import fp from 'fastify-plugin';
import type { FastifyInstance } from "fastify";
import jwt, { type FastifyJWTOptions } from '@fastify/jwt';

export const jwtPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: "token",
      signed: false
    }
  } as FastifyJWTOptions)
});
