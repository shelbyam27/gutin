import { getSetting } from './settings';
import { assertSafeOutboundUrl } from './ssrf';

export interface WrVariant {
  id: string;
  name: string;
  price: number;
  duration: string;
  type: string;
  warranty: string;
  stock: number;
  terms: string | null;
  delivery_terms: string | null;
}

export interface WrProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  variants: WrVariant[];
}

export interface WrOrderResponse {
  order_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  current_balance: number;
  is_test?: boolean;
}

export interface WrTransaction {
  order_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  products?: any[];
  account_details?: any[];
  created_at: string;
}

interface WrEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface MarginConfig {
  mode: 'percent' | 'fixed';
  value: number;
}

function creds(): { apiKey: string; baseUrl: string } {
  const apiKey = getSetting('wr_api_key').trim();
  const baseUrl = (getSetting('wr_base_url').trim() || 'https://warungrebahan.com/api/v1').replace(/\/$/, '');
  if (!apiKey) {
    throw new Error('Warung Rebahan belum dikonfigurasi. Isi API Key di Admin → Pengaturan.');
  }
  assertSafeOutboundUrl(baseUrl, 'wr_base_url');
  return { apiKey, baseUrl };
}

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const { apiKey, baseUrl } = creds();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ api_key: apiKey, ...body }),
    cache: 'no-store',
  });
  const text = await res.text();
  let parsed: WrEnvelope<T>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Warung Rebahan ${path} response bukan JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok || !parsed.success) {
    const m = parsed?.message || `HTTP ${res.status}`;
    throw new Error(`Warung Rebahan ${path}: ${m}`);
  }
  return (parsed.data ?? ({} as T));
}

export async function wrBalance(): Promise<{ balance: number; currency: string }> {
  return postJson<{ balance: number; currency: string }>('/balance');
}

export async function wrProducts(): Promise<WrProduct[]> {
  const data = await postJson<WrProduct[]>('/products');
  return Array.isArray(data) ? data : [];
}

export async function wrCreateOrder(opts: {
  variantId: string;
  emailInvite?: string;
  quantity?: number;
  voucherCode?: string;
  isTest?: boolean;
}): Promise<WrOrderResponse> {
  const body: Record<string, unknown> = { variant_id: opts.variantId };
  if (opts.emailInvite) body.email_invite = opts.emailInvite;
  if (opts.quantity && opts.quantity > 1) body.quantity = opts.quantity;
  if (opts.voucherCode) body.voucher_code = opts.voucherCode;
  if (opts.isTest) body.is_test = true;
  return postJson<WrOrderResponse>('/order', body);
}

export async function wrTransactions(): Promise<WrTransaction[]> {
  const data = await postJson<WrTransaction[]>('/transactions');
  return Array.isArray(data) ? data : [];
}

export async function wrFindTransaction(orderId: string): Promise<WrTransaction | null> {
  const list = await wrTransactions();
  return list.find((t) => t.order_id === orderId) ?? null;
}

export async function wrScrapeImages(): Promise<Record<string, string>> {
  const baseUrl = (getSetting('wr_base_url').trim() || 'https://warungrebahan.com/api/v1').replace(/\/$/, '');
  const origin = baseUrl.replace(/\/api\/v\d+$/, '');
  try {
    assertSafeOutboundUrl(origin, 'wr_base_url');
  } catch {
    return {};
  }
  try {
    const res = await fetch(`${origin}/products`, {
      headers: { 'User-Agent': 'Mozilla/5.0 GutInc/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const html = await res.text();
    const map: Record<string, string> = {};
    const re = /"url":\s*"https?:\/\/[^"]+\/products\/([0-9a-f-]{36})"[\s\S]{0,400}?"image":\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const uuid = match[1];
      const img = match[2];
      if (uuid && img) map[uuid] = img;
    }
    return map;
  } catch {
    return {};
  }
}

export function applyMargin(cost: number, m: MarginConfig, opts: { roundTo?: number; minMargin?: number } = {}): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  const roundTo = Math.max(1, Math.floor(opts.roundTo ?? 1));
  const minMargin = Math.max(0, Math.floor(opts.minMargin ?? 0));
  let raw: number;
  if (m.mode === 'percent') {
    raw = cost * (1 + Math.max(0, m.value) / 100);
  } else {
    raw = cost + Math.max(0, m.value);
  }
  if (minMargin > 0 && raw - cost < minMargin) raw = cost + minMargin;
  const rounded = Math.ceil(raw / roundTo) * roundTo;
  return Math.max(500, rounded);
}

export function readDefaultMargin(): MarginConfig {
  const mode = (getSetting('wr_default_margin_mode') || 'percent').toLowerCase();
  const value = Number(getSetting('wr_default_margin_value') || '15') || 0;
  return { mode: mode === 'fixed' ? 'fixed' : 'percent', value };
}

export function readPriceOpts(): { roundTo: number; minMargin: number } {
  const roundTo = Math.max(1, Number(getSetting('wr_round_to') || '500') || 500);
  const minMargin = Math.max(0, Number(getSetting('wr_min_margin_rp') || '0') || 0);
  return { roundTo, minMargin };
}

export function slugifyWr(name: string, wrId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const tail = wrId.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  return base ? `${base}-${tail}` : `wr-${tail}`;
}

export function categorize(raw: string | null | undefined): string {
  const known = new Set(['streaming', 'music', 'ai', 'design', 'social', 'game', 'edu', 'vpn']);
  const c = (raw || '').toLowerCase();
  if (known.has(c)) return c;
  if (/stream|movie|tv|nonton/.test(c)) return 'streaming';
  if (/music|audio|song/.test(c)) return 'music';
  if (/ai|gpt|claude/.test(c)) return 'ai';
  if (/design|art|edit|video|productivity/.test(c)) return 'design';
  if (/edu|learn|course/.test(c)) return 'edu';
  if (/vpn|proxy/.test(c)) return 'vpn';
  if (/game/.test(c)) return 'game';
  if (/social/.test(c)) return 'social';
  return 'streaming';
}
