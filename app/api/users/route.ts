import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { UserDoc } from '@/types/user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = (searchParams.get('address') || '').toLowerCase()
  const username = searchParams.get('username') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '0', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  if (address) {
    const db = await getMongoDb()
    const user = await db.collection<UserDoc>('users').findOne({ address })
    return new Response(JSON.stringify({ user }), { status: 200 })
  }

  if (username) {
    const db = await getMongoDb()
    const exists = await db.collection<UserDoc>('users').findOne({ username })
    return new Response(JSON.stringify({ available: !exists }), { status: 200 })
  }

  // List users paginated when no filters provided
  if (page > 0) {
    const db = await getMongoDb()
    const cursor = db.collection<UserDoc>('users')
      .find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
    const [items, total] = await Promise.all([
      cursor.toArray(),
      db.collection<UserDoc>('users').countDocuments({})
    ])
    return new Response(JSON.stringify({ items, total, page, limit }), { status: 200 })
  }

  return new Response(JSON.stringify({ error: 'Missing query param: address or username' }), { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const address: string = (body.address || '').toLowerCase()
  const username: string | undefined = body.username?.trim()

  if (!address) {
    return new Response(JSON.stringify({ error: 'address is required' }), { status: 400 })
  }

  const db = await getMongoDb()
  const now = new Date()

  const update: Partial<UserDoc> = { updatedAt: now }
  if (typeof username === 'string' && username.length > 0) {
    update.username = username
  }

  // Upsert user
  try {
    const res = await db.collection<UserDoc>('users').findOneAndUpdate(
      { address },
      { $setOnInsert: { address, createdAt: now }, $set: update },
      { upsert: true, returnDocument: 'after' }
    )

    return new Response(JSON.stringify({ user: res }), { status: 200 })
  } catch (e: any) {
    // Handle unique username conflict
    if (e?.code === 11000 && e?.message?.includes('username')) {
      return new Response(JSON.stringify({ error: 'Username already taken' }), { status: 409 })
    }
    return new Response(JSON.stringify({ error: 'Failed to upsert user' }), { status: 500 })
  }
}


