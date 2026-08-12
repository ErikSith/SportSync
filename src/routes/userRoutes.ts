import { Sport, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { createOrUpdateProfile, getProfile, updateProfile } from '../services/userService';

export const userRoutes = Router();

/**
 * POST /api/users
 * Profile onboarding: the user picks a role (PLAYER / COACH / VENUE_MANAGER),
 * their preferred sports, and their GPS position — the home city is resolved
 * automatically. Idempotent on email (upsert), so re-submitting the onboarding
 * form just refreshes the profile instead of failing with a duplicate error.
 */
userRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().min(1),
        avatarUrl: z.string().url().optional(),
        bio: z.string().max(500).optional(),
        role: z.nativeEnum(UserRole).default(UserRole.PLAYER),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        city: z.string().optional(),
        preferredSports: z.array(z.nativeEnum(Sport)).default([]),
      })
      .parse(req.body);

    const user = await createOrUpdateProfile(body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

/** GET /api/users/:id — full profile used by the gamified profile / trainer / venue screens. */
userRoutes.get('/:id', async (req, res, next) => {
  try {
    const user = await getProfile(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/users/:id — update role, home city (GPS), preferred sports, avatar, bio, name. */
userRoutes.patch('/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).optional(),
        avatarUrl: z.string().url().optional(),
        bio: z.string().max(500).optional(),
        role: z.nativeEnum(UserRole).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        city: z.string().optional(),
        preferredSports: z.array(z.nativeEnum(Sport)).optional(),
      })
      .parse(req.body);

    const user = await updateProfile(req.params.id, body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
