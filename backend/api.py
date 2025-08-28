import os
import sys
import shutil
import time
import logging
import json
from typing import Optional, Tuple

import numpy as np
import nibabel as nib
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Load environment variables from .env file
load_dotenv()

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

# Import similarity search functionality
from backend.similarity_search import search_similar_cases, is_similarity_search_available
from backend.multifieldannotator_predictor import MultiFieldAnnotatorPredictor

# Import overlay generation functionality
from backend.overlay_generator import get_overlay_image_bytes, get_nifti_preview_bytes


PUBLIC_DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
MODEL_PATH = os.path.join(PROJECT_ROOT, "backend", "model", "brain_tumor_unet_final.h5")

os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)

# Set up logging
logger = logging.getLogger(__name__)


app = FastAPI(title="MedScan Segmentation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SimilarityMatch(BaseModel):
    id: str
    score: float
    metadata: Dict[str, Any]
    case_name: str


class PredictResponse(BaseModel):
    case: str
    output_abs_path: str
    output_url: str
    visualization_url: str
    similarity_results: Optional[List[SimilarityMatch]] = None


class ConsensusRequest(BaseModel):
    scan_id: str
    assessments: List[Dict[str, Any]]


class ConsensusResponse(BaseModel):
    consensus: Dict[str, str]
    saved_json_path: str


class ReportRequest(BaseModel):
    scan_id: str


class ReportResponse(BaseModel):
    report_path: str
    download_url: str
    filename: str


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

    # Perform similarity search
    similarity_results = None
    try:
        is_available, error_msg = is_similarity_search_available()
        if is_available:
            print("Performing similarity search...")
            similar_cases = search_similar_cases(seg_path)
            if similar_cases:
                similarity_results = [
                    SimilarityMatch(
                        id=case['id'],
                        score=case['score'],
                        metadata=case['metadata'],
                        case_name=case['case_name']
                    )
                    for case in similar_cases
                ]
                print(f"Found {len(similarity_results)} similar cases")
            else:
                print("No similar cases found")
        else:
            print(f"Similarity search not available: {error_msg}")
    except Exception as e:
        print(f"Similarity search failed: {e}")
        # Continue without similarity results

    # Return paths for frontend; Next.js serves under /data
    rel_url = f"/data/{safe_case}/{os.path.basename(seg_path)}"
    viz_url = f"/data/{safe_case}/{os.path.basename(viz_path)}"
    return PredictResponse(
        case=safe_case,
        output_abs_path=seg_path,
        output_url=rel_url,
        visualization_url=viz_url,
        similarity_results=similarity_results
    )


@app.post("/consensus", response_model=ConsensusResponse)
async def consensus(request: ConsensusRequest):
    """
    Generate consensus labels from multiple radiologist assessments.
    """
    try:
        # Initialize the predictor
        predictor = MultiFieldAnnotatorPredictor(verbose=True)

        # Convert assessments to the format expected by add_new_scan
        scan_data = {
            request.scan_id: {}
        }

        for assessment in request.assessments:
            radiologist_name = assessment.get("radiologist", "unknown")
            scan_data[request.scan_id][radiologist_name] = {
                "Tumor Location": assessment.get("tumor_location", ""),
                "Tumor Type": assessment.get("tumor_type", ""),
                "Tumor Grade": assessment.get("tumor_grade", ""),
                "Size": assessment.get("size", ""),
                "Confidence": assessment.get("confidence", "50%"),
                "Additional Comments": assessment.get("comments", "")
            }

        # Save the scan data with comments for report generation
        case_dir = os.path.join(PUBLIC_DATA_DIR, request.scan_id)
        os.makedirs(case_dir, exist_ok=True)
        scan_data_path = os.path.join(case_dir, "scan_data.json")

        with open(scan_data_path, "w") as f:
            json.dump(scan_data, f, indent=2)

        # Process the scan data
        result = predictor.add_new_scan(scan_data)

        # Get the consensus for this scan
        consensus_labels = result["consensus_labels"].get(request.scan_id, {})

        # Determine the saved JSON path
        json_path = os.path.join(case_dir, "consensus_labels.json")

        return ConsensusResponse(
            consensus=consensus_labels,
            saved_json_path=json_path
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate consensus: {str(e)}")


@app.post("/generate-report", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """
    Generate a comprehensive medical report using LLM with hardcoded API key.
    """
    try:
        from backend.llm_report_generator import LLMReportGenerator

        # Determine case directory
        case_dir = os.path.join(PUBLIC_DATA_DIR, request.scan_id)

        if not os.path.exists(case_dir):
            raise HTTPException(status_code=404, detail=f"Case directory not found: {request.scan_id}")

        # Check if required files exist
        consensus_path = os.path.join(case_dir, "consensus_labels.json")
        scan_data_path = os.path.join(case_dir, "scan_data.json")

        if not os.path.exists(consensus_path):
            raise HTTPException(status_code=400, detail="Consensus labels not found. Please generate consensus first.")

        if not os.path.exists(scan_data_path):
            raise HTTPException(status_code=400, detail="Scan data not found. Please generate consensus first.")

        # Initialize the report generator with API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found in environment variables")
        generator = LLMReportGenerator(api_key=api_key)

        # Generate the report
        report_path = generator.generate_report(request.scan_id, case_dir)

        # Create download URL and filename
        report_filename = os.path.basename(report_path)
        download_url = f"/data/{request.scan_id}/{report_filename}"

        return ReportResponse(
            report_path=report_path,
            download_url=download_url,
            filename=report_filename
        )

    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@app.post("/preview")
async def generate_nifti_preview(file: UploadFile = File(...), size: int = 256):
    """
    Generate and serve a grayscale preview image from an uploaded NIfTI file.

    Args:
        file: Uploaded NIfTI file (.nii or .nii.gz)
        size: Image size in pixels (default: 256x256)
    """
    try:
        # Validate file extension
        if not (file.filename.endswith('.nii') or file.filename.endswith('.nii.gz')):
            raise HTTPException(status_code=400, detail="File must be a NIfTI file (.nii or .nii.gz)")

        # Create temporary file to save upload
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.nii.gz' if file.filename.endswith('.nii.gz') else '.nii') as temp_file:
            # Copy uploaded file to temporary location
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name

        try:
            # Generate preview image
            image_bytes = get_nifti_preview_bytes(temp_path, (size, size))

            if image_bytes is None:
                raise HTTPException(status_code=400, detail="Failed to generate preview from NIfTI file")

            # Return image with appropriate headers
            from fastapi.responses import Response
            return Response(
                content=image_bytes,
                media_type="image/png",
                headers={
                    "Content-Disposition": f"inline; filename=preview_{size}x{size}.png",
                    "Cache-Control": "no-cache"  # Don't cache temporary previews
                }
            )

        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating NIfTI preview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")
    finally:
        # Ensure uploaded file is closed
        try:
            file.file.close()
        except Exception:
            pass


@app.get("/overlay/{case_id}")
async def get_overlay_image(case_id: str, size: int = 96):
    """
    Generate and serve overlay image (FLAIR background + red segmentation overlay).

    Args:
        case_id: BraTS case ID (e.g., "BraTS20_Training_009")
        size: Image size in pixels (default: 96x96)
    """
    try:
        # Generate overlay image
        image_bytes = get_overlay_image_bytes(case_id, (size, size))

        if image_bytes is None:
            raise HTTPException(status_code=404, detail=f"Could not generate overlay for case {case_id}")

        # Return image with appropriate headers
        from fastapi.responses import Response
        return Response(
            content=image_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f"inline; filename=overlay_{case_id}_{size}x{size}.png"
            }
        )

    except Exception as e:
        logger.error(f"Failed to generate overlay for {case_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Entrypoint hint: uvicorn backend.api:app --host 0.0.0.0 --port 8000


