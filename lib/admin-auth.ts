import { headers } from 'next/headers';

export async function isAdminRequest() {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get('authorization');
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword || !authorization?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  return separator >= 0 && decoded.slice(0, separator) === expectedUser && decoded.slice(separator + 1) === expectedPassword;
}
