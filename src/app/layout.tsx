import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Find an IP Teacher',
  description: 'Search for Art of Living IP teachers near you by zip code or city.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
