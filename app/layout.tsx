import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThumbButton } from '@/components/navigation/ThumbButton';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'SportSync - Apex Elite',
  description: 'Find local sports partners, official venue events, and elite training near you.',
  applicationName: 'SportSync',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SportSync',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#131313',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Ported 1:1 from the Stitch export - see FrontEnd/apex_elite_homepage_refined_branding/code.html */}
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Montserrat:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-body-md min-h-dvh max-w-[100vw] overflow-x-clip selection:bg-primary-container selection:text-white pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
        <ThumbButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
