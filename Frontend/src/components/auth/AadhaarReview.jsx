import React, { useState } from "react"
import { CheckCircle2, AlertCircle, User, Calendar, MapPin, Key, Copy, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

const AadhaarReview = ({ verificationData, onComplete }) => {
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const { sessionId, userExists, extractedInfo } = verificationData

  // Handle completion
  const handleComplete = async () => {
    if (!acceptTerms && !userExists) {
      setError("Please accept the terms and conditions to continue")
      return
    }

    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/kyc/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          acceptTerms: !userExists ? acceptTerms : true
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        onComplete(data.data)
      } else {
        setError(data.message || 'Failed to complete KYC process')
      }
    } catch (error) {
      console.error('Failed to complete KYC process', error)
      setError('Network error. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  // Copy login credentials
  const copyCredentials = () => {
    const credentials = `Name: ${extractedInfo.nameLoginKey}\\nPassword: ${extractedInfo.passwordHint}`
    navigator.clipboard.writeText(credentials).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  return (
    <Card className="w-full max-w-2xl rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {userExists ? "Welcome back!" : "Almost there!"}
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          {userExists 
            ? "Your account has been verified. You can now login with your credentials."
            : "Review your information and complete your TaxWise registration"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Extracted Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Verified Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                {extractedInfo.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="h-4 w-4" />
                Date of Birth
              </Label>
              <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                {extractedInfo.dob}
              </div>
            </div>
            {extractedInfo.gender && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gender
                </Label>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                  {extractedInfo.gender}
                </div>
              </div>
            )}
            {extractedInfo.address && (
              <div className="space-y-2 sm:col-span-2">
                <Label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 text-sm font-medium text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                  {extractedInfo.address}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Login Credentials */}
        <div className="space-y-4 rounded-3xl border border-sky-200/50 bg-gradient-to-br from-sky-50/50 via-cyan-50/30 to-emerald-50/50 p-6 dark:border-sky-800/50 dark:bg-gradient-to-br dark:from-sky-950/30 dark:via-cyan-950/20 dark:to-emerald-950/30">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Key className="h-5 w-5 text-sky-500" />
              Your Login Credentials
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={copyCredentials}
              className="text-xs"
            >
              {copySuccess ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-sky-700 dark:text-sky-300">
                Login Name
              </Label>
              <div className="rounded-2xl border border-sky-300/60 bg-white/80 p-3 text-center font-mono text-lg font-bold text-sky-700 dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-300">
                {extractedInfo.nameLoginKey}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-sky-700 dark:text-sky-300">
                Password (Generated)
              </Label>
              <div className="rounded-2xl border border-sky-300/60 bg-white/80 p-3 text-center font-mono text-lg font-bold text-sky-700 dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-300">
                {extractedInfo.passwordHint}
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              📝 Important: Save these credentials
            </p>
            <ul className="space-y-1 text-xs text-amber-600 dark:text-amber-400">
              <li>• Your password is generated from your Aadhaar name and date of birth</li>
              <li>• You can reset your password anytime using Aadhaar re-verification</li>
              <li>• Keep your credentials secure and don't share them</li>
            </ul>
          </div>
        </div>

        {/* Terms and Conditions (for new users only) */}
        {!userExists && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-slate-300/70 bg-white text-sky-500 focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 dark:border-slate-600/70 dark:bg-slate-900 dark:text-sky-400 dark:focus:ring-sky-500/80"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{" "}
                <a href="#" className="font-semibold text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300">
                  Terms of Service
                </a>
                {" "}and{" "}
                <a href="#" className="font-semibold text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300">
                  Privacy Policy
                </a>
                . I understand that my Aadhaar data is processed securely and only a hashed reference is stored.
              </label>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Complete Button */}
        <Button
          size="lg"
          className="w-full justify-center"
          onClick={handleComplete}
          disabled={isCompleting || (!acceptTerms && !userExists)}
        >
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {userExists ? "Verifying..." : "Creating Account..."}
            </>
          ) : userExists ? (
            "Continue to Login"
          ) : (
            "Complete Registration"
          )}
        </Button>

        {userExists && (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            You will be redirected to the login page
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default AadhaarReview
