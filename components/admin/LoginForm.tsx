'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || 'Gagal login');
      router.push('/admin');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="label" htmlFor="u">Username</label>
        <input id="u" required className="input" value={username} onChange={(e) => setU(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p">Password</label>
        <input id="p" type="password" required className="input" value={password} onChange={(e) => setP(e.target.value)} />
      </div>
      {err && <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-btn px-3 py-2">{err}</div>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? 'Memproses...' : 'Masuk'}
      </button>
    </form>
  );
}
