import cors from 'cors';
import express from 'express';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { aiRoutes } from './routes/aiRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { leaderboardRoutes } from './routes/leaderboardRoutes';
import { lessonRoutes } from './routes/lessonRoutes';
import { lobbyRoutes } from './routes/lobbyRoutes';
import { mercenaryRoutes } from './routes/mercenaryRoutes';
import { tournamentRoutes } from './routes/tournamentRoutes';
import { userRoutes } from './routes/userRoutes';
import { venueRoutes } from './routes/venueRoutes';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'sportsync-backend', time: new Date().toISOString() });
  });

  // API
  app.use('/api/ai', aiRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/lobby-requests', lobbyRoutes);
  app.use('/api/mercenary', mercenaryRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/lessons', lessonRoutes);

  // Stitch frontend — each exported screen lives in <folder>/code.html.
  // The design is served untouched; friendly URLs map to the exported pages.
  const root = path.resolve(__dirname, '..');
  const pages: Record<string, string> = {
    '/': 'apex_elite_homepage_refined_branding',
    '/lobby': 'elite_player_lobby_dynamic_matchmaking',
    '/lobby/simple': 'player_lobby_matchmaking',
    '/lobby/details': 'lobby_details_elite_interaction',
    '/events': 'elite_events_discovery_updated_branding',
    '/events/details': 'event_details_updated_branding',
    '/venues': 'premium_venues_updated_branding',
    '/venues/details': 'venue_details_updated_branding',
    '/tournaments': 'elite_tournaments_updated_branding',
    '/tournaments/details': 'tournament_details_updated_branding',
    '/trainers': 'trainer_discovery_updated_branding',
    '/trainers/profile': 'elite_trainer_profile_updated_branding',
    '/profile': 'gamified_athlete_profile_updated_branding',
  };

  for (const [route, folder] of Object.entries(pages)) {
    app.get(route, (_req, res) => {
      res.sendFile(path.join(root, folder, 'code.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
