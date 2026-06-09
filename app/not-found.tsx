import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <div className="text-7xl font-extrabold gradient-text">404</div>
      <h1 className="text-xl font-semibold mt-3">Halaman tidak ditemukan</h1>
      <p className="text-muted mt-2">Mungkin URL salah atau halaman sudah dipindahkan.</p>
      <Link href="/" className="btn btn-primary mt-6">Kembali ke Beranda</Link>
    </div>
  );
}
