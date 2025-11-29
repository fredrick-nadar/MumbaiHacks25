#!/bin/bash

echo "========================================"
echo "CrewAI Financial Prediction Setup"
echo "========================================"
echo ""

echo "[1/3] Checking Python installation..."
python3 --version || python --version
if [ $? -ne 0 ]; then
    echo "ERROR: Python not found!"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo ""
echo "[2/3] Installing CrewAI dependencies..."
cd crewai-agents
pip3 install -r requirements.txt || pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[3/3] Testing CrewAI environment..."
python3 -c "import crewai, pandas, sklearn; print('✅ All packages installed successfully!')" || \
python -c "import crewai, pandas, sklearn; print('✅ All packages installed successfully!')"
if [ $? -ne 0 ]; then
    echo "ERROR: Package import failed"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ CrewAI Setup Complete!"
echo "========================================"
echo ""
echo "You can now use the multi-agent prediction system."
echo "Start your backend with: npm start"
echo ""
