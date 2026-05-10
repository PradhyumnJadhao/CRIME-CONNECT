@echo off
REM Crime-Connect Backend Startup Script for Windows

echo.
echo ===========================================
echo Crime-Connect Backend Startup (Windows)
echo ===========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

echo 1. Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

echo 2. Activating virtual environment...
call venv\Scripts\activate.bat

echo 3. Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo 4. Creating uploads directory...
if not exist "uploads" mkdir uploads

echo 5. Checking infrastructure...
echo    - Neo4j: Ensure running on bolt://localhost:7687
echo    - Redis: Ensure running on localhost:6379
echo    - Ollama: Ensure running on http://localhost:11434
echo.
echo    Start with: docker-compose up -d
echo.

echo ===========================================
echo Backend is ready!
echo ===========================================
echo.
echo To start the API server, run:
echo   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo To start the Celery worker, run (in another terminal):
echo   celery -A app.tasks.worker worker --loglevel=info
echo.
echo API Documentation: http://localhost:8000/docs
echo ReDoc: http://localhost:8000/redoc
echo.

pause
