import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  agentApiKey: process.env.AGENT_API_KEY ?? 'change-me-crewai-secret',
  defaultRadiusKm: Number(process.env.DEFAULT_RADIUS_KM ?? 20),
  extendedRadiusKm: Number(process.env.EXTENDED_RADIUS_KM ?? 50),
  /** How long before match start the Mercenary +1 scanner raises an emergency call. */
  mercenaryWindowMinutes: 60,
} as const;
