# AGENTS.md

Guidance for coding agents working in this repository (`CLAUDE.md` is a symlink to this file).

## Commands

```bash
npm run dev      # dev server (Node 20, see .nvmrc)
npm run build    # production build (lints first)
npm test         # all tests
npx jest __tests__/path/to/file.test.ts   # one test file
npm run lint
```

Requires difftastic >= 0.71.0 (binary `difft`) on PATH for the diff mode. Install with `brew install difftastic`.

## Architecture

Atlas is a Next.js app that analyzes a local TypeScript repository and draws it as a radial hierarchy (the default view), with an optional diff mode that marks changes between two refs.

- `app/page.tsx` holds the repo path, the analysis result and the diff-mode toggle, and renders `DefaultView` (plus `CompareBar` in diff mode).
- `app/api/repo-analysis` calls `app/services/analysis/controller.ts`: SCIP index (`lib/scip`), tree-sitter parse (`lib/tree-sitter`), node and edge extraction, then graph assembly into an `AnalysisResult` (`lib/analysis/types.ts`).
- `app/api/diff` runs `lib/diff/pipeline.ts`: analyze both commits (`snapshot.ts`), run difftastic, map changed spans to declarations (`units.ts`), and join the result onto the analysis.
- `app/api/git-refs` and `app/api/browse-directory` feed the repository selector and the compare bar.
- `lib/default/` holds the pure layout, camera, label, hover and card logic behind `app/components/default-view/`.
- The SCIP cache lives in `.atlas/` inside the analyzed repository.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project. Do not repeat what the code already shows; point to the authoritative file or command instead.
