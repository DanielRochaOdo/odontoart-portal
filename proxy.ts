import { NextRequest, NextResponse } from 'next/server';

function unauthorized() {
  return new NextResponse('Autenticação de administrador necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Odontoart Admin", charset="UTF-8"', 'Cache-Control': 'no-store' }
  });
}

export function proxy(request: NextRequest) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const configured = Boolean(expectedUser && expectedPassword);
  const authorization = request.headers.get('authorization');

  if (!configured || !authorization?.startsWith('Basic ')) return unauthorized();
  const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  const user = separator >= 0 ? decoded.slice(0, separator) : '';
  const password = separator >= 0 ? decoded.slice(separator + 1) : '';

  if (user !== expectedUser || password !== expectedPassword) return unauthorized();

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
