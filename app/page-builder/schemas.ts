import type { PageData, PageKind, PageStatus } from './types';

const reservedSlugs = new Set(['admin', 'api', 'login', 'auth', 'dashboard']);
export function normalizeSlug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}
export function isReservedSlug(slug: string) { return reservedSlugs.has(slug); }
export function validSlug(slug: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && !isReservedSlug(slug); }
export function validatePageInput(input: { title?: unknown; slug?: unknown; status?: unknown; kind?: unknown; draftContent?: unknown }) {
  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 180) : '';
  const slug = normalizeSlug(typeof input.slug === 'string' ? input.slug : '');
  const status: PageStatus = input.status === 'published' || input.status === 'archived' ? input.status : 'draft';
  const kind: PageKind = input.kind === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM';
  if (!title) return { ok: false as const, error: 'Informe o título da página.' };
  if (!validSlug(slug)) return { ok: false as const, error: 'Slug inválido ou reservado.' };
  if (typeof input.draftContent !== 'object' || input.draftContent === null) return { ok: false as const, error: 'Conteúdo Puck inválido.' };
  const data = input.draftContent as PageData;
  if (!Array.isArray(data.content) || typeof data.root !== 'object' || data.root === null) return { ok: false as const, error: 'Estrutura Puck inválida.' };
  if (JSON.stringify(data).length > 2_000_000) return { ok: false as const, error: 'O layout excede o tamanho máximo permitido.' };
  return { ok: true as const, value: { title, slug, status, kind, draftContent: data } };
}
