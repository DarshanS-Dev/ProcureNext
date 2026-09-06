"""
AI-assisted Problem Statement drafting.

Three standalone async functions, no FastAPI routes, no ORM/schema changes:

    1. draft_problem_statement(raw_text, partial_fields, answers=None)
       -> round 1 when answers=None, round 2 when answers is given.

    2. resuggest_field(current_fields, field_name)
       -> single-field re-suggestion for a still-low-confidence field,
          used by the per-field "ask again" button after the 2-round cap.

    3. check_publish_readiness(fields)
       -> pure Python, no LLM call. Scans final field data for low/unknown
          confidence or unresolved flags before publish. Advisory only.

    4. ai_assist_draft(rough_text)
       -> Darshan's entry point. Direct LLM call, returns exactly 4 fields.
          Never raises — returns safe defaults on any failure.
"""

from __future__ import annotations

import json
from typing import Any, Literal, Optional

from openai import AsyncOpenAI
import os

client = AsyncOpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

MODEL = "openai/gpt-oss-120b"

# ---------------------------------------------------------------------------
# Schema constants
# ---------------------------------------------------------------------------

PS_CATEGORIES = [
    "healthcare", "education", "agriculture", "urban_infrastructure",
    "public_safety", "sanitation", "governance_digitization",
    "financial_inclusion", "environment", "transportation", "other",
]

CONTENT_FIELDS = [
    "title", "description", "category", "target_beneficiaries",
    "baseline", "target", "measurement_method", "measurement_period",
    "budget_range", "sensitivity_flags", "success_condition",
]

VAGUENESS_CHECK_FIELDS = [f for f in CONTENT_FIELDS if f not in ("category", "sensitivity_flags")]
PRESCRIPTIVE_CHECK_FIELDS = ["title", "description", "success_condition"]

Confidence = Literal["high", "medium", "low", "unknown"]

# ---------------------------------------------------------------------------
# Shared JSON-schema builder
# ---------------------------------------------------------------------------

def _field_schema(value_schema: dict, flaggable: bool = False) -> dict:
    props = {
        "value": value_schema,
        "confidence": {"type": "string", "enum": ["high", "medium", "low", "unknown"]},
        "note": {"type": "string"},
    }
    required = ["value", "confidence"]
    if flaggable:
        props["flag"] = {"type": "string", "enum": ["vague", "prescriptive"]}
        props["suggested_rewrite"] = {"type": "string"}
    return {"type": "object", "properties": props, "required": required}


def _build_extraction_tool() -> dict:
    field_properties = {}
    for f in CONTENT_FIELDS:
        flaggable = f in VAGUENESS_CHECK_FIELDS or f in PRESCRIPTIVE_CHECK_FIELDS
        if f == "category":
            value_schema = {"type": ["string", "null"], "enum": [*PS_CATEGORIES, None]}
        elif f == "sensitivity_flags":
            value_schema = {"type": ["array", "null"], "items": {"type": "string"}}
        else:
            value_schema = {"type": ["string", "null"]}
        field_properties[f] = _field_schema(value_schema, flaggable=flaggable)

    return {
        "type": "function",
        "function": {
            "name": "emit_problem_statement",
            "description": "Emit the structured problem statement extraction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fields": {
                        "type": "object",
                        "properties": field_properties,
                        "required": CONTENT_FIELDS,
                    },
                    "clarifying_questions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Max 3. Empty if the draft is complete enough.",
                    },
                },
                "required": ["fields", "clarifying_questions"],
            },
        },
    }


EXTRACTION_TOOL = _build_extraction_tool()

SYSTEM_PROMPT = f"""You help government officers convert a rough problem description into a
structured "Problem Statement" that startups will use to design solutions.

You receive:
- raw_text: the officer's free-form description
- partial_fields: fields the officer already filled in themselves (may be empty)
- answers: (only present on a second pass) officer's answers to your previous
  clarifying_questions

GROUNDING RULES — CRITICAL:
1. Use ONLY information explicitly present in raw_text, partial_fields, or answers.
2. NEVER invent: causes, numbers, percentages, software/platform names,
   organizations, medicine/product counts, dates or durations, locations,
   technologies, policies, or any other fact about the problem.
3. A plausible assumption is still an assumption. Do NOT present assumptions
   as facts — either ground it in the input, or lower confidence and use
   the note field to label it as a proposal.
4. If a field cannot be determined from the input: confidence="unknown",
   value=null, and raise it as a clarifying question if appropriate.
5. For measurement_method: you MAY propose a generic measurement approach,
   but the note must clearly frame it as a proposed method, never as an
   existing fact about how the problem is currently measured.
6. Before finalizing each field, check: "Can I point to the exact input
   text that supports this value?" If no, remove it or mark it as a
   proposal via confidence + note, never as a stated fact.

FIELD RULES:
- title: short, outcome-framed, never a solution name.
- description: enough operational detail for a startup to scope a solution.
  NEVER invent causes or specifics not stated in the input.
- category: MUST be exactly one of: {", ".join(PS_CATEGORIES)}.
- baseline / target: NEVER fabricate a number. value=null if not stated,
  note should suggest a plausible way to establish it.
- measurement_method: a plausible tracking method, mark confidence medium/low if proposed.
- success_condition: one concrete, checkable condition.

CONFIDENCE: "high" | "medium" | "low" | "unknown"
- "unknown": value MUST be null, appears in clarifying_questions.
- "high": grounded directly in explicit input text.
- "medium"/"low": a reasonable proposal, not a stated fact — must read as
  a suggestion in the note, never asserted as given information.

VAGUE / PRESCRIPTIVE FLAGS:
- "vague": not specific enough to verify against.
- "prescriptive": mandates a solution instead of stating an outcome.
- Set flag + suggested_rewrite. Never modify value itself.

CLARIFYING QUESTIONS: Max 3, only for unknown-confidence fields.
If answers is present, this is final pass — return empty clarifying_questions.

Respond only by calling the emit_problem_statement tool. No prose."""


# ---------------------------------------------------------------------------
# 1. draft_problem_statement
# ---------------------------------------------------------------------------

async def draft_problem_statement(
    raw_text: str,
    partial_fields: Optional[dict[str, Any]] = None,
    answers: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    if not raw_text or not raw_text.strip():
        raise ValueError("raw_text is required")

    partial_fields = partial_fields or {}
    payload: dict[str, Any] = {"raw_text": raw_text, "partial_fields": partial_fields}
    if answers:
        payload["answers"] = answers

    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=2000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
        tools=[EXTRACTION_TOOL],
        tool_choice={"type": "function", "function": {"name": "emit_problem_statement"}},
    )

    message = response.choices[0].message
    tool_calls = message.tool_calls
    if not tool_calls:
        raise RuntimeError("LLM did not return a structured extraction")

    result = json.loads(tool_calls[0].function.arguments)
    if answers:
        result["clarifying_questions"] = []

    return result


# ---------------------------------------------------------------------------
# 2. resuggest_field
# ---------------------------------------------------------------------------

RESUGGEST_TOOL = {
    "type": "function",
    "function": {
        "name": "emit_field_suggestion",
        "description": "Emit a single suggested value for the requested field.",
        "parameters": {
            "type": "object",
            "properties": {
                "value": {"type": "string"},
                "rationale": {"type": "string"},
            },
            "required": ["value", "rationale"],
        },
    },
}

RESUGGEST_SYSTEM_PROMPT = """You are helping refine ONE field of an already-drafted government
Problem Statement. Propose one concrete, plausible value for ONLY that field,
grounded in the other fields' content.

GROUNDING RULE FOR RESUGGESTION — CRITICAL:
The suggestion must be derived ONLY from current_fields. Do NOT introduce:
  - named software or platforms (e.g. specific tools/products)
  - named organizations
  - exact numbers, counts, percentages, or durations
  - specific technologies not already mentioned
  - dates
unless they already appear verbatim in current_fields.

If a concrete, specific recommendation would require information not present
in current_fields, give a GENERIC recommendation instead (e.g. "use standard
hospital pharmacy inventory records" rather than naming a specific software
product), or state in the rationale that officer input is required for
anything more specific.

Do not fabricate baseline/target numbers.
Respond only by calling the emit_field_suggestion tool. No prose."""


async def resuggest_field(
    current_fields: dict[str, Any],
    field_name: str,
) -> dict[str, str]:
    if field_name not in CONTENT_FIELDS:
        raise ValueError(f"Unknown field: {field_name}")

    payload = {"current_fields": current_fields, "field_to_resuggest": field_name}

    response = await client.chat.completions.create(
        model=MODEL,
        max_tokens=500,
        messages=[
            {"role": "system", "content": RESUGGEST_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)},
        ],
        tools=[RESUGGEST_TOOL],
        tool_choice={"type": "function", "function": {"name": "emit_field_suggestion"}},
    )

    message = response.choices[0].message
    tool_calls = message.tool_calls
    if not tool_calls:
        raise RuntimeError("LLM did not return a structured suggestion")

    return json.loads(tool_calls[0].function.arguments)


# ---------------------------------------------------------------------------
# 3. check_publish_readiness
# ---------------------------------------------------------------------------

def check_publish_readiness(fields: dict[str, dict[str, Any]]) -> dict[str, Any]:
    low_confidence_fields = []
    unresolved_flags = []

    for name, data in fields.items():
        if data.get("confidence") in ("low", "unknown"):
            low_confidence_fields.append(name)
        if data.get("flag"):
            unresolved_flags.append({"field": name, "flag": data["flag"]})

    return {
        "ready": not low_confidence_fields and not unresolved_flags,
        "low_confidence_fields": low_confidence_fields,
        "unresolved_flags": unresolved_flags,
    }


# ---------------------------------------------------------------------------
# 4. ai_assist_draft — Darshan's entry point (direct LLM call, 4 fields only)
# ---------------------------------------------------------------------------

_AI_ASSIST_TOOL = {
    "type": "function",
    "function": {
        "name": "emit_ai_assist",
        "description": "Emit advisory suggestions for a rough problem statement.",
        "parameters": {
            "type": "object",
            "properties": {
                "suggested_baseline_question": {
                    "type": ["string", "null"],
                    "description": "A question to help the officer arrive at a measurable baseline. Null if too vague.",
                },
                "suggested_measurement_method": {
                    "type": ["string", "null"],
                    "description": "A plausible data source or method for measuring the outcome. Null if not derivable.",
                },
                "is_outcome_based": {
                    "type": "boolean",
                    "description": "True if the text describes an outcome, False if it prescribes a technology/solution.",
                },
                "rewrite_suggestion": {
                    "type": ["string", "null"],
                    "description": "A rewritten version nudging toward outcome framing. Null if already outcome-based.",
                },
            },
            "required": [
                "suggested_baseline_question",
                "suggested_measurement_method",
                "is_outcome_based",
                "rewrite_suggestion",
            ],
        },
    },
}

_AI_ASSIST_SYSTEM_PROMPT = """You help government officers improve rough problem descriptions.

GROUNDING RULE — CRITICAL:
Use ONLY information present in the rough text. Do NOT invent or name
specific software, platforms, organizations, exact numbers, percentages,
dates, or technologies unless they already appear in the text. If a
concrete, specific suggestion would require information not present in
the text, give a GENERIC suggestion instead (e.g. "hospital pharmacy
logs" not a named software product) — never present a plausible guess
as though it were a known fact about the situation.

Given a rough problem text, return exactly 4 advisory fields:

1. suggested_baseline_question: A question that helps the officer arrive at a
   measurable baseline (e.g. "What % of days in the last 90 days did a hospital
   report a stock-out?"). Return null if the text is too vague to suggest anything useful.

2. suggested_measurement_method: A GENERIC plausible data source or method for
   measuring the outcome (e.g. "% of days essential medicine unavailable,
   self-reported via hospital pharmacy logs"). Never name a specific software
   product, platform, or organization unless it already appears in the input
   text. Return null if not derivable from the text.

3. is_outcome_based: True if the text describes an outcome ("reduce stock-outs"),
   False if it prescribes a specific technology ("build a mobile app for inventory").

4. rewrite_suggestion: If is_outcome_based is False, provide a rewritten version
   nudging toward outcome framing. Return null if is_outcome_based is True.

These are advisory only — the officer decides what to use.
Respond only by calling the emit_ai_assist tool. No prose."""


async def ai_assist_draft(rough_text: str) -> dict[str, Any]:
    """
    Entry point wired by Darshan into problem_statement_service.py.

    Takes a rough problem description, returns exactly:
    {
        suggested_baseline_question: str | None,
        suggested_measurement_method: str | None,
        is_outcome_based: bool,
        rewrite_suggestion: str | None,
    }

    Never raises — returns safe defaults on any failure.
    """
    try:
        response = await client.chat.completions.create(
            model=MODEL,
            max_tokens=1000,
            messages=[
                {"role": "system", "content": _AI_ASSIST_SYSTEM_PROMPT},
                {"role": "user", "content": rough_text},
            ],
            tools=[_AI_ASSIST_TOOL],
            tool_choice={"type": "function", "function": {"name": "emit_ai_assist"}},
        )

        tool_calls = response.choices[0].message.tool_calls
        if not tool_calls:
            raise RuntimeError("No tool call returned")

        return json.loads(tool_calls[0].function.arguments)

    except Exception:
        return {
            "suggested_baseline_question": None,
            "suggested_measurement_method": None,
            "is_outcome_based": False,
            "rewrite_suggestion": None,
        }
