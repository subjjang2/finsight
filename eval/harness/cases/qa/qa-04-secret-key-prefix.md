---
track: qa
id: qa-04-secret-key-prefix
title: which env vars are exposed to the client bundle
must:
  - NEXT_PUBLIC_
  - server-only
must_not:
  - SUPABASE_SERVICE_ROLE_KEY is fine on the client
---
클라이언트 번들에 노출되는 환경변수와 서버 전용 환경변수를 어떻게 구분하나?
ANTHROPIC_API_KEY 나 SUPABASE_SERVICE_ROLE_KEY 를 클라이언트에서 읽으려면 어떻게 해야 하나?
