import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/admin-auth';

type Resource = 'banners' | 'pages' | 'webhooks';
const file = path.join(process.cwd(), 'data', 'admin-content.json');
const allowed: Resource[] = ['banners', 'pages', 'webhooks'];

async function readStore() {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw) as Record<Resource, Array<Record<string, unknown>>>;
}
async function writeStore(store: Record<Resource, Array<Record<string, unknown>>>) {
  await fs.writeFile(file, JSON.stringify(store, null, 2) + '\n', 'utf8');
}
function validResource(value: unknown): value is Resource { return typeof value === 'string' && allowed.includes(value as Resource); }
function safeText(value: unknown, max = 10000) { return typeof value === 'string' ? value.slice(0, max) : ''; }

export async function GET(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const resource = new URL(request.url).searchParams.get('resource') || 'banners';
  if (!validResource(resource)) return NextResponse.json({ error: 'Recurso inválido' }, { status: 400 });
  const store = await readStore();
  return NextResponse.json(store[resource], { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resource = body?.resource;
  if (!validResource(resource)) return NextResponse.json({ error: 'Recurso inválido' }, { status: 400 });
  const value = body?.value;
  if (!value || typeof value !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const item: Record<string, unknown> = { ...(value as Record<string, unknown>), id: safeText((value as Record<string, unknown>).id, 120) || randomUUID() };
  if (resource === 'pages') {
    item.slug = safeText(item.slug, 120).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    item.title = safeText(item.title, 180);
    item.html = safeText(item.html, 100000);
    item.css = safeText(item.css, 100000);
    item.js = safeText(item.js, 100000);
    item.python = safeText(item.python, 100000);
    if (!item.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(item.slug))) return NextResponse.json({ error: 'Slug inválido.' }, { status: 400 });
  }
  const store = await readStore();
  store[resource].push(item);
  await writeStore(store);
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resource = body?.resource;
  const id = safeText(body?.id, 120);
  if (!validResource(resource) || !id || !body?.value || typeof body.value !== 'object') return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const store = await readStore();
  const index = store[resource].findIndex(item => item.id === id);
  if (index < 0) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
  const merged: Record<string, unknown> = { ...store[resource][index], ...(body.value as Record<string, unknown>), id };
  if (resource === 'pages') {
    if (typeof merged.slug === 'string') merged.slug = merged.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    store[resource][index] = merged;
  } else {
    store[resource][index] = merged;
  }
  await writeStore(store);
  return NextResponse.json(store[resource][index]);
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resource = body?.resource;
  const id = safeText(body?.id, 120);
  if (!validResource(resource) || !id) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const store = await readStore();
  const before = store[resource].length;
  store[resource] = store[resource].filter(item => item.id !== id);
  if (store[resource].length === before) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
