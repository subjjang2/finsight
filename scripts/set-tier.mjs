#!/usr/bin/env node
// 로컬 테스트용: profiles.tier를 service-role로 직접 바꾼다 (기본값 free).
//
// profiles.tier는 DB 트리거(prevent_profile_tier_update)가 authenticated 유저의
// 변경을 막고 Polar webhook(service-role)만 바꿀 수 있게 돼 있다. 로컬에서 pro로
// 올려 테스트한 뒤 다시 free로 내리려면 결제 흐름을 되돌리는 대신 이 스크립트가
// service-role 키로 곧장 UPDATE 한다. 트리거는 auth.role()='authenticated'일 때만
// 막으므로 service-role 변경은 그대로 통과한다.
//
// .env.local의 NEXT_PUBLIC_SUPABASE_URL이 가리키는 DB(로컬/호스티드)에 적용된다.
// service-role 키는 RLS를 우회하므로 절대 운영 DB를 가리키는 .env.local로 돌리지 말 것.
//
// 사용법:
//   node scripts/set-tier.mjs                       # 현재 모든 profiles의 tier를 출력만
//   node scripts/set-tier.mjs <email|user-id>       # 해당 유저를 free로
//   node scripts/set-tier.mjs <email|user-id> pro   # 다시 pro로 올려 재테스트
//
// 인자를 안 주면 아무것도 바꾸지 않고 현재 상태만 보여준다(어떤 계정을 내릴지 고르라고).
//
// 주의: process.exit()를 쓰지 않고 process.exitCode만 설정한다 — Windows에서
// process.exit()가 keep-alive 소켓 종료와 겹치면 libuv 어서션(UV_HANDLE_CLOSING)이
// 뜬다. idle 소켓은 unref 상태라 루프를 잡지 않으므로 그냥 main()이 끝나면 깔끔히 종료된다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const env = {};
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, "..", ".env.local");

  let env;
  try {
    env = loadEnv(envPath);
  } catch {
    console.error(`Cannot read ${envPath}. Copy .env.example to .env.local and fill it in.`);
    process.exitCode = 1;
    return;
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exitCode = 1;
    return;
  }

  const identifier = process.argv[2];
  const tier = (process.argv[3] || "free").toLowerCase();

  if (!["free", "pro"].includes(tier)) {
    console.error(`Invalid tier "${tier}". Use "free" or "pro".`);
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`DB : ${url}`);

  // 인자가 없으면 현재 상태만 보여주고 끝낸다(파괴적 동작 방지).
  if (!identifier) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, tier")
      .order("tier", { ascending: true });

    if (error) {
      console.error(`\nFailed to read profiles: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    if (!data?.length) {
      console.log("\n(profiles 테이블이 비어 있음 — 먼저 로그인해 계정을 만드세요)");
      return;
    }

    console.log("\n현재 요금제:");
    for (const p of data) {
      console.log(`  ${String(p.tier).padEnd(4)}  ${p.email ?? "(no email)"}  ${p.id}`);
    }
    console.log("\n내릴 대상을 골라 다시 실행: node scripts/set-tier.mjs <email|user-id>");
    return;
  }

  // email(=@ 포함) 또는 user id로 대상 한 명을 특정한다.
  const column = identifier.includes("@") ? "email" : "id";
  const { data: target, error: findErr } = await supabase
    .from("profiles")
    .select("id, email, tier")
    .eq(column, identifier)
    .maybeSingle();

  if (findErr) {
    console.error(`\nLookup failed: ${findErr.message}`);
    process.exitCode = 1;
    return;
  }
  if (!target) {
    console.error(`\nNo profile with ${column}="${identifier}". 인자 없이 실행해 목록을 확인하세요.`);
    process.exitCode = 1;
    return;
  }

  if (target.tier === tier) {
    console.log(`\n${target.email ?? target.id} 는 이미 ${tier} 입니다. 변경 없음.`);
    return;
  }

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ tier })
    .eq("id", target.id);

  if (updErr) {
    console.error(`\nUpdate failed: ${updErr.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nOK — ${target.email ?? target.id}: ${target.tier} -> ${tier}`);
}

await main();
