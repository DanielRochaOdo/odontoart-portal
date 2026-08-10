import type { Metadata } from 'next';
import './globals.css';
import PublicChrome from './ui/PublicChrome';

export const metadata: Metadata = { title: 'Odontoart – Planos odontológicos', description: 'Planos odontológicos para você, sua família e sua empresa.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><PublicChrome>{children}</PublicChrome></body></html>;
}
