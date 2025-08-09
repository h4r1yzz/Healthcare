"""
Configuration module for NeuroGrade_AI similarity search functionality.
Manages environment variables and default settings for CLIP and Pinecone integration.
"""

import os
from typing import Optional


class SimilaritySearchConfig:
    """Configuration class for similarity search functionality."""
    
    # Pinecone Configuration
    PINECONE_API_KEY: str = os.getenv(
        "PINECONE_API_KEY", 
        "pcsk_6K4z5X_7EtrVfCTASwXGxEXqb5U8ztagsyhN28cDe7q3xRcgwYWZUnqC9baUz8zUgciFTR"
    )
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "testmed")
    PINECONE_CLOUD: str = os.getenv("PINECONE_CLOUD", "aws")
    PINECONE_REGION: str = os.getenv("PINECONE_REGION", "us-east-1")
    
    # CLIP Model Configuration
    CLIP_MODEL_NAME: str = os.getenv("CLIP_MODEL_NAME", "openai/clip-vit-base-patch32")
    CLIP_IMAGE_SIZE: int = int(os.getenv("CLIP_IMAGE_SIZE", "224"))
    
    # Similarity Search Settings
    TOP_K_RESULTS: int = int(os.getenv("SIMILARITY_TOP_K", "3"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.0"))
    
    # Feature Flags
    ENABLE_SIMILARITY_SEARCH: bool = os.getenv("ENABLE_SIMILARITY_SEARCH", "true").lower() == "true"
    
    @classmethod
    def validate_config(cls) -> tuple[bool, Optional[str]]:
        """
        Validate the configuration settings.
        
        Returns:
            tuple: (is_valid, error_message)
        """
        if not cls.PINECONE_API_KEY:
            return False, "PINECONE_API_KEY is required"
        
        if not cls.PINECONE_INDEX_NAME:
            return False, "PINECONE_INDEX_NAME is required"
        
        if cls.TOP_K_RESULTS <= 0:
            return False, "TOP_K_RESULTS must be positive"
        
        if cls.CLIP_IMAGE_SIZE <= 0:
            return False, "CLIP_IMAGE_SIZE must be positive"
        
        return True, None
    
    @classmethod
    def get_device(cls) -> str:
        """Get the appropriate device for CLIP model (cuda if available, else cpu)."""
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu"


# Global configuration instance
config = SimilaritySearchConfig()
