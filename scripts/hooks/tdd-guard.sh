#!/bin/bash
# TDD Guard Hook — PreToolUse[Edit|Write]
# 구현 코드를 작성하려 할 때, 해당 모듈의 테스트 파일이 먼저 존재하는지 체크.
# 테스트 없이 구현 코드를 작성하려 하면 차단.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 파일 경로가 없으면 통과
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Windows 경로(백슬래시)를 forward slash로 정규화한다.
# 이게 없으면 아래 모든 "*/..." case 패턴(layout/page/route 면제 등)이 백슬래시 경로에서 매칭에 실패한다.
FILE_PATH=$(echo "$FILE_PATH" | tr '\\' '/')

# 프로젝트가 아직 스캐폴딩되지 않았으면(package.json 없음) TDD 가드를 건너뛴다.
# 테스트 프레임워크가 깔리기 전(MVP 부트스트랩)에는 강제할 대상이 없기 때문.
# package.json이 생기면 이후 모든 lib/소스 편집에 TDD가 적용된다.
# (Claude .claude/settings.json 과 codex .codex/hooks.json 양쪽에서 공유하는 스크립트)
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
if [ ! -f "$ROOT/package.json" ]; then
  exit 0
fi

# 테스트 파일 자체를 수정하는 건 허용
case "$FILE_PATH" in
  *test*|*spec*|*.test.*|*.spec.*|*__tests__*)
    exit 0
    ;;
esac

# .claude/ 인프라(설정·훅·슬래시 커맨드)와 workflows/ 오케스트레이션 스크립트는 TDD 비대상 — 허용.
# 이유: 워크플로우 스크립트는 런타임이 주입하는 전역(agent/pipeline/log)에 의존하는 오케스트레이션
#       정의로, lib/services 비즈니스 로직이 아니며 유닛 테스트를 붙일 수 없다.
case "$FILE_PATH" in
  */.claude/*|*/workflows/*)
    exit 0
    ;;
esac

# 설정/타입/스타일 파일은 테스트 불필요 — 허용
case "$FILE_PATH" in
  *.json|*.css|*.scss|*.md|*.yml|*.yaml|*.env*|*.config.*|*tailwind*|*postcss*|*next.config*|*tsconfig*)
    exit 0
    ;;
esac

# types/ 폴더는 테스트 불필요 — 허용
case "$FILE_PATH" in
  */types/*|*/types.ts|*/types.d.ts)
    exit 0
    ;;
esac

# route 핸들러: 통합 테스트 강제. page/layout과 달리 route.ts에는 외부 API 로직
# (Claude 호출, Polar webhook, CSV 처리 등 CLAUDE.md CRITICAL 대상)이 들어가므로
# 단순 면제하지 않는다. 통과 조건:
#   (1) 같은 폴더에 route.test.ts(x) / route.spec.ts(x), 또는
#   (2) tests/ 에서 '<상위폴더>/route' 형태로 이 route를 import 하는 테스트가 존재.
# 둘 다 없으면 차단. 핵심 로직을 테스트된 lib/services로 추출하는 것도 통과 경로다
# (그 lib 모듈에는 별도 테스트가 붙으므로). <상위폴더>로 매칭해 route 간 오탐을 막는다.
case "$FILE_PATH" in
  */route.ts|*/route.tsx)
    DIR=$(dirname "$FILE_PATH")
    SEG="$(basename "$DIR")/route"   # 예: webhook/route
    for EXT in ts tsx; do
      if [ -f "${DIR}/route.test.${EXT}" ] || [ -f "${DIR}/route.spec.${EXT}" ]; then
        exit 0
      fi
    done
    PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
    if [ -d "${PROJECT_ROOT}/tests" ] && \
       grep -rqE "from [\"'][^\"']*${SEG}[\"']" "${PROJECT_ROOT}/tests" 2>/dev/null; then
      exit 0
    fi
    cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "TDD GUARD: route 핸들러 '${SEG}'에 대한 테스트가 없습니다. tests/에서 이 route의 핸들러(GET/POST 등)를 import하는 통합 테스트를 먼저 작성하거나, 핵심 로직을 테스트된 lib/services 모듈로 추출하세요."
  }
}
EOF
    exit 0
    ;;
esac

# Next.js 프레임워크 파일은 허용 (layout, page, loading, error, not-found, global styles)
# route.ts는 위 전용 케이스에서 통합 테스트를 강제하므로 여기서 제외한다.
case "$FILE_PATH" in
  */layout.tsx|*/layout.ts|*/page.tsx|*/page.ts|*/loading.tsx|*/error.tsx|*/not-found.tsx|*/globals.css)
    exit 0
    ;;
esac

# lib/ 또는 소스 파일이면 테스트 파일 존재 여부 확인
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    # 파일명 추출
    DIR=$(dirname "$FILE_PATH")
    BASENAME=$(basename "$FILE_PATH" | sed -E 's/\.(ts|tsx|js|jsx)$//')

    # 테스트 파일 후보 경로들
    TEST_FOUND=false

    # 같은 폴더에 .test 파일
    for EXT in ts tsx js jsx; do
      if [ -f "${DIR}/${BASENAME}.test.${EXT}" ] || [ -f "${DIR}/${BASENAME}.spec.${EXT}" ]; then
        TEST_FOUND=true
        break
      fi
    done

    # __tests__ 폴더
    if [ "$TEST_FOUND" = false ]; then
      PARENT=$(dirname "$DIR")
      for EXT in ts tsx js jsx; do
        if [ -f "${PARENT}/__tests__/${BASENAME}.test.${EXT}" ] || [ -f "${DIR}/__tests__/${BASENAME}.test.${EXT}" ]; then
          TEST_FOUND=true
          break
        fi
      done
    fi

    # src/__tests__/ 루트 테스트 폴더
    if [ "$TEST_FOUND" = false ]; then
      PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
      for EXT in ts tsx js jsx; do
        if [ -f "${PROJECT_ROOT}/src/__tests__/${BASENAME}.test.${EXT}" ]; then
          TEST_FOUND=true
          break
        fi
      done
    fi

    # 루트 tests/ 디렉토리(이 프로젝트의 테스트 컨벤션)에서 이 소스를 import하는
    # 테스트가 하나라도 있으면 통과. 디렉토리 배럴(index.ts)은 부모 디렉토리명으로 매칭.
    if [ "$TEST_FOUND" = false ]; then
      PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
      MATCH_NAME="$BASENAME"
      if [ "$BASENAME" = "index" ]; then
        MATCH_NAME=$(basename "$DIR")
      fi
      if [ -d "${PROJECT_ROOT}/tests" ] && \
         grep -rqE "from [\"'][^\"']*/${MATCH_NAME}[\"']" "${PROJECT_ROOT}/tests" 2>/dev/null; then
        TEST_FOUND=true
      fi
    fi

    if [ "$TEST_FOUND" = false ]; then
      cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "TDD GUARD: '${BASENAME}'에 대한 테스트 파일이 존재하지 않습니다. 구현 코드를 작성하기 전에 테스트를 먼저 작성하세요. (테스트 파일 예: ${BASENAME}.test.ts)"
  }
}
EOF
    fi
    ;;
esac

exit 0
