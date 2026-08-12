import { distanceKm } from './geo';

interface CityPoint {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

/**
 * Curated set of city centres used to reverse-geocode GPS coordinates into a
 * human-readable city name without depending on a paid geocoding API. The
 * "Založiť Lobby" and "+" (create event) buttons only ever send lat/lng from
 * the device — this table resolves the nearest known city so LobbyRequest,
 * Event, Venue, Tournament and TrainingLesson rows can all be grouped and
 * filtered by city, and so CrewAI agents and the karma leaderboard can reason
 * about "Bratislava", "Košice", etc. instead of raw coordinates.
 */
const CITIES: CityPoint[] = [
  { name: 'Bratislava', country: 'SK', lat: 48.1486, lng: 17.1077 },
  { name: 'Košice', country: 'SK', lat: 48.7164, lng: 21.2611 },
  { name: 'Prešov', country: 'SK', lat: 49.0007, lng: 21.2393 },
  { name: 'Žilina', country: 'SK', lat: 49.2231, lng: 18.7394 },
  { name: 'Banská Bystrica', country: 'SK', lat: 48.7395, lng: 19.1538 },
  { name: 'Nitra', country: 'SK', lat: 48.3081, lng: 18.0873 },
  { name: 'Trnava', country: 'SK', lat: 48.3774, lng: 17.5883 },
  { name: 'Trenčín', country: 'SK', lat: 48.8945, lng: 18.0444 },
  { name: 'Martin', country: 'SK', lat: 49.0653, lng: 18.9219 },
  { name: 'Poprad', country: 'SK', lat: 49.0552, lng: 20.2975 },
  { name: 'Senec', country: 'SK', lat: 48.2194, lng: 17.4 },
  { name: 'Piešťany', country: 'SK', lat: 48.591, lng: 17.8286 },
  { name: 'Zvolen', country: 'SK', lat: 48.5763, lng: 19.1226 },
  { name: 'Prievidza', country: 'SK', lat: 48.7712, lng: 18.6272 },
  { name: 'Považská Bystrica', country: 'SK', lat: 49.1194, lng: 18.4522 },
  { name: 'Michalovce', country: 'SK', lat: 48.7538, lng: 21.9186 },
  { name: 'Komárno', country: 'SK', lat: 47.7636, lng: 18.1265 },
  { name: 'Levice', country: 'SK', lat: 48.2166, lng: 18.6035 },
  { name: 'Humenné', country: 'SK', lat: 48.9358, lng: 21.9061 },
  { name: 'Bardejov', country: 'SK', lat: 49.2925, lng: 21.2761 },
  { name: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738 },
  { name: 'Budapest', country: 'HU', lat: 47.4979, lng: 19.0402 },
  { name: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378 },
  { name: 'Brno', country: 'CZ', lat: 49.1951, lng: 16.6068 },
];

/**
 * Resolves a human-readable city name from GPS coordinates by finding the
 * nearest entry in the curated CITIES table (great-circle distance). If the
 * caller already supplied a non-empty city name, that value is trusted and
 * returned unchanged — GPS resolution only kicks in when the client omits it,
 * exactly matching the "+" event button rule: "Mesto sa automaticky určí
 * podľa GPS polohy".
 */
export function resolveCity(lat: number, lng: number, explicitCity?: string | null): string {
  if (explicitCity && explicitCity.trim().length > 0) {
    return explicitCity.trim();
  }

  let nearest = CITIES[0];
  let nearestDistance = distanceKm(lat, lng, nearest.lat, nearest.lng);
  for (const city of CITIES.slice(1)) {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    if (d < nearestDistance) {
      nearest = city;
      nearestDistance = d;
    }
  }
  return nearest.name;
}
