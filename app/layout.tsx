import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Votoni Shqipëri – Mendimi juaj ka rëndësi',
  description:
    'Platforma e votimit online të qytetarëve shqiptarë. Shprehni mendimin tuaj të lirë.',
  keywords: ['votim', 'Shqipëri', 'demokraci', 'kryeministër'],
  openGraph: {
    title: 'Votoni Shqipëri',
    description: 'Shprehni mendimin tuaj të lirë.',
    locale: 'sq_AL',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sq">
      <body cz-shortcut-listen="true">{children}</body>
    </html>
  );
}
