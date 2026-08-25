/**
 * Ukážkové JSON dáta = výstup Classifier Agenta (agents/models.py → SportEvent).
 * V produkcii ich naplní `python -m agents.pipeline <url>` → to_ui_json().
 */
import type { SportEventCard } from '@/components/sports/SportsTabs';

export const SAMPLE_CLASSIFIED_EVENTS: SportEventCard[] = [
  {
    title: 'Ranná joga v Ružinove',
    location: 'Ružinov',
    participation_type: 'ACTIVE',
    target_audience: ['WOMEN'],
    category: 'Joga',
    description:
      'Pokojná hodinová lekcia jógy pre začiatočníčky aj pokročilé. Maty na mieste, registrácia online.',
  },
  {
    title: 'Detský mini tenis',
    location: 'Petržalka',
    participation_type: 'ACTIVE',
    target_audience: ['KIDS'],
    category: 'Tenis',
    description:
      'Skupinové lekcie tenisu pre deti 6–10 rokov. Kurty s mäkkými loptičkami, tréner na mieste.',
  },
  {
    title: 'HC Slovan — domáci zápas',
    location: 'Nové Mesto',
    participation_type: 'PASSIVE_SPECTATOR',
    target_audience: ['ALL'],
    category: 'Hokej',
    description:
      'Tipos Extraliga. Vstupenky na oficiálnom predaji organizátora. Športová aréna v Bratislave.',
  },
  {
    title: 'Pánsky padel turnaj',
    location: 'Staré Mesto',
    participation_type: 'ACTIVE',
    target_audience: ['MEN'],
    category: 'Padel',
    description:
      'Večerný padel turnaj pre mužov. Dvojice, rebríček a rezervácia kurtov cez web športoviska.',
  },
  {
    title: 'Verejné plávanie — bazén',
    location: 'Karlova Ves',
    participation_type: 'ACTIVE',
    target_audience: ['ALL'],
    category: 'Plávanie',
    description:
      'Voľné plávanie pre verejnosť. Dráhy podľa úrovne, šatne a sprchy k dispozícii.',
  },
];
