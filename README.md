# Atlas

Atlas is a local Next.js app that maps a TypeScript repository as a radial hierarchy of folders, files and symbols, and can mark what changed between two commits. Analysis uses a SCIP index and tree-sitter, runs on your machine, and uploads nothing. Released under the MIT license.

## Getting started

You need Node 20 and [difftastic](https://difftastic.wilfred.me.uk/) 0.71.0 or newer (`brew install difftastic`).

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a local TypeScript repository.
