import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { ActivityDoc } from '@/types/user'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const address = (searchParams.get('address') || '').toLowerCase()
  const type = searchParams.get('type') as ActivityDoc['type'] | null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  const db = await getMongoDb()
  const query: any = {}
  if (address) query.address = address
  if (type) query.type = type

  const cursor = db.collection<ActivityDoc>('activity')
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  const [items, total] = await Promise.all([
    cursor.toArray(),
    db.collection<ActivityDoc>('activity').countDocuments(query)
  ])

  return new Response(JSON.stringify({ items, total, page, limit }), { status: 200 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const address: string = (body.address || '').toLowerCase()
  const type: ActivityDoc['type'] = body.type
  const metadata: Record<string, any> | undefined = body.metadata

  if (!address || !type) {
    return new Response(JSON.stringify({ error: 'address and type are required' }), { status: 400 })
  }

  const db = await getMongoDb()
  const doc: ActivityDoc = {
    address,
    type,
    metadata,
    createdAt: new Date(),
  }
  await db.collection<ActivityDoc>('activity').insertOne(doc)
  return new Response(JSON.stringify({ ok: true }), { status: 201 })
}


