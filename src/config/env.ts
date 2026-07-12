import { z } from "zod";
import dotenv from "dotenv";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  DATABASE_URL: z.string().url().min(1, "DATABASE_URL is required"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    console.error("Invalid environment variables:");
    console.error(parsed.error);
    process.exit(1);
  }

  return parsed.data;
}

dotenv.config();
export const env = parseEnv(process.env);