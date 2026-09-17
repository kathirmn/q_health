import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Q-Health | Live Token System',
  description: 'A real-time queue logistics and appointment tracking web app for the healthcare sector.',
  openGraph: {
    title: 'Q-Health | Live Token System',
    description: 'A real-time queue logistics and appointment tracking web app for the healthcare sector.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Q-Health | Live Token System',
    description: 'A real-time queue logistics and appointment tracking web app for the healthcare sector.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
