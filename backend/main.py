import os
import sys
import argparse
from typing import Tuple

import numpy as np
import nibabel as nib
import cv2

# TensorFlow / Keras
import tensorflow as tf
from tensorflow import keras
import tensorflow.keras.backend as K


# -----------------------------------------------------------------------------
# Constants (aligned with the training notebook)
# -----------------------------------------------------------------------------
IMG_SIZE: int = 128
VOLUME_SLICES: int = 100
VOLUME_START_AT: int = 22


# -----------------------------------------------------------------------------
# Custom metrics used during training (needed to load certain .h5 checkpoints)
# -----------------------------------------------------------------------------
def dice_coef(y_true, y_pred, smooth: float = 1.0):
    class_num = 4
    total_loss = None
    for class_index in range(class_num):
        y_true_f = K.flatten(y_true[:, :, :, class_index])
        y_pred_f = K.flatten(y_pred[:, :, :, class_index])
        intersection = K.sum(y_true_f * y_pred_f)
        loss = ((2.0 * intersection + smooth) /
                (K.sum(y_true_f) + K.sum(y_pred_f) + smooth))
        if total_loss is None:
            total_loss = loss
        else:
            total_loss = total_loss + loss
    total_loss = total_loss / class_num
    return total_loss


def dice_coef_necrotic(y_true, y_pred, epsilon: float = 1e-6):
    intersection = K.sum(K.abs(y_true[:, :, :, 1] * y_pred[:, :, :, 1]))
    return (2.0 * intersection) / (
        K.sum(K.square(y_true[:, :, :, 1])) + K.sum(K.square(y_pred[:, :, :, 1])) + epsilon
    )


def dice_coef_edema(y_true, y_pred, epsilon: float = 1e-6):
    intersection = K.sum(K.abs(y_true[:, :, :, 2] * y_pred[:, :, :, 2]))
    return (2.0 * intersection) / (
        K.sum(K.square(y_true[:, :, :, 2])) + K.sum(K.square(y_pred[:, :, :, 2])) + epsilon
    )


def dice_coef_enhancing(y_true, y_pred, epsilon: float = 1e-6):
    intersection = K.sum(K.abs(y_true[:, :, :, 3] * y_pred[:, :, :, 3]))
    return (2.0 * intersection) / (
        K.sum(K.square(y_true[:, :, :, 3])) + K.sum(K.square(y_pred[:, :, :, 3])) + epsilon
    )


def precision(y_true, y_pred):
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    predicted_positives = K.sum(K.round(K.clip(y_pred, 0, 1)))
    return true_positives / (predicted_positives + K.epsilon())


def sensitivity(y_true, y_pred):
    true_positives = K.sum(K.round(K.clip(y_true * y_pred, 0, 1)))
    possible_positives = K.sum(K.round(K.clip(y_true, 0, 1)))
    return true_positives / (possible_positives + K.epsilon())


def specificity(y_true, y_pred):
    true_negatives = K.sum(K.round(K.clip((1 - y_true) * (1 - y_pred), 0, 1)))
    possible_negatives = K.sum(K.round(K.clip(1 - y_true, 0, 1)))
    return true_negatives / (possible_negatives + K.epsilon())


CUSTOM_OBJECTS = {
    'accuracy': tf.keras.metrics.MeanIoU(num_classes=4),
    'dice_coef': dice_coef,
    'precision': precision,
    'sensitivity': sensitivity,
    'specificity': specificity,
    'dice_coef_necrotic': dice_coef_necrotic,
    'dice_coef_edema': dice_coef_edema,
    'dice_coef_enhancing': dice_coef_enhancing,
}


# -----------------------------------------------------------------------------
# I/O helpers
# -----------------------------------------------------------------------------
def load_nifti(path: str) -> Tuple[np.ndarray, np.ndarray, nib.Nifti1Header]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing NIfTI file: {path}")
    img = nib.load(path)
    data = img.get_fdata()
    return data, img.affine, img.header


def save_nifti(label_volume: np.ndarray, affine: np.ndarray, header: nib.Nifti1Header, out_path: str) -> None:
    # Ensure integer labels for segmentation and cast to int16 to save space
    label_volume = label_volume.astype(np.int16)
    seg_img = nib.Nifti1Image(label_volume, affine, header)
    nib.save(seg_img, out_path)


# -----------------------------------------------------------------------------
# Preprocessing and prediction
# -----------------------------------------------------------------------------
def build_model(model_path: str) -> keras.Model:
    # Try loading with custom_objects (safer if the model was saved with them referenced)
    try:
        model = keras.models.load_model(model_path, custom_objects=CUSTOM_OBJECTS, compile=False)
        return model
    except Exception as first_err:
        # Fallback to loading without custom objects
        try:
            model = keras.models.load_model(model_path, compile=False)
            return model
        except Exception as second_err:
            raise RuntimeError(
                f"Failed to load model from {model_path}. First error: {first_err}. Second error: {second_err}"
            )


def prepare_input(modality_to_volume: dict, channel_order: Tuple[str, ...]) -> np.ndarray:
    # Validate same shapes across chosen modalities
    shapes = [modality_to_volume[name].shape for name in channel_order]
    if len(set(shapes)) != 1:
        raise ValueError(f"Selected modalities have different shapes: {shapes}")

    height, width, depth = shapes[0]
    if depth < VOLUME_START_AT + VOLUME_SLICES:
        raise ValueError(
            f"Not enough slices: depth={depth}, requires at least {VOLUME_START_AT + VOLUME_SLICES}"
        )

    num_channels = len(channel_order)
    x_batch = np.empty((VOLUME_SLICES, IMG_SIZE, IMG_SIZE, num_channels), dtype=np.float32)

    for slice_index in range(VOLUME_SLICES):
        z = slice_index + VOLUME_START_AT
        for channel_index, modality_name in enumerate(channel_order):
            slice_2d = modality_to_volume[modality_name][:, :, z]
            resized = cv2.resize(slice_2d, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LINEAR)
            x_batch[slice_index, :, :, channel_index] = resized

    # Normalize by the global max across the input batch to match notebook logic
    max_val = np.max(x_batch)
    if max_val > 0:
        x_batch = x_batch / max_val

    return x_batch


def predict_segmentation(model: keras.Model, x_batch: np.ndarray, original_hw: Tuple[int, int]) -> np.ndarray:
    """
    Runs prediction on the prepared batch and reconstructs a 3D label volume with
    original in-plane resolution and correct slice positions. Slices outside the
    predicted range are left as background (0).
    """
    height, width = original_hw

    # Predict per-slice softmax maps (VOLUME_SLICES, IMG_SIZE, IMG_SIZE, 4)
    probs = model.predict(x_batch, verbose=1)
    # Convert to discrete labels via argmax
    labels_small = np.argmax(probs, axis=-1).astype(np.uint8)

    # Upsample each slice back to original in-plane resolution using nearest neighbor
    labels_fullres = np.empty((VOLUME_SLICES, height, width), dtype=np.uint8)
    for i in range(VOLUME_SLICES):
        labels_fullres[i] = cv2.resize(
            labels_small[i], (width, height), interpolation=cv2.INTER_NEAREST
        )

    return labels_fullres


def assemble_full_volume(
    labels_fullres: np.ndarray, original_shape: Tuple[int, int, int]
) -> np.ndarray:
    """
    Places the predicted slices back into a full 3D volume of shape (H, W, D),
    leaving slices before/after the predicted window as background (0).
    """
    height, width, depth = original_shape
    seg_volume = np.zeros((height, width, depth), dtype=np.uint8)

    slice_end = VOLUME_START_AT + VOLUME_SLICES
    seg_volume[:, :, VOLUME_START_AT:slice_end] = np.transpose(labels_fullres, (1, 2, 0))
    return seg_volume


# -----------------------------------------------------------------------------
# CLI
# -----------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    default_public = os.path.join(project_root, 'public')

    parser = argparse.ArgumentParser(
        description='Run brain tumor segmentation using a trained UNet (.h5) model.'
    )
    parser.add_argument(
        '--model',
        type=str,
        default=os.path.join(project_root, 'backend', 'model', 'brain_tumor_unet_final.h5'),
        help='Path to the trained Keras .h5 model.'
    )
    parser.add_argument('--flair', type=str,
                        default=os.path.join(default_public, 'BraTS20_Validation_008_flair.nii'),
                        help='Path to the FLAIR NIfTI file.')
    parser.add_argument('--t1', type=str,
                        default=os.path.join(default_public, 'BraTS20_Validation_008_t1.nii'),
                        help='Path to the T1 NIfTI file.')
    parser.add_argument('--t1ce', type=str,
                        default=os.path.join(default_public, 'BraTS20_Validation_008_t1ce.nii'),
                        help='Path to the T1CE NIfTI file.')
    parser.add_argument('--t2', type=str,
                        default=os.path.join(default_public, 'BraTS20_Validation_008_t2.nii'),
                        help='Path to the T2 NIfTI file.')
    parser.add_argument(
        '--output',
        type=str,
        default=os.path.join(default_public, 'BraTS20_Validation_008_seg.nii'),
        help='Path to save the predicted segmentation NIfTI.'
    )
    parser.add_argument(
        '--channels', type=str, default='',
        help='Comma-separated channel order to use from {flair,t1,t1ce,t2}. '
             'If empty, will auto-select based on model input channels: 2 -> flair,t1ce | 4 -> flair,t1,t1ce,t2.'
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print(f"Loading model from: {args.model}")
    model = build_model(args.model)
    print("Model loaded.")

    # Load all available modalities
    modalities = {}
    print(f"Loading FLAIR: {args.flair}")
    modalities['flair'], flair_affine, flair_header = load_nifti(args.flair)
    print(f"Loading T1:    {args.t1}")
    modalities['t1'], _, _ = load_nifti(args.t1)
    print(f"Loading T1CE:  {args.t1ce}")
    modalities['t1ce'], _, _ = load_nifti(args.t1ce)
    print(f"Loading T2:    {args.t2}")
    modalities['t2'], _, _ = load_nifti(args.t2)

    # Validate shapes
    shapes = {name: vol.shape for name, vol in modalities.items()}
    if len(set(shapes.values())) != 1:
        raise ValueError(f"Modalities have different shapes: {shapes}")

    original_h, original_w, original_d = modalities['flair'].shape
    print(f"Input volume shape: (H={original_h}, W={original_w}, D={original_d})")

    # Determine channel order to use
    input_channels = model.input_shape[-1]
    if args.channels:
        channel_order = tuple([c.strip().lower() for c in args.channels.split(',') if c.strip()])
    else:
        if input_channels == 4:
            channel_order = ('flair', 't1', 't1ce', 't2')
        elif input_channels == 2:
            channel_order = ('flair', 't1ce')
        elif input_channels == 1:
            channel_order = ('flair',)
        else:
            raise ValueError(f"Unsupported number of input channels in model: {input_channels}")

    # Sanity check channel names
    for c in channel_order:
        if c not in modalities:
            raise ValueError(f"Unknown channel '{c}'. Must be one of {list(modalities.keys())}.")

    print(f"Using channel order: {channel_order} (model expects {input_channels})")

    x_batch = prepare_input(modalities, channel_order)
    labels_fullres = predict_segmentation(model, x_batch, (original_h, original_w))
    seg_volume = assemble_full_volume(labels_fullres, (original_h, original_w, original_d))

    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    save_nifti(seg_volume, flair_affine, flair_header, args.output)
    print(f"Saved predicted segmentation to: {args.output}")


if __name__ == '__main__':
    main()


