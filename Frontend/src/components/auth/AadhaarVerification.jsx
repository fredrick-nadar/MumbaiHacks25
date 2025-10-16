import React, { useState, useCallback, useRef, useEffect } from "react"
import { motion as Motion } from "framer-motion"
import { Upload, FileText, QrCode, CheckCircle2, AlertCircle, Loader2, Camera, X } from "lucide-react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { cn } from "../../lib/utils"

const AadhaarVerification = ({ onVerificationComplete }) => {
  const [activeTab, setActiveTab] = useState("camera")
  const [uploadedFile, setUploadedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [error, setError] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const scannerRef = useRef(null)
  const qrScannerRef = useRef(null)

  // Handle QR scan result
  const handleQRScan = useCallback(async (qrData) => {
    if (!qrData) return

    console.log("Processing QR scan:", qrData)
    
    // Stop camera immediately after successful scan detection
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.clear()
        qrScannerRef.current = null
        setIsCameraActive(false)
        console.log("Camera stopped after QR detection")
      } catch (e) {
        console.log("Error stopping camera:", e)
      }
    }
    
    setIsUploading(true)
    setError(null)
    setVerificationResult(null)

    try {
      const response = await fetch('http://localhost:3001/api/kyc/qr-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        setVerificationResult(data.data)
        setTimeout(() => {
          onVerificationComplete(data.data)
        }, 1500)
      } else {
        setError(data.message || 'Aadhaar verification failed')
      }
    } catch (error) {
      console.error('Failed to verify Aadhaar QR scan', error)
      setError('Network error. Please check if the server is running.')
    } finally {
      setIsUploading(false)
    }
  }, [onVerificationComplete])

  // Handle file upload
  const handleFileUpload = useCallback(async (file, uploadType) => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setVerificationResult(null)

    const formData = new FormData()
    formData.append(uploadType === 'qr' ? 'qrImage' : 'xmlFile', file)

    try {
      const endpoint = uploadType === 'qr' 
        ? '/api/kyc/qr-parse' 
        : '/api/kyc/xml-parse'
      
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.status === 'success') {
        setVerificationResult(data.data)
        setTimeout(() => {
          onVerificationComplete(data.data)
        }, 1500)
      } else {
        setError(data.message || 'Aadhaar verification failed')
      }
    } catch (error) {
      console.error('Failed to verify Aadhaar upload', error)
      setError('Network error. Please check if the server is running.')
    } finally {
      setIsUploading(false)
    }
  }, [onVerificationComplete])

  // Camera controls
  const startCamera = useCallback(() => {
    console.log("Starting camera...")
    
    // Clear any existing scanner
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.clear()
      } catch (e) {
        console.log("Error clearing previous scanner:", e)
      }
      qrScannerRef.current = null
    }

    // Set camera active first to show the scanner element
    setIsCameraActive(true)
    setError(null)

    // Wait for DOM to update
    setTimeout(() => {
      try {
        // Check if the DOM element exists
        const scannerElement = document.getElementById("qr-scanner")
        if (!scannerElement) {
          console.error("QR scanner element not found")
          setError("Scanner element not ready. Please try again.")
          setIsCameraActive(false)
          return
        }

        console.log("Scanner element found, initializing scanner...")

        const scanner = new Html5QrcodeScanner(
          "qr-scanner",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          false
        )

        scanner.render(
          (decodedText) => {
            console.log("QR Code detected:", decodedText)
            handleQRScan(decodedText)
          },
          (errorMessage) => {
            // Only log non-routine scanning errors
            if (!errorMessage.includes("No QR code found") && !errorMessage.includes("QR code parse error")) {
              console.warn("QR Scanner error:", errorMessage)
            }
          }
        )

        qrScannerRef.current = scanner
        console.log("Camera started successfully")
      } catch (error) {
        console.error("Failed to start camera:", error)
        setError(`Failed to access camera: ${error.message}`)
        setIsCameraActive(false)
      }
    }, 100)
  }, [handleQRScan])

  const stopCamera = useCallback(() => {
    console.log("Stopping camera...")
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear()
        qrScannerRef.current = null
      }
    } catch (e) {
      console.log("Error stopping camera:", e)
    }
    setIsCameraActive(false)
  }, [])

  // Handle tab changes
  useEffect(() => {
    // Only stop camera when switching away from camera tab
    if (activeTab !== 'camera' && isCameraActive) {
      stopCamera()
    }

    return () => {
      if (qrScannerRef.current) {
        try {
          qrScannerRef.current.clear()
        } catch (e) {
          console.log("Cleanup error:", e)
        }
      }
    }
  }, [activeTab, isCameraActive, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear()
      }
    }
  }, [])

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      setUploadedFile(files[0])
      handleFileUpload(files[0], activeTab)
    }
  }, [activeTab, handleFileUpload])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      handleFileUpload(file, activeTab)
    }
  }

  const FileUploadArea = ({ accept, description, icon: IconComponent }) => (
    <div
      className={cn(
        "relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300",
        dragActive || uploadedFile
          ? "border-sky-400/60 bg-sky-50/50 dark:border-sky-500/60 dark:bg-sky-950/30"
          : "border-slate-300/60 bg-slate-50/50 hover:border-sky-400/40 hover:bg-sky-50/30 dark:border-slate-600/60 dark:bg-slate-800/50 dark:hover:border-sky-500/40 dark:hover:bg-sky-950/20"
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Verifying Aadhaar data...
          </p>
        </div>
      ) : verificationResult ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Aadhaar verified successfully!
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Redirecting to complete registration...
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
              Verification failed
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20">
            <IconComponent className="h-8 w-8 text-sky-500" />
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
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Aadhaar Verification
        </CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          Secure registration using your Aadhaar QR code or XML file from digilocker
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 rounded-full bg-slate-200/60 p-1 text-sm font-semibold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
            <TabsTrigger value="camera" className="rounded-full px-3 py-2 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="qr" className="rounded-full px-3 py-2 flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Upload QR
            </TabsTrigger>
            <TabsTrigger value="xml" className="rounded-full px-3 py-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              XML File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            >
              {isUploading ? (
                <div className="rounded-3xl border-2 border-dashed border-sky-400/60 bg-sky-50/50 p-8 text-center dark:border-sky-500/60 dark:bg-sky-950/30">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20">
                      <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Verifying Aadhaar data...
                    </p>
                  </div>
                </div>
              ) : verificationResult ? (
                <div className="rounded-3xl border-2 border-dashed border-emerald-400/60 bg-emerald-50/50 p-8 text-center dark:border-emerald-500/60 dark:bg-emerald-950/30">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Aadhaar verified successfully!
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Redirecting to complete registration...
                      </p>
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-3xl border-2 border-dashed border-red-400/60 bg-red-50/50 p-8 text-center dark:border-red-500/60 dark:bg-red-950/30">
                  <div className="space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 via-pink-400/20 to-rose-400/20">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Scan failed
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {error}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError(null)
                          startCamera()
                        }}
                        className="mt-3"
                      >
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isCameraActive ? (
                    <div className="rounded-3xl border-2 border-dashed border-slate-300/60 bg-slate-50/50 p-8 text-center dark:border-slate-600/60 dark:bg-slate-800/50">
                      <div className="space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20">
                          <Camera className="h-8 w-8 text-sky-500" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            Ready to Scan QR Code
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Click "Start Camera" to begin scanning your Aadhaar QR code
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Button
                            size="lg"
                            onClick={startCamera}
                            className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                          >
                            <Camera className="mr-2 h-5 w-5" />
                            Start Camera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                                console.log("Camera permission granted:", stream)
                                stream.getTracks().forEach(track => track.stop())
                                setError("Camera permission granted! Try starting camera again.")
                              } catch (error) {
                                console.error("Camera permission denied:", error)
                                setError(`Camera permission denied: ${error.message}`)
                              }
                            }}
                            className="text-xs"
                          >
                            Test Camera Permission
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        Position your Aadhaar QR code in the camera frame
                      </p>
                    </div>
                  )}
                  
                  {/* QR Scanner Element - Always present but hidden when not active */}
                  <div className={cn(
                    "rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5",
                    !isCameraActive && "hidden"
                  )}>
                    <div id="qr-scanner" ref={scannerRef}></div>
                  </div>
                  
                  {isCameraActive && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopCamera}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Stop Camera
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Motion.div>
            <div className="space-y-3 rounded-2xl border border-sky-200/50 bg-sky-50/30 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
              <h4 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                Camera QR scanning tips:
              </h4>
              <ul className="space-y-1 text-xs text-sky-600 dark:text-sky-400">
                <li>• Hold your Aadhaar card steady in front of the camera</li>
                <li>• Ensure good lighting for better QR code detection</li>
                <li>• The QR code should fill most of the scanning area</li>
                <li>• Scanning will happen automatically when QR is detected</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="qr" className="space-y-4">
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 150, damping: 20 }}
            >
              <FileUploadArea
                accept="image/*"
                description="Scan or upload the QR code from your Aadhaar card"
                icon={QrCode}
              />
            </Motion.div>
            <div className="space-y-3 rounded-2xl border border-sky-200/50 bg-sky-50/30 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
              <h4 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                How to find your Aadhaar QR code:
              </h4>
              <ul className="space-y-1 text-xs text-sky-600 dark:text-sky-400">
                <li>• Located on the back of your physical Aadhaar card</li>
                <li>• Available in your digital Aadhaar from mAadhaar app</li>
                <li>• Supported formats: JPG, JPEG, PNG, GIF, BMP, WEBP</li>
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
                accept=".xml"
                description="Upload the XML file downloaded from DigiLocker"
                icon={FileText}
              />
            </Motion.div>
            <div className="space-y-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/30 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/20">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                How to download Aadhaar XML:
              </h4>
              <ul className="space-y-1 text-xs text-emerald-600 dark:text-emerald-400">
                <li>• Visit DigiLocker (digilocker.gov.in)</li>
                <li>• Login with your Aadhaar number</li>
                <li>• Download your e-Aadhaar in XML format</li>
                <li>• Upload the downloaded .xml file here</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200/50 bg-slate-50/30 p-4 dark:border-slate-700/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Your data is secure
          </div>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <li>• Aadhaar data is processed securely and not stored</li>
            <li>• Only hashed reference is saved for login</li>
            <li>• Compliant with data protection regulations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default AadhaarVerification
