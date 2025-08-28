# NeuroGrade AI 🧠

<div align="center">

**Advanced AI-Powered Brain Tumor Analysis Platform**

*Transforming medical imaging data into actionable clinical insights*

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-Latest-FF6F00?logo=tensorflow)](https://tensorflow.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://typescriptlang.org/)

</div>

---

## 🎯 Overview

NeuroGrade AI is a comprehensive medical imaging platform that combines cutting-edge artificial intelligence with clinical expertise to revolutionize brain tumor analysis. The platform provides automated segmentation, multi-radiologist consensus building, similarity search, and AI-generated medical reports.

### ✨ Key Features

- 🔬 **AI-Powered Segmentation**: Automated brain tumor detection using advanced UNet models
- 👥 **Multi-Radiologist Consensus**: Collaborative assessment system with ML-driven consensus generation
- 🔍 **Similarity Search**: CLIP-based visual similarity matching for differential diagnosis
- 📊 **Interactive Visualization**: Advanced NIfTI file viewer with overlay capabilities
- 📋 **AI Report Generation**: LLM-powered comprehensive medical documentation
- 🎯 **Clinical Workflow Integration**: Streamlined interface designed for medical professionals

---

## 🏗️ Architecture

The platform follows a modern microservices architecture:

```
Frontend (Next.js) ←→ Backend (FastAPI) ←→ AI Models
     ↓                      ↓                ↓
Static Files          File Storage      Model Storage
     ↓                      ↓                ↓
Public Assets         NIfTI Files      .h5/.pkl files
```

### Data Flow:
1. **Upload**: User uploads 4 MRI sequences via frontend
2. **Processing**: Backend processes files through UNet model
3. **Segmentation**: AI generates tumor segmentation
4. **Assessment**: Multiple radiologists provide independent assessments
5. **Consensus**: ML algorithms generate consensus labels
6. **Similarity**: CLIP model finds similar historical cases
7. **Reporting**: LLM generates comprehensive medical report

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm/pnpm
- **CUDA-compatible GPU** (recommended for optimal performance)

### 1. Clone Repository

```bash
git clone https://github.com/your-username/NeuroGrade_AI.git
cd NeuroGrade_AI
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv neurograde_env
source neurograde_env/bin/activate  # On Windows: neurograde_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
```

**Quick Start Alternative:**
```bash
./start_backend.sh
```

### 3. Frontend Setup

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development server
pnpm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.2.4 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Medical Visualization**: Niivue for NIfTI file rendering
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form + Zod validation

### Backend
- **Framework**: FastAPI with Uvicorn
- **AI/ML**: TensorFlow, PyTorch, scikit-learn
- **Medical Imaging**: nibabel, OpenCV
- **Vector Search**: Pinecone
- **LLM Integration**: OpenAI API
- **Data Processing**: NumPy, Pandas

---

## 📋 Environment Configuration

Create a `.env` file in the project root:

```env
# OpenAI Configuration (Required for report generation)
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration (Optional - has defaults)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=testmed
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# Feature Flags
ENABLE_SIMILARITY_SEARCH=true
SIMILARITY_TOP_K=3
SIMILARITY_THRESHOLD=0.0
```

---

## 🎯 Usage Guide

### 1. Brain Tumor Segmentation

1. Navigate to the **Analysis** page
2. Upload 4 MRI sequences:
   - T1 weighted image
   - T2 weighted image  
   - FLAIR sequence
   - T1ce (contrast-enhanced)
3. Click **"Process Sequences"**
4. Download segmentation results and visualizations

### 2. Multi-Radiologist Assessment

1. After segmentation, access the **Assessment Panel**
2. Multiple radiologists can independently evaluate:
   - Tumor location
   - Tumor type and grade
   - Size estimation
   - Confidence levels
   - Additional comments
3. Generate **consensus labels** using ML algorithms

### 3. Similarity Search

- Automatically finds similar cases from historical database
- Uses CLIP-based visual similarity matching
- Assists with differential diagnosis

### 4. Report Generation

- AI-powered comprehensive medical reports
- Integrates segmentation, consensus, and similarity data
- Professional documentation ready for clinical use

---

## 📁 Project Structure

```
NeuroGrade_AI/
├── app/                          # Next.js app directory
│   ├── analysis/                 # Analysis page and components
│   ├── visualization/            # Medical image visualization
│   ├── dashboard/                # Results dashboard
│   └── api/                      # API routes
├── backend/                      # FastAPI backend
│   ├── api.py                    # Main API endpoints
│   ├── main.py                   # Core segmentation logic
│   ├── multifieldannotator_predictor.py  # Consensus system
│   ├── similarity_search.py     # CLIP-based similarity
│   ├── llm_report_generator.py  # AI report generation
│   ├── model/                    # AI model storage
│   └── requirements.txt         # Python dependencies
├── components/                   # React components
│   ├── analysis/                 # Upload and processing UI
│   ├── visualization/            # NIfTI viewers
│   ├── ui/                       # Base UI components
│   └── multi-radiologist/        # Assessment interfaces
├── models/                       # Pre-trained model files
├── public/                       # Static assets and data
│   ├── data/                     # Processed case files
│   └── BraTS2020_TrainingData/   # Sample datasets
├── package.json                  # Node.js dependencies
├── start_backend.sh             # Backend startup script
└── SETUP.md                     # Detailed setup guide
```

---

## 🔧 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/predict` | Process MRI sequences for segmentation |
| `POST` | `/consensus` | Generate consensus from multiple assessments |
| `POST` | `/generate-report` | Create AI-powered medical reports |
| `GET` | `/overlay/{case_id}` | Generate overlay visualizations |
| `POST` | `/preview` | Generate NIfTI file previews |

### Request Examples

**Segmentation Request:**
```bash
curl -X POST "http://localhost:8000/predict" \
  -F "flair=@path/to/flair.nii" \
  -F "t1=@path/to/t1.nii" \
  -F "t1ce=@path/to/t1ce.nii" \
  -F "t2=@path/to/t2.nii" \
  -F "case=CASE_001"
```

---

## 🔍 Model Requirements

### Required Models

1. **Main Segmentation Model**: `backend/model/brain_tumor_unet_final.h5`
   - Pre-trained UNet for brain tumor segmentation
   - Input: 2-channel (FLAIR + T1CE) or 4-channel MRI data
   - Output: Multi-class segmentation masks

2. **Consensus Models**: Located in `models/` directory
   - `tumor_grade_model.pkl`
   - `tumor_location_model.pkl`
   - `tumor_type_model.pkl`
   - `size_model.pkl`
   - `confidence_model.pkl`

### Model Training

The platform supports incremental learning and model retraining when new data becomes available. See the `MultiFieldAnnotatorPredictor` class for training loop implementation.

---

## 🚨 Troubleshooting

### Common Issues

**Backend Issues:**
- **Model not found**: Ensure all required models exist in their respective directories
- **CUDA errors**: Install appropriate CUDA drivers for GPU acceleration
- **Memory errors**: Reduce batch size or use CPU-only mode for large images

**Frontend Issues:**
- **CORS errors**: Verify FastAPI CORS configuration
- **Upload failures**: Check file formats (must be .nii or .nii.gz)
- **Visualization issues**: Ensure Niivue dependencies are properly installed

**API Issues:**
- **Authentication errors**: Verify OpenAI API key is set correctly
- **Pinecone errors**: Check Pinecone configuration and index availability
- **Timeout errors**: Increase timeout settings for large file processing

### Performance Optimization

- Use GPU acceleration for faster processing
- Implement caching for frequently accessed models
- Optimize image preprocessing pipelines
- Use appropriate batch sizes based on available memory

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install development dependencies
npm install --include=dev
pip install -r backend/requirements-dev.txt

# Run tests
npm test
pytest backend/tests/

# Code formatting
npm run lint
black backend/
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **BraTS Challenge** for providing standardized brain tumor datasets
- **OpenAI** for LLM capabilities
- **Pinecone** for vector similarity search
- **Niivue** for medical image visualization
- **The medical imaging community** for continued innovation

---

## 📞 Support

For support and questions:

- 📧 Email: support@neurograde-ai.com
- 💬 Discord: [Join our community](https://discord.gg/neurograde-ai)
- 📖 Documentation: [Full docs](https://docs.neurograde-ai.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/NeuroGrade_AI/issues)

---

<div align="center">

**Made with ❤️ for the medical imaging community**

*Advancing healthcare through AI innovation*

</div>
