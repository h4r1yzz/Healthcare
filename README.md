# MedScan - FastAPI Backend Integration

This document explains how to run the MedScan application with the FastAPI backend for brain tumor segmentation.

## Architecture

- **Frontend**: Next.js application (port 3000)
- **Backend**: FastAPI server (port 8000)
- **Model**: Pre-trained UNet model for brain tumor segmentation

## Setup Instructions

### 1. Backend Setup

First, set up the FastAPI backend:

```bash
# Navigate to the project root
cd /home/zuhair/Desktop/project/MedScan

# Create and activate virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
```

**Alternative**: Use the provided script:
```bash
./start_backend.sh
```

### 2. Frontend Setup

In a new terminal, start the Next.js frontend:

```bash
# Navigate to project root
cd /home/zuhair/Desktop/project/MedScan

# Install dependencies (if not already done)
npm install
# or
pnpm install

# Start the development server
npm run dev
# or 
pnpm dev
```

### 3. Model Requirements

Ensure the trained model exists at:
```
backend/model/brain_tumor_unet_final.h5
```

## Usage

1. **Start Backend**: The FastAPI server should be running on `http://localhost:8000`
   - API documentation: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`

2. **Start Frontend**: The Next.js app should be running on `http://localhost:3000`

3. **Upload and Process**:
   - Navigate to the Analysis page
   - Upload 4 MRI sequences: T1, T2, FLAIR, T1ce (NIfTI format)
   - Click "Process Sequences"
   - Wait for processing to complete
   - Download the resulting segmentation file

## API Endpoints

### FastAPI Backend (`localhost:8000`)

- `GET /health` - Health check
- `POST /predict` - Process MRI sequences
  - Parameters: `flair`, `t1`, `t1ce`, `t2` (multipart files)
  - Optional: `case` (string, case identifier)
  - Returns: Segmentation file path and download URL

### Next.js API Routes (`localhost:3000`)

- `POST /api/prediction` - Proxy to FastAPI backend for predictions
- `GET /api/data` - List files in public/data directory
- `GET /api/data?file={path}` - Serve individual files from public/data

## File Structure

```
MedScan/
├── backend/
│   ├── api.py              # FastAPI application
│   ├── main.py             # Core segmentation logic
│   ├── requirements.txt    # Python dependencies
│   └── model/
│       └── brain_tumor_unet_final.h5
├── app/
│   ├── analysis/
│   │   └── page.tsx        # Main analysis interface
│   └── api/
│       ├── prediction/
│       │   └── route.ts    # FastAPI proxy endpoint
│       └── data/
│           └── route.ts    # File serving API
├── components/
│   └── analysis/
│       ├── upload-panel.tsx    # File upload interface
│       └── sequence-dropzone.tsx
├── public/
│   └── data/               # Processed results storage
└── start_backend.sh        # Backend startup script
```

## Troubleshooting

### Backend Issues

1. **Model not found**: Ensure `brain_tumor_unet_final.h5` exists in `backend/model/`
2. **Dependencies**: Install all requirements with `pip install -r backend/requirements.txt`
3. **Port conflicts**: Change port in uvicorn command if 8000 is occupied

### Frontend Issues

1. **CORS errors**: Ensure FastAPI CORS is configured (already done in api.py)
2. **Connection refused**: Verify backend is running on localhost:8000
3. **File upload fails**: Check file format (must be .nii or .nii.gz)

### Common Errors

- **"Model not found"**: Copy the trained model to the correct location
- **"All 4 sequences required"**: Upload all modalities before processing
- **"Failed to load NIfTI files"**: Ensure files are valid NIfTI format
- **"Connection refused"**: Start the FastAPI backend first

## Development Notes

- The frontend expects the backend on `localhost:8000`
- Processed files are saved to `public/data/{case_id}/`
- The model expects 2-channel input (FLAIR + T1CE) by default
- Results are returned as NIfTI files with integer labels
