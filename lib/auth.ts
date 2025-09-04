import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// JWT Secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
const API_KEY_SECRET = process.env.API_KEY_SECRET || 'your-api-key-secret-change-this'

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface AuthUser {
  address: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// Generate JWT token for authenticated users
export function generateToken(address: string, role: 'user' | 'admin' = 'user'): string {
  const payload: AuthUser = {
    address: address.toLowerCase(),
    role
  }
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'shardtalk-api'
  })
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    return decoded
  } catch (error) {
    return null
  }
}

// Generate API key for admin access
export function generateApiKey(): string {
  const key = crypto.randomBytes(32).toString('hex')
  const hashedKey = crypto.createHmac('sha256', API_KEY_SECRET).update(key).digest('hex')
  return `${key}.${hashedKey}`
}

// Verify API key
export function verifyApiKey(apiKey: string): boolean {
  try {
    const [key, hash] = apiKey.split('.')
    if (!key || !hash) return false
    
    const expectedHash = crypto.createHmac('sha256', API_KEY_SECRET).update(key).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
  } catch (error) {
    return false
  }
}

// Rate limiting middleware
export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig = { windowMs: 15 * 60 * 1000, maxRequests: 100 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `rate_limit:${identifier}`
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [k, v] of rateLimitStore.entries()) {
        if (now > v.resetTime) {
          rateLimitStore.delete(k)
        }
      }
    }
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }
  
  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    }
  }
  
  current.count++
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime
  }
}

// Extract authentication from request
export function getAuthFromRequest(req: NextRequest): { user: AuthUser | null; isApiKey: boolean } {
  // Check for API key in headers
  const apiKey = req.headers.get('x-api-key')
  if (apiKey && verifyApiKey(apiKey)) {
    return {
      user: { address: 'api-key', role: 'admin' },
      isApiKey: true
    }
  }
  
  // Check for JWT token in Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (user) {
      return { user, isApiKey: false }
    }
  }
  
  // Check for JWT token in cookies
  const cookieToken = req.cookies.get('auth-token')?.value
  if (cookieToken) {
    const user = verifyToken(cookieToken)
    if (user) {
      return { user, isApiKey: false }
    }
  }
  
  return { user: null, isApiKey: false }
}

// Authentication middleware
export function requireAuth(requiredRole: 'user' | 'admin' = 'user') {
  return function authMiddleware(req: NextRequest): { 
    success: boolean
    user?: AuthUser
    error?: string
    statusCode?: number
  } {
    const { user, isApiKey } = getAuthFromRequest(req)
    
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      }
    }
    
    if (requiredRole === 'admin' && user.role !== 'admin' && !isApiKey) {
      return {
        success: false,
        error: 'Admin access required',
        statusCode: 403
      }
    }
    
    return {
      success: true,
      user
    }
  }
}

// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

// Validate request origin
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',')
  
  if (!origin) return true // Allow requests without origin (like Postman)
  return allowedOrigins.includes(origin)
}

// Input validation helpers
export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{1,20}$/.test(username)
}

export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 1000) // Limit length and trim
}
