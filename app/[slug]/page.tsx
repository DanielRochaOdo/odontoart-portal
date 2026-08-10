import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pages, pdfs } from '../data';
import { getPageBySlug } from '../page-builder/service';
import { PageRenderer } from '../page-builder/renderer';
import SectionCard from '../ui/SectionCard';

export const dynamic = 'force-dynamic';
export function generateStaticParams() { return Object.keys(pages).map(slug => ({ slug })); }

export default async function InnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const puckPage = await getPageBySlug(slug);
  if (puckPage?.status === 'published' && puckPage.publishedContent) return <main className="public-puck-page"><PageRenderer data={puckPage.publishedContent} /></main>;
  const page = pages[slug];
  if (!page) notFound();
  return <main><section className="page-hero"><p className="eyebrow">{page.eyebrow || 'Odontoart'}</p><h1>{page.title}</h1><p>{page.intro}</p></section><section className="inner-content"><div className="inner-grid">{page.sections.map((section, index) => <SectionCard key={section} index={index}><h3>{section}</h3><p>Conteúdo editável desta seção. Atualize textos, imagens e chamadas sem alterar a estrutura visual.</p></SectionCard>)}</div>{slug === 'ans' && <div className="documents"><h2>Documentos e relatórios</h2>{pdfs.map(pdf => <div className="document" key={pdf}><span>PDF</span><strong>{pdf}</strong><Link href="/">Baixar ↗</Link></div>)}</div>}<Link className="button" href="/contato/">Fale com a Odontoart ↗</Link></section></main>;
}
