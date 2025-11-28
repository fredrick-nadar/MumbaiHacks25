import React, { useState } from "react"
import { Scan, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

const DigiLockerScan = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleStartScan = async () => {
    setIsScanning(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('http://localhost:3001/api/kyc/digilocker-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(true)
        console.log('✅ DigiLocker scan successful:', data)
        
        // Auto-fill the form with extracted data
        if (onScanComplete) {
          onScanComplete(data.data)
        }
      } else {
        setError(data.message || 'DigiLocker scan failed')
      }
    } catch (error) {
      console.error('DigiLocker scan error:', error)
      setError('Network error. Please check if the backend server is running.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20 mb-4">
          <Scan className="h-8 w-8 text-emerald-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          DigiLocker QR Scanner
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          Scan your Aadhaar QR code using the official DigiLocker scanner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 text-sm text-emerald-600 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            DigiLocker scan completed! Your registration form is now auto-filled.
          </div>
        )}

        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            onClick={handleStartScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Opening DigiLocker Scanner...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-5 w-5" />
                Start DigiLocker Scan
              </>
            )}
          </Button>

          <div className="space-y-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
            <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              How it works:
            </h4>
            <ol className="space-y-2 text-xs text-emerald-600 dark:text-emerald-400">
              <li>1. Click "Start DigiLocker Scan" button above</li>
              <li>2. A small DigiLocker window will open</li>
              <li>3. Scan your Aadhaar QR code using your phone or physical card</li>
              <li>4. Wait for data extraction (5-10 seconds)</li>
              <li>5. Form will auto-fill with your details for review</li>
            </ol>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-700/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Secure & Official
            </div>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <li>• Uses official DigiLocker verification service</li>
              <li>• Your data is processed securely</li>
              <li>• Automated form filling saves time</li>
              <li>• No manual data entry required</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DigiLockerScan
