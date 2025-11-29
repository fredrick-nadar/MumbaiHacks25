@echo off
echo ========================================
echo CrewAI Financial Prediction Setup
echo ========================================
echo.

echo [1/3] Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

echo.
echo [2/3] Installing CrewAI dependencies...
cd crewai-agents
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/3] Testing CrewAI environment...
python -c "import crewai, pandas, sklearn; print('✅ All packages installed successfully!')"
if %errorlevel% neq 0 (
    echo ERROR: Package import failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ CrewAI Setup Complete!
echo ========================================
echo.
echo You can now use the multi-agent prediction system.
echo Start your backend with: npm start
echo.
pause
