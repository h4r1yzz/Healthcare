import os
import sys
import shutil
import time
from typing import Optional, Tuple

import numpy as np
import nibabel as nib

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


_model = None


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"Model not found at {MODEL_PATH}")
        _model = build_model(MODEL_PATH)
    return _model


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

    # Return path for frontend; Next.js serves under /data
    rel_url = f"/data/{safe_case}/{os.path.basename(seg_path)}"
    return PredictResponse(case=safe_case, output_abs_path=seg_path, output_url=rel_url)


# Entrypoint hint: uvicorn backend.api:app --host 0.0.0.0 --port 8000


