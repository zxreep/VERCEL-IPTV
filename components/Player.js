import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export default function Player({ url, forceFullscreen = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Force fullscreen on channel select
    if (forceFullscreen && video.requestFullscreen) {
      setTimeout(() => {
        video.requestFullscreen().catch(() => {})
      }, 300)
    }

    // Safari native HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
      return
    }

    // hls.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        enableWorker: true
      })

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })

      return () => hls.destroy()
    }
  }, [url, forceFullscreen])

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      className="w-full h-full object-contain bg-black"
    />
  )
        }
