---
name: asset-sprite-factory
description: Create, normalize, validate, and ship reusable game sprite assets through the Student repo asset factory. Use when Codex needs to make or review student sprites, RPG characters, companions, monsters, move sheets, transparent cutouts, sprite atlases, axis/baseline alignment, visual QA, or repeatable AI-generated bitmap asset production for this web/Capacitor game.
---

# Asset Sprite Factory

## Core Rule

Use this skill to keep sprite production repeatable. AI image generation may create source candidates, but final project assets must pass the repo-local deterministic pipeline: source PNG -> chroma key/matte cleanup -> axis/baseline normalization -> atlas packing -> CSS/manifest update -> visual QA.

## Workflow

1. Work from the project root and read `AGENTS.md` plus `docs/asset_sprite_factory.md`.
2. Check `git status --short` before editing. Do not revert unrelated user changes.
3. Add source sheets one character at a time under `assets/visual-source/characters/`.
4. Prefer a `4 columns x 1 row` move sheet with right-facing key poses: contact, passing, high step, push-off.
5. Use bright green `#00FF00` or a similarly clean matte background. Do not crop multiple characters from a collage for final production.
6. Run `npm run asset:factory:prepare`.
7. Inspect `artifacts/visual-asset-samples/character-axis-review-page-*.png`.
8. For companions and monsters, inspect both `artifacts/visual-asset-samples/professional-axis-review-page-*.png` and `artifacts/visual-asset-samples/professional-zoom-review-page-*.png`.
9. Run `npm run asset:factory:qa`, then `npm run verify:mobile` for release-facing changes.

## Quality Gates

- Every character must face right unless the target feature explicitly defines another direction.
- `poseDelta.minimum` must be at least the manifest `minFrameDifference`.
- Center drift must stay within 1px.
- Baseline drift must be 0px.
- Solid body height drift must stay within 3px.
- Companions and monsters must keep at least 8px top/bottom alpha margin after normalization.
- Companion/monster zoom review must show source 4 frames and normalized 4 frames without clipping, matte leaks, or one-frame scale jumps.
- One frame visibly growing or shrinking is a failure even if the app still runs.
- Browser/mobile screenshots must not show horizontal overflow or text/sprite overlap.

## Commands

```powershell
npm run asset:factory:prepare
npm run asset:factory:review
npm run asset:factory:qa
npm run asset:factory:install-skill
```

Use `asset:factory:install-skill` when another Codex Agent should discover this skill from the local Codex skills directory.

## Source Files

- `docs/asset_sprite_factory.md`: detailed human/agent guide
- `tools/asset-factory/run.mjs`: workflow runner
- `tools/asset-factory/summarize-character-report.mjs`: axis quality summary
- `tools/asset-factory/make-character-review-sheet.py`: review sheet generator
- `tools/prepare-character-sprites.py`: matte cleanup and normalization
- `tools/generate-professional-sprite-sources.py`: deterministic companion and expedition enemy source generation
- `tools/prepare-professional-sprites.py`: professional sprite normalization and source-vs-normalized zoom sheets
- `data/character_animation_manifest.json`: character set table
- `data/professional_sprite_manifest.json`: companion and expedition enemy table

## Expansion

For a new RPG character or monster family, start from `tools/asset-factory/recipes/character-set.template.json`. Keep the manifest/table first, then add source images, then connect the generated frames into a runtime atlas. Do not hardcode absolute paths or one-off CSS-only fallback sprites.

Read `references/repo-workflow.md` when you need a compact checklist for this specific Student repo.
