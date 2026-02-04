import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===========================================
// CLAW JOBS - MIDDLEWARE
// Security headers + CORS configuration
// ===========================================

// Public API routes that allow any origin
const PUBLIC_API_ROUTES = [
  '/api/gigs',
  '/api/stats', 
  '/api/health',
  '/api/categories',
  '/api/openapi',
  '/api/skill',
  '/api/users',
];

// Sensitive routes that should restrict CORS
const SENSITIVE_API_ROUTES = [
  '/api/admin',
  '/api/webhooks',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
}

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_API_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
}

function getAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin') || '';
  const pathname = request.nextUrl.pathname;
  
  // Sensitive routes: only allow same-origin or specific domains
  if (isSensitiveRoute(pathname)) {
    const allowedOrigins = [
      'https://claw-jobs.com',
      'https://www.claw-jobs.com',
      'http://localhost:3000', // Dev
    ];
    return allowedOrigins.includes(origin) ? origin : 'https://claw-jobs.com';
  }
  
  // Public routes: allow any origin (needed for agent API access)
  return '*';
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': getAllowedOrigin(request),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-admin-secret',
        'Access-Control-Max-Age': '86400',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  }

  const response = NextResponse.next();
  
  // Add security headers to ALL responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add CORS headers to API responses
  if (pathname.startsWith('/api')) {
    response.headers.set('Access-Control-Allow-Origin', getAllowedOrigin(request));
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-admin-secret');
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Also match main pages for security headers
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
