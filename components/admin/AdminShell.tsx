import { requireAdmin } from '@/lib/guard';
import { getSetting } from '@/lib/settings';
import Sidebar from './Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const session = requireAdmin();
  const brand = getSetting('brand_name') || 'GutInc Store';
  return (
    <div className="min-h-screen md:pl-60">
      <Sidebar brand={brand} username={session.username} />
      <main>{children}</main>
    </div>
  );
}
