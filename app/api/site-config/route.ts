import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', 'admin-content.json'), 'utf8');
    const store = JSON.parse(raw);
    return Response.json(store.global || {} , { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({}, { headers: { 'Cache-Control': 'no-store' } }); }
}
