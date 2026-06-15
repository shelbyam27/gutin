import { NextRequest, NextResponse } from 'next/server';
import { adminApiGuard } from '@/lib/guard';
import { ensureWrScheduler, getSyncState, runWrSync } from '@/lib/wrScheduler';

export async function GET(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  ensureWrScheduler();
  return NextResponse.json({ ok: true, state: getSyncState() });
}

export async function POST(req: NextRequest) {
  const g = adminApiGuard(req); if (g) return g;
  const result = await runWrSync();
  ensureWrScheduler();
  return NextResponse.json({ ok: result.ok, result });
}
