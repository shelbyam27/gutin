import crypto from 'node:crypto';
import { getSetting } from './settings';
import { formatIDR } from './format';
import { isSafeOutboundUrl } from './ssrf';

export type NotifyEvent = 'order.created' | 'order.paid' | 'order.delivered' | 'order.failed';

export interface NotifyPayload {
  event: NotifyEvent;
  order: {
    code: string;
    product_name: string;
    variant_name: string;
    amount: number;
    fee: number;
    total: number;
    email: string;
    whatsapp: string | null;
    status: string;
    payment_method: string;
    created_at: string;
    paid_at?: string | null;
    delivered_at?: string | null;
    wr_order_id?: string | null;
  };
  brand: string;
  timestamp: string;
}

function isDiscordWebhook(url: string): boolean {
  return /https?:\/\/(discord(?:app)?\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\//i.test(url);
}

function isTelegramWebhook(url: string): boolean {
  return /https?:\/\/api\.telegram\.org\/bot[^/]+\/sendMessage/i.test(url);
}

function eventTitle(e: NotifyEvent): string {
  switch (e) {
    case 'order.created': return 'Pesanan Baru Dibuat';
    case 'order.paid': return 'Pembayaran Diterima';
    case 'order.delivered': return 'Pesanan Terkirim';
    case 'order.failed': return 'Pesanan Gagal';
  }
}

function eventColor(e: NotifyEvent): number {
  switch (e) {
    case 'order.created': return 0x3b82f6;
    case 'order.paid': return 0xeab308;
    case 'order.delivered': return 0x22c55e;
    case 'order.failed': return 0xef4444;
  }
}

function discordPayload(p: NotifyPayload): Record<string, unknown> {
  const fields = [
    { name: 'Kode', value: '`' + p.order.code + '`', inline: true },
    { name: 'Produk', value: `${p.order.product_name} — ${p.order.variant_name}`, inline: false },
    { name: 'Email', value: p.order.email, inline: true },
    { name: 'Total', value: formatIDR(p.order.total), inline: true },
    { name: 'Status', value: p.order.status, inline: true },
  ];
  if (p.order.whatsapp) fields.push({ name: 'WhatsApp', value: p.order.whatsapp, inline: true });
  return {
    username: p.brand,
    embeds: [
      {
        title: eventTitle(p.event),
        description: `Brand: **${p.brand}**`,
        color: eventColor(p.event),
        fields,
        timestamp: p.timestamp,
      },
    ],
  };
}

function telegramPayload(url: string, p: NotifyPayload): { url: string; body: Record<string, unknown> } {
  const u = new URL(url);
  const chatId = u.searchParams.get('chat_id') || '';
  const lines = [
    `*${eventTitle(p.event)}*`,
    `Brand: ${p.brand}`,
    `Kode: \`${p.order.code}\``,
    `Produk: ${p.order.product_name} — ${p.order.variant_name}`,
    `Total: ${formatIDR(p.order.total)}`,
    `Status: ${p.order.status}`,
    `Email: ${p.order.email}`,
  ];
  if (p.order.whatsapp) lines.push(`WhatsApp: ${p.order.whatsapp}`);
  return {
    url: `${u.origin}${u.pathname}`,
    body: {
      chat_id: chatId,
      text: lines.join('\n'),
      parse_mode: 'Markdown',
    },
  };
}

async function send(url: string, payload: NotifyPayload): Promise<void> {
  const secret = getSetting('notifier_secret').trim();
  let target = url;
  let body: string;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isDiscordWebhook(url)) {
    body = JSON.stringify(discordPayload(payload));
  } else if (isTelegramWebhook(url)) {
    const tg = telegramPayload(url, payload);
    target = tg.url;
    body = JSON.stringify(tg.body);
  } else {
    body = JSON.stringify(payload);
    if (secret) {
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Notifier-Signature'] = sig;
      headers['X-Notifier-Event'] = payload.event;
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(target, { method: 'POST', headers, body, signal: ctrl.signal });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('[notifier] webhook non-2xx', res.status, t.slice(0, 200));
    }
  } catch (e) {
    console.warn('[notifier] webhook gagal:', (e as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

function enabledEvents(): Set<NotifyEvent> {
  const raw = getSetting('notifier_events') || 'order.created,order.paid,order.delivered,order.failed';
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean) as NotifyEvent[]);
}

export function notifyOrder(payload: NotifyPayload): void {
  const url = getSetting('notifier_url').trim();
  if (!url) return;
  if (!isSafeOutboundUrl(url)) {
    console.warn('[notifier] notifier_url menuju host internal/loopback, ditolak:', url);
    return;
  }
  const events = enabledEvents();
  if (!events.has(payload.event)) return;
  void send(url, payload);
}

export function buildPayload(event: NotifyEvent, order: NotifyPayload['order']): NotifyPayload {
  return {
    event,
    order,
    brand: getSetting('brand_name') || 'Toko Digital',
    timestamp: new Date().toISOString(),
  };
}
