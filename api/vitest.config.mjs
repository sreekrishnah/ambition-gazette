import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      AUTH_SECRET: '0123456789abcdef0123456789abcdef',
      GEMINI_API_KEY: 'test-gemini-key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      RELATE_DATABASE_PATH: ':memory:',
    },
  },
});
