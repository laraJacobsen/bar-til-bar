import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Bar Til Bar',
  description: 'A playful mobile-first bar crawl companion app.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>
          <div className="min-h-screen bg-slate-950">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
