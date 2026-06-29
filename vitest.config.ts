import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "lib/**/*.test.ts",
      "services/**/*.test.ts",
      "components/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
      "middleware.test.ts",
    ],
  },
});
