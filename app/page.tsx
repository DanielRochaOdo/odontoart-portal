import Link from 'next/link';
import Image from 'next/image';
import { getPageBySlug } from './page-builder/service';
import { PageRenderer } from './page-builder/renderer';
import { site } from './data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const page = await getPageBySlug('home');
  if (page?.status === 'published' && page.publishedContent?.content.length) return <main className="public-puck-page"><PageRenderer data={page.publishedContent} /></main>;
  return <main><section className="hero"><div className="hero-copy"><p className="eyebrow">Cuidado que acompanha você</p><h1>Somos especialistas<br/><em>em Planos<br/>Odontológicos.</em></h1><Link className="button" href="/ecommerce-fc/">Faça seu Plano ↗</Link></div><div className="hero-image"><Image src={site.heroImage} alt="Pessoa sorrindo usando o celular" fill priority sizes="(max-width: 800px) 100vw, 50vw" /></div></section></main>;
}
