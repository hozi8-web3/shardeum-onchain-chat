import { getMongoDb } from '@/lib/mongodb'

export async function GET() {
  const db = await getMongoDb()

  const [userCount, activityCount, recentUniqueWallets] = await Promise.all([
    db.collection('users').estimatedDocumentCount(),
    db.collection('activity').estimatedDocumentCount(),
    db.collection('activity').distinct('address', { createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } })
  ])

  const last24h = await db.collection('activity').aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24) } } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]).toArray()

  const byType: Record<string, number> = {}
  for (const r of last24h) byType[r._id as string] = r.count as number

  return new Response(JSON.stringify({
    users: userCount,
    activities: activityCount,
    uniqueWallets7d: recentUniqueWallets.length,
    last24hByType: byType,
  }), { status: 200 })
}


