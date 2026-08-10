import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Administração | Odontoart',
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell">{children}</div>;
}
