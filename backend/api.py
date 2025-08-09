import os
import sys
import shutil
import time
from typing import Optional, Tuple

import numpy as np
import nibabel as nib
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure project root on sys.path for absolute imports when running from `backend/`
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Reuse prediction utilities from main.py
from backend.main import (
    build_model,
    load_nifti,
    prepare_input,
    predict_segmentation,
    assemble_full_volume,
)


PUBLIC_DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
MODEL_PATH = os.path.join(PROJECT_ROOT, "backend", "model", "brain_tumor_unet_final.h5")

os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)


app = FastAPI(title="MedScan Segmentation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictResponse(BaseModel):
    case: str
    output_abs_path: str
    output_url: str
    visualization_url: str


_model = None


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model not found at {MODEL_PATH}")
        _model = build_model(MODEL_PATH)
    return _model


def convert_nifti_to_rgb_visualization(nifti_path: str, flair_path: str, output_path: str) -> None:
    """
    Convert a NIfTI segmentation file to an RGB visualization image overlaid on FLAIR.

    Args:
        nifti_path: Path to the input NIfTI segmentation file
        flair_path: Path to the FLAIR NIfTI file for background
        output_path: Path where the RGB visualization PNG will be saved
    """
    try:
        # Load the segmentation and FLAIR images
        seg_img = nib.load(nifti_path)
        seg_data = seg_img.get_fdata()

        flair_img = nib.load(flair_path)
        flair_data = flair_img.get_fdata()

        # Extract middle axial slice
        z_idx = seg_data.shape[2] // 2
        slice_seg = seg_data[:, :, z_idx]
        slice_flair = flair_data[:, :, z_idx]

        # Normalize FLAIR slice to 0-255 range
        slice_flair_norm = (slice_flair - slice_flair.min()) / (np.ptp(slice_flair)) * 255
        base_img = Image.fromarray(slice_flair_norm.astype(np.uint8)).convert("RGB")

        # Create segmentation overlay (in red with transparency)
        overlay = Image.new("RGBA", base_img.size)
        overlay_data = overlay.load()
        for y in range(slice_seg.shape[0]):
            for x in range(slice_seg.shape[1]):
                if slice_seg[y, x] > 0:
                    overlay_data[x, y] = (255, 0, 0, 120)  # Red with transparency

        # Merge base FLAIR and segmentation overlay
        combined_img = Image.alpha_composite(base_img.convert("RGBA"), overlay)

        # Save the combined image (clean visualization without annotations)
        combined_img.convert("RGB").save(output_path, "PNG")

    except Exception as e:
        # If visualization fails, create a simple error image
        error_img = Image.new("RGB", (512, 512), color=(0, 0, 0))
        draw = ImageDraw.Draw(error_img)
        draw.text((256, 256), 'Visualization\nUnavailable',
                 fill=(255, 255, 255), anchor="mm")
        error_img.save(output_path, "PNG")
        print(f"Warning: Failed to generate visualization: {e}")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
async def predict(
    flair: UploadFile = File(...),
    t1: UploadFile = File(...),
    t1ce: UploadFile = File(...),
    t2: UploadFile = File(...),
    case: Optional[str] = Form(None),
):
    model = get_model()

    # Determine target folder and filenames
    safe_case = case.strip() if case else f"CASE_{int(time.time())}"
    case_dir = os.path.join(PUBLIC_DATA_DIR, safe_case)
    os.makedirs(case_dir, exist_ok=True)

    # Persist uploads so nibabel can read them, and so frontend can list them later if needed
    paths = {}
    try:
        for name, upload in ("flair", flair), ("t1", t1), ("t1ce", t1ce), ("t2", t2):
            # Keep/force expected filename suffixes
            ext = ".nii.gz" if upload.filename.endswith(".nii.gz") else ".nii"
            out_path = os.path.join(case_dir, f"{safe_case}_{name}{ext}")
            with open(out_path, "wb") as f:
                shutil.copyfileobj(upload.file, f)
            paths[name] = out_path
    finally:
        # Ensure file buffers are closed
        for up in (flair, t1, t1ce, t2):
            try:
                up.file.close()
            except Exception:
                pass

    # Load volumes
    try:
        modalities = {}
        modalities["flair"], affine, header = load_nifti(paths["flair"])
        modalities["t1"], _, _ = load_nifti(paths["t1"]) 
        modalities["t1ce"], _, _ = load_nifti(paths["t1ce"]) 
        modalities["t2"], _, _ = load_nifti(paths["t2"]) 
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load NIfTI files: {e}")

    # Validate same shapes
    shapes = {k: v.shape for k, v in modalities.items()}
    if len(set(shapes.values())) != 1:
        raise HTTPException(status_code=400, detail=f"Modalities have different shapes: {shapes}")

    original_h, original_w, original_d = modalities["flair"].shape

    # Choose channels based on model input shape (current model expects 2 -> flair,t1ce)
    input_channels = model.input_shape[-1]
    if input_channels == 4:
        channel_order = ("flair", "t1", "t1ce", "t2")
    elif input_channels == 2:
        channel_order = ("flair", "t1ce")
    elif input_channels == 1:
        channel_order = ("flair",)
    else:
        raise HTTPException(status_code=500, detail=f"Unsupported model channels: {input_channels}")

    # Prepare batch, predict, and assemble full volume
    x_batch = prepare_input(modalities, channel_order)
    labels_fullres = predict_segmentation(model, x_batch, (original_h, original_w))
    seg_volume = assemble_full_volume(labels_fullres, (original_h, original_w, original_d))

    # Save segmentation next to inputs
    seg_path = os.path.join(case_dir, f"{safe_case}_seg.nii")
    nib.save(nib.Nifti1Image(seg_volume.astype(np.int16), affine, header), seg_path)

    # Generate RGB visualization with FLAIR overlay
    viz_path = os.path.join(case_dir, f"{safe_case}_seg_visualization.png")
    flair_path = paths["flair"]  # Get the FLAIR file path
    convert_nifti_to_rgb_visualization(seg_path, flair_path, viz_path)

    # Return paths for frontend; Next.js serves under /data
    rel_url = f"/data/{safe_case}/{os.path.basename(seg_path)}"
    viz_url = f"/data/{safe_case}/{os.path.basename(viz_path)}"
    return PredictResponse(
        case=safe_case,
        output_abs_path=seg_path,
        output_url=rel_url,
        visualization_url=viz_url
    )


# Entrypoint hint: uvicorn backend.api:app --host 0.0.0.0 --port 8000


