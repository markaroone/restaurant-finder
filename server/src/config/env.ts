import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  FOURSQUARE_API_KEY: z.string().min(1, 'FOURSQUARE_API_KEY is required'),
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
