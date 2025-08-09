#!/bin/bash

# Activate virtual environment and start backend server
cd "$(dirname "$0")"
source backend/venv/bin/activate
uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
