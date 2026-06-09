'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CekTransaksiForm() {
  const [code, setCode] = useState('');
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim()) return;
        router.push(`/pesanan/${encodeURIComponent(code.trim())}`);
      }}
      className="card p-6 space-y-4"
    >
      <div>
        <label className="label" htmlFor="code">ID Transaksi</label>
        <input
          id="code"
          required
          placeholder="contoh: INV-260609-AB12CD"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input font-mono"
        />
      </div>
      <button type="submit" className="btn btn-primary w-full">Cek Status</button>
    </form>
  );
}
