import { useEffect, useState } from 'react'

export default function Admin() {
  const [channels, setChannels] = useState([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [password, setPassword] = useState('')

  const load = () => fetch('/api/channels').then(r => r.json()).then(d => setChannels(d.channels))

  useEffect(load, [])

  async function add() {
    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', name, url, password })
    })
    setName(''); setUrl(''); load()
  }

  async function del(id) {
    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, password })
    })
    load()
  }

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-3xl mx-auto bg-white p-4 rounded">
        <h1 className="text-xl font-bold mb-3">Admin Panel</h1>

        <input placeholder="Admin password" value={password} onChange={e => setPassword(e.target.value)} className="border p-2 w-full mb-2" />
        <input placeholder="Channel name" value={name} onChange={e => setName(e.target.value)} className="border p-2 w-full mb-2" />
        <input placeholder="Stream URL (.m3u8)" value={url} onChange={e => setUrl(e.target.value)} className="border p-2 w-full mb-2" />
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>

        <hr className="my-4" />

        {channels.map(c => (
          <div key={c._id} className="flex justify-between border-b py-2">
            <span>{c.name}</span>
            <button onClick={() => del(c._id)} className="text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
      }
