import { getSetting } from './settings';

const BASE = 'https://app.pakasir.com/api';

export type PakasirMethod =
  | 'qris'
  | 'bni_va'
  | 'bri_va'
  | 'cimb_niaga_va'
  | 'maybank_va'
  | 'permata_va'
  | 'bnc_va'
  | 'atm_bersama_va'
  | 'sampoerna_va'
  | 'artha_graha_va';

export interface PakasirPayment {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string;
  payment_url?: string;
  expired_at?: string;
  status?: string;
  completed_at?: string;
}

function credentials(): { project: string; apiKey: string } {
  const project = getSetting('pakasir_project').trim();
  const apiKey = getSetting('pakasir_api_key').trim();
  if (!project || !apiKey) {
    throw new Error(
      'Pakasir belum dikonfigurasi. Isi project & api_key di Admin → Pengaturan.',
    );
  }
  return { project, apiKey };
}

async function pjson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function createTransaction(
  method: PakasirMethod,
  orderId: string,
  amount: number,
): Promise<PakasirPayment> {
  const { project, apiKey } = credentials();
  const res = await fetch(`${BASE}/transactioncreate/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      order_id: orderId,
      amount,
      api_key: apiKey,
    }),
    cache: 'no-store',
  });
  const data = await pjson(res);
  if (!res.ok || !data?.payment) {
    throw new Error(
      `Pakasir createTransaction gagal (${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return data.payment as PakasirPayment;
}

export async function getTransactionDetail(
  orderId: string,
  amount: number,
): Promise<PakasirPayment | null> {
  const { project, apiKey } = credentials();
  const url = `${BASE}/transactiondetail?project=${encodeURIComponent(
    project,
  )}&amount=${amount}&order_id=${encodeURIComponent(orderId)}&api_key=${encodeURIComponent(
    apiKey,
  )}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await pjson(res);
  if (!res.ok) {
    throw new Error(
      `Pakasir transactiondetail gagal (${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return (data?.transaction ?? null) as PakasirPayment | null;
}

export async function cancelTransaction(orderId: string, amount: number) {
  const { project, apiKey } = credentials();
  const res = await fetch(`${BASE}/transactioncancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      order_id: orderId,
      amount,
      api_key: apiKey,
    }),
    cache: 'no-store',
  });
  const data = await pjson(res);
  if (!res.ok) {
    throw new Error(
      `Pakasir cancel gagal (${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return data;
}

export async function simulatePayment(orderId: string, amount: number) {
  const { project, apiKey } = credentials();
  const res = await fetch(`${BASE}/paymentsimulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project,
      order_id: orderId,
      amount,
      api_key: apiKey,
    }),
    cache: 'no-store',
  });
  const data = await pjson(res);
  if (!res.ok) {
    throw new Error(
      `Pakasir simulate gagal (${res.status}): ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return data;
}
