#!/usr/bin/env node
/**
 * DeepCamp evaluation harness — E1: learning-path quality.
 *
 * Runs the real GET /api/skills/gap flow for a fixed goal battery and records
 * the raw API responses for rubric scoring (see docs/EVALUATION.md §2).
 *
 * The gap endpoint computes results for ANY valid goal id without the goal
 * having to be the user's active goal, so this harness is read-only by default:
 * no Sparks are spent and no user state is mutated.
 *
 * Usage:
 *   export DC_COOKIE="__deepcamp=<session token>"
 *   node evaluation/run-skill-gap-eval.mjs --cookie "$DC_COOKIE" \
 *        [--base https://deepcamp.cc] [--out evaluation/results] [--delay 1200]
 *        [--set-goals]   # optional: also POST /api/skills/goals (spends 24 Sparks/goal)
 *
 * Response contract (verified against workers/learn-hub/index.ts):
 *   { ok, cached, gaps: [{skillId, name, level, confidence, required, gap,
 *                         importance, prerequisitesMet}],
 *       path: [{skillId, skillName, status,
 *               videos: [{id, title, slug, duration, level, thumbnail,
 *                         outcomes, practical}]}] }
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Goal battery — 10 of the 27 GOAL_TEMPLATES ids from shared/learn-catalogue.ts,
// spanning well-served, control, and intentionally sparse domains.
// ---------------------------------------------------------------------------
const GOALS = [
  'become_prompt_engineer',        // narrow, well-served
  'become_ml_engineer',            // deep, math-heavy
  'build_ai_agents',               // emerging, fast-moving content
  'become_data_analyst',           // classic, non-LLM
  'become_frontend_developer',     // control: non-AI domain
  'become_devops_engineer',        // control: non-AI domain
  'become_ai_designer',            // sparse coverage — expected weak spot
  'become_ai_marketer',            // business domain
  'become_cybersecurity_analyst',  // compliance-adjacent, sparse
  'become_fullstack_developer',    // broad
];

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
function hasFlag(flag) {
  return args.includes(flag);
}

const COOKIE = argValue('--cookie', process.env.DC_COOKIE || '');
const BASE = argValue('--base', 'https://deepcamp.cc');
const OUT = resolve(argValue('--out', 'evaluation/results'));
const DELAY = Number(argValue('--delay', '1200'));
const SET_GOALS = hasFlag('--set-goals');

if (!COOKIE) {
  console.error('Missing session cookie. Set DC_COOKIE="__deepcamp=<token>" or pass --cookie.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms + Math.random() * 300));

async function api(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { cookie: COOKIE, accept: 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} -> ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summary = [];

  for (const goalId of GOALS) {
    try {
      // Optional: replicate the real user flow (activates the goal; costs 24
      // Sparks per switch and deactivates the previously active goal).
      if (SET_GOALS) {
        await sleep(DELAY);
        await api('/api/skills/goals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ goalId }),
        });
      }

      // The evaluation call itself — read-only.
      await sleep(DELAY);
      const gap = await api(`/api/skills/gap?goalId=${encodeURIComponent(goalId)}`);

      const record = {
        goalId,
        capturedAt: new Date().toISOString(),
        fromCache: gap?.cached ?? null,
        totals: {
          gaps: gap?.gaps?.length ?? 0,
          gapsBlocking: (gap?.gaps ?? []).filter((g) => g.importance === 1).length,
          gapsLocked: (gap?.gaps ?? []).filter((g) => !g.prerequisitesMet).length,
          pathSteps: gap?.path?.length ?? 0,
          pathVideos: (gap?.path ?? []).reduce((n, s) => n + (s.videos?.length ?? 0), 0),
          stepsWithFewVideos: (gap?.path ?? []).filter((s) => (s.videos?.length ?? 0) < 3).length,
        },
        gaps: (gap?.gaps ?? []).map((g) => ({
          skillId: g.skillId,
          name: g.name,
          level: g.level,
          required: g.required,
          confidence: g.confidence,
          gap: g.gap,
          importance: g.importance,
          prerequisitesMet: g.prerequisitesMet,
        })),
        path: (gap?.path ?? []).map((s) => ({
          skillId: s.skillId,
          skillName: s.skillName,
          status: s.status,
          videos: (s.videos ?? []).map((v) => ({
            title: v.title,
            slug: v.slug,
            level: v.level,
            durationSeconds: v.duration,
            practical: v.practical,
          })),
        })),
        raw: gap,
      };

      const file = join(OUT, `e1-${goalId}-${runStamp}.json`);
      writeFileSync(file, JSON.stringify(record, null, 2));
      summary.push({ goalId, file, ok: true, ...record.totals });
      console.log(
        `ok   ${goalId}: ${record.totals.gaps} gaps (${record.totals.gapsBlocking} blocking), ` +
        `${record.totals.pathVideos} videos, ${record.totals.stepsWithFewVideos} thin steps`
      );
    } catch (err) {
      summary.push({ goalId, ok: false, error: String(err.message || err) });
      console.error(`FAIL ${goalId}: ${err.message || err}`);
    }
  }

  const summaryFile = join(OUT, `e1-summary-${runStamp}.json`);
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\nSummary -> ${summaryFile}`);
  console.log('Next: score each record against docs/EVALUATION.md §2.3 and fill §6.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
