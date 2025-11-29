'use client'

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Mic, TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { VoiceSentimentInput } from "../../components/VoiceSentimentInput"
import { useTransactionsList } from "../../hooks/useDashboardApi"
import { cn } from "../../lib/utils"

const MotionDiv = motion.div

const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
  } else {
    return date.toLocaleDateString('en-IN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

const normalizeCategory = (category = '') => {
  return category
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export default function DashboardVoiceInput() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data: transactionsData, loading, refetch } = useTransactionsList({ 
    limit: 10,
    _refreshKey: refreshKey 
  })

  const handleTransactionAdded = async (newTransaction) => {
    console.log('🔄 Transaction added, refreshing list...', newTransaction)
    
    // Increment the refresh key to trigger a refetch
    setRefreshKey(prev => prev + 1)
    
    // Also explicitly refetch
    if (refetch) {
      await refetch()
    }
    
    console.log('✅ Refresh triggered')
  }

  const transactions = transactionsData?.transactions || []
  const stats = {
    totalInflows: transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalOutflows: transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    transactionCount: transactions.length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-semibold text-slate-900 dark:text-white">
                  <Mic className="h-7 w-7 text-sky-500" />
                  Voice Transaction Input
                </CardTitle>
                <CardDescription className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Use voice to add transactions with automatic sentiment analysis for inflow/outflow detection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </MotionDiv>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Voice Input Card */}
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Speak Your Transaction
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Our AI analyzes the sentiment to determine if it's income or expense
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceSentimentInput onTransactionAdded={handleTransactionAdded} />
              
              {/* How it works */}
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-300">
                <p className="mb-2 font-semibold text-slate-900 dark:text-white">How it works:</p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Sentiment Analysis:</strong> AI detects positive words (received, earned) for inflows and negative words (spent, paid) for outflows</li>
                  <li><strong>Smart Categorization:</strong> Automatically categorizes by keywords (food, transport, salary, etc.)</li>
                  <li><strong>Amount Extraction:</strong> Recognizes numbers and currency amounts from speech</li>
                  <li><strong>Instant Recording:</strong> Transaction added to your account immediately</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        {/* Quick Stats */}
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                  Recent Activity
                </CardTitle>
                <button
                  onClick={() => {
                    setRefreshKey(prev => prev + 1)
                    if (refetch) refetch()
                  }}
                  className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">Inflows</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(stats.totalInflows)}
                  </p>
                </div>
                
                <div className="rounded-2xl border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-800/60 dark:bg-rose-950/30">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-semibold">Outflows</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-rose-700 dark:text-rose-300">
                    {formatCurrency(stats.totalOutflows)}
                  </p>
                </div>
                
                <div className="rounded-2xl border border-sky-200/60 bg-sky-50/50 p-3 dark:border-sky-800/60 dark:bg-sky-950/30">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-semibold">Count</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-sky-700 dark:text-sky-300">
                    {stats.transactionCount}
                  </p>
                </div>
              </div>

              {/* Net Balance */}
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-800/50">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Net Balance</p>
                <p className={cn(
                  "mt-1 text-2xl font-semibold",
                  stats.totalInflows - stats.totalOutflows >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}>
                  {formatCurrency(stats.totalInflows - stats.totalOutflows)}
                </p>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>

      {/* Recent Transactions */}
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Transactions
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
              Last 10 transactions added via voice or manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mic className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                  No transactions yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Use the voice input above to add your first transaction
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => (
                  <MotionDiv
                    key={transaction._id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border p-4 transition-all hover:shadow-md",
                      transaction.type === 'credit'
                        ? "border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                        : "border-rose-200/60 bg-rose-50/50 dark:border-rose-800/40 dark:bg-rose-950/20"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {transaction.type === 'credit' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {normalizeCategory(transaction.category)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                        {transaction.description || 'No description'}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-semibold",
                        transaction.type === 'credit'
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  )
}
