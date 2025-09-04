import { MongoClient, Db } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB || 'shardtalk'

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }

  // Always create a new connection for Next.js API routes
  // This prevents connection pooling issues in serverless environments
  const client = new MongoClient(uri, {
    // Connection options optimized for Next.js
    maxPoolSize: 1, // Single connection for API routes
    serverSelectionTimeoutMS: 10000, // 10 seconds timeout
    socketTimeoutMS: 30000, // 30 seconds socket timeout
    connectTimeoutMS: 10000, // 10 seconds connection timeout
    
    // Retry options
    retryWrites: true,
    retryReads: true,
    
    // Security
    tls: true, // Always use TLS for MongoDB Atlas
    tlsInsecure: false, // Never allow insecure connections
  })

  try {
    await client.connect()
    
    // Test the connection with a simple ping
    await client.db(dbName).admin().ping()
    
    const db = client.db(dbName)

    // Ensure indexes exist (only create if they don't exist)
    try {
      await Promise.all([
        db.collection('users').createIndex({ address: 1 }, { unique: true }),
        db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true }),
        db.collection('activity').createIndex({ address: 1, createdAt: -1 }),
        db.collection('activity').createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }), // 30 days TTL
        db.collection('api_keys').createIndex({ key: 1 }, { unique: true }),
        db.collection('api_keys').createIndex({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }), // 1 year TTL
      ])
    } catch (indexError) {
      // Index creation errors are not critical, log and continue
      console.log('⚠️ Index creation warning (non-critical):', indexError)
    }

    console.log('✅ MongoDB connected successfully')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    // Close the client if connection failed
    try {
      await client.close()
    } catch (closeError) {
      // Ignore close errors
    }
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Graceful shutdown
export async function closeMongoConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
    console.log('✅ MongoDB connection closed')
  }
}


