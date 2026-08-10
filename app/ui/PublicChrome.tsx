'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  return isAdmin ? <>{children}</> : <><Header />{children}<Footer /></>;
}
