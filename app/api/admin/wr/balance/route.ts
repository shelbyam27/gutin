import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { wrBalance } from '@/lib/warungrebahan';

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  try {
    const data = await wrBalance();
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
