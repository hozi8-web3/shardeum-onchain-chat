import { NextRequest } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'
import { 
  requireAuth, 
  checkRateLimit, 
  validateOrigin, 
  corsHeaders, 
  generateApiKey 
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
    const rateLimit = checkRateLimit(`admin_keys_get:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 20 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    // Require admin authentication
    const auth = requireAuth('admin')(req)
    if (!auth.success) {
      return new Response(JSON.stringify({ error: auth.error }), { 
        status: auth.statusCode || 401,
        headers: corsHeaders
      })
    }

    const db = await getMongoDb()
    const keys = await db.collection('api_keys')
      .find({}, { projection: { key: 1, createdAt: 1, lastUsed: 1, description: 1 } })
      .sort({ createdAt: -1 })
      .toArray()

    return new Response(JSON.stringify({ keys }), { 
      status: 200,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('Error in admin keys GET:', error)
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
    const rateLimit = checkRateLimit(`admin_keys_post:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    // Require admin authentication
    const auth = requireAuth('admin')(req)
    if (!auth.success) {
      return new Response(JSON.stringify({ error: auth.error }), { 
        status: auth.statusCode || 401,
        headers: corsHeaders
      })
    }

    const body = await req.json()
    const description = body.description || 'API Key'

    // Generate new API key
    const apiKey = generateApiKey()
    const db = await getMongoDb()
    
    await db.collection('api_keys').insertOne({
      key: apiKey,
      description,
      createdAt: new Date(),
      lastUsed: null
    })

    return new Response(JSON.stringify({ 
      apiKey,
      description,
      createdAt: new Date()
    }), { 
      status: 201,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('Error in admin keys POST:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: corsHeaders
    })
  }
}
