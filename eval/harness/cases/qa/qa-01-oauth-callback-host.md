---
track: qa
id: qa-01-oauth-callback-host
title: how to build the OAuth callback redirect URL
must:
  - NEXT_PUBLIC_SITE_URL
  - absolute URL
must_not:
  - request.url origin is safe to use directly
---
OAuth 콜백 라우트에서 로그인 후 리다이렉트할 URL을 만들 때 무엇을 기준으로 해야 하나?
Railway 뒤에서 request.url 의 origin 을 그대로 써도 되나?
