import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

export default function Player({ url }) {
  const ref = useRef(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play()
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(url)
      hls.attachMedia(video)
      return () => hls.destroy()
    }
  }, [url])

  return <video ref={ref} controls className="w-full h-full bg-black" />
    }
