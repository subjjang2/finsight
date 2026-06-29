# 아키텍처

## 디렉토리 구조 (루트 기준, `src/` 사용 안 함)
```
app/                  # 페이지 + API 라우트 (App Router)
├── api/              # 라우트 핸들러 (uploads, analyses, polar/*, health)
├── auth/callback/    # Supabase OAuth 콜백
├── dashboard/        # 대시보드 페이지 (force-dynamic)
└── page.tsx          # 랜딩 (정적)
components/           # UI 컴포넌트 (.tsx)
types/                # TypeScript 타입 정의
lib/                  # 순수 유틸 (supabase 클라, csv, entitlements, billing)
services/             # 외부 API 래퍼 (claude)
supabase/migrations/  # SQL 마이그레이션 (0001_init.sql)
```

## 패턴
- Server Components 기본. 인터랙션 필요한 곳만 Client Component(`"use client"`).
- 외부 API·DB 접근은 서버(라우트 핸들러/서버 컴포넌트)에서만. 클라는 fetch로 자체 API 호출.
- 외부 클라이언트는 함수 내부 lazy 생성(top-level 금지).

## 데이터 흐름
```
사용자 → Client Component(업로드/요청) → app/api/* 라우트 핸들러
      → user-scoped Supabase(RLS) / Claude / Polar → 응답 → Server Component 리렌더
Polar 웹훅 → app/api/polar/webhook → service-role Supabase → profiles.tier 갱신
```

## 상태 관리
- 서버 상태: Server Components가 user-scoped Supabase로 직접 조회(per-user 페이지는 `force-dynamic`).
- 클라이언트 상태: 업로드/분석 트리거 등 인터랙션만 `useState`. 전역 상태 라이브러리 없음.
