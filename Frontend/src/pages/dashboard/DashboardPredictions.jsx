import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  Calendar, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Loader2, 
  AlertCircle,
  Lightbulb
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import api from '../../services/api'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
)

const DashboardPredictions = () => {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPredictions()
  }, [])

  const loadPredictions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is authenticated
      const token = localStorage.getItem('taxwise_token')
      if (!token) {
        setError('Please log in to view predictions')
        setLoading(false)
        return
      }
      
      const response = await api.get('/predictions/latest')
      console.log('Prediction response:', response)
      
      // Check if we got data
      if (response.data) {
        setPrediction(response.data)
        
        // Load comparison data only if we have predictions
        try {
          const comparisonResponse = await api.get('/predictions/comparison/overview?months=3')
          console.log('Comparison response:', comparisonResponse)
          setComparison(comparisonResponse.data)
        } catch (compErr) {
          console.log('Comparison not available yet')
        }
      } else {
        // No predictions exist yet
        setError('no_predictions')
      }
    } catch (err) {
      console.log('Load predictions error:', err.message)
      setError(err.message || 'Failed to load predictions')
    } finally {
      setLoading(false)
    }
  }

  const generatePredictions = async () => {
    try {
      setGenerating(true)
      setError(null)
      console.log('Generating predictions...')
      await api.post('/predictions/generate', { months_back: 4 })
      await loadPredictions()
      console.log('Predictions generated successfully')
    } catch (err) {
      console.error('Failed to generate predictions:', err)
      setError(err.response?.data?.message || err.message || 'Failed to generate predictions')
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />
    if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />
    return <div className="h-4 w-4" />
  }

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 0.8) return <Badge variant="success">High</Badge>
    if (confidence >= 0.6) return <Badge variant="warning">Medium</Badge>
    return <Badge variant="destructive">Low</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error === 'no_predictions' || error?.includes('Need at least 10 transactions')) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Financial Predictions
            </CardTitle>
            <CardDescription>
              Generate intelligent predictions based on your spending patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Transaction Data Available</h3>
              <p className="text-muted-foreground mb-6">
                You need at least 10 transactions from the last 3-4 months to generate AI-powered predictions.
                <br />
                Please upload your historical transaction data first.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/dashboard/data'}
                  variant="primary"
                >
                  Upload Transaction Data
                </Button>
                <Button 
                  onClick={generatePredictions} 
                  disabled={generating}
                  variant="outline"
                >
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Try Generate Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
        <Button onClick={loadPredictions} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  // Prepare chart data for predicted vs actual
  const chartData = comparison?.comparisons?.map(comp => ({
    month: comp.month,
    predictedIncome: comp.comparison?.income?.predicted || 0,
    actualIncome: comp.comparison?.income?.actual || 0,
    predictedExpenses: comp.comparison?.expenses?.predicted || 0,
    actualExpenses: comp.comparison?.expenses?.actual || 0,
    status: comp.status
  })) || []

  // Category breakdown chart data
  const categoryData = prediction?.next_month_prediction?.categories
    ?.sort((a, b) => b.predicted_outflow - a.predicted_outflow)
    ?.slice(0, 8)
    ?.map(cat => ({
      category: cat.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      outflow: cat.predicted_outflow,
      inflow: cat.predicted_inflow,
      trend: cat.trend
    })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Financial Predictions
          </h2>
          <p className="text-muted-foreground mt-1">
            AI-powered insights based on {prediction?.metadata?.months_analyzed || 0} months of data
          </p>
        </div>
        <Button 
          onClick={() => {
            console.log('Regenerate button clicked, generating:', generating)
            generatePredictions()
          }} 
          disabled={generating}
        >
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Regenerate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(prediction?.next_month_prediction?.total_predicted_income)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next month forecast
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predicted Expenses</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(prediction?.next_month_prediction?.total_predicted_expenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Savings</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(prediction?.next_month_prediction?.predicted_savings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Savings rate: {((prediction?.next_month_prediction?.predicted_savings_rate || 0) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Level</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {prediction?.analysis?.confidence_level || 'Medium'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {prediction?.metadata?.total_transactions || 0} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-4">
          {/* Inflow vs Outflow Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses Forecast</CardTitle>
              <CardDescription>
                Predicted cash flow for {prediction?.prediction_for_month}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: '400px' }}>
                <Line
                  data={{
                    labels: prediction?.next_month_prediction?.categories?.map(cat => 
                      cat.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ) || [],
                    datasets: [
                      {
                        label: 'Predicted Income',
                        data: prediction?.next_month_prediction?.categories?.map(cat => cat.predicted_inflow) || [],
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                      },
                      {
                        label: 'Predicted Expenses',
                        data: prediction?.next_month_prediction?.categories?.map(cat => cat.predicted_outflow) || [],
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          font: { size: 14 },
                          padding: 20
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(value)
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prediction?.next_month_prediction?.categories
                  ?.sort((a, b) => b.predicted_outflow - a.predicted_outflow)
                  ?.map((cat, idx) => (
                    <div key={`${cat.category}-${idx}`} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">
                            {cat.category.replace(/_/g, ' ')}
                          </p>
                          {getTrendIcon(cat.trend)}
                          {getConfidenceBadge(cat.confidence)}
                        </div>
                        <p className="text-sm text-muted-foreground">{cat.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(cat.predicted_outflow)}
                        </p>
                        {cat.predicted_inflow > 0 && (
                          <p className="text-sm text-green-600">
                            +{formatCurrency(cat.predicted_inflow)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Patterns Detected */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Patterns Detected
              </CardTitle>
              <CardDescription>AI-identified spending patterns from your transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {prediction?.analysis?.patterns_detected?.map((pattern, idx) => (
                  <li key={`pattern-${idx}-${pattern.substring(0, 20)}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm">{pattern}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quarter Outlook */}
          <Card>
            <CardHeader>
              <CardTitle>Quarterly Outlook</CardTitle>
              <CardDescription>Next 3 months forecast</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Monthly Income</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(prediction?.quarter_outlook?.monthly_averages?.income)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Monthly Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(prediction?.quarter_outlook?.monthly_averages?.expenses)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Monthly Savings</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(prediction?.quarter_outlook?.monthly_averages?.savings)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Key Insights</h4>
                <ul className="space-y-2">
                  {prediction?.quarter_outlook?.key_insights?.map((insight, idx) => (
                    <li key={`q-insight-${idx}-${insight.substring(0, 20)}`} className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {prediction?.quarter_outlook?.recommendations?.map((rec, idx) => (
                    <li key={`q-rec-${idx}-${rec.substring(0, 20)}`} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Category Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prediction?.category_insights?.map((insight, idx) => (
                  <div key={`cat-insight-${insight.category}-${idx}`} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium capitalize">
                        {insight.category.replace(/_/g, ' ')}
                      </h5>
                      <div className="flex gap-2">
                        <Badge variant="outline">{insight.volatility}</Badge>
                        <Badge variant="outline">{insight.trend}</Badge>
                        {insight.is_recurring && <Badge>Recurring</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.pattern_description}</p>
                    <p className="text-sm font-medium mt-1">
                      Historical Avg: {formatCurrency(insight.historical_average)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DashboardPredictions
