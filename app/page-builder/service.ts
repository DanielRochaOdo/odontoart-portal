import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { emptyPageData, type PageData, type PageRecord } from './types';
import { normalizeSlug } from './schemas';
import { pages as sitePages, site } from '../data';

const file = path.join(process.cwd(), 'data', 'admin-content.json');
type Store = { pages?: Array<Record<string, unknown>>; [key: string]: unknown };
type BuilderNode = { type: string; props: Record<string, unknown> };

function now() { return new Date().toISOString(); }
function node(type: string, id: string, props: Record<string, unknown>): BuilderNode { return { type, props: { id, ...props } }; }
function stringValue(value: unknown, fallback = '') { return typeof value === 'string' ? value : fallback; }
function propsOf(value: BuilderNode) { return value.props || {}; }
function contentOf(value: unknown): BuilderNode[] { return Array.isArray(value) ? value.filter((item): item is BuilderNode => Boolean(item && typeof item === 'object' && typeof (item as BuilderNode).type === 'string' && typeof (item as BuilderNode).props === 'object')).map(upgradeNode) : []; }
function benefitsSection(id: string, items: string[], eyebrow = 'Por que escolher a Odontoart?', title = 'Vantagens para você e sua família'): BuilderNode {
  const cards = items.map((text, index) => node('Section', `${id}-item-${index + 1}`, { background: 'white', padding: 'md', minHeight: 'sm', width: 'full', aspectRatio: 'auto', radius: 'md', border: true, align: 'left', content: [node('Text', `${id}-item-${index + 1}-number`, { text: String(index + 1).padStart(2, '0'), size: 'sm', align: 'left', color: 'accent' }), node('Heading', `${id}-item-${index + 1}-title`, { text, tag: 'h3', size: 'lg', align: 'left', color: 'secondary' }), node('Text', `${id}-item-${index + 1}-description`, { text: 'Mais tranquilidade e acesso ao cuidado que você merece.', size: 'sm', align: 'left', color: 'secondary' })] }));
  return node('Section', id, { background: 'white', padding: 'lg', minHeight: 'auto', width: 'full', aspectRatio: 'auto', radius: 'none', border: false, align: 'left', content: [node('Eyebrow', `${id}-eyebrow`, { text: eyebrow, align: 'left', color: 'primary' }), node('Heading', `${id}-title`, { text: title, tag: 'h2', size: '3xl', align: 'left', color: 'secondary' }), node('Columns', `${id}-columns`, { columns: '4', gap: 'sm', content: cards })] });
}

function heroChildren(props: Record<string, unknown>, id: string): BuilderNode[] {
  const children = [
    node('Eyebrow', `${id}-eyebrow`, { text: stringValue(props.eyebrow, 'Odontoart'), align: 'left', color: 'primary' }),
    node('Heading', `${id}-title`, { text: stringValue(props.title, 'Novo título'), tag: 'h1', size: '5xl', align: 'left', color: 'secondary' }),
    node('Text', `${id}-description`, { text: stringValue(props.description, ''), size: 'lg', align: 'left', color: 'secondary' }),
  ];
  if (stringValue(props.primaryText)) children.push(node('Button', `${id}-primary`, { text: stringValue(props.primaryText), url: stringValue(props.primaryUrl, '/'), target: '_self', variant: 'primary', size: 'md', align: 'left' }));
  if (stringValue(props.secondaryText)) children.push(node('Link', `${id}-secondary`, { text: stringValue(props.secondaryText), url: stringValue(props.secondaryUrl, '/'), target: '_self', color: 'secondary', underline: false }));
  return children;
}

function upgradeNode(value: BuilderNode): BuilderNode {
  const props = propsOf(value);
  const id = stringValue(props.id, randomUUID());
  if (value.type === 'Hero' && !Array.isArray(props.content)) return { type: 'Hero', props: { id, image: stringValue(props.image), layout: stringValue(props.layout, 'imageRight'), content: heroChildren(props, id) } };
  if (value.type === 'SiteHero' && !Array.isArray(props.content)) return { type: 'EditableHero', props: { id, image: stringValue(props.image), content: [node('Eyebrow', `${id}-eyebrow`, { text: stringValue(props.eyebrow, 'Cuidado que acompanha você'), align: 'left', color: 'primary' }), node('Heading', `${id}-title`, { text: stringValue(props.title, 'Somos especialistas'), tag: 'h1', size: '5xl', align: 'left', color: 'secondary' }), node('Text', `${id}-highlight`, { text: stringValue(props.highlight, ''), size: 'lg', align: 'left', color: 'accent' }), node('Button', `${id}-button`, { text: stringValue(props.buttonText, 'Faça seu Plano'), url: stringValue(props.buttonUrl, '/'), target: '_self', variant: 'primary', size: 'md', align: 'left' })] } };
  if (value.type === 'BenefitsGrid' && (typeof props.items === 'string' || Array.isArray(props.items))) {
    const legacyItems = typeof props.items === 'string'
      ? stringValue(props.items).split('\n').filter(Boolean)
      : contentOf(props.items).map(item => stringValue(item.props.title, stringValue(item.props.text))).filter(Boolean);
    const header = contentOf(props.header);
    const eyebrow = header.find(item => item.type === 'Eyebrow');
    const title = header.find(item => item.type === 'Heading');
    return benefitsSection(id, legacyItems, stringValue(eyebrow?.props.text, stringValue(props.eyebrow, 'Por que escolher a Odontoart?')), stringValue(title?.props.text, stringValue(props.title, 'Vantagens para você e sua família')));
  }
  if (value.type === 'NetworkBanner' && !Array.isArray(props.content)) return { type: 'NetworkBanner', props: { id, metric: stringValue(props.metric, '+ 4.000'), content: [node('Eyebrow', `${id}-eyebrow`, { text: stringValue(props.eyebrow, 'Onde você estiver'), align: 'left', color: 'white' }), node('Heading', `${id}-title`, { text: stringValue(props.title, 'Encontre especialistas em nossa rede credenciada por todo o Brasil'), tag: 'h2', size: '3xl', align: 'left', color: 'white' }), node('Link', `${id}-link`, { text: stringValue(props.linkText, 'Ver rede completa →'), url: stringValue(props.linkUrl, '/rede-credenciada/'), target: '_self', color: 'accent', underline: false })] } };
  if (value.type === 'AudiencePanels' && (!Array.isArray(props.businessContent) || !Array.isArray(props.familyContent))) return { type: 'AudiencePanels', props: { id, businessContent: [node('Eyebrow', `${id}-business-eyebrow`, { text: 'Para empresas', align: 'left', color: 'primary' }), node('Heading', `${id}-business-title`, { text: stringValue(props.businessTitle, 'Planos para sua Empresa!'), tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', `${id}-business-button`, { text: 'Conheça os planos →', url: stringValue(props.businessUrl, '/planos-empresa/'), target: '_self', variant: 'outline', size: 'md', align: 'left' })], familyContent: [node('Eyebrow', `${id}-family-eyebrow`, { text: 'Para você', align: 'left', color: 'accent' }), node('Heading', `${id}-family-title`, { text: stringValue(props.familyTitle, 'Planos para você e sua família!'), tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', `${id}-family-button`, { text: 'Faça seu Plano →', url: stringValue(props.familyUrl, '/ecommerce-fc/'), target: '_self', variant: 'primary', size: 'md', align: 'left' })] } };
  if (value.type === 'AppPromo' && !Array.isArray(props.content)) return { type: 'AppPromo', props: { id, content: [node('Eyebrow', `${id}-eyebrow`, { text: stringValue(props.eyebrow, 'Tecnologia para simplificar'), align: 'left', color: 'primary' }), node('Heading', `${id}-title`, { text: stringValue(props.title, 'Baixe nosso aplicativo Odontoart'), tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Text', `${id}-text`, { text: stringValue(props.text, ''), size: 'base', align: 'left', color: 'secondary' }), node('Link', `${id}-link`, { text: stringValue(props.linkText, 'Saiba como baixar →'), url: stringValue(props.linkUrl, '/passo-a-passo-app/'), target: '_self', color: 'accent', underline: false })] } };
  if (value.type === 'CTA' && !Array.isArray(props.content)) return { type: 'CTA', props: { id, theme: stringValue(props.theme, 'primary'), content: [node('Heading', `${id}-title`, { text: stringValue(props.title, 'Pronto para começar?'), tag: 'h2', size: '2xl', align: 'center', color: 'white' }), node('Text', `${id}-text`, { text: stringValue(props.text, ''), size: 'base', align: 'center', color: 'white' }), node('Button', `${id}-button`, { text: stringValue(props.buttonText, 'Fale conosco'), url: stringValue(props.buttonUrl, '/contato/'), target: '_self', variant: 'primary', size: 'md', align: 'center' })] } };
  const nextProps = { ...props };
  for (const key of ['content', 'header', 'items', 'businessContent', 'familyContent']) if (Array.isArray(nextProps[key])) nextProps[key] = contentOf(nextProps[key]);
  return { type: value.type, props: nextProps };
}

function isNode(value: unknown): value is BuilderNode {
  return Boolean(value && typeof value === 'object' && typeof (value as BuilderNode).type === 'string' && (value as BuilderNode).props && typeof (value as BuilderNode).props === 'object');
}

function ensureUniqueIds(data: PageData): PageData {
  const used = new Set<string>();
  const normalize = (value: BuilderNode): BuilderNode => {
    const props = { ...value.props };
    const originalId = stringValue(props.id, randomUUID());
    let id = originalId;
    while (used.has(id)) id = `${originalId}-${randomUUID().slice(0, 8)}`;
    used.add(id);
    props.id = id;
    for (const [key, child] of Object.entries(props)) {
      if (Array.isArray(child)) props[key] = child.map(item => isNode(item) ? normalize(item) : item);
    }
    return { type: value.type, props };
  };
  return { ...data, content: data.content.filter(isNode).map(normalize) };
}

function upgradePageData(data: PageData): PageData {
  const upgraded = { ...data, content: Array.isArray(data.content) ? data.content.filter(isNode).map(item => upgradeNode(item)) : [] };
  return ensureUniqueIds(upgraded);
}

function isHomeBenefitCard(value: BuilderNode): boolean {
  return value.type === 'Section' && /^home-benefits-item-\d+$/.test(stringValue(value.props.id));
}

function removeNestedHomeBenefitCards(value: BuilderNode, extracted: BuilderNode[]): BuilderNode {
  const props = { ...value.props };
  for (const [key, child] of Object.entries(props)) {
    if (!Array.isArray(child)) continue;
    props[key] = child
      .filter(isNode)
      .flatMap(item => {
        if (isHomeBenefitCard(item)) {
          extracted.push(item);
          return [];
        }
        return [removeNestedHomeBenefitCards(item, extracted)];
      });
  }
  return { type: value.type, props };
}

function normalizeHomeBenefitGrid(data: PageData): PageData {
  const normalize = (value: BuilderNode): BuilderNode => {
    const props = { ...value.props };
    if (props.id === 'home-benefits-columns' && Array.isArray(props.content)) {
      const extracted: BuilderNode[] = [];
      const direct = props.content.filter(isNode).map(item => removeNestedHomeBenefitCards(item, extracted));
      const allCards = [...direct.filter(isHomeBenefitCard), ...extracted];
      if (extracted.length > 0 || direct.some(item => !isHomeBenefitCard(item))) {
        allCards.sort((a, b) => Number(stringValue(a.props.id).match(/\d+$/)?.[0] || 0) - Number(stringValue(b.props.id).match(/\d+$/)?.[0] || 0));
        props.content = allCards;
      }
    }
    for (const [key, child] of Object.entries(props)) {
      if (Array.isArray(child) && key === 'content' && value.props.id === 'home-benefits-columns') continue;
      if (Array.isArray(child)) props[key] = child.filter(isNode).map(normalize);
    }
    return { type: value.type, props };
  };

  return { ...data, content: data.content.map(normalize) };
}

function isSyntheticEmptySystemDraft(data: PageData, published: PageData | null): boolean {
  if (!published || data.content.length === 0 || published.content.length <= data.content.length || data.content.length > 4) return false;
  const structural = new Set(['Section', 'Container', 'Columns', 'Table', 'Div']);
  return data.content.every(item => structural.has(item.type) && Object.entries(item.props).every(([key, value]) => key === 'id' || !Array.isArray(value) || value.length === 0));
}
function hasPuckData(value: unknown): value is PageRecord['draftContent'] { return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as Record<string, unknown>).content)); }
function puckData(value: unknown) { return hasPuckData(value) ? value : emptyPageData; }

function systemContent(slug: string, title: string, eyebrow: string, intro: string, sections: string[]): PageRecord['draftContent'] {
  if (slug === 'home') return { root: {}, content: [
    { type: 'EditableHero', props: { id: 'home-hero', image: site.heroImage, content: [node('Eyebrow', 'hero-eyebrow', { text: 'Cuidado que acompanha você', align: 'left', color: 'primary' }), node('Heading', 'hero-title', { text: 'Somos especialistas em Planos Odontológicos.', tag: 'h1', size: '5xl', align: 'left', color: 'secondary' }), node('Button', 'hero-button', { text: 'Faça seu Plano', url: '/ecommerce-fc/', target: '_self', variant: 'primary', size: 'md', align: 'left' })] } },
    benefitsSection('home-benefits', ['Clube de Vantagens Odontoart', 'Ampla rede de clínicas próprias e credenciadas', 'Urgência 24h', 'Identificação biométrica', 'Tratamento planejado e com hora marcada', 'Marcação de consultas on-line', 'Utilização do plano sem necessidade de perícia']),
    { type: 'NetworkBanner', props: { id: 'home-network', metric: '+ 4.000', content: [node('Eyebrow', 'network-eyebrow', { text: 'Onde você estiver', align: 'left', color: 'white' }), node('Heading', 'network-title', { text: 'Encontre especialistas em nossa rede credenciada por todo o Brasil', tag: 'h2', size: '3xl', align: 'left', color: 'white' }), node('Link', 'network-link', { text: 'Ver rede completa →', url: '/rede-credenciada/', target: '_self', color: 'accent', underline: false })] } },
    { type: 'AudiencePanels', props: { id: 'home-audience', businessContent: [node('Eyebrow', 'business-eyebrow', { text: 'Para empresas', align: 'left', color: 'primary' }), node('Heading', 'business-title', { text: 'Planos para sua Empresa!', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', 'business-button', { text: 'Conheça os planos →', url: '/planos-empresa/', target: '_self', variant: 'outline', size: 'md', align: 'left' })], familyContent: [node('Eyebrow', 'family-eyebrow', { text: 'Para você', align: 'left', color: 'accent' }), node('Heading', 'family-title', { text: 'Planos para você e sua família!', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', 'family-button', { text: 'Faça seu Plano →', url: '/ecommerce-fc/', target: '_self', variant: 'primary', size: 'md', align: 'left' })] } },
    { type: 'AppPromo', props: { id: 'home-app', content: [node('Eyebrow', 'app-eyebrow', { text: 'Tecnologia para simplificar', align: 'left', color: 'primary' }), node('Heading', 'app-title', { text: 'Baixe nosso aplicativo Odontoart', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Text', 'app-text', { text: 'Marque consultas com rapidez e facilidade. Com o App da Odontoart você tem tudo na mão.', size: 'base', align: 'left', color: 'secondary' }), node('Link', 'app-link', { text: 'Saiba como baixar →', url: '/passo-a-passo-app/', target: '_self', color: 'accent', underline: false })] } },
  ] };
  return { root: {}, content: [
    { type: 'Hero', props: { id: `${slug}-hero`, image: '', layout: 'left', content: [node('Eyebrow', `${slug}-eyebrow`, { text: eyebrow || 'Odontoart', align: 'left', color: 'primary' }), node('Heading', `${slug}-title`, { text: title, tag: 'h1', size: '5xl', align: 'left', color: 'secondary' }), node('Text', `${slug}-intro`, { text: intro, size: 'lg', align: 'left', color: 'secondary' }), node('Button', `${slug}-button`, { text: 'Fale conosco', url: '/contato/', target: '_self', variant: 'primary', size: 'md', align: 'left' })] } },
    { type: 'Section', props: { id: `${slug}-content`, background: 'white', padding: 'lg', minHeight: 'auto', align: 'left', content: [node('Heading', `${slug}-content-title`, { text: 'Conteúdo da página', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), ...sections.map((text, index) => node('Text', `${slug}-section-${index}`, { text, size: 'base', align: 'left', color: 'secondary' }))] } },
  ] };
}

function systemPage(slug: string, title: string, eyebrow: string | undefined, intro: string, sections: string[]): PageRecord { const content = systemContent(slug, title, eyebrow || '', intro, sections); const timestamp = now(); return { id: `system-${slug}`, title, slug, description: intro, status: 'published', kind: 'SYSTEM', draftContent: content, publishedContent: content, createdAt: timestamp, updatedAt: timestamp, publishedAt: timestamp }; }

export function fromStored(input: Record<string, unknown>): PageRecord {
  const legacy = input.projectData && typeof input.projectData === 'object' ? { html: String(input.html || ''), css: String(input.css || ''), projectData: input.projectData as Record<string, unknown> } : undefined;
  const publishedValue = puckData(input.publishedContent);
  const publishedContent = hasPuckData(input.publishedContent) ? normalizeHomeBenefitGrid(upgradePageData(publishedValue)) : null;
  const storedDraft = puckData(input.draftContent || input.publishedContent);
  const normalizedDraft = normalizeHomeBenefitGrid(upgradePageData(storedDraft));
  const kind = input.kind === 'SYSTEM' ? 'SYSTEM' : 'CUSTOM';
  // Recupera somente o caso claramente corrompido em que uma página de sistema
  // foi salva como poucos blocos estruturais vazios, embora ainda tenha uma
  // versão publicada completa. Rascunhos válidos continuam sendo a fonte.
  const draftContent: PageData = kind === 'SYSTEM' && publishedContent && isSyntheticEmptySystemDraft(normalizedDraft, publishedContent) ? publishedContent : normalizedDraft;
  const resolvedPublished = publishedContent || (input.status === 'published' ? draftContent : null);
  return { id: String(input.id || randomUUID()), title: String(input.title || 'Nova página'), slug: normalizeSlug(String(input.slug || 'nova-pagina')), description: String(input.description || ''), status: input.status === 'published' ? 'published' : 'draft', kind, draftContent, publishedContent: resolvedPublished, seoTitle: String(input.seoTitle || ''), seoDescription: String(input.seoDescription || ''), createdAt: String(input.createdAt || now()), updatedAt: String(input.updatedAt || now()), publishedAt: typeof input.publishedAt === 'string' ? input.publishedAt : null, legacy };
}

async function readStore(): Promise<Store> { return JSON.parse(await fs.readFile(file, 'utf8')) as Store; }
async function writeStore(store: Store) { await fs.writeFile(file, `${JSON.stringify(store, null, 2)}\n`, 'utf8'); }

export async function listPages() {
  const store = await readStore();
  const stored = (Array.isArray(store.pages) ? store.pages : []).map(fromStored);
  const storedSlugs = new Set(stored.map(page => page.slug));
  const existing = Object.entries(sitePages).filter(([slug]) => !storedSlugs.has(slug)).map(([slug, page]) => systemPage(slug, page.title, page.eyebrow, page.intro, page.sections));
  const home = storedSlugs.has('home') ? [] : [systemPage('home', 'Página Inicial', 'Odontoart', 'Conteúdo principal da página inicial do site.', [])];
  return [...home, ...existing, ...stored];
}
export async function getPage(id: string) { return (await listPages()).find(page => page.id === id) || null; }
export async function getPageBySlug(slug: string) { return (await listPages()).find(page => page.slug === slug) || null; }
export async function savePage(page: PageRecord) { const store = await readStore(); const pages = Array.isArray(store.pages) ? store.pages : []; const index = pages.findIndex(item => String(item.id) === page.id); const next = { ...page, updatedAt: now() }; if (index >= 0) pages[index] = next; else pages.push(next); store.pages = pages; await writeStore(store); return next; }
export async function createPage(title: string, slug: string, content = emptyPageData) { const page: PageRecord = { id: randomUUID(), title, slug, status: 'draft', kind: 'CUSTOM', draftContent: content, publishedContent: null, createdAt: now(), updatedAt: now(), publishedAt: null }; return savePage(page); }
export async function deletePage(id: string) { const store = await readStore(); const pages = Array.isArray(store.pages) ? store.pages : []; const target = pages.find(item => String(item.id) === id); if (target && target.kind === 'SYSTEM') throw new Error('Páginas do sistema não podem ser excluídas.'); store.pages = pages.filter(item => String(item.id) !== id); await writeStore(store); }
