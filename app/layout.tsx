import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Votoni Shqipëri – Debat Kombëtar & Zëri Qytetar',
  description:
    'Pse po protestojnë sot studentët dhe populli në Shqipëri: kërkojnë thjesht doreheqjen e qeverisë, apo rrezimin e të gjithë sistemit? Shprehni mendimin tuaj lirshëm dhe anonimisht.',
  keywords: [
    'protesta shqiperi',
    'studentet',
    'votim',
    'debat kombetar',
    'demokraci',
    'komente',
  ],
  openGraph: {
    title: 'Votoni Shqipëri – Debat Kombëtar',
    description:
      'Pse po protestojnë sot studentët dhe populli në Shqipëri? Shpreh mendimin tënd anonimisht.',
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
    <html lang="sq" className="dark">
      <body
        cz-shortcut-listen="true"
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#07080b',
          color: '#f1f5f9',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowX: 'hidden',
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          {children}
        </div>

        {/* REKLAMA ADSTERRA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '28px 0',
            width: '100%',
            minHeight: '100px',
          }}
        >
          <div id="container-9b33dd36f1e89b72d9c6c434468a00fe" style={{ minHeight: '90px', width: '100%', display: 'flex', justifyContent: 'center' }}></div>
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