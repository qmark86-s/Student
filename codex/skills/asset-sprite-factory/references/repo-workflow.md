# Student Repo Workflow

Use this reference only for the Student web/Capacitor game repo.

## Required Reading

1. `AGENTS.md`
2. `docs/asset_sprite_factory.md`
3. `docs/visual_asset_production.md`

## Standard Commands

```powershell
git status --short
npm run asset:factory:prepare
npm run asset:factory:qa
npm run verify:mobile
```

## Visual Review

Open these generated artifacts after `asset:factory:prepare`:

- `artifacts/visual-asset-samples/character-axis-review-page-01.png`
- `artifacts/visual-asset-samples/character-axis-review-page-02.png`
- `artifacts/visual-asset-contact-sheet/index.html`
- `artifacts/visual-asset-smoke/main-battle.png`

## Do Not

- Do not use Godot, Unity, Unreal, or UMG workflows for this project.
- Do not accept left-facing movement frames for right-facing combat.
- Do not use a collage crop as a final character source.
- Do not hide missing assets behind CSS fallback shapes.
- Do not finish until review sheets and smoke screenshots match the intended quality.
