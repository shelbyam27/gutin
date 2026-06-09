import { getSetting } from '@/lib/settings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CekTransaksiForm from '@/components/CekTransaksiForm';

export const dynamic = 'force-dynamic';

export default function CekPage() {
  const brand = getSetting('brand_name') || 'GutInc Store';
  const wa = getSetting('whatsapp_contact') || '';
  return (
    <>
      <Navbar brand={brand} />
      <div className="container-page py-12 max-w-md mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Cek Transaksi</h1>
        <p className="text-center text-muted mb-6 text-sm">
          Masukkan ID transaksi untuk lihat detail dan ulang akses akun.
        </p>
        <CekTransaksiForm />
      </div>
      <Footer brand={brand} whatsapp={wa} />
    </>
  );
}
