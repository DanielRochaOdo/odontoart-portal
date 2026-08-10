import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/admin-auth';
import { mediaBucket, supabaseAdmin } from '../../../../../lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Apenas arquivos de imagem são aceitos.' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'A imagem deve ter no máximo 10 MB.' }, { status: 400 });
    const supabase = supabaseAdmin();
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw new Error(bucketsError.message);
    if (!buckets?.some(bucket => bucket.name === mediaBucket)) {
      const { error: bucketError } = await supabase.storage.createBucket(mediaBucket, { public: true, fileSizeLimit: '10MB', allowedMimeTypes: ['image/*'] });
      if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) throw new Error(bucketError.message);
    }
    const extension = path.extname(file.name).toLowerCase() || '.bin';
    const objectPath = `editor/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
    const { error: uploadError } = await supabase.storage.from(mediaBucket).upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data } = supabase.storage.from(mediaBucket).getPublicUrl(objectPath);
    return NextResponse.json({ path: objectPath, name: file.name, mimeType: file.type, url: data.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao enviar imagem para o Supabase Storage.' }, { status: 500 });
  }
}
