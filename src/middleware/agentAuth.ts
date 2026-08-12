import { NextFunction, Request, Response } from 'express';
import { config } from '../config';

/**
 * Protects /api/ai/* endpoints. CrewAI agents authenticate with a shared secret
 * sent in the "x-agent-key" header and identify themselves via "x-agent-id".
 */
export function agentAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-agent-key');
  if (!key || key !== config.agentApiKey) {
    res.status(401).json({ error: 'Invalid or missing x-agent-key header' });
    return;
  }
  res.locals.agentId = req.header('x-agent-id') ?? 'crewai-agent';
  next();
}
