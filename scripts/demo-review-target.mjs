// 임시: AI 리뷰(review-code CI) 스모크 테스트용 데모 파일.
// correctness 차원이 잡을 만한 명백한 off-by-one 버그를 하나 담았다.
// CI 검증이 끝나면 이 파일과 테스트 PR은 폐기한다.

export function sumPositive(nums) {
  let total = 0
  // BUG: i <= nums.length 는 마지막 반복에서 nums[nums.length](undefined)에 접근한다.
  for (let i = 0; i <= nums.length; i++) {
    if (nums[i] > 0) total += nums[i]
  }
  return total
}
