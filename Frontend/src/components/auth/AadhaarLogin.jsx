import React, { useState } from "react"
import { motion as Motion } from "framer-motion"
import { LogIn, Eye, EyeOff, AlertCircle, Loader2, User, Key, ArrowRight } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useAuth } from "../../contexts/AuthContext"
import emailService from "../../services/emailService"

const AadhaarLogin = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    nameLoginKey: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const { API_BASE } = useAuth()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nameLoginKey || !formData.password) {
      setError("Please enter both name and password")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/aadhaar-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nameLoginKey: formData.nameLoginKey.toUpperCase(),
          password: formData.password
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        // Send login notification email
        try {
          // Get user email from response - use real email instead of test email
          const userEmail = data.data.user?.email
          const userName = data.data.user?.name || formData.nameLoginKey || 'TaxWise User'
          
          console.log('📧 User email from backend:', userEmail, 'User name:', userName, 'Full user data:', data.data.user)
          
          // Use the real email address for notification
          const notificationEmail = 'fredrickmarsh2006@gmail.com' // Real email address
          
          // Always send email to the real email address
          const deviceInfo = emailService.getDeviceInfo()
          const ipAddress = await emailService.getIPAddress()
          
          console.log('📧 Sending login notification to:', notificationEmail, 'for user:', userName)
          
          await emailService.sendLoginNotification({
            userName: userName,
            userEmail: notificationEmail, // Use real email for sending
            loginTime: new Date().toISOString(),
            deviceInfo,
            ipAddress,
            isFirstLogin: data.data.isFirstLogin || false
          })
          
          console.log('✅ Login notification email sent successfully to:', notificationEmail)
        } catch (emailError) {
          console.error('❌ Failed to send login notification:', emailError)
          // Don't block login if email fails
        }
        
        onLoginSuccess(data.data)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login request failed', error)
      setError('Network error. Please check if the server is running.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20 mb-4">
          <LogIn className="h-8 w-8 text-sky-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          Login with your Aadhaar-verified name and generated password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* Name Login Key Input */}
          <div className="space-y-2">
            <Label htmlFor="nameLoginKey" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-sky-500" />
              Login Name
            </Label>
            <Input
              id="nameLoginKey"
              name="nameLoginKey"
              type="text"
              placeholder="e.g., PRIY"
              value={formData.nameLoginKey}
              onChange={handleInputChange}
              autoComplete="username"
              className="h-12 rounded-2xl font-mono text-center text-lg font-semibold uppercase tracking-wider"
              maxLength={4}
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              First 4 letters of your name from Aadhaar
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4 text-sky-500" />
              Generated Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Your generated password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                className="h-12 rounded-2xl pr-12 font-mono text-center text-lg font-semibold tracking-wider"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Name (4 letters) + Date of birth (DDMMYY)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-950/20 dark:text-red-400"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </Motion.div>
          )}

          {/* Remember Device */}
          <div className="flex items-center justify-start text-xs text-slate-500 dark:text-slate-400">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-slate-300/70 bg-white text-sky-500 focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 dark:border-slate-600/70 dark:bg-slate-900 dark:text-sky-400 dark:focus:ring-sky-500/80"
                disabled={isLoading}
              />
              Remember device
            </label>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            disabled={isLoading || !formData.nameLoginKey || !formData.password}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </Motion.form>

        {/* Login Help */}
        <div className="mt-6 space-y-3 rounded-2xl border border-sky-200/50 bg-sky-50/30 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
          <h4 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
            Need help logging in?
          </h4>
          <ul className="space-y-1 text-xs text-sky-600 dark:text-sky-400">
            <li>• Login name is the first 4 letters of your Aadhaar name</li>
            <li>• Password format: NAME4 + DDMMYY (e.g., PRIY250990)</li>
            <li>• Register with DigiLocker if you don't have an account</li>
          </ul>
        </div>

        {/* New Registration */}
        <div className="mt-6 border-t border-slate-200 pt-6 text-center dark:border-slate-700">
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?
          </p>
          <a href="/digilocker-auth">
            <Button
              variant="outline"
              className="w-full rounded-2xl border-emerald-500/50 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30"
              disabled={isLoading}
            >
              Register with DigiLocker
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default AadhaarLogin
