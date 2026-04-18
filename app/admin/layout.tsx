import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    redirect('/admin/login');
  }
  return (
    <div className="min-h-screen" style={{ background: '#0D0000' }}>
      {children}
    </div>
  );
}
