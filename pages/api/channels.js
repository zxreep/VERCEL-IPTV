import clientPromise from '../../lib/mongodb'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

export default async function handler(req, res) {
  const client = await clientPromise
  const db = client.db('iptv')
  const collection = db.collection('channels')

  if (req.method === 'GET') {
    const channels = await collection.find({}).toArray()
    res.status(200).json({ channels })
    return
  }

  if (req.method === 'POST') {
    const { password, action } = req.body

    if (ADMIN_PASSWORD && password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' })
    }

    if (action === 'add') {
      const { name, url } = req.body
      if (!name || !url) {
        return res.status(400).json({ error: 'Missing fields' })
      }
      await collection.insertOne({ name, url, createdAt: new Date() })
    }

    if (action === 'delete') {
      const { id } = req.body
      await collection.deleteOne({ _id: new (require('mongodb').ObjectId)(id) })
    }

    const channels = await collection.find({}).toArray()
    return res.status(200).json({ channels })
  }

  res.status(405).end()
  }
      
