import { useState, useRef, useEffect } from 'react'
import { Camera, CameraOff, Upload, X } from 'lucide-react'

interface ObservationCameraProps {
  onCapture?: (blob: Blob) => void
  onUpload?: (blob: Blob) => Promise<void>
}

export default function ObservationCamera({ onCapture, onUpload }: ObservationCameraProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [stream])

  const startCamera = async () => {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
    } catch {
      setError('Camera access denied or not available')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
  }

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (blob) {
        setCaptured(canvas.toDataURL('image/jpeg'))
        setCapturedBlob(blob)
        onCapture?.(blob)
      }
    }, 'image/jpeg', 0.8)
    stopCamera()
  }

  const handleUpload = async () => {
    if (!capturedBlob || !onUpload) return
    setUploading(true)
    try {
      await onUpload(capturedBlob)
      setCaptured(null)
      setCapturedBlob(null)
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const discard = () => {
    setCaptured(null)
    setCapturedBlob(null)
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Camera className="h-4 w-4 text-primary-600" />
        Observation Camera
      </h3>

      {error && (
        <div className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
      )}

      <div className="relative mb-3 overflow-hidden rounded-lg bg-gray-900">
        {!captured ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="h-48 w-full object-cover" />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  className="btn-primary flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Start Camera
                </button>
              </div>
            )}
          </>
        ) : (
          <img src={captured} alt="Captured" className="h-48 w-full object-cover" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex items-center gap-2">
        {stream && !captured && (
          <>
            <button onClick={capture} className="btn-primary flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Capture
            </button>
            <button onClick={stopCamera} className="btn-secondary flex items-center gap-2">
              <CameraOff className="h-4 w-4" />
              Stop
            </button>
          </>
        )}
        {captured && (
          <>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-success flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={discard} className="btn-secondary flex items-center gap-2">
              <X className="h-4 w-4" />
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
