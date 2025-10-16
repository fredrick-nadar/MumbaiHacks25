import React, { useState } from "react"
import { motion as Motion } from "framer-motion"
import { Upload, FileText, QrCode, AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { cn } from "../../lib/utils"

const PasswordReset = ({ onResetComplete, onBackToLogin }) => {
  const [activeTab, setActiveTab] = useState("qr")
  const [uploadedFile, setUploadedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [error, setError] = useState(null)

  // Handle file upload for password reset
  const handleFileUpload = async (file, uploadType) => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setResetResult(null)

    const formData = new FormData()
    formData.append(uploadType === 'qr' ? 'qrImage' : 'xmlFile', file)

    try {
      const endpoint = uploadType === 'qr' 
        ? '/api/aadhaar-auth/password-reset/qr' 
        : '/api/aadhaar-auth/password-reset/xml'
      
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.status === 'success') {
        setResetResult(data.data)
        setTimeout(() => {
          onResetComplete(data.data)
        }, 3000)
      } else {
        setError(data.message || 'Password reset failed')
      }
    } catch (error) {
      console.error('Password reset request failed', error)
      setError('Network error. Please check if the server is running.')
    } finally {
      setIsUploading(false)
    }
  }

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      setUploadedFile(files[0])
      handleFileUpload(files[0], activeTab)
    }
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      handleFileUpload(file, activeTab)
    }
  }

  const FileUploadArea = ({ type, accept, description, icon: IconComponent }) => (
    <div
      className={cn(
        "relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300",
        dragActive || uploadedFile
          ? "border-orange-400/60 bg-orange-50/50 dark:border-orange-500/60 dark:bg-orange-950/30"
          : "border-slate-300/60 bg-slate-50/50 hover:border-orange-400/40 hover:bg-orange-50/30 dark:border-slate-600/60 dark:bg-slate-800/50 dark:hover:border-orange-500/40 dark:hover:bg-orange-950/20"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={isUploading}
      />
      
      {isUploading ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 via-amber-400/20 to-yellow-400/20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Verifying Aadhaar and resetting password...
          </p>
        </div>
      ) : resetResult ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Password reset successful!
            </p>
            <div className="space-y-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Your new login credentials:
              </p>
              <div className="space-y-1">
                <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Name: {resetResult.nameLoginKey}
                </p>
                <p className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Password: {resetResult.newPasswordHint}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Redirecting to login page...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 via-pink-400/20 to-rose-400/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              Reset failed
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null)
                setUploadedFile(null)
              }}
              className="mt-3"
            >
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 via-amber-400/20 to-yellow-400/20">
            <IconComponent className="h-8 w-8 text-orange-500" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Upload {type === 'qr' ? 'QR Code' : 'XML File'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
          <Button variant="outline" className="mt-4">
            <Upload className="mr-2 h-4 w-4" />
            Choose file
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <Card className="w-full max-w-2xl rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-2 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 via-amber-400/20 to-yellow-400/20 mb-4">
          <RefreshCw className="h-8 w-8 text-orange-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Reset Password
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          Verify your identity using Aadhaar to generate a new password
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 rounded-full bg-slate-200/60 p-1 text-sm font-semibold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
            <TabsTrigger value="qr" className="rounded-full px-4 py-2 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="xml" className="rounded-full px-4 py-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              XML File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="qr" className="space-y-4">
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            >
              <FileUploadArea
                type="qr"
                accept="image/*"
                description="Upload your Aadhaar QR code to reset password"
                icon={QrCode}
              />
            </Motion.div>
            <div className="space-y-3 rounded-2xl border border-orange-200/50 bg-orange-50/30 p-4 dark:border-orange-800/50 dark:bg-orange-950/20">
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Password Reset via QR:
              </h4>
              <ul className="space-y-1 text-xs text-orange-600 dark:text-orange-400">
                <li>• Scan or upload the QR code from your Aadhaar card</li>
                <li>• System will verify your identity securely</li>
                <li>• New password will be generated automatically</li>
                <li>• Rate limited: 3 attempts per day for security</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="xml" className="space-y-4">
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            >
              <FileUploadArea
                type="xml"
                accept=".xml"
                description="Upload your Aadhaar XML file to reset password"
                icon={FileText}
              />
            </Motion.div>
            <div className="space-y-3 rounded-2xl border border-orange-200/50 bg-orange-50/30 p-4 dark:border-orange-800/50 dark:bg-orange-950/20">
              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Password Reset via XML:
              </h4>
              <ul className="space-y-1 text-xs text-orange-600 dark:text-orange-400">
                <li>• Download e-Aadhaar XML from DigiLocker</li>
                <li>• Upload the .xml file for identity verification</li>
                <li>• Secure processing with automatic password generation</li>
                <li>• Your data is processed securely and not stored</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {/* Security Notice */}
        <div className="space-y-3 rounded-2xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-700/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Security & Privacy
          </div>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <li>• Password reset is rate-limited for security</li>
            <li>• Your Aadhaar data is processed securely and not stored</li>
            <li>• New password follows the same generation rules</li>
            <li>• All reset attempts are logged for audit</li>
          </ul>
        </div>

        {/* Back to Login */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={onBackToLogin}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PasswordReset
