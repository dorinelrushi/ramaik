import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';

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
      <body cz-shortcut-listen="true">
        {children}

        {/* REKLAMA ADSTERRA */}
        <div className="flex justify-center my-4">
          <div id="container-9b33dd36f1e89b72d9c6c434468a00fe"></div>
          <Script
            id="adsterra-banner"
            src="https://pl29712153.effectivecpmnetwork.com/9b33dd36f1e89b72d9c6c434468a00fe/invoke.js"
            strategy="afterInteractive"
            data-cfasync="false"
          />
        </div>

      </body>
    </html>
  );
}