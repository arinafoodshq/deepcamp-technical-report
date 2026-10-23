# Evaluation methodology — DeepCamp learning engine

Companion to the [main report](../README.md), §8. This document defines what we measure, how, and what we explicitly do **not** claim. Results tables are shipped empty and will be filled in v1.1 of the report — this is deliberate: an evaluation published before it is run is marketing, not measurement.

---

## 1. What is evaluated

Three subsystems, chosen because they are the load-bearing AI components of the product:

| # | Subsystem | Question | Method |
|---|---|---|---|
| E1 | **Learning-path quality** (skill gap engine + `video_skill_map` retrieval) | Given a career goal, is the produced learning path relevant, correctly ordered, and complete? | Rubric-scored API run over a fixed goal battery |
| E2 | **Retrieval quality** (hybrid semantic search) | Does semantic search retrieve more relevant results than keyword-only? | Graded relevance, semantic vs keyword baseline |
| E3 | **Explainer faithfulness** (AI tutor) | Do AI explainers stick to what the transcript actually says? | Sampled claim-checking against source transcripts |

**Explicitly out of scope until instrumentation matures:** learning outcomes (job placement, skill retention, completion deltas). These require cohort tracking that is being added; no outcome claims are made in this report.

---

## 2. E1 — Learning-path quality

### 2.1 Goal battery

10 of the 27 production goal templates, spanning the difficulty range:

1. `become_prompt_engineer` (narrow, well-served topic)
2. `become_ml_engineer` (deep, math-heavy)
3. `build_ai_agents` (emerging, fast-moving content)
4. `become_data_analyst` (classic, non-LLM)
5. `become_frontend_developer` (control: non-AI domain)
6. `become_devops_engineer` (control: non-AI domain)
7. `become_ai_designer` (sparse-coverage domain — expected to expose weaknesses)
8. `become_ai_marketer` (business domain)
9. `become_cybersecurity_analyst` (compliance-adjacent, sparse)
10. `become_fullstack_developer` (broad)

### 2.2 Procedure

For each goal, with a fresh test account at zero skill state:

1. `POST /api/skills/goals` — set the goal.
2. `GET /api/skills/gap?goalId=...` — fetch the computed gap list + learning path (cache-busted).
3. Record: every gap skill (name, importance, min_confidence, gap size), every path step (skill, videos with title/topic/level/relevance/rank), total hours estimate.
4. Repeat after simulating a learning profile (seeded watch history for 3 prerequisite skills) and re-run — verifies the gap engine *responds* to state changes.

### 2.3 Rubric (scored 0–2 per item, three independent passes)

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| **Relevance** — path videos actually teach the target skill | ≥30% off-topic | 70% on-topic | ≥90% on-topic |
| **Ordering** — prerequisites precede dependents | foundational skills appear after advanced | one ordering violation | strict prerequisite order |
| **Coverage** — all blocking (importance=1) skills present in path | >2 blocking skills missing | 1 missing | all blocking skills covered |
| **Level progression** — beginner content before advanced | inverted | mixed | monotonic where metadata exists |
| **Actionability** — every path step has ≥3 concrete videos | any step with <3 | all steps ≥3 | all steps ≥5 with practical_score > 0.5 |

Score per goal = sum/10 (max 2 per criterion × 5 criteria × … normalized to 0–100). Failures are logged with the exact API response for diagnosis.

### 2.4 Known confounds (stated up front)

- `video_skill_map` coverage depends on the classification backfill having reached a video; results will quantify current coverage per domain rather than hide it.
- Sparse domains (UX/UI, Kids) are included *because* they are expected to score poorly; a benchmark that only tests strengths is an ad, not an evaluation.

---

## 3. E2 — Retrieval quality

### 3.1 Query set

20 queries across three intents: **conceptual** ("how do neural networks learn", "what is RAG"), **task** ("build a chatbot with python", "deploy a model on aws"), **jargon-mismatch** ("make computers see" → computer vision, "teach a robot to talk" → NLP). Jargon-mismatch queries are the discriminative test of semantic vs keyword search.

### 3.2 Procedure & metric

For each query: run production search with `semantic=1` and `semantic=0`, take top 10 each. Grade top-10 relevance on a 0–2 scale (0 irrelevant / 1 adjacent / 2 directly teaches the query). Metric: **nDCG@10** per mode, plus MRR. Report the delta with 95% CI across queries (paired, since the same query is its own control).

---

## 4. E3 — Explainer faithfulness

Sample 20 cached explainers across topics and levels. For each: extract atomic factual claims from the explainer, check each against the source transcript (stored in R2; retrievable by the checker via the video page). Classify: supported / unsupported / contradicted. Metric: **faithfulness rate** = supported / total claims, with the hallucination inventory published alongside. This is the same evaluation logic used for RAG systems applied to tutoring.

---

## 5. Running the harness

```bash
# 1. Create a test account at deepcamp.cc and copy its session cookie
#    (name: __deepcamp, value: <64-hex token>)

# 2. Run the E1 battery — read-only: the gap endpoint computes results for any
#    valid goal id, so no goals are activated and no Sparks are spent.
export DC_COOKIE="__deepcamp=<token>"
node evaluation/run-skill-gap-eval.mjs --cookie "$DC_COOKIE" \
      --out evaluation/results

# 3. The script writes one JSON per goal plus a summary. Each record contains
#    the full gap list (skill, required vs actual confidence, importance,
#    prerequisite state) and the ordered learning path (steps with videos,
#    level, duration, practical score).
```

Optional `--set-goals` replicates the real user flow first (POST /api/skills/goals — note this spends 24 Sparks per switch and deactivates the previously active goal, matching production behavior).

The harness hits only documented endpoints, sends requests sequentially with jittered delays, and never bypasses auth — it is a *user*, not an attack.

**Pre-registered analysis notes:**

- `totals.stepsWithFewVideos` counts path steps with <3 videos — the "actionability" rubric line.
- `totals.gapsLocked` counts skills whose prerequisites are unmet — sanity check for the ordering rubric line.
- Records are captured raw (`raw` field) so scoring disputes can be re-adjudicated from the artifact.

## 6. Results

> **Status: pending.** Tables below are the pre-registered reporting format. v1.1 of the report will fill them or state why a number could not be produced. No results will be added without the raw JSON artifacts committed alongside.

### E1 — Learning-path quality (target: fill by report v1.1)

| Goal | Relevance | Ordering | Coverage | Level progression | Actionability | Total /100 |
|---|---|---|---|---|---|---|
| become_prompt_engineer | — | — | — | — | — | — |
| become_ml_engineer | — | — | — | — | — | — |
| build_ai_agents | — | — | — | — | — | — |
| become_data_analyst | — | — | — | — | — | — |
| become_frontend_developer | — | — | — | — | — | — |
| become_devops_engineer | — | — | — | — | — | — |
| become_ai_designer | — | — | — | — | — | — |
| become_ai_marketer | — | — | — | — | — | — |
| become_cybersecurity_analyst | — | — | — | — | — | — |
| become_fullstack_developer | — | — | — | — | — | — |

### E2 — Retrieval (semantic vs keyword)

| Metric | Semantic | Keyword | Δ (95% CI) |
|---|---|---|---|
| nDCG@10 (20 queries) | — | — | — |
| MRR | — | — | — |
| Jargon-mismatch subset nDCG@10 | — | — | — |

### E3 — Explainer faithfulness

| Metric | Value |
|---|---|
| Explainers sampled | 20 |
| Claims extracted | — |
| Supported | — |
| Unsupported | — |
| Contradicted | — |
| **Faithfulness rate** | — |
