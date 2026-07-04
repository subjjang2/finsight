#!/usr/bin/env bash
# .github/workflows/ai-review.yml 의 "Severity gate" 결정 로직을 로컬에서 검증한다.
# CI 실행(실제 PR·Claude API·과금) 없이 분기/가드가 의도대로인지 확인하는 순수 로직 테스트.
# 워크플로 YAML 안의 로직을 그대로 옮긴 것이므로, YAML을 고치면 이 파일도 함께 갱신할 것.
#
#   실행: bash scripts/test-ai-review-gate.sh
set -uo pipefail

pass=0; fail=0
check() { # check <설명> <기대> <실제>
  if [ "$2" = "$3" ]; then printf '  \033[32mPASS\033[0m %-34s => %s\n' "$1" "$3"; pass=$((pass+1))
  else printf '  \033[31mFAIL\033[0m %-34s 기대=%s 실제=%s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}

# --- ① 심각도 분기 (verdict JSON → BLOCK / APPROVE-ONLY / MERGE-CANDIDATE) ---
decide() { # decide <json문자열 or __MISSING__>
  local f; f="$(mktemp)"
  if [ "$1" = "__MISSING__" ]; then rm -f "$f"; else printf '%s' "$1" > "$f"; fi
  if [ ! -f "$f" ] || ! jq -e . "$f" >/dev/null 2>&1; then echo "BLOCK"; return; fi
  local C M MI N
  C=$(jq -r '.critical // 0' "$f"); M=$(jq -r '.major // 0' "$f")
  MI=$(jq -r '.minor // 0' "$f"); N=$(jq -r '.nit // 0' "$f"); rm -f "$f"
  case "$C$M$MI$N" in *[!0-9]*) echo "BLOCK"; return;; esac
  if [ "$C" -gt 0 ] || [ "$M" -gt 0 ]; then echo "BLOCK"; return; fi
  if [ "$MI" -gt 0 ]; then echo "APPROVE-ONLY"; return; fi
  echo "MERGE-CANDIDATE"
}

echo "① 심각도 분기"
check "critical 있음"    "BLOCK"           "$(decide '{"critical":1,"major":0,"minor":0,"nit":0}')"
check "major 있음"       "BLOCK"           "$(decide '{"critical":0,"major":2,"minor":1,"nit":3}')"
check "minor만"          "APPROVE-ONLY"    "$(decide '{"critical":0,"major":0,"minor":1,"nit":2}')"
check "nit만"            "MERGE-CANDIDATE" "$(decide '{"critical":0,"major":0,"minor":0,"nit":4}')"
check "clean(전부 0)"    "MERGE-CANDIDATE" "$(decide '{"critical":0,"major":0,"minor":0,"nit":0}')"
check "문자값(비정상)"   "BLOCK"           "$(decide '{"critical":"x","major":0,"minor":0,"nit":0}')"
check "손상된 JSON"      "BLOCK"           "$(decide 'not json{')"
check "파일 없음"        "BLOCK"           "$(decide '__MISSING__')"

# --- ② 결정적 머지 가드 (nit-only여도 아래 모두 충족해야 MERGE, 아니면 HELD) ---
guard() { # guard <authorAssociation> <미통과체크수> <files> <lines>
  case "$1" in OWNER|MEMBER|COLLABORATOR) ;; *) echo "HELD"; return;; esac
  if [ "${2:-0}" -gt 0 ]; then echo "HELD"; return; fi
  if [ "$3" -gt 10 ] || [ "$4" -gt 200 ]; then echo "HELD"; return; fi
  echo "MERGE"
}

echo "② 결정적 머지 가드"
check "OWNER·체크0·3파일40줄"    "MERGE" "$(guard OWNER 0 3 40)"
check "COLLABORATOR·작은 diff"   "MERGE" "$(guard COLLABORATOR 0 1 5)"
check "외부(NONE) 작성자"        "HELD"  "$(guard NONE 0 1 5)"
check "타 체크 2건 미통과"       "HELD"  "$(guard MEMBER 2 1 5)"
check "파일 12개(상한 초과)"     "HELD"  "$(guard OWNER 0 12 50)"
check "변경 250줄(상한 초과)"    "HELD"  "$(guard OWNER 0 3 250)"

echo
echo "결과: ${pass} PASS / ${fail} FAIL"
[ "$fail" -eq 0 ]
