# Appendix — DeepCamp technical reference

Companion to the [main report](../README.md). Every identifier below is taken from the production codebase (`workers/`), verified October 2026.

---

## A. Queue inventory

All queues share a dead-letter queue `toolhub-vec-dead`.

| Queue | Binding | Stage | batch / timeout | concurrency | Retries |
|---|---|---|---|---|---|
| `toolhub-transcript` | `TRANSCRIPT_Q` | YouTube caption fetch (3 strategies) | 5 / 3s | 3 | 5 |
| `toolhub-chunk-extract` | `CHUNK_EXTRACT` | **V3 MAP** — 8B per chunk | 3 / 5s | 20 | 3 |
| `toolhub-chunk-aggregate` | `CHUNK_AGGREGATE` | **V3 REDUCE** — 70B aggregate | 2 / 5s | 20 | **10** (5s delay) |
| `toolhub-vec-pending` | `VEC_PENDING` | V2 enricher — 70B batched | 5 / 5s | 5 (70B rate-limit safe) | 3 |
| `toolhub-vec-enriched` | `VEC_ENRICHED` | Embedder — bge-large → Vectorize | 50 / 5s | 20 | 3 |
| `toolhub-re-enrich` | `RE_ENRICH` | 70B summary re-enrich (no re-embed) | 5 / 3s | 50 | 3 |
| `toolhub-skill-classify` | `SKILL_CLASSIFY` | CPU-only keyword skill match | 50 / 2s | 20 | 3 |
| `toolhub-outcomes-reclassify` | `OUTCOMES_Q` | 70B outcomes + practical_score | 3 / 3s | 50 | 3 |
| `toolhub-micro-lessons` | `ML_QUEUE` | Jina Reader + 70B micro-lesson | 3 / 3s | 20 | 3 |
| `deepcamp-email-jobs` | `EMAIL_JOBS` | Email rendering + Resend batch | 10 / 30s | — | — |
| `tiktok-discovery-jobs` | `TIKTOK_DISCOVERY_QUEUE` | oEmbed hydration → insert | 32 / 30s | — | — |

## B. Cron schedule

| Cron | Worker | Work |
|---|---|---|
| `0 * * * *` | content-curator | Full pipeline: news import (50 rotating sources), all channels (batches of 8), alt sources, course catalogs, Dev.to + HN (10 pages each), micro-lessons (20), AI topic reclassification (40), enrich+vectorize (200), discovery queue (20), stuck-state recovery, sitemap pings |
| `20 * * * *` | content-curator | News only |
| `40 * * * *` | content-curator | Micro-lessons only (20) |
| `*/2 * * * *` | content-curator | D1→R2 transcript migration (60 rows/run) |
| `0 8 * * *` | learn-hub | Daily: pipeline report email, leaderboard recalc/decay/snapshots, job fetch, mentor notifications, email queue processing, farming detection |
| `0 8 * * 2` | learn-hub | Tuesday: weekly digest + re-engagement ladder (via queue templates) |
| `0 2 * * *` | page-generator | Legacy tool pages (scheduled for retirement) |
| `0 4 * * *` | sitemap-cron | Legacy tools sitemap + engine pings |

## C. Admin control plane (`workers/admin`)

Auth: first-run `/setup` → SHA-256 credentials in KV (`admin:creds`); login sets `__adm` cookie backed by KV session (24h TTL). Reads use the D1 replica session; writes use primary.

**Pages (13):** Overview · Users · Videos · News · Channels · Sources · Alt Sources · Topics · Search Test · Skills · Cron · SQL Runner · Settings.

**Key operations:**

| Route | What it does |
|---|---|
| `POST /run/v3-enrich?limit=N` | Seeds V3 MAP/REDUCE via service binding to curator |
| `POST /run/v3-reset-stuck` | Requeues stalled V3 states |
| `GET /api/dashboard-stats` | One JSON payload, ~17 D1 queries: V3 counts, transcript breakdown, skill-mapping split, micro-lesson states, by-level/topic/source, last cron, pause state |
| `GET /api/v3-enrich-status` | Live pipeline progress (polled every 8s) |
| `POST /api/fetch-channel` | Synchronous channel import with immediate AI classification + embedding |
| `POST /api/issue-sparks` | Manual credit grant → D1 batch (update + audit insert) + email via queue |
| `POST /api/approve-transfer` | Bank-transfer purchase approval (audit + email) |
| `POST /api/set-user-plan` | Grant/revoke Pro with `payment_provider='admin'` audit row |
| `POST /run/reconcile-vectors` | D1↔Vectorize audit (getByIds batches of 100) + repair |
| `POST /admin/pause` / `GET /admin/pause-status` | 9 pause flags shared across workers via KV (`system:pause_flags`): `ai, incoming, embeddings, crons, micro_lessons, enrichment, skill_classify, outcomes, transcripts` |

**Dashboard invariants (tested):** `v3Done` counts only transcribed videos; `v3InFlight = chunking + mapped` (excludes complete `reduced`); `v3Done + v3InFlight + v3Pending === withTranscript`.

## D. Curator ops endpoints (selected)

| Endpoint | Purpose |
|---|---|
| `POST /admin/transcript/store` | Receives transcripts from the local yt-dlp/Whisper fleet; persists to R2; auto-enqueues V3 |
| `GET /admin/transcript/pending?source=tiktok` | Randomized work list for local scripts |
| `POST /admin/v3-enrich/seed?limit=N[&include_no_transcript=1]` | Tier-aware V3 seeding (no-transcript rows go straight to aggregate with metadata-only enrichment) |
| `POST /admin/v3-enrich/fast-track` | Bypasses queues, runs `runV3Sync` workers directly |
| `POST /admin/reconcile-vectors?limit=N&offset=N` | D1↔Vectorize audit/repair |
| `POST /admin/transcripts/migrate-to-r2?dryRun=1&after=` | Idempotent, resumable D1→R2 migration |
| `POST /admin/classify-news-ai?limit=100` | 8B news topic classification (20-token outputs) |
| `POST /import/search-bulk?count=20` | AI discovery query walk via YouTube Data API |

## E. Model registry (complete)

| Model | Used for | Where |
|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | V2/V3 reduce, micro-lessons, AI chat (600 tok, temp 0.5), job matcher (temp 0.1) | curator, learn-hub |
| `@cf/meta/llama-3.1-8b-instruct` | V3 MAP, TikTok query suggestions, legacy enrichment | curator, learn-hub |
| `@cf/meta/llama-3.1-8b-instruct-fast` | News topic classification (20 tok) | curator |
| `@cf/baai/bge-large-en-v1.5` | All embeddings (1024-dim) | curator, learn-hub, admin |
| `us.anthropic.claude-3-5-sonnet-20241022-v2:0` | Explainers (3000 tok, streamed), roadmaps | learn-hub (Bedrock) |
| `us.anthropic.claude-3-5-sonnet-20240620-v1:0` → `claude-3-opus` → `claude-3-5-haiku` | Bedrock fallback chain | learn-hub |
| `@cf/zai-org/glm-5.2` → `@cf/moonshotai/kimi-k2.6` → `llama-3.3-70b` | Workers AI fallback chain | learn-hub |
| `anthropic.claude-haiku-20240307-v1:0` | Tool-runner paid AI (streaming, SigV4) | tool-runner (Bedrock) |
| Whisper (local) | TikTok audio transcription | local fleet |

## F. External services & secrets registry

| Service | Binding/vars | Purpose |
|---|---|---|
| Cloudflare D1 | `LEARN_DB` (`toolhub-learn`) | Single system database |
| Cloudflare KV | `HUB_KV` | Sessions, pause flags, caches, semantic-search quota, admin state |
| Cloudflare R2 | `TRANSCRIPTS` → `toolhub-transcripts`, `ASSETS_BUCKET` → `toolhub-assets` | Transcript text, static assets |
| Cloudflare Vectorize | `VECTORIZE` (`toolhub-videos`) | 1024-dim vector index |
| Cloudflare Queues | 11 queues + `toolhub-vec-dead` DLQ | Async pipeline stages |
| Cloudflare Browser Rendering | `BROWSER` | Caption fetch strategy 1 (slot-locked at 1 browser/sec) |
| Workers AI | `AI` | Volume inference |
| AWS Bedrock | `AWS_*` secrets, `us-east-1` | Quality-critical generation |
| YouTube Data API v3 | `YT_API_KEY` | Channel/video discovery (+ RSS fallback) |
| Paystack | `PAYSTACK_*`, plan `PLN_i0b4m4408ru90wi` | NGN subscriptions & credit top-ups |
| Resend | `RESEND_API_KEY` | Transactional & engagement email (batch API) |
| Tavily | `TAVILY_API_KEY` | TikTok URL discovery search |
| AdZuna | `ADZUNA_APP_ID/KEY` | Job source |
| Auth0 + TechAssembly SSO | `JWT_SECRET` | Authentication |
| TikTok oEmbed / Display API | `TIKTOK_CLIENT_KEY/SECRET` | Creator-authorized import |
| Jina Reader | none | Article text extraction |
| Google AdSense | `ca-pub-9720496491732739` | Ads (gated by ad-free rule) |

## G. D1 migration index (77 files, grouped)

| Range | Theme |
|---|---|
| 0001–0007 | Core content (videos, news, users, vectors, slugs) |
| 0008–0012 | Recommendation, chat, engagement, goals/camps/roadmaps, SSO |
| 0013–0026 | News AI columns, subscriptions, collections, kids-safe, usernames, analytics |
| 0027–0031 | **Skill gap engine**, topics, transcripts |
| 0032–0040 | Leaderboard, V3 chunk tables, explainer versioning, spark spends, cost indexes, email engine, admin audits |
| 0050–0064 | Ops hardening: job tables, explainer locks, video topics, browser-render lock, discovery indexes |
| 0070–0077 | Mentor syllabus, skill credentials, transcript R2, partner API, portfolios, english scores, homepage indexes, TikTok query library |

(Some migration numbers appear twice — two files each for 0021 and 0032–0036 — an artifact of parallel work; both variants apply cleanly in order.)

## H. Test & tooling inventory (learn-hub)

- **67 test files, ~658 test cases** (Vitest 2.1.9). Largest: `skill-gap-engine` (53), `leaderboard-domain` (37), `jobs-domain` (34), `tutor-explainer` (16).
- `npm run lint:js` — custom JS-in-HTML syntax linter, wired as a `predeploy` hook so `wrangler deploy` cannot skip it.
- `npx tsc --noEmit` — TypeScript 5.7.3, no emit.
- Sequence-dependent D1 mocks enforce exact SQL ordering in tests — a discipline cost of the no-ORM choice.
- `d1-cost-optimization.test.ts` — regression tests that forbid the query patterns behind the $7,198/month incident (§9.1 of the report).
