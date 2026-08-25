import { cookies } from 'next/headers';
import {
  LOCALE_COOKIE,
  localeToHtmlLang,
  parseLocale,
} from '@/lib/i18n/config';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { ThumbButton } from '@/components/navigation/ThumbButton';
import { THUMB_BUTTON_ENABLED } from '@/components/navigation/thumb-button-flags';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'SportSync - Apex Elite',
  description:
    'Nájdi športových partnerov, oficiálne eventy na športoviskách a tréningy v okolí.',
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
  const locale = parseLocale(cookies().get(LOCALE_COOKIE)?.value);

  return (
    <html lang={localeToHtmlLang(locale)} className="dark">
      <head>
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
      <body
        className={[
          'bg-background text-on-surface font-body-md min-h-dvh max-w-[100vw] overflow-x-clip',
          'selection:bg-primary-container selection:text-white',
          THUMB_BUTTON_ENABLED
            ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
            : 'pb-[env(safe-area-inset-bottom,0px)]',
        ].join(' ')}
      >
        <LocaleProvider initialLocale={locale}>
          {children}
          <ThumbButton />
          <ServiceWorkerRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
