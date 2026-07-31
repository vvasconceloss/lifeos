import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export function parseAllowedOrigins(raw?: string): string[] {
  const origins = raw ? raw.split(',').map((origin) => origin.trim()).filter(Boolean) : [...DEFAULT_ALLOWED_ORIGINS];

  if (origins.some((origin) => origin === '*')) {
    throw new Error('ALLOWED_ORIGINS must not contain a wildcard (*)');
  }

  return origins;
}

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'csrf-token'],
    credentials: true,
    maxAge: 86400,
  });
});
