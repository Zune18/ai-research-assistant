import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: true, // set to false to run all test files sequentially (browser tests are slow)
    testTimeout: 30000,
  },
});