import { notFound } from 'next/navigation';
import { getPage } from '../../../../page-builder/service';
import PageEditor from '../../../editor/PageEditor';

export const dynamic = 'force-dynamic';
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) { const page = await getPage((await params).id); if (!page) notFound(); return <PageEditor page={page} />; }
