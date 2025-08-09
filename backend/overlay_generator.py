"""
Overlay image generator for NeuroGrade_AI similarity search.
Creates FLAIR background images with red segmentation overlays.
"""

import os
import logging
from typing import Optional, Tuple
import numpy as np
import nibabel as nib
import matplotlib.pyplot as plt
from PIL import Image
import io

# Set up logging
logger = logging.getLogger(__name__)

# BraTS2020 training data path
BRATS_DATA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "public", "BraTS2020_TrainingData", 
    "MICCAI_BraTS2020_TrainingData"
)


def load_nifti_slice(nifti_path: str, slice_idx: Optional[int] = None) -> Optional[np.ndarray]:
    """
    Load a specific slice from a NIfTI file.
    
    Args:
        nifti_path: Path to the NIfTI file
        slice_idx: Slice index (if None, uses middle slice)
        
    Returns:
        2D numpy array of the slice, or None if loading fails
    """
    try:
        if not os.path.exists(nifti_path):
            logger.warning(f"NIfTI file not found: {nifti_path}")
            return None
            
        img = nib.load(nifti_path)
        data = img.get_fdata()
        
        if slice_idx is None:
            slice_idx = data.shape[2] // 2  # Middle slice
            
        if slice_idx >= data.shape[2]:
            slice_idx = data.shape[2] - 1
            
        return data[:, :, slice_idx]
        
    except Exception as e:
        logger.error(f"Failed to load NIfTI slice from {nifti_path}: {e}")
        return None


def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize image to 0-255 range."""
    if image.max() == image.min():
        return np.zeros_like(image, dtype=np.uint8)
    
    normalized = (image - image.min()) / (image.max() - image.min())
    return (normalized * 255).astype(np.uint8)


def create_overlay_image(flair_slice: np.ndarray, seg_slice: np.ndarray, 
                        size: Tuple[int, int] = (96, 96)) -> Image.Image:
    """
    Create an overlay image with FLAIR background and red segmentation mask.
    
    Args:
        flair_slice: 2D FLAIR image slice
        seg_slice: 2D segmentation mask slice
        size: Output image size (width, height)
        
    Returns:
        PIL Image with overlay
    """
    # Normalize FLAIR to 0-255
    flair_normalized = normalize_image(flair_slice)
    
    # Create RGB image from FLAIR (grayscale background)
    rgb_image = np.stack([flair_normalized, flair_normalized, flair_normalized], axis=-1)
    
    # Create red overlay for segmentation (tumor regions)
    tumor_mask = seg_slice > 0
    if np.any(tumor_mask):
        # Apply red overlay with some transparency
        rgb_image[tumor_mask, 0] = np.minimum(255, rgb_image[tumor_mask, 0] + 128)  # Enhance red
        rgb_image[tumor_mask, 1] = rgb_image[tumor_mask, 1] // 2  # Reduce green
        rgb_image[tumor_mask, 2] = rgb_image[tumor_mask, 2] // 2  # Reduce blue
    
    # Convert to PIL Image and resize
    pil_image = Image.fromarray(rgb_image.astype(np.uint8))
    pil_image = pil_image.resize(size, Image.Resampling.LANCZOS)
    
    return pil_image


def generate_overlay_for_case(case_id: str, size: Tuple[int, int] = (96, 96)) -> Optional[Image.Image]:
    """
    Generate overlay image for a specific case.

    Args:
        case_id: Case ID (e.g., "BraTS20_Training_009")
        size: Output image size

    Returns:
        PIL Image with overlay, or None if generation fails
    """
    # Build paths to FLAIR and segmentation files
    case_dir = os.path.join(BRATS_DATA_PATH, case_id)
    flair_path = os.path.join(case_dir, f"{case_id}_flair.nii")
    seg_path = os.path.join(case_dir, f"{case_id}_seg.nii")

    # Load FLAIR and segmentation slices
    flair_slice = load_nifti_slice(flair_path)
    seg_slice = load_nifti_slice(seg_path)

    if flair_slice is None:
        logger.error(f"Failed to load FLAIR slice for case {case_id}")
        return None

    if seg_slice is None:
        logger.warning(f"Failed to load segmentation slice for case {case_id}, using empty mask")
        seg_slice = np.zeros_like(flair_slice)

    # Create overlay image
    try:
        overlay_image = create_overlay_image(flair_slice, seg_slice, size)
        return overlay_image

    except Exception as e:
        logger.error(f"Failed to create overlay image for case {case_id}: {e}")
        return None


def get_overlay_image_bytes(case_id: str, size: Tuple[int, int] = (96, 96)) -> Optional[bytes]:
    """
    Get overlay image as bytes for HTTP response.

    Args:
        case_id: Case ID
        size: Image size

    Returns:
        Image bytes, or None if generation fails
    """
    overlay_image = generate_overlay_for_case(case_id, size)
    if overlay_image is None:
        return None

    # Convert to bytes
    img_buffer = io.BytesIO()
    overlay_image.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    return img_buffer.getvalue()
