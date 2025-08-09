"""
Similarity search module for NeuroGrade_AI.
Integrates CLIP model with Pinecone vector database for medical image similarity search.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import nibabel as nib
from PIL import Image
import torch

from .config import config

# Set up logging
logger = logging.getLogger(__name__)

# Global variables for model caching
_clip_model = None
_clip_processor = None
_pinecone_index = None


class SimilaritySearchError(Exception):
    """Custom exception for similarity search errors."""
    pass


def initialize_clip_model():
    """Initialize and cache the CLIP model and processor."""
    global _clip_model, _clip_processor
    
    if _clip_model is not None and _clip_processor is not None:
        return _clip_model, _clip_processor
    
    try:
        from transformers import CLIPProcessor, CLIPModel
        
        device = config.get_device()
        logger.info(f"Loading CLIP model on device: {device}")
        
        _clip_model = CLIPModel.from_pretrained(config.CLIP_MODEL_NAME).to(device)
        _clip_processor = CLIPProcessor.from_pretrained(config.CLIP_MODEL_NAME)
        
        logger.info("CLIP model loaded successfully")
        return _clip_model, _clip_processor
        
    except Exception as e:
        logger.error(f"Failed to load CLIP model: {e}")
        raise SimilaritySearchError(f"Failed to load CLIP model: {e}")


def initialize_pinecone_client():
    """Initialize and cache the Pinecone client and index."""
    global _pinecone_index
    
    if _pinecone_index is not None:
        return _pinecone_index
    
    try:
        from pinecone import Pinecone, ServerlessSpec
        
        # Initialize Pinecone
        pc = Pinecone(api_key=config.PINECONE_API_KEY)
        
        # Check if index exists, create if it doesn't
        if config.PINECONE_INDEX_NAME not in [index.name for index in pc.list_indexes()]:
            logger.info(f"Creating Pinecone index: {config.PINECONE_INDEX_NAME}")
            pc.create_index(
                name=config.PINECONE_INDEX_NAME,
                dimension=512,  # CLIP embedding dimension
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=config.PINECONE_CLOUD,
                    region=config.PINECONE_REGION
                )
            )
        
        # Connect to index
        _pinecone_index = pc.Index(config.PINECONE_INDEX_NAME)
        logger.info(f"Connected to Pinecone index: {config.PINECONE_INDEX_NAME}")
        return _pinecone_index
        
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone: {e}")
        raise SimilaritySearchError(f"Failed to initialize Pinecone: {e}")


def convert_segmentation_to_clip_input(seg_path: str) -> Image.Image:
    """
    Convert a 3D segmentation mask to a 2D RGB image suitable for CLIP.
    
    Args:
        seg_path: Path to the segmentation NIfTI file
        
    Returns:
        PIL Image in RGB format with red overlay for tumor regions
    """
    try:
        # Load the segmentation image
        seg_img = nib.load(seg_path)
        seg_data = seg_img.get_fdata()
        
        # Extract middle slice
        z_idx = seg_data.shape[2] // 2
        slice_seg = seg_data[:, :, z_idx]
        
        # Convert to RGB (tumor mask in red)
        seg_rgb = np.zeros((slice_seg.shape[0], slice_seg.shape[1], 3), dtype=np.uint8)
        seg_rgb[slice_seg > 0] = [255, 0, 0]  # Red for tumor regions
        
        # Convert to PIL Image and resize for CLIP
        pil_img = Image.fromarray(seg_rgb).resize((config.CLIP_IMAGE_SIZE, config.CLIP_IMAGE_SIZE))
        
        return pil_img
        
    except Exception as e:
        logger.error(f"Failed to convert segmentation to CLIP input: {e}")
        raise SimilaritySearchError(f"Failed to convert segmentation: {e}")


def generate_clip_embedding(image: Image.Image) -> np.ndarray:
    """
    Generate CLIP embedding for an image.
    
    Args:
        image: PIL Image to encode
        
    Returns:
        Normalized CLIP embedding as numpy array
    """
    try:
        model, processor = initialize_clip_model()
        device = config.get_device()
        
        # Preprocess image
        inputs = processor(images=image, return_tensors="pt").to(device)
        
        # Generate embedding
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            # Normalize the embedding
            image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
            
        return image_features.cpu().numpy()[0]
        
    except Exception as e:
        logger.error(f"Failed to generate CLIP embedding: {e}")
        raise SimilaritySearchError(f"Failed to generate embedding: {e}")


def search_similar_cases(seg_path: str) -> List[Dict[str, Any]]:
    """
    Search for similar cases using the segmentation mask.
    
    Args:
        seg_path: Path to the segmentation NIfTI file
        
    Returns:
        List of similar cases with metadata and scores
    """
    try:
        # Convert segmentation to CLIP input
        clip_image = convert_segmentation_to_clip_input(seg_path)
        
        # Generate embedding
        query_vector = generate_clip_embedding(clip_image)
        
        # Initialize Pinecone and search
        index = initialize_pinecone_client()
        
        # Query for similar cases
        query_response = index.query(
            vector=query_vector.tolist(),
            top_k=config.TOP_K_RESULTS,
            include_metadata=True
        )
        
        # Format results
        results = []
        for match in query_response.get('matches', []):
            if match['score'] >= config.SIMILARITY_THRESHOLD:
                results.append({
                    'id': match['id'],
                    'score': float(match['score']),
                    'metadata': match.get('metadata', {}),
                    'case_name': match['id'].replace('_seg', '') if '_seg' in match['id'] else match['id']
                })
        
        logger.info(f"Found {len(results)} similar cases")
        return results
        
    except Exception as e:
        logger.error(f"Similarity search failed: {e}")
        # Return empty results instead of raising exception to allow graceful degradation
        return []


def is_similarity_search_available() -> Tuple[bool, Optional[str]]:
    """
    Check if similarity search is available and properly configured.
    
    Returns:
        tuple: (is_available, error_message)
    """
    if not config.ENABLE_SIMILARITY_SEARCH:
        return False, "Similarity search is disabled"
    
    # Validate configuration
    is_valid, error_msg = config.validate_config()
    if not is_valid:
        return False, f"Configuration error: {error_msg}"
    
    try:
        # Test CLIP model loading
        initialize_clip_model()
        
        # Test Pinecone connection
        initialize_pinecone_client()
        
        return True, None
        
    except Exception as e:
        return False, str(e)
