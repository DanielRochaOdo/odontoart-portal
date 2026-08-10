import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/admin-auth';
import { createPage, listPages } from '../../../../app/page-builder/service';
import { normalizeSlug, validatePageInput } from '../../../../app/page-builder/schemas';

export async function POST(request: Request) { if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 }); const body = await request.json().catch(() => null) as { title?: unknown; slug?: unknown } | null; const title = typeof body?.title === 'string' ? body.title.trim() : ''; const slug = normalizeSlug(typeof body?.slug === 'string' ? body.slug : title); const existing = await listPages(); if (existing.some(page => page.slug === slug)) return NextResponse.json({ error: 'Este slug já está em uso.' }, { status: 409 }); const validation = validatePageInput({ title, slug, draftContent: { content: [], root: {} } }); if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 }); return NextResponse.json(await createPage(validation.value.title, slug), { status: 201 }); }
