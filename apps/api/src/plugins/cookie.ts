import fp from 'fastify-plugin';
import type { FastifyInstance } from "fastify";
import cookie, { type FastifyCookieOptions } from "@fastify/cookie";

export const cookiesPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.register(cookie, {
    secret: process.env.JWT_SECRET,
    parseOptions: {}
  } as FastifyCookieOptions)
});
