import { useEffect, useState } from 'react'
import Player from '../components/Player'
import Link from 'next/link'

export default function Home() {
  const [channels, setChannels] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.json())
      .then(d => setChannels(d.channels || []))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">
            📺 IPTV Live
          </h1>
          <Link href="/admin" className="text-sm text-blue-400">
            Admin
          </Link>
        </header>

        <div className="grid md:grid-cols-4 gap-4">
          {/* Channel List */}
          <div className="md:col-span-1 bg-gray-900/70 backdrop-blur rounded-xl p-3 h-[70vh] overflow-y-auto">
            {channels.map(c => (
              <div
                key={c._id}
                onClick={() => setCurrent(c)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                  current?._id === c._id
                    ? 'bg-blue-600'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{c.name}</div>
              </div>
            ))}
          </div>

          {/* Player */}
          <div className="md:col-span-3 rounded-xl overflow-hidden bg-black h-[70vh] flex items-center justify-center">
            {current ? (
              <Player url={current.url} forceFullscreen />
            ) : (
              <div className="text-gray-400">
                Select a channel to start streaming
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
    }
