import { Sport } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { createVenue, getVenue, listVenues, updateVenue } from '../services/venueService';

export const venueRoutes = Router();

/** POST /api/venues — VENUE_MANAGER registers an official venue/sports centre. */
venueRoutes.post('/', async (req, res, next) => {
  try {
    const body = z
      .object({
        managerId: z.string().min(1),
        name: z.string().min(2),
        description: z.string().optional(),
        sports: z.array(z.nativeEnum(Sport)).min(1),
        address: z.string().min(3),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        city: z.string().optional(),
        amenities: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const venue = await createVenue(body);
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
});

/** GET /api/venues?lat=..&lng=..&radiusKm=..&sport=..&city=.. — "Premium Venues" discovery screen. */
venueRoutes.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        radiusKm: z.coerce.number().positive().max(200).optional(),
        sport: z.nativeEnum(Sport).optional(),
        city: z.string().optional(),
      })
      .parse(req.query);

    const venues = await listVenues(query);
    res.json({ count: venues.length, venues });
  } catch (err) {
    next(err);
  }
});

/** GET /api/venues/:id — venue detail screen with open events and tournaments. */
venueRoutes.get('/:id', async (req, res, next) => {
  try {
    const venue = await getVenue(req.params.id);
    res.json(venue);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/venues/:id — owner-only updates. */
venueRoutes.patch('/:id', async (req, res, next) => {
  try {
    const body = z
      .object({
        managerId: z.string().min(1),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        sports: z.array(z.nativeEnum(Sport)).min(1).optional(),
        address: z.string().min(3).optional(),
        amenities: z.array(z.string()).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        city: z.string().optional(),
      })
      .parse(req.body);

    const { managerId, ...patch } = body;
    const venue = await updateVenue(req.params.id, managerId, patch);
    res.json(venue);
  } catch (err) {
    next(err);
  }
});
