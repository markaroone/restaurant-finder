import z from 'zod';

const baseSchema = z.object({
  API_URL: z
    .string({ error: 'Missing API_URL env.' })
    .refine(
      (value) => !value.endsWith('/'),
      'Invalid API_URL. Please remove forward slash after the url.',
    ),
  ENVIRONMENT: z.enum(['local', 'stg', 'production'], {
    error: 'Missing ENVIRONMENT env.',
  }),
});

const LocalSchema = baseSchema;
const StgSchema = baseSchema;
const ProdSchema = baseSchema;

const environmentMap = new Map<string, z.ZodObject<z.ZodRawShape>>([
  ['local', LocalSchema],
  ['stg', StgSchema],
  ['production', ProdSchema],
]);

export const getSchema = (environment?: string): z.Schema | never => {
  if (!environment) throw new Error('Application mode not set.');

  const Schema = environmentMap.get(environment);

  if (!Schema)
    throw new Error(
      'Invalid application mode. ENVIRONMENT should only be (local | stg | production).',
    );

  return Schema;
};
