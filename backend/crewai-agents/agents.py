from crewai import Agent, Task, Crew, Process
from crewai_tools import tool
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
import json
import sys

class FinancialPredictionAgents:
    """Multi-agent system for financial predictions using CrewAI"""
    
    def __init__(self):
        self.transactions_data = None
        
    @tool("Analyze Transaction Patterns")
    def analyze_patterns(self, transactions_json: str) -> dict:
        """Analyzes historical transaction patterns and trends"""
        transactions = json.loads(transactions_json)
        df = pd.DataFrame(transactions)
        
        # Convert date strings to datetime
        df['date'] = pd.to_datetime(df['date'])
        df['month'] = df['date'].dt.to_period('M')
        
        # Separate inflows and outflows
        df['inflow'] = df.apply(lambda x: x['amount'] if x['type'] == 'credit' else 0, axis=1)
        df['outflow'] = df.apply(lambda x: x['amount'] if x['type'] == 'debit' else 0, axis=1)
        
        # Group by month and category
        monthly_summary = df.groupby(['month', 'description']).agg({
            'inflow': 'sum',
            'outflow': 'sum',
            'amount': 'count'
        }).reset_index()
        
        # Detect patterns
        patterns = []
        category_stats = {}
        
        for category in df['description'].unique():
            cat_data = df[df['description'] == category]
            monthly_cat = cat_data.groupby('month').agg({
                'inflow': 'sum',
                'outflow': 'sum',
                'amount': 'count'
            })
            
            avg_inflow = monthly_cat['inflow'].mean()
            avg_outflow = monthly_cat['outflow'].mean()
            std_outflow = monthly_cat['outflow'].std()
            
            # Determine if recurring
            is_recurring = monthly_cat['amount'].count() >= len(monthly_cat) * 0.8
            
            # Determine trend
            if len(monthly_cat) > 1:
                values = monthly_cat['outflow'].values if avg_outflow > 0 else monthly_cat['inflow'].values
                x = np.arange(len(values)).reshape(-1, 1)
                y = values.reshape(-1, 1)
                
                if len(x) > 1:
                    model = LinearRegression()
                    model.fit(x, y)
                    slope = model.coef_[0][0]
                    
                    if slope > avg_outflow * 0.1:
                        trend = "increasing"
                    elif slope < -avg_outflow * 0.1:
                        trend = "decreasing"
                    else:
                        trend = "stable"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Volatility
            volatility = "low" if std_outflow < avg_outflow * 0.3 else ("medium" if std_outflow < avg_outflow * 0.6 else "high")
            
            category_stats[category] = {
                'avg_inflow': float(avg_inflow),
                'avg_outflow': float(avg_outflow),
                'volatility': volatility,
                'trend': trend,
                'is_recurring': bool(is_recurring),
                'transaction_count': int(monthly_cat['amount'].sum())
            }
            
            # Generate pattern description
            if is_recurring and avg_inflow > 0:
                patterns.append(f"{category.capitalize()} is a recurring income source.")
            elif is_recurring and avg_outflow > 0:
                patterns.append(f"{category.capitalize()} is a recurring expense.")
            
            if trend == "increasing" and avg_outflow > avg_inflow:
                patterns.append(f"{category.capitalize()} expenses are increasing over time.")
        
        total_months = len(df['month'].unique())
        
        return {
            'period_analyzed': f"Last {total_months} months",
            'total_months': total_months,
            'patterns_detected': patterns[:10],  # Top 10 patterns
            'category_stats': category_stats,
            'total_transactions': len(df)
        }
    
    @tool("Train Prediction Model")
    def train_model(self, analysis_result: str) -> dict:
        """Trains ML models for each category to predict future values"""
        analysis = json.loads(analysis_result)
        category_stats = analysis['category_stats']
        
        predictions = []
        
        for category, stats in category_stats.items():
            # Simple prediction based on trend and average
            avg_inflow = stats['avg_inflow']
            avg_outflow = stats['avg_outflow']
            trend = stats['trend']
            volatility = stats['volatility']
            
            # Adjust prediction based on trend
            trend_multiplier = 1.1 if trend == "increasing" else (0.9 if trend == "decreasing" else 1.0)
            
            # Adjust confidence based on volatility
            confidence = 0.9 if volatility == "low" else (0.7 if volatility == "medium" else 0.5)
            
            predicted_inflow = avg_inflow * trend_multiplier
            predicted_outflow = avg_outflow * trend_multiplier
            
            predictions.append({
                'category': category.lower().replace(' ', '_'),
                'predicted_inflow': round(predicted_inflow, 2),
                'predicted_outflow': round(predicted_outflow, 2),
                'predicted_net': round(predicted_inflow - predicted_outflow, 2),
                'confidence': confidence,
                'trend': trend,
                'reasoning': f"Based on {stats['transaction_count']} transactions with {volatility} volatility and {trend} trend."
            })
        
        # Calculate totals
        total_income = sum(p['predicted_inflow'] for p in predictions)
        total_expenses = sum(p['predicted_outflow'] for p in predictions)
        savings = total_income - total_expenses
        savings_rate = savings / total_income if total_income > 0 else 0
        
        return {
            'categories': predictions,
            'total_predicted_income': round(total_income, 2),
            'total_predicted_expenses': round(total_expenses, 2),
            'predicted_savings': round(savings, 2),
            'predicted_savings_rate': round(savings_rate, 4)
        }
    
    @tool("Generate Insights")
    def generate_insights(self, analysis_result: str, predictions: str) -> dict:
        """Generates actionable insights and recommendations"""
        analysis = json.loads(analysis_result)
        pred = json.loads(predictions)
        
        insights = []
        recommendations = []
        
        # Analyze savings rate
        savings_rate = pred['predicted_savings_rate']
        if savings_rate < 0:
            insights.append("Predicted expenses exceed income - urgent budget review needed.")
            recommendations.append("Review and cut non-essential expenses immediately.")
        elif savings_rate < 0.1:
            insights.append("Low savings rate predicted - need to increase savings.")
            recommendations.append("Aim to save at least 20% of your income.")
        elif savings_rate > 0.3:
            insights.append("Strong savings rate predicted - good financial health.")
            recommendations.append("Consider increasing investments or building emergency fund.")
        
        # Analyze trends
        increasing_expenses = [c for c in pred['categories'] if c['trend'] == 'increasing' and c['predicted_outflow'] > 0]
        if increasing_expenses:
            top_increasing = sorted(increasing_expenses, key=lambda x: x['predicted_outflow'], reverse=True)[:3]
            for exp in top_increasing:
                recommendations.append(f"Monitor {exp['category'].replace('_', ' ')} expenses - showing increasing trend.")
        
        # Quarter outlook
        quarter_outlook = {
            'monthly_averages': {
                'income': round(pred['total_predicted_income'], 2),
                'expenses': round(pred['total_predicted_expenses'], 2),
                'savings': round(pred['predicted_savings'], 2)
            },
            'key_insights': insights[:5],
            'recommendations': recommendations[:5]
        }
        
        # Category insights
        category_insights = []
        for cat_name, stats in analysis['category_stats'].items():
            category_insights.append({
                'category': cat_name.lower().replace(' ', '_'),
                'historical_average': round(stats['avg_outflow'] if stats['avg_outflow'] > 0 else stats['avg_inflow'], 2),
                'volatility': stats['volatility'],
                'trend': stats['trend'],
                'is_recurring': stats['is_recurring'],
                'pattern_description': f"{stats['volatility'].capitalize()} volatility, {stats['trend']} trend."
            })
        
        return {
            'quarter_outlook': quarter_outlook,
            'category_insights': category_insights
        }
    
    def create_agents(self):
        """Create the multi-agent crew"""
        
        # Agent 1: Data Analyst - Analyzes transaction patterns
        data_analyst = Agent(
            role='Financial Data Analyst',
            goal='Analyze historical transaction data to identify spending patterns, trends, and anomalies',
            backstory="""You are an expert financial data analyst with years of experience 
            in analyzing spending patterns. You excel at finding hidden trends and seasonal 
            variations in financial data.""",
            verbose=True,
            allow_delegation=False
        )
        
        # Agent 2: ML Engineer - Trains prediction models
        ml_engineer = Agent(
            role='Machine Learning Engineer',
            goal='Train predictive models to forecast future spending based on historical patterns',
            backstory="""You are a skilled ML engineer specializing in time series forecasting 
            and financial predictions. You build accurate models that help people plan their finances.""",
            verbose=True,
            allow_delegation=False
        )
        
        # Agent 3: Financial Advisor - Generates insights
        financial_advisor = Agent(
            role='Financial Advisor',
            goal='Generate actionable insights and recommendations based on predictions',
            backstory="""You are a certified financial advisor who helps people make better 
            financial decisions. You provide clear, actionable advice based on data.""",
            verbose=True,
            allow_delegation=False
        )
        
        return [data_analyst, ml_engineer, financial_advisor]
    
    def create_tasks(self, agents, transactions_json):
        """Create tasks for the agents"""
        data_analyst, ml_engineer, financial_advisor = agents
        
        # Task 1: Analyze patterns
        analyze_task = Task(
            description=f"""Analyze the following transaction data and identify:
            1. Spending patterns and trends
            2. Recurring transactions
            3. Seasonal variations
            4. Category-wise statistics
            
            Transaction data: {transactions_json[:1000]}... (truncated)
            
            Use the analyze_patterns tool to process this data.""",
            agent=data_analyst,
            expected_output="A detailed analysis of transaction patterns with category statistics"
        )
        
        # Task 2: Train model and predict
        predict_task = Task(
            description="""Based on the analysis results, train prediction models for each 
            spending category and generate forecasts for the next month. Consider trends, 
            volatility, and historical averages. Use the train_model tool.""",
            agent=ml_engineer,
            expected_output="Predictions for each category with confidence scores",
            context=[analyze_task]
        )
        
        # Task 3: Generate insights
        insights_task = Task(
            description="""Generate actionable financial insights and recommendations based 
            on the predictions. Focus on:
            1. Savings opportunities
            2. Spending warnings
            3. Budget recommendations
            4. Category-specific advice
            
            Use the generate_insights tool.""",
            agent=financial_advisor,
            expected_output="Comprehensive insights and recommendations",
            context=[analyze_task, predict_task]
        )
        
        return [analyze_task, predict_task, insights_task]
    
    def run_prediction(self, transactions):
        """Run the complete prediction pipeline"""
        try:
            # Convert transactions to JSON
            transactions_json = json.dumps(transactions)
            
            # Create agents
            agents = self.create_agents()
            
            # Create tasks
            tasks = self.create_tasks(agents, transactions_json)
            
            # Create crew
            crew = Crew(
                agents=agents,
                tasks=tasks,
                process=Process.sequential,
                verbose=True
            )
            
            # Execute
            result = crew.kickoff()
            
            # Manually process since we're using custom tools
            # Step 1: Analyze
            analysis = self.analyze_patterns(transactions_json)
            
            # Step 2: Train and predict
            predictions = self.train_model(json.dumps(analysis))
            
            # Step 3: Generate insights
            insights = self.generate_insights(json.dumps(analysis), json.dumps(predictions))
            
            # Combine all results
            final_result = {
                'analysis': {
                    'period_analyzed': analysis['period_analyzed'],
                    'total_months': analysis['total_months'],
                    'patterns_detected': analysis['patterns_detected'],
                    'confidence_level': 'medium'
                },
                'next_month_prediction': predictions,
                'quarter_outlook': insights['quarter_outlook'],
                'category_insights': insights['category_insights'],
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'data_period': analysis['period_analyzed'],
                    'months_analyzed': analysis['total_months'],
                    'total_transactions': analysis['total_transactions']
                }
            }
            
            return final_result
            
        except Exception as e:
            return {'error': str(e)}

def main():
    """Main entry point for Node.js integration"""
    try:
        # Read transactions from stdin
        transactions_json = sys.stdin.read()
        transactions = json.loads(transactions_json)
        
        # Create agent system
        agent_system = FinancialPredictionAgents()
        
        # Run prediction
        result = agent_system.run_prediction(transactions)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'type': type(e).__name__
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
