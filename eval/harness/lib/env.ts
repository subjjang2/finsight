// .env.local 손수 파싱 (repo 관례: dotenv 의존성 없음, scripts/*.mjs 의 loadEnv와 동일).
import { readFileSync } from "node:fs";

export function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return env; // 없으면 process.env 로 폴백하도록 빈 객체 반환
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}
