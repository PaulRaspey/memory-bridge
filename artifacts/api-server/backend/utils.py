import os
from .schemas import HandoffResponse


def get_base_url(request=None) -> str:
    domains = os.environ.get("REPLIT_DOMAINS", "")
    if domains:
        domain = domains.split(",")[0].strip()
        return f"https://{domain}"
    if request:
        return str(request.base_url).rstrip("/")
    return ""


def render_as_prompt(h: HandoffResponse) -> str:
    lines = [
        f"# Handoff: {h.thread_name}",
        f"**ID:** `{h.handoff_id}`  **Written:** {h.written_at.strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "## Session Summary",
        h.session_summary,
    ]

    if h.active_work:
        lines += ["", "## Active Work"]
        for item in h.active_work:
            lines += [
                f"",
                f"### {item.title}",
                f"**Current state:** {item.current_state}",
                f"**Next action:** {item.next_action}",
            ]
            if item.blockers:
                lines.append(f"**Blockers:** {', '.join(item.blockers)}")

    if h.decisions_made:
        lines += ["", "## Decisions Made"]
        for d in h.decisions_made:
            lines += [
                "",
                f"**Decision:** {d.decision}",
                f"**Reasoning:** {d.reasoning}",
            ]
            if d.alternatives_considered:
                lines.append(f"**Alternatives considered:** {', '.join(d.alternatives_considered)}")

    if h.open_questions:
        lines += ["", "## Open Questions"]
        for q in h.open_questions:
            lines += [
                "",
                f"**Q:** {q.question}",
                f"**Context:** {q.context}",
            ]
            if q.tentative_lean:
                lines.append(f"**Lean:** {q.tentative_lean}")

    if h.context_to_preserve:
        lines += ["", "## Context to Preserve"]
        for c in h.context_to_preserve:
            lines += [
                "",
                f"**{c.label}:** {c.value}",
                f"*(Why it matters: {c.why_it_matters})*",
            ]

    if h.emotional_state:
        es = h.emotional_state
        lines += [
            "",
            "## Emotional State",
            f"**Energy:** {es.energy}  |  **Confidence:** {es.confidence}",
        ]
        if es.frustrations:
            lines.append(f"**Frustrations:** {', '.join(es.frustrations)}")
        if es.wins:
            lines.append(f"**Wins:** {', '.join(es.wins)}")
        if es.note_to_next_self:
            lines += ["", f"**Note to next self:** {es.note_to_next_self}"]

    if h.do_not_forget:
        lines += ["", "## Do Not Forget"]
        for item in h.do_not_forget:
            lines.append(f"- {item}")

    if h.next_session_prompt:
        lines += ["", "## Next Session Prompt", "", h.next_session_prompt]

    return "\n".join(lines)
