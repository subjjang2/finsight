// Golden-set 케이스 파서. 키 없이(vitest) 무결성을 검증할 수 있도록 순수 함수로 분리한다.
// case/*.md 형식:
//   ---
//   track: review | qa
//   id: <unique>
//   (review) expect: violation | pass, rule: <label>
//   (qa) must: [...], must_not: [...], false_premise: true|false
//   ---
//   <body = subject 입력: review는 코드 스니펫, qa는 질문>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Track = "review" | "qa";
export type ReviewExpect = "violation" | "pass";

export interface ReviewCase {
  track: "review";
  id: string;
  file: string;
  expect: ReviewExpect;
  rule?: string;
  title?: string;
  input: string;
}

export interface QaCase {
  track: "qa";
  id: string;
  file: string;
  must: string[];
  mustNot: string[];
  falsePremise: boolean;
  title?: string;
  input: string;
}

export type EvalCase = ReviewCase | QaCase;
type Frontmatter = Record<string, string | string[]>;

function unquote(s: string): string {
  return s.replace(/^["']|["']$/g, "");
}

/** `---\n...\n---\n<body>` 를 frontmatter 문자열과 body로 분리. */
export function splitFrontmatter(md: string): { frontmatter: string; body: string } {
  const m = md.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    throw new Error("missing frontmatter block (--- ... ---)");
  }
  return { frontmatter: m[1], body: m[2].trim() };
}

/**
 * 최소 YAML subset: `key: value` 스칼라와, 값이 빈 `key:` 뒤에 이어지는
 * `  - item` 블록 리스트만 지원한다. 외부 yaml 의존성을 피하기 위한 통제된 파서.
 */
export function parseFrontmatter(fm: string): Frontmatter {
  const out: Frontmatter = {};
  let key: string | null = null;
  for (const raw of fm.split(/\r?\n/)) {
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    const item = raw.match(/^\s*-\s+(.*)$/);
    if (item && key && Array.isArray(out[key])) {
      (out[key] as string[]).push(unquote(item[1].trim()));
      continue;
    }
    const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      throw new Error(`malformed frontmatter line: "${raw}"`);
    }
    key = kv[1];
    const val = kv[2].trim();
    // 대괄호 인라인 리스트도 허용: must: ["a", "b"]
    if (/^\[.*\]$/.test(val)) {
      out[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => unquote(s.trim()))
        .filter((s) => s !== "");
    } else if (val === "") {
      out[key] = []; // 블록 리스트 시작
    } else {
      out[key] = unquote(val);
    }
  }
  return out;
}

function reqStr(fm: Frontmatter, key: string, file: string): string {
  const v = fm[key];
  if (typeof v !== "string" || v === "") {
    throw new Error(`${file}: missing/invalid "${key}"`);
  }
  return v;
}

function optStr(fm: Frontmatter, key: string): string | undefined {
  const v = fm[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** 단일 케이스 파일 텍스트를 검증된 EvalCase로. 형식 위반 시 throw. */
export function parseCase(file: string, md: string): EvalCase {
  const { frontmatter, body } = splitFrontmatter(md);
  const fm = parseFrontmatter(frontmatter);
  if (body.trim() === "") {
    throw new Error(`${file}: empty body`);
  }
  const track = fm.track;
  const id = reqStr(fm, "id", file);

  if (track === "review") {
    const expect = reqStr(fm, "expect", file);
    if (expect !== "violation" && expect !== "pass") {
      throw new Error(`${file}: expect must be "violation" or "pass", got "${expect}"`);
    }
    return {
      track: "review",
      id,
      file,
      expect,
      rule: optStr(fm, "rule"),
      title: optStr(fm, "title"),
      input: body,
    };
  }

  if (track === "qa") {
    const must = asArray(fm.must);
    if (must.length === 0) {
      throw new Error(`${file}: qa case needs at least one "must" fact`);
    }
    return {
      track: "qa",
      id,
      file,
      must,
      mustNot: asArray(fm.must_not),
      falsePremise: fm.false_premise === "true" || fm.false_premise === true as unknown as string,
      title: optStr(fm, "title"),
      input: body,
    };
  }

  throw new Error(`${file}: unknown track "${String(track)}"`);
}

/** cases/{review,qa}/*.md 를 모두 로드. 파일시스템만 쓰고 네트워크는 없다. */
export function loadCases(root: string): EvalCase[] {
  const cases: EvalCase[] = [];
  for (const sub of ["review", "qa"] as const) {
    const dir = join(root, sub);
    let files: string[];
    try {
      files = readdirSync(dir);
    } catch {
      continue; // 트랙 디렉터리가 없으면 건너뛴다
    }
    for (const f of files.filter((f) => f.endsWith(".md")).sort()) {
      const full = join(dir, f);
      cases.push(parseCase(full, readFileSync(full, "utf8")));
    }
  }
  return cases;
}
