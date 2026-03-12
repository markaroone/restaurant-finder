/// <reference types="vite/client" />

/**
 * Global ENV object injected by Vite at build time.
 * Never use `import.meta.env` directly — always use `ENV`.
 */
declare const ENV: {
  API_URL: string;
  API_CODE: string;
  ENVIRONMENT: 'local' | 'stg' | 'production';
};

declare module '@fontsource-variable/inter';
