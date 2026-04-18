import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/lib/auth';
import { generateConcepts } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { brief, count = 6 } = await req.json();
  if (!brief?.trim()) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 });
  }

  const safeCount = Math.min(Math.max(parseInt(count, 10) || 6, 1), 12);
  const concepts = await generateConcepts(brief.trim(), safeCount);
  return NextResponse.json({ concepts });
}
