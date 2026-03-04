import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // run in Node (no DOM needed for pure unit tests in Step 1)
    environment: 'node',
  },
});