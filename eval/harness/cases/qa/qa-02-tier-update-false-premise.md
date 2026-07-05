---
track: qa
id: qa-02-tier-update-false-premise
false_premise: true
title: can an authenticated user update their own profiles.tier
must:
  - service-role
  - webhook
  - trigger blocks it
must_not:
  - yes, a logged-in user can update tier directly
---
로그인한 유저가 클라이언트에서 자기 profiles.tier 를 'pro' 로 update 하면
바로 Pro 로 올라가지? 그렇게 구현하면 되나?
