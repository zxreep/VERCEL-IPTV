import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function Player({ url, forceFullscreen = true }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [quality, setQuality] = useState('auto')
  const [buffering, setBuffering] = useState(false)
  const [error, setError] = useState(null)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 5

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    setError(null)
    setBuffering(true)
    retryCountRef.current = 0

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    // Force fullscreen (best effort, browser-safe)
    if (forceFullscreen) {
      setTimeout(() => {
        if (video.requestFullscreen) {
          video.requestFullscreen().catch(() => {})
        }
      }, 300)
    }

    // Safari / iOS native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
      return
    }

    if (!Hls.isSupported()) {
      setError('HLS not supported in this browser')
      return
    }

    const hls = new Hls({
      // 🔴 Stability over latency
      lowLatencyMode: false,

      // 🟢 ENHANCED Buffering (optimized for IPTV + Vercel)
      maxBufferLength: 180,        // Increased from 120 to 180s
      maxMaxBufferLength: 360,     // Increased from 240 to 360s
      backBufferLength: 90,        // Reduced from 180 to save memory
      
      // 🟢 Live stream tolerance
      liveSyncDuration: 3,         // Reduced from 6 for better live sync
      liveMaxLatencyDuration: 15,  // Reduced from 20 for less delay
      maxBufferHole: 0.5,          // Reduced from 1.5 for smoother playback
      maxFragLookUpTolerance: 0.25,

      // 🟢 Performance
      enableWorker: true,
      progressive: true,
      
      // 🔥 ABR control (ENHANCED)
      capLevelToPlayerSize: true,
      startLevel: -1,              // Changed from 0 to -1 for auto-select
      abrEwmaFastLive: 5,          // Increased from 3
      abrEwmaSlowLive: 9,
      abrBandWidthFactor: 0.95,    // Increased from 0.8
      abrBandWidthUpFactor: 0.7,
      abrMaxWithRealBitrate: true, // NEW: Use actual bitrate

      // 🆕 FRAGMENT Loading (CRITICAL for buffering)
      maxMaxBufferLength: 360,
      maxBufferSize: 60 * 1000 * 1000, // 60 MB buffer
      maxBufferHole: 0.5,
      highBufferWatchdogPeriod: 3,
      
      // 🆕 Fragment retry settings
      manifestLoadingTimeOut: 20000,    // 20s timeout
      manifestLoadingMaxRetry: 6,       // More retries
      manifestLoadingRetryDelay: 1000,
      manifestLoadingMaxRetryTimeout: 10000,
      
      levelLoadingTimeOut: 20000,
      levelLoadingMaxRetry: 6,
      levelLoadingRetryDelay: 1000,
      levelLoadingMaxRetryTimeout: 10000,
      
      fragLoadingTimeOut: 30000,       // Increased from default 20s
      fragLoadingMaxRetry: 10,         // More retries for fragments
      fragLoadingRetryDelay: 500,
      fragLoadingMaxRetryTimeout: 8000,

      // Reduce stalls
      nudgeOffset: 0.1,            // Reduced from 0.2 for precision
      nudgeMaxRetry: 15,           // Increased from 10

      // 🆕 Logging for debugging (remove in production)
      debug: false,
      enableWebVTT: false,
      enableCEA708Captions: false
    })

    hlsRef.current = hls
    hls.loadSource(url)
    hls.attachMedia(video)

    // 🔒 HARD BITRATE CAP (prevents fake high bitrate streams)
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      const MAX_BITRATE = 8000000 // Increased to 8 Mbps for better quality

      const levels = hls.levels || []
      let maxAllowedLevel = levels.length - 1

      for (let i = 0; i < levels.length; i++) {
        if (levels[i].bitrate > MAX_BITRATE) {
          maxAllowedLevel = i - 1
          break
        }
      }

      if (maxAllowedLevel >= 0) {
        hls.autoLevelCapping = maxAllowedLevel
      }
      
      setBuffering(false)
      video.play().catch(() => {})
    })

    // 🆕 Error Recovery System
    hls.on(Hls.Events.ERROR, (event, data) => {
      console.warn('HLS Error:', data.type, data.details, data.fatal)

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('Network error, attempting recovery...')
            if (retryCountRef.current < MAX_RETRIES) {
              retryCountRef.current++
              setBuffering(true)
              setTimeout(() => {
                hls.startLoad()
              }, 1000 * retryCountRef.current) // Exponential backoff
            } else {
              setError('Network error: Unable to load stream')
            }
            break

          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Media error, attempting recovery...')
            hls.recoverMediaError()
            setBuffering(true)
            break

          default:
            console.error('Fatal error, destroying player')
            setError('Playback error: ' + data.details)
            hls.destroy()
            break
        }
      }
    })

    // 🆕 Quality level tracking
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      const level = hls.levels[data.level]
      if (level) {
        const qualityLabel = level.height 
          ? `${level.height}p` 
          : `${Math.round(level.bitrate / 1000)}kbps`
        setQuality(hls.autoLevelEnabled ? `Auto (${qualityLabel})` : qualityLabel)
      }
    })

    // 🆕 Buffer state tracking
    const onWaiting = () => setBuffering(true)
    const onPlaying = () => setBuffering(false)
    const onCanPlay = () => setBuffering(false)

    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('canplay', onCanPlay)

    // 🛑 ENHANCED Freeze watchdog with better recovery
    let lastTime = 0
    let stallCount = 0
    const MAX_STALLS = 3

    const watchdog = setInterval(() => {
      if (!video || video.paused || video.ended) return

      if (video.currentTime === lastTime && !video.seeking) {
        stallCount++
        console.log(`Stall detected (${stallCount}/${MAX_STALLS})`)
        
        if (stallCount >= MAX_STALLS) {
          console.log('Multiple stalls detected, forcing recovery')
          setBuffering(true)
          
          // Try aggressive recovery
          hls.stopLoad()
          setTimeout(() => {
            hls.startLoad(-1) // Start from live edge
            stallCount = 0
          }, 1000)
        }
      } else {
        stallCount = 0
      }

      lastTime = video.currentTime
    }, 4000) // Check every 4 seconds

    // 🆕 Preload optimization
    video.preload = 'auto'

    return () => {
      clearInterval(watchdog)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('canplay', onCanPlay)
      if (hlsRef.current) {
        hls.destroy()
      }
    }
  }, [url, forceFullscreen])

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        preload="auto"
        className="w-full h-full bg-black object-contain"
      />
      
      {/* Loading Indicator */}
      {buffering && (
        <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg text-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Buffering...</span>
          </div>
        </div>
      )}
      
      {/* Quality Indicator */}
      {!buffering && !error && quality && (
        <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-lg text-xs backdrop-blur">
          {quality}
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <div className="text-white text-lg mb-2">Playback Error</div>
            <div className="text-gray-400 text-sm mb-4">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  )
            }
