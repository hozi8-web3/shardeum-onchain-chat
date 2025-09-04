import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { UserDoc } from '@/types/user'
import { 
  requireAuth, 
  checkRateLimit, 
  validateOrigin, 
  corsHeaders, 
  validateAddress, 
  validateUsername,
  sanitizeInput 
} from '@/lib/auth'

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}

export async function GET(req: NextRequest) {
  try {
    // CORS check
    if (!validateOrigin(req)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { 
        status: 403,
        headers: corsHeaders
      })
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit(`users_get:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 100 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    const { searchParams } = new URL(req.url)
    const address = sanitizeInput(searchParams.get('address') || '').toLowerCase()
    const username = sanitizeInput(searchParams.get('username') || '')
    const page = Math.max(1, parseInt(searchParams.get('page') || '0', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Validate inputs
    if (address && !validateAddress(address)) {
      return new Response(JSON.stringify({ error: 'Invalid address format' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    if (username && !validateUsername(username)) {
      return new Response(JSON.stringify({ error: 'Invalid username format' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    const db = await getMongoDb()

    if (address) {
      const user = await db.collection<UserDoc>('users').findOne({ address })
      return new Response(JSON.stringify({ user }), { 
        status: 200,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    if (username) {
      const exists = await db.collection<UserDoc>('users').findOne({ username })
      return new Response(JSON.stringify({ available: !exists }), { 
        status: 200,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    // List users paginated when no filters provided - requires authentication
    if (page > 0) {
      const auth = requireAuth('admin')(req)
      if (!auth.success) {
        return new Response(JSON.stringify({ error: auth.error }), { 
          status: auth.statusCode || 401,
          headers: corsHeaders
        })
      }

      const cursor = db.collection<UserDoc>('users')
        .find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
      const [items, total] = await Promise.all([
        cursor.toArray(),
        db.collection<UserDoc>('users').countDocuments({})
      ])
      return new Response(JSON.stringify({ items, total, page, limit }), { 
        status: 200,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    return new Response(JSON.stringify({ error: 'Missing query param: address or username' }), { 
      status: 400,
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error in users GET:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: corsHeaders
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    // CORS check
    if (!validateOrigin(req)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), { 
        status: 403,
        headers: corsHeaders
      })
    }

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit(`users_post:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 50 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    const body = await req.json()
    const address: string = sanitizeInput(body.address || '').toLowerCase()
    const username: string | undefined = sanitizeInput(body.username || '').trim()

    // Validate inputs
    if (!address) {
      return new Response(JSON.stringify({ error: 'address is required' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    if (!validateAddress(address)) {
      return new Response(JSON.stringify({ error: 'Invalid address format' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    if (username && !validateUsername(username)) {
      return new Response(JSON.stringify({ error: 'Invalid username format' }), { 
        status: 400,
        headers: corsHeaders
      })
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

      return new Response(JSON.stringify({ user: res }), { 
        status: 200,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    } catch (e: any) {
      // Handle unique username conflict
      if (e?.code === 11000 && e?.message?.includes('username')) {
        return new Response(JSON.stringify({ error: 'Username already taken' }), { 
          status: 409,
          headers: corsHeaders
        })
      }
      console.error('Error upserting user:', e)
      return new Response(JSON.stringify({ error: 'Failed to upsert user' }), { 
        status: 500,
        headers: corsHeaders
      })
    }
  } catch (error) {
    console.error('Error in users POST:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: corsHeaders
    })
  }
}


