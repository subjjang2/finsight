import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "../app/page";

function render() {
  return renderToStaticMarkup(React.createElement(Home));
}

describe("landing page — UX guide 단계 1 (랜딩 → 가입)", () => {
  it("전달: '1분 만에 분석' 가치를 한 문장으로 제시한다", () => {
    const html = render();
    // 시선 1순위 단일 헤드라인(계층). 핵심 가치 단어 포함.
    expect(html).toMatch(/<h1[^>]*>/);
    expect(html).toContain("1분");
    expect(html).toContain("지출");
  });

  it("가입 1개 행동: Primary CTA는 accent이고 /login으로 향한다 (대비·다음 단계 트리거)", () => {
    const html = render();
    // 다음 단계로 가는 버튼만 accent. /login 링크 존재.
    expect(html).toContain('href="/login"');
    expect(html).toContain("bg-accent");
    // 동사로 시작하는 행동 지향 카피
    expect(html).toMatch(/시작하기|분석하기|시작/);
  });

  it("이탈 방지: 가입 없이 가치를 검증할 보조 경로(샘플)를 제공한다", () => {
    const html = render();
    expect(html).toContain("샘플");
  });

  it("마찰 제거: '카드사·형식 무관' 불안 선제 해소 카피가 있다", () => {
    const html = render();
    expect(html).toContain("카드사");
  });

  it("Time-to-Value: 업로드 → 매핑 확인 → 인사이트 3단계 흐름을 보여준다", () => {
    const html = render();
    expect(html).toContain("업로드");
    expect(html).toContain("매핑");
    expect(html).toContain("인사이트");
  });

  it("랜딩 레이아웃 폭은 max-w-5xl을 사용한다", () => {
    expect(render()).toContain("max-w-5xl");
  });

  it("브랜드 워드마크 finsight를 노출한다", () => {
    expect(render()).toContain("finsight");
  });

  it("AI-슬롭 안티패턴을 포함하지 않는다 (gradient/blur/네온/보라색)", () => {
    const html = render();
    expect(html).not.toMatch(/bg-gradient|text-transparent|bg-clip-text/);
    expect(html).not.toMatch(/backdrop-blur|blur-3xl|blur-2xl/);
    expect(html).not.toMatch(/purple|indigo|violet|fuchsia/);
    expect(html).not.toMatch(/animate-pulse|drop-shadow-\[/);
    // "Powered by AI" 류 과장 배지 금지
    expect(html).not.toContain("Powered by AI");
  });

  it("준비 중 플레이스홀더 문구가 더 이상 남아 있지 않다", () => {
    expect(render()).not.toContain("준비 중");
  });
});
