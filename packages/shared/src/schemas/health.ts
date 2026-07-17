import { z } from "zod";

export const healthCheckResponseSchema = z.object({
  status: z.literal("ok"),
});

export type HealthCheckResponse = z.infer<
  typeof healthCheckResponseSchema
>;
