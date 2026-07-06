// [oncall E2E] CI build(tsc)를 일부러 깨뜨리는 의도적 타입 에러.
// oncall-ci-fix 파이프라인 검증용 임시 파일(실제 테스트 아님). 검증 후 삭제.
// vitest include 밖(루트)이라 test 잡엔 안 걸리고, tsconfig `**/*.ts`에 포함돼 build(tsc)만 실패한다.
export const oncallE2EFault: number = "trigger-oncall";
