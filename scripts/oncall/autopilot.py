#!/usr/bin/env python3
"""oncall autopilot — 로컬 one-shot 질의응답 하네스 (채널 어댑터).

이 스크립트는 "두뇌"가 아니다. 두뇌는 oncall 하네스 스킬(.claude/skills/oncall/
autopilot.md)이 in-session Claude에게 지시하는 절차다. 이 CLI는 그 두뇌에
질문을 넘기고(intake), 사람이 승인할 draft를 파일로 관리(approve/reject)하는
**채널 어댑터**일 뿐이다.

설계 계약:
- 유료 Claude API를 호출하지 않는다. `claude -p` 를 부르지 않는다(과금 없음).
  답을 만드는 건 인터랙티브 세션의 스킬이 담당한다. 24/7 always-on 인프라(헤드리스
  `claude -p` Haiku)는 분리돼 있고 여기서 실행하지 않는다.
- DB/prod는 이 스크립트가 건드리지 않는다. read-only 근거 수집은 스킬이 MCP로 한다.
- 유저向 답은 반드시 draft → 사람 승인. `intake` 는 절대 "전송"하지 않는다.

사용:
  python scripts/oncall/autopilot.py intake --audience user \
      --question "방금 업로드했는데 분석이 안 떠요" [--context-file err.txt] [--title "..."]
  python scripts/oncall/autopilot.py list
  python scripts/oncall/autopilot.py approve <draft-dir> --by khseobi2
  python scripts/oncall/autopilot.py reject  <draft-dir> --reason "근거 부족"
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DRAFTS_DIR = REPO_ROOT / "oncall" / "drafts"

AUDIENCES = ("user", "internal")

# draft 상태 머신: DRAFTING(스킬이 채우는 중) → READY_FOR_REVIEW(스킬 완료, 사람 대기)
#                 → APPROVED / REJECTED (사람 게이트)
STATUS_DRAFTING = "DRAFTING"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _slug(text: str, maxlen: int = 40) -> str:
    s = re.sub(r"[^0-9A-Za-z가-힣]+", "-", text.strip()).strip("-").lower()
    return (s[:maxlen] or "q").strip("-")


def _read_status(draft_md: Path) -> str | None:
    if not draft_md.exists():
        return None
    for line in draft_md.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^STATUS:\s*(\S+)", line)
        if m:
            return m.group(1)
    return None


def cmd_intake(args: argparse.Namespace) -> int:
    if args.audience not in AUDIENCES:
        print(f"audience 는 {AUDIENCES} 중 하나여야 함", file=sys.stderr)
        return 2

    context = ""
    if args.context_file:
        cf = Path(args.context_file)
        if not cf.exists():
            print(f"context-file 없음: {cf}", file=sys.stderr)
            return 2
        context = cf.read_text(encoding="utf-8", errors="replace")

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    title = args.title or args.question
    draft_dir = DRAFTS_DIR / f"{ts}-{args.audience}-{_slug(title)}"
    draft_dir.mkdir(parents=True, exist_ok=True)

    (draft_dir / "request.md").write_text(
        "\n".join(
            [
                "# 요청 (원본)",
                f"- created_at: {_now_iso()}",
                f"- audience: {args.audience}",
                f"- title: {title}",
                "",
                "## 질문/증상",
                args.question,
                "",
                "## 첨부 컨텍스트 (에러 원문·로그·붙여넣기)",
                "```",
                context.strip() or "(없음)",
                "```",
                "",
            ]
        ),
        encoding="utf-8",
    )

    audience_note = (
        "유저向: 존댓말 한국어, 내부 로그/DB/스택트레이스 원문 노출 금지, "
        "다음 행동을 알려주기. 확실치 않으면 단정하지 말 것."
        if args.audience == "user"
        else "내부向: 근거(파일:라인·쿼리 결과·로그 라인)를 그대로 인용. 재현·원인·영향·다음 조치."
    )

    (draft_dir / "draft.md").write_text(
        "\n".join(
            [
                f"STATUS: {STATUS_DRAFTING}",
                f"AUDIENCE: {args.audience}",
                f"CREATED: {_now_iso()}",
                "",
                f"# draft 답 — {title}",
                f"> 톤 규칙: {audience_note}",
                "",
                "## 근거 (grounding) — 최소 2소스, 없으면 '모름'",
                "> `.claude/skills/oncall/grounding.md` 의 소스별 최소권한 쿼리로 채운다.",
                "- [ ] 코드베이스: ",
                "- [ ] PostHog(에러/이벤트): ",
                "- [ ] Supabase(read-only SELECT): ",
                "- [ ] Railway 로그: ",
                "",
                "## 답 draft (승인 전까지 전송 금지)",
                "(여기에 답을 작성)",
                "",
                "## 불확실/공백",
                "(근거가 없어 단정 못 한 부분. 없으면 '없음')",
                "",
                "## ESCALATE (해당 시)",
                "> 쓰기 권한 필요(구독 해제·환불·DB 변경 등)면 여기 사유+대상 적고, 답은 escalation 안내로.",
                "(없으면 비움)",
                "",
                "---",
                "리뷰 준비되면 STATUS 를 READY_FOR_REVIEW 로 바꾸고 사람 승인 대기.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    rel = draft_dir.relative_to(REPO_ROOT)
    print(f"draft envelope 생성: {rel}")
    print("다음 단계:")
    print("  1) 인터랙티브 세션에서 oncall autopilot 스킬을 돌려 draft.md 를 근거로 채운다.")
    print("  2) 스킬이 STATUS 를 READY_FOR_REVIEW 로 바꾼다.")
    print(f"  3) 사람이 검토 후: python scripts/oncall/autopilot.py approve {rel} --by <you>")
    return 0


def cmd_list(_args: argparse.Namespace) -> int:
    if not DRAFTS_DIR.exists():
        print("(draft 없음)")
        return 0
    rows = []
    for d in sorted(DRAFTS_DIR.iterdir()):
        if d.is_dir():
            rows.append((_read_status(d / "draft.md") or "?", d.name))
    if not rows:
        print("(draft 없음)")
        return 0
    for status, name in rows:
        print(f"{status:18} {name}")
    return 0


def _resolve_draft(path_arg: str) -> Path | None:
    p = Path(path_arg)
    if not p.is_absolute():
        p = REPO_ROOT / p
    if p.is_dir():
        p = p / "draft.md"
    return p if p.exists() else None


def _gate(args: argparse.Namespace, decision: str) -> int:
    draft_md = _resolve_draft(args.draft)
    if draft_md is None:
        print(f"draft 없음: {args.draft}", file=sys.stderr)
        return 2
    status = _read_status(draft_md)
    if status != "READY_FOR_REVIEW":
        print(
            f"승인/반려 불가: STATUS={status}. 스킬이 채우고 READY_FOR_REVIEW 로 바꾼 뒤에만 가능.",
            file=sys.stderr,
        )
        return 1
    text = draft_md.read_text(encoding="utf-8")
    stamp = f" (by {args.by})" if getattr(args, "by", None) else ""
    reason = f" — {args.reason}" if getattr(args, "reason", None) else ""
    text = re.sub(
        r"^STATUS:.*$",
        f"STATUS: {decision}  @ {_now_iso()}{stamp}{reason}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    draft_md.write_text(text, encoding="utf-8")
    print(f"{decision}: {draft_md.relative_to(REPO_ROOT)}")
    if decision == "APPROVED":
        print("승인 완료. 실제 유저 전송은 분리된 always-on 채널 어댑터가 담당(이 CLI 범위 밖).")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="autopilot", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("intake", help="질문을 받아 draft envelope 생성 (전송 안 함)")
    pi.add_argument("--audience", required=True, choices=AUDIENCES)
    pi.add_argument("--question", required=True)
    pi.add_argument("--context-file", help="에러 원문·로그 등 첨부 파일 경로")
    pi.add_argument("--title")
    pi.set_defaults(func=cmd_intake)

    pl = sub.add_parser("list", help="draft 목록·상태")
    pl.set_defaults(func=cmd_list)

    pa = sub.add_parser("approve", help="사람 승인 게이트 (READY_FOR_REVIEW 만)")
    pa.add_argument("draft")
    pa.add_argument("--by", help="승인자")
    pa.set_defaults(func=lambda a: _gate(a, "APPROVED"))

    pr = sub.add_parser("reject", help="사람 반려")
    pr.add_argument("draft")
    pr.add_argument("--by", help="반려자")
    pr.add_argument("--reason")
    pr.set_defaults(func=lambda a: _gate(a, "REJECTED"))

    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
