# Publishing this report

The report is self-contained in this folder. Two publication targets, per the application strategy: **GitHub for technical credibility**, **Zenodo for a citable DOI**.

---

## 1. GitHub

The report must live in its own public repo (not inside the private application codebase). The folder is intentionally standalone.

```bash
# From the repo root
mkdir ../deepcamp-technical-report
cp -r paper/* ../deepcamp-technical-report/
cd ../deepcamp-technical-report

git init
git add -A
git commit -m "DeepCamp technical report v1.0 — architecture, AI systems, evaluation"
git branch -M main
git remote add origin git@github.com:<your-username>/deepcamp-technical-report.git
git push -u origin main
```

Suggested repo settings:
- **Description:** "Technical report: the DeepCamp learning engine — turning 830k+ free videos into goal-driven, skill-verified learning. Architecture, AI systems, evaluation."
- **Topics:** `ai`, `cloudflare-workers`, `retrieval`, `learning-engine`, `vector-search`, `technical-report`
- **About website link:** https://deepcamp.cc

### Before pushing — checklist

- [ ] Fill the traction placeholders (see §4 below).
- [ ] Decide on repository disclosure: the report currently describes internals without code. If you want stronger credibility, extract and publish the two safest pure-data modules (`shared/learn-catalogue.ts` skill graph; `src/jobs/sources/*` adapters) as `examples/`.
- [ ] Re-capture screenshots if the UI has changed (`scripts/capture-screenshots.mjs`).
- [ ] Run `git status` and make sure no secrets, `.dev.vars`, or private repo paths leaked into the folder.

## 2. Zenodo

1. Sign in at https://zenodo.org with GitHub.
2. Enable the new repo under Account → GitHub, then click **Get DOI** for it — Zenodo mints a DOI per release.
3. Create release `v1.0` on GitHub → Zenodo publishes the snapshot with a DOI.
4. Update the citation line below once the DOI exists:

> Samuel Iso. *From Content Consumption to Demonstrable Capability: The DeepCamp learning engine.* Zenodo. DOI: **[pending]**

## 3. Companion posts

- **LinkedIn article (short form):** one post framing the problem → the loop diagram → link to the report. Reuse the report's Executive Summary paragraphs.
- **Application form:** the "paper / relevant work" field points to the GitHub repo; the description field quotes the central research question and the one-paragraph summary.

## 4. Placeholders to fill before publishing

The report deliberately contains no invented numbers. Fill or confirm:

| Location | Placeholder | Source |
|---|---|---|
| README §8 (Evaluation) | evaluation results tables | run the harness, fill `docs/EVALUATION.md` §6 |
| README §12 / PUBLISHING | traction metrics (registered users, DAU, engagement events) | your admin dashboard — update to the latest verified figures with an "as of" date |
| Zenodo citation line | DOI | after first release |

## 5. Versioning

- `v1.0` — this document (architecture + methodology, results pending).
- `v1.1` — evaluation results filled, any architecture changes since.
- Tag releases in GitHub; Zenodo re-mints DOIs per release automatically.
