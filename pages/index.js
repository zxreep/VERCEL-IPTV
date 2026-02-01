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
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between mb-4">
          <h1 className="text-2xl font-bold">IPTV Player</h1>
          <Link href="/admin">Admin</Link>
        </header>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded p-3 overflow-auto h-[60vh]">
            {channels.map(c => (
              <div key={c._id} className="p-2 border-b cursor-pointer" onClick={() => setCurrent(c)}>
                {c.name}
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-black rounded h-[60vh]">
            {current ? <Player url={current.url} /> : <div className="text-white m-auto">Select a channel</div>}
          </div>
        </div>
      </div>
    </div>
  )
    }
  
