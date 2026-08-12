/**
 * Researched Bratislava sports venues (športoviská) — compiled by orchestrator
 * from public sources (bratislava.sk, napadel.sk, askinter.sk, nbcbratislava.sk, etc.).
 * Consumed by Venues tab seed/import.
 */
export interface BratislavaVenueImport {
  name: string;
  description: string;
  address: string;
  city: 'Bratislava';
  sports: string[];
  latitude: number;
  longitude: number;
  verified: boolean;
  amenities: Record<string, boolean>;
  openingHours: Record<string, string>;
  source: string;
}

export const BRATISLAVA_VENUES_INVENTORY: BratislavaVenueImport[] = [
  {
    name: 'Aurial Padel Bratislava',
    description:
      'Largest padel centre in Bratislava with 12 indoor WPT-standard courts on Bajkalská. Daily play 08:00–22:00, on-site restaurant and equipment rental.',
    address: 'Bajkalská 7, 831 04 Bratislava',
    city: 'Bratislava',
    sports: ['PADEL'],
    latitude: 48.1478,
    longitude: 17.1289,
    verified: true,
    amenities: { parking: true, showers: true, proShop: true, floodlights: true, restaurant: true },
    openingHours: { mon_fri: '08:00-22:00', saturday: '08:00-22:00', sunday: '08:00-22:00' },
    source: 'https://aurialpadel.sk/',
  },
  {
    name: 'Aurial Padel Rača',
    description:
      'Aurial Padel courts in Rača (Na Pántoch) — formerly Arena Padel. WPT-standard courts, café, changing rooms, free on-site parking.',
    address: 'Na Pántoch 8, 831 06 Bratislava',
    city: 'Bratislava',
    sports: ['PADEL'],
    latitude: 48.1972,
    longitude: 17.1431,
    verified: true,
    amenities: { parking: true, showers: true, proShop: true, restaurant: true },
    openingHours: { mon_fri: '08:00-22:00', saturday: '08:00-22:00', sunday: '08:00-22:00' },
    source: 'https://aurialpadel.sk/',
  },
  {
    name: 'FitCamp Padel Ružinov',
    description:
      'Sports complex near Štrkovecke jazero with 2 indoor padel courts, tennis, athletics track and Form Factory fitness. Free parking for 80 cars.',
    address: 'Drieňová 11/A, 821 03 Bratislava',
    city: 'Bratislava',
    sports: ['PADEL', 'TENNIS', 'RUNNING'],
    latitude: 48.1421,
    longitude: 17.1654,
    verified: true,
    amenities: { parking: true, showers: true, fitness_center: true, floodlights: true },
    openingHours: { mon_fri: '07:00-22:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://fitcamp.sk/sluzby/padel/',
  },
  {
    name: 'Tenisový klub AŠK Inter Bratislava',
    description:
      'Historic club with 10 clay courts, 2 indoor Taraflex courts, winter inflatable halls, restaurant, sauna and massage services on Trnavská cesta.',
    address: 'Trnavská cesta 33, 821 08 Bratislava',
    city: 'Bratislava',
    sports: ['TENNIS'],
    latitude: 48.1653,
    longitude: 17.1475,
    verified: true,
    amenities: { parking: true, showers: true, proShop: true, floodlights: true, restaurant: true, spa: true },
    openingHours: { mon_fri: '06:30-23:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.askinter.sk/sk/sportoviska',
  },
  {
    name: 'Gopass Aréna',
    description:
      'Modern NBC Bratislava multi-purpose arena on Trnavská cesta — home to Bratislava basketball events, concerts and large indoor sports competitions.',
    address: 'Trnavská cesta 29, 831 04 Bratislava',
    city: 'Bratislava',
    sports: ['BASKETBALL', 'VOLLEYBALL'],
    latitude: 48.1661,
    longitude: 17.1452,
    verified: true,
    amenities: { parking: true, showers: true, floodlights: true, restaurant: true },
    openingHours: { mon_fri: '08:00-22:00', saturday: '09:00-20:00', sunday: '09:00-20:00' },
    source: 'https://gopassarena.sk/',
  },
  {
    name: 'Tehelné pole',
    description:
      'UEFA Category 4 stadium, home of ŠK Slovan Bratislava. Capacity 22,500 with premium skyboxes, multifunctional school playgrounds in the precinct.',
    address: 'Viktora Tegelhoffa 4, 821 08 Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL'],
    latitude: 48.1636,
    longitude: 17.1386,
    verified: true,
    amenities: { parking: true, showers: true, floodlights: true, restaurant: true },
    openingHours: { mon_fri: '09:00-18:00', saturday: '09:00-18:00', sunday: '09:00-18:00' },
    source: 'https://www.skslovan.com/',
  },
  {
    name: 'Areál Zlaté piesky',
    description:
      'City recreation area with tennis courts, beach volleyball, football pitch, water sports on the lake, camping and large paid parking at Cesta na Senec.',
    address: 'Cesta na Senec 2, 821 04 Bratislava',
    city: 'Bratislava',
    sports: ['TENNIS', 'FOOTBALL', 'RUNNING'],
    latitude: 48.171,
    longitude: 17.185,
    verified: false,
    amenities: { parking: true, showers: true, restaurant: true, floodlights: false },
    openingHours: { mon_fri: '08:00-20:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.bratislava.sk/vzdelavanie-a-volny-cas/starz/prevadzky-sportoviska/az-zlate-piesky',
  },
  {
    name: 'Mestská plaváreň Pasienky',
    description:
      'Landmark Bratislava aquatics centre with 50m and 25m indoor pools, sauna wing and long history of competitive swimming. Junácka complex near Dom športu.',
    address: 'Junácka 4, 831 04 Bratislava',
    city: 'Bratislava',
    sports: ['SWIMMING'],
    latitude: 48.169,
    longitude: 17.151,
    verified: false,
    amenities: { parking: true, showers: true, spa: true, pool: true },
    openingHours: { mon_fri: '06:00-21:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://bratislava.sk/vzdelavanie-a-volny-cas/starz/prevadzky-sportoviska/mestska-plavaren-pasienky-25m',
  },
  {
    name: 'Dom športu',
    description:
      'Multi-hall sports palace at Pasienky — hosts national volleyball, basketball and handball matches. Two halls: new hall on Junácka and legacy hall at Olympijské námestie.',
    address: 'Junácka 8, 831 04 Bratislava',
    city: 'Bratislava',
    sports: ['BASKETBALL', 'VOLLEYBALL', 'HANDBALL'],
    latitude: 48.1685,
    longitude: 17.152,
    verified: true,
    amenities: { parking: true, showers: true, floodlights: true },
    openingHours: { mon_fri: '07:00-22:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://bratislava.sk/en/education-and-leisure/sport/events/tournament-4-cities-2025/venues',
  },
  {
    name: 'Futbalový štadión FK Rača',
    description:
      'Natural-grass municipal football stadium in Rača borough, used for local league matches and community football events.',
    address: 'Černockého 2, 831 06 Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL'],
    latitude: 48.195,
    longitude: 17.138,
    verified: false,
    amenities: { parking: true, floodlights: true },
    openingHours: { mon_fri: '08:00-20:00', saturday: '08:00-18:00', sunday: '08:00-18:00' },
    source: 'https://staryweb.raca.sk/selected-sport-facilities/',
  },
  {
    name: 'TK Slávia STU Bratislava',
    description:
      'University tennis club in Petržalka with 10 clay courts and 2 Decoturf hard courts. Winter inflatable hall extends the outdoor season.',
    address: 'Májová 21, 851 01 Bratislava',
    city: 'Bratislava',
    sports: ['TENNIS'],
    latitude: 48.108,
    longitude: 17.098,
    verified: false,
    amenities: { parking: true, showers: true, floodlights: true },
    openingHours: { mon_fri: '07:00-21:00', saturday: '08:00-18:00', sunday: '08:00-18:00' },
    source: 'https://www.blta.sk/',
  },
  {
    name: 'Atletický štadión STU Mladá Garda',
    description:
      'Six-lane athletics stadium operated by STU at Račianska 105 — training base for track & field clubs and university PE programmes.',
    address: 'Račianska 105, 831 02 Bratislava',
    city: 'Bratislava',
    sports: ['RUNNING'],
    latitude: 48.188,
    longitude: 17.135,
    verified: false,
    amenities: { parking: true, floodlights: true },
    openingHours: { mon_fri: '07:00-20:00', saturday: '08:00-16:00', sunday: '08:00-16:00' },
    source: 'https://bratislava.sk/en/education-and-leisure/sport/events/tournament-4-cities-2025/venues',
  },
  {
    name: 'Národné stolnotenisové centrum',
    description:
      'National table-tennis centre on Černockého street in Rača — hosts national team training and regional tournaments.',
    address: 'Černockého 6, 831 06 Bratislava',
    city: 'Bratislava',
    sports: ['TABLE_TENNIS'],
    latitude: 48.1945,
    longitude: 17.1375,
    verified: false,
    amenities: { parking: true, showers: true },
    openingHours: { mon_fri: '08:00-20:00', saturday: '09:00-17:00', sunday: '09:00-17:00' },
    source: 'https://bratislava.sk/en/education-and-leisure/sport/events/tournament-4-cities-2025/venues',
  },
  {
    name: 'Multifunkčné ihrisko Tbiliská',
    description:
      'Outdoor municipal multi-sport ground in Rača with football, basketball and volleyball courts for community use.',
    address: 'Tbiliská, 831 06 Bratislava',
    city: 'Bratislava',
    sports: ['FOOTBALL', 'BASKETBALL'],
    latitude: 48.193,
    longitude: 17.141,
    verified: false,
    amenities: { parking: false, floodlights: false },
    openingHours: { mon_fri: '08:00-20:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://staryweb.raca.sk/selected-sport-facilities/',
  },
  {
    name: 'Športové centrum Dúbravka',
    description:
      'District sports complex in Dúbravka with indoor hall, outdoor courts and community fitness programmes for west Bratislava residents.',
    address: 'Pekná cesta 23, 841 02 Bratislava',
    city: 'Bratislava',
    sports: ['BASKETBALL', 'FOOTBALL', 'TENNIS'],
    latitude: 48.182,
    longitude: 17.043,
    verified: false,
    amenities: { parking: true, showers: true, fitness_center: true },
    openingHours: { mon_fri: '07:00-21:00', saturday: '08:00-18:00', sunday: '08:00-18:00' },
    source: 'https://www.scorentino.com/',
  },
  {
    name: 'TIPOS Aréna',
    description:
      'Premier ice-hockey and figure-skating arena (Zimný štadión Ondreja Nepelu) on Odbojárov — home of HC Slovan, also hosts concerts and ceremonies.',
    address: 'Odbojárov 9, 831 04 Bratislava',
    city: 'Bratislava',
    sports: ['HOCKEY'],
    latitude: 48.1628,
    longitude: 17.1395,
    verified: true,
    amenities: { parking: true, showers: true, restaurant: true, floodlights: true },
    openingHours: { mon_fri: '09:00-21:00', saturday: '10:00-20:00', sunday: '10:00-20:00' },
    source: 'https://www.hcslovan.sk/',
  },
  {
    name: 'Národné tenisové centrum Bratislava',
    description:
      'National tennis centre — STZ events, Davis Cup preparations and elite junior training in Bratislava.',
    address: 'Bratislava',
    city: 'Bratislava',
    sports: ['TENNIS'],
    latitude: 48.1486,
    longitude: 17.1077,
    verified: true,
    amenities: { parking: true, showers: true, floodlights: true },
    openingHours: { mon_fri: '07:00-21:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.stz.sk/',
  },
  {
    name: 'Form Factory FitCamp',
    description:
      'Form Factory fitness club at FitCamp Ružinov — group classes, Open Air events and gym facilities.',
    address: 'Drieňová 11/A, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1562,
    longitude: 17.1475,
    verified: true,
    amenities: { parking: true, showers: true, fitness_center: true },
    openingHours: { mon_fri: '06:00-22:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://fitcamp.formfactory.sk/calendar',
  },
  {
    name: 'Form Factory Farského',
    description: 'Form Factory club on Farského — group workouts and member events in Petržalka.',
    address: 'Farského 14, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1405,
    longitude: 17.1338,
    verified: true,
    amenities: { parking: true, showers: true, fitness_center: true },
    openingHours: { mon_fri: '06:00-22:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.formfactory.sk/eventy/',
  },
  {
    name: 'Form Factory OC Nivy',
    description: 'Form Factory at OC Nivy — gym and group classes next to the bus station.',
    address: 'Mlynské nivy 16, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1468,
    longitude: 17.1272,
    verified: true,
    amenities: { parking: true, showers: true, fitness_center: true },
    openingHours: { mon_fri: '06:00-22:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.formfactory.sk/eventy/',
  },
  {
    name: 'Eurovea (Dunaj)',
    description:
      'Eurovea riverside steps and promenade — recurring open-air yoga and group fitness (CityLife / outdoor sessions).',
    address: 'Pribinova, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1405,
    longitude: 17.1225,
    verified: true,
    amenities: { parking: true },
    openingHours: { mon_fri: '06:00-21:00', saturday: '07:00-20:00', sunday: '07:00-20:00' },
    source: 'https://www.citylife.sk/tag/sport',
  },
  {
    name: 'Grassalkovichova zahrada',
    description:
      'Presidential garden grounds used for open community fitness and outdoor workout meetups.',
    address: 'Hodžovo námestie, Bratislava',
    city: 'Bratislava',
    sports: ['FITNESS'],
    latitude: 48.1494,
    longitude: 17.1077,
    verified: true,
    amenities: {},
    openingHours: { mon_fri: '07:00-20:00', saturday: '08:00-20:00', sunday: '08:00-20:00' },
    source: 'https://www.citylife.sk/tag/sport',
  },
];

/** Summary for orchestrator logs */
export const BRATISLAVA_VENUES_SUMMARY = {
  total: BRATISLAVA_VENUES_INVENTORY.length,
  verified: BRATISLAVA_VENUES_INVENTORY.filter((v) => v.verified).length,
  bySport: BRATISLAVA_VENUES_INVENTORY.reduce<Record<string, number>>((acc, v) => {
    for (const sport of v.sports) acc[sport] = (acc[sport] ?? 0) + 1;
    return acc;
  }, {}),
};
