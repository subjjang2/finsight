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
      // harness eval: 키 없는 파서/집계/균형 테스트 (라이브 채점은 npm run eval 로 분리)
      "eval/harness/**/*.test.ts",
    ],
  },
});
