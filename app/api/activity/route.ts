import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { ActivityDoc } from '@/types/user'
import { 
  requireAuth, 
  checkRateLimit, 
  validateOrigin, 
  corsHeaders, 
  validateAddress,
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
    const rateLimit = checkRateLimit(`activity_get:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 100 })
    
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
    const type = sanitizeInput(searchParams.get('type') || '') as ActivityDoc['type'] | null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    // Validate inputs
    if (address && !validateAddress(address)) {
      return new Response(JSON.stringify({ error: 'Invalid address format' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Validate activity type
    const validTypes = ['connect', 'disconnect', 'send_message', 'switch_network', 'update_username']
    if (type && !validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid activity type' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

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

    return new Response(JSON.stringify({ items, total, page, limit }), { 
      status: 200,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('Error in activity GET:', error)
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
    const rateLimit = checkRateLimit(`activity_post:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 200 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    const body = await req.json()
    const address: string = sanitizeInput(body.address || '').toLowerCase()
    const type = sanitizeInput(body.type || '') as ActivityDoc['type']
    const metadata: Record<string, any> | undefined = body.metadata

    // Validate inputs
    if (!address || !type) {
      return new Response(JSON.stringify({ error: 'address and type are required' }), { 
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

    // Validate activity type
    const validTypes = ['connect', 'disconnect', 'send_message', 'switch_network', 'update_username']
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid activity type' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Sanitize metadata
    let sanitizedMetadata: Record<string, any> | undefined
    if (metadata && typeof metadata === 'object') {
      sanitizedMetadata = {}
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof key === 'string' && key.length <= 50) {
          if (typeof value === 'string') {
            sanitizedMetadata[key] = sanitizeInput(value)
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitizedMetadata[key] = value
          }
        }
      }
    }

    const db = await getMongoDb()
    const doc: ActivityDoc = {
      address,
      type,
      metadata: sanitizedMetadata,
      createdAt: new Date(),
    }
    
    await db.collection<ActivityDoc>('activity').insertOne(doc)
    
    return new Response(JSON.stringify({ ok: true }), { 
      status: 201,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': '200',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('Error in activity POST:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: corsHeaders
    })
  }
}


