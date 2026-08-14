import type { MetadataRoute } from 'next';

export const runtime = 'edge';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SportSync — Apex Elite',
    short_name: 'SportSync',
    description:
      'Nájdi športové eventy, trénerov a komunitu v okolí. Oficiálne zápasy, komunitné hry a elitný tréning.',
    start_url: '/events',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#131313',
    theme_color: '#131313',
    lang: 'sk',
    dir: 'ltr',
    categories: ['sports', 'social', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Eventy',
        short_name: 'Eventy',
        url: '/events',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Lobby',
        short_name: 'Lobby',
        url: '/lobby',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
