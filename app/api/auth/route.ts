import { NextRequest } from 'next/server'
import { 
  generateToken, 
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
    const rateLimit = checkRateLimit(`auth_post:${clientIP}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 })
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }), { 
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        }
      })
    }

    const body = await req.json()
    const address = sanitizeInput(body.address || '').toLowerCase()
    const role = sanitizeInput(body.role || 'user') as 'user' | 'admin'

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

    if (!['user', 'admin'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    // Generate JWT token
    const token = generateToken(address, role)

    return new Response(JSON.stringify({ 
      token,
      expiresIn: '24h',
      role 
    }), { 
      status: 200,
      headers: {
        ...corsHeaders,
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    })
  } catch (error) {
    console.error('Error in auth POST:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: corsHeaders
    })
  }
}
