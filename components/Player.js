import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export default function Player({ url, forceFullscreen = true }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

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

    if (!Hls.isSupported()) return

    const hls = new Hls({
      // 🔴 Stability over latency
      lowLatencyMode: false,

      // 🟢 Buffering (IPTV-friendly)
      maxBufferLength: 120,
      maxMaxBufferLength: 240,
      backBufferLength: 180,

      // 🟢 Live tolerance
      liveSyncDuration: 6,
      liveMaxLatencyDuration: 20,
      maxBufferHole: 1.5,

      // 🟢 Performance
      enableWorker: true,
      progressive: true,

      // 🔥 ABR control (CRITICAL)
      capLevelToPlayerSize: true,
      startLevel: 0,
      abrEwmaFastLive: 3,
      abrEwmaSlowLive: 9,
      abrBandWidthFactor: 0.8,
      abrBandWidthUpFactor: 0.7,

      // Reduce stalls
      nudgeOffset: 0.2,
      nudgeMaxRetry: 10
    })

    hlsRef.current = hls
    hls.loadSource(url)
    hls.attachMedia(video)

    // 🔒 HARD BITRATE CAP (prevents fake 15–20 Mbps streams)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const MAX_BITRATE = 7000000 // 7 Mbps (safe for 1080p IPTV)

      const levels = hls.levels || []
      let maxAllowedLevel = levels.length - 1

      for (let i = 0; i < levels.length; i++) {
        if (levels[i].bitrate > MAX_BITRATE) {
          maxAllowedLevel = i - 1
          break
        }
      }

      hls.autoLevelCapping = Math.max(0, maxAllowedLevel)
      video.play().catch(() => {})
    })

    // 🛑 Freeze watchdog (auto recover)
    let lastTime = 0
    const watchdog = setInterval(() => {
      if (!video || video.paused) return

      if (video.currentTime === lastTime) {
        hls.stopLoad()
        hls.startLoad()
      }

      lastTime = video.currentTime
    }, 5000)

    return () => {
      clearInterval(watchdog)
      hls.destroy()
    }
  }, [url, forceFullscreen])

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      preload="auto"
      className="w-full h-full bg-black object-contain"
    />
  )
        }
