import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/**/*.test.ts",
      "lib/**/*.test.ts",
      "services/**/*.test.ts",
      "app/**/*.test.{ts,tsx}",
      "middleware.test.ts",
    ],
  },
});
