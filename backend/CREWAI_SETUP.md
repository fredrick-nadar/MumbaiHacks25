# CrewAI Multi-Agent Financial Prediction System

## Overview
This system uses **CrewAI** (Python) for intelligent multi-agent financial predictions while keeping Node.js as the main backend. It's optimized for hackathons with minimal code and maximum impact.

## Architecture

```
User Request → Node.js Backend → CrewAI Python Agents → ML Predictions → Node.js → Frontend
```

### Agents
1. **Data Analyst Agent**: Analyzes transaction patterns, trends, and anomalies
2. **ML Engineer Agent**: Trains prediction models using scikit-learn
3. **Financial Advisor Agent**: Generates actionable insights and recommendations

## Setup

### 1. Install Python Dependencies
```bash
cd backend/crewai-agents
pip install -r requirements.txt
```

### 2. Test CrewAI
```bash
# Test the agents directly
python agents.py < test_transactions.json
```

### 3. Start Backend
```bash
cd backend
npm start
```

## How It Works

### 1. Transaction Analysis
- Groups transactions by month and category
- Calculates averages, trends, and volatility
- Identifies recurring vs one-time expenses

### 2. ML Prediction
- Uses Linear Regression for trend analysis
- Applies trend multipliers (increasing/decreasing/stable)
- Adjusts confidence based on data volatility

### 3. Insight Generation
- Analyzes savings rate
- Identifies spending risks
- Provides actionable recommendations

## API Usage

### Generate Predictions
```javascript
POST /api/predictions/generate
{
  "months_back": 4
}
```

Response:
```json
{
  "status": "success",
  "message": "Predictions generated successfully using CrewAI",
  "data": {
    "analysis": {
      "period_analyzed": "Last 4 months",
      "patterns_detected": [...],
      "confidence_level": "medium"
    },
    "next_month_prediction": {
      "categories": [...],
      "total_predicted_income": 136400,
      "total_predicted_expenses": 99000,
      "predicted_savings": 37400
    },
    "quarter_outlook": {...},
    "category_insights": [...]
  }
}
```

## Advantages for Hackathons

✅ **Minimal Code**: ~300 lines for complete AI system
✅ **Multi-Agent**: Professional agentic architecture
✅ **Autonomous**: Self-organizing agents with delegation
✅ **Easy Integration**: Simple Python ↔ Node.js bridge
✅ **Fallback Support**: Auto-falls back to Gemini if Python fails
✅ **Chart-Ready**: Output optimized for Chart.js/Recharts

## Fallback Strategy

If CrewAI fails (Python not installed, packages missing), the system automatically falls back to the Gemini AI implementation. This ensures reliability in all environments.

## Features

- **Pattern Detection**: Identifies recurring income/expenses
- **Trend Analysis**: Increasing/decreasing/stable trends
- **Volatility Assessment**: High/medium/low confidence
- **ML-Powered**: Uses scikit-learn for predictions
- **Actionable Insights**: Budget recommendations
- **Multi-Month Forecast**: Next month + quarterly outlook

## Chart Integration

The output is designed for smooth line charts:

```javascript
// Frontend: Convert predictions to Chart.js format
const chartData = {
  labels: predictions.categories.map(c => c.category),
  datasets: [{
    label: 'Predicted Income',
    data: predictions.categories.map(c => c.predicted_inflow),
    borderColor: 'rgb(34, 197, 94)',
    tension: 0.4
  }]
}
```

## Environment Variables

No additional environment variables needed for CrewAI!
Just ensure Python 3.8+ is installed.

## Troubleshooting

### Python not found
```bash
# Windows
where python

# Mac/Linux
which python3
```

### Install packages
```bash
pip install crewai pandas numpy scikit-learn
```

### Test manually
```bash
cd backend
node -e "const crew = require('./src/services/ai/crewaiService'); crew.checkPythonEnvironment().then(console.log)"
```

## Demo Mode

If Python is not available, the system automatically uses Gemini as a fallback, ensuring the demo always works!
