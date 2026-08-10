import { notFound } from 'next/navigation';
import { getPage } from '../../../../page-builder/service';
import { PageRenderer } from '../../../../page-builder/renderer';

export const dynamic = 'force-dynamic';
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) { const page = await getPage((await params).id); if (!page) notFound(); return <main className="page-preview"><p className="preview-badge">Preview de rascunho</p><PageRenderer data={page.draftContent} /></main>; }
