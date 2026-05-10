#!/bin/bash
# Crime-Connect Backend Startup Script

set -e

echo "==========================================="
echo "Crime-Connect Backend Startup"
echo "==========================================="

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "Error: Python is not installed"
    exit 1
fi

echo "1. Creating virtual environment..."
if [ ! -d "venv" ]; then
    python -m venv venv
    echo "Virtual environment created"
else
    echo "Virtual environment already exists"
fi

echo "2. Activating virtual environment..."
source venv/Scripts/activate

echo "3. Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "4. Creating uploads directory..."
mkdir -p uploads

echo "5. Checking infrastructure..."
echo "   - Neo4j: Ensure running on bolt://localhost:7687"
echo "   - Redis: Ensure running on localhost:6379"
echo "   - Ollama: Ensure running on http://localhost:11434"
echo ""
echo "   Start with: docker-compose up -d"
echo ""

echo "==========================================="
echo "Backend is ready!"
echo "==========================================="
echo ""
echo "To start the API server, run:"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "To start the Celery worker, run (in another terminal):"
echo "  celery -A app.tasks.worker worker --loglevel=info"
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo "ReDoc: http://localhost:8000/redoc"
echo ""
