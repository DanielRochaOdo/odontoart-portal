import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/admin-auth';

function allowedHost(url: URL) {
  const allowlist = (process.env.ADMIN_WEBHOOK_ALLOWLIST || '').split(',').map(value => value.trim()).filter(Boolean);
  return allowlist.length > 0 && allowlist.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as { url?: unknown; secret?: unknown } | null;
  if (typeof body?.url !== 'string') return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  let url: URL;
  try { url = new URL(body.url); } catch { return NextResponse.json({ error: 'URL inválida' }, { status: 400 }); }
  if (url.protocol !== 'https:' || !allowedHost(url)) return NextResponse.json({ error: 'O host precisa estar na ADMIN_WEBHOOK_ALLOWLIST e usar HTTPS.' }, { status: 400 });
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(typeof body.secret === 'string' && body.secret ? { 'X-Webhook-Secret': body.secret.slice(0, 300) } : {}) }, body: JSON.stringify({ event: 'odontoart.admin.test', sentAt: new Date().toISOString(), source: 'odontoart-admin' }), cache: 'no-store' });
  return NextResponse.json({ ok: response.ok, status: response.status }, { status: response.ok ? 200 : 502 });
}
