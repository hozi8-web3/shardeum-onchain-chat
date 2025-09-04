import { MongoClient, Db } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'shardtalk'

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }

  if (cachedClient && cachedDb) {
    return cachedDb
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  cachedClient = client
  cachedDb = db

  // Ensure indexes exist
  await Promise.all([
    db.collection('users').createIndex({ address: 1 }, { unique: true }),
    db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true }),
    db.collection('activity').createIndex({ address: 1, createdAt: -1 }),
  ])

  return db
}


