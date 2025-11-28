import React, { useState } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Scan, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

const DigiLockerAuthPage = () => {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    gender: '',
    address: '',
    pincode: '',
    aadhaarNumber: '',
    nameLoginKey: '',
    passwordHint: '',
    sessionId: ''
  })
  const [showForm, setShowForm] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [loginCredentials, setLoginCredentials] = useState(null)

  // Convert date format from DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD for input[type="date"]
  const convertDateFormat = (dateStr) => {
    if (!dateStr) return ''
    // Handle DD/MM/YYYY or DD-MM-YYYY format
    const parts = dateStr.split(/[\/\-]/)
    if (parts.length === 3) {
      // parts[0] = DD, parts[1] = MM, parts[2] = YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
  }

  const handleDigiLockerScan = async () => {
    setIsScanning(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/kyc/digilocker-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (result.status === 'success' && result.data) {
        // Auto-fill form with scanned data
        const { extractedInfo, sessionId } = result.data
        console.log('📋 Received extracted info:', extractedInfo)
        setFormData({
          name: extractedInfo.name || '',
          dob: convertDateFormat(extractedInfo.dob) || '',
          gender: extractedInfo.gender || '',
          address: extractedInfo.address || '',
          pincode: extractedInfo.pincode || '',
          aadhaarNumber: extractedInfo.aadhaarNumber || '',
          nameLoginKey: extractedInfo.nameLoginKey || '',
          passwordHint: extractedInfo.passwordHint || '',
          sessionId: sessionId
        })
        setShowForm(true)
      } else {
        setError(result.message || 'Failed to extract data')
      }
    } catch (error) {
      console.error('Error connecting to backend:', error)
      setError('Network error. Please check if the backend server is running.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.sessionId) {
      setError('Please fill in required fields')
      return
    }

    setIsRegistering(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/kyc/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: formData.sessionId,
          acceptTerms: true
        }),
      })

      const result = await response.json()

      if (result.status === 'success') {
        setLoginCredentials(result.data.credentials)
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/aadhaar-auth?mode=login&next=%2Fdashboard')
        }, 3000)
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  // Show success screen with login credentials
  if (loginCredentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="space-y-2 pb-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Registration Successful!
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
              Your account has been created. Save your login credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-3">Your Login Credentials:</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Name:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{loginCredentials.nameLoginKey}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Password:</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{loginCredentials.password}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              Redirecting to login... Please use these credentials to sign in.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show registration form after scan
  if (showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="space-y-1 pb-4 text-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
            <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Review Your Information
            </CardTitle>
            <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
              Please review and complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-400 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    type="date"
                    id="dob"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Enter your complete address"
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="6-digit pincode"
                    maxLength="6"
                  />
                </div>
                <div>
                  <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                  <Input
                    id="aadhaarNumber"
                    name="aadhaarNumber"
                    value={formData.aadhaarNumber}
                    onChange={handleInputChange}
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength="12"
                  />
                </div>
              </div>

              {formData.nameLoginKey && (
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                  <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1.5">
                    🔑 Your Login Credentials (Preview)
                  </h4>
                  <div className="space-y-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <div className="flex justify-between">
                      <span>Login Name:</span>
                      <span className="font-semibold">{formData.nameLoginKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Password Format:</span>
                      <span className="font-semibold">{formData.passwordHint}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show DigiLocker scan button (initial screen)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-2xl rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-2 pb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20 mb-4">
            <Scan className="h-8 w-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Register with DigiLocker
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

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              onClick={handleDigiLockerScan}
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
    </div>
  )
}

export default DigiLockerAuthPage
