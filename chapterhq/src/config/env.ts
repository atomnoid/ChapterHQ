import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  AUTH_SECRET: z.string().optional(),

  AUTH_URL: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);