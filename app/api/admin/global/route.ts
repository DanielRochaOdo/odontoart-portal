import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/admin-auth';

const file = path.join(process.cwd(), 'data', 'admin-content.json');
const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
async function store() { return JSON.parse(await fs.readFile(file, 'utf8')); }
function normalize(value: unknown) {
  const input = value && typeof value === 'object' ? value as Record<string, any> : {};
  const header = input.header && typeof input.header === 'object' ? input.header : {};
  const footer = input.footer && typeof input.footer === 'object' ? input.footer : {};
  const cleanItems = (items: unknown) => Array.isArray(items) ? items.slice(0, 50).map(item => ({ label: text(item?.label, 120), href: text(item?.href, 500), enabled: item?.enabled !== false })) : [];
  const columns = Array.isArray(footer.columns) ? footer.columns.slice(0, 12).map((column: any) => ({ title: text(column?.title, 120), items: cleanItems(column?.items) })) : [];
  return { preset: text(input.preset, 40) || 'completo', header: { topbarText: text(header.topbarText, 80), topbarPhone: text(header.topbarPhone, 40), greeting: text(header.greeting, 100), customerLabel: text(header.customerLabel, 100), customerHref: text(header.customerHref, 500), menu: cleanItems(header.menu), servicesLabel: text(header.servicesLabel, 80), services: cleanItems(header.services), ctaLabel: text(header.ctaLabel, 100), ctaHref: text(header.ctaHref, 500) }, footer: { description: text(footer.description, 500), columns, copyright: text(footer.copyright, 300) } };
}

export async function GET() { if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const data = await store(); return NextResponse.json(data.global || {}); }
export async function PUT(request: Request) { if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const body = await request.json().catch(() => null); const data = await store(); data.global = normalize(body); await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8'); return NextResponse.json(data.global); }
