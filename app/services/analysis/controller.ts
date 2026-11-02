/**
 * Top-level analysis controller: runs the TypeScript analysis pipeline
 * (SCIP indexing, tree-sitter extraction, graph assembly).
 *
 * @remarks
 * Consumed by the repo-analysis API route and the diff snapshot pipeline.
 *
 * @packageDocumentation
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { indexTypeScriptRepo } from '@/lib/scip/ts/indexer';
import { readScipIndex } from '@/lib/scip/reader';
import { loadLanguage } from '@/lib/tree-sitter/language';
import { createParser } from '@/lib/tree-sitter/parser';
import type { TreeWrapper } from '@/lib/tree-sitter/tree';
import type { AnalysisResult } from '@/lib/analysis/types';
import { AnalysisError } from '@/lib/analysis/types';
import { isTestFile } from './test-file-detector';
import { isGeneratedFile } from './generated-file-detector';
import { extractNodes } from './node-extractor';
import { extractEdges } from './edge-extractor';
import { assembleResult } from './graph-assembler';

export interface AnalysisOptions {
  hideTestFiles?: boolean;
}

/**
 * Runs the full analysis pipeline for a TypeScript repository: SCIP
 * indexing, tree-sitter parsing, node and edge extraction, and assembly.
 *
 * @remarks
 * Validates the path exists, then orchestrates SCIP index
 * retrieval/creation, tree-sitter-based node and edge extraction, and
 * assembly of the final result. Test-file filtering is applied when
 * `hideTestFiles` is true.
 *
 * @param repoPath - Absolute path to the git repository root.
 * @param options - Optional analysis options (e.g., `hideTestFiles`).
 * @returns The full {@link AnalysisResult} with nodes, edges, and metadata.
 * @throws {@link AnalysisError} When the path does not exist.
 * @see commit 4dff751
 */
export async function analyzeRepo(
  repoPath: string,
  options?: AnalysisOptions,
): Promise<AnalysisResult> {
  const hideTestFiles = options?.hideTestFiles ?? true;

  // Validate repoPath exists
  try {
    await fs.access(repoPath);
  } catch {
    throw new AnalysisError(`Repository path does not exist: ${repoPath}`, repoPath);
  }

  const startTime = Date.now();

  // Stage 1: SCIP indexing
  const indexResult = await indexTypeScriptRepo(repoPath);
  const scipIndex = await readScipIndex(indexResult.indexPath);

  // Stage 2: Tree-sitter parsing
  const tsLang = loadLanguage('typescript');
  const tsxLang = loadLanguage('tsx');
  const tsParser = createParser(tsLang, 'typescript');
  const tsxParser = createParser(tsxLang, 'tsx');

  const parsedFiles = new Map<string, { tree: TreeWrapper; source: string }>();

  for (const doc of scipIndex.documents) {
    const filePath = doc.relativePath;

    if (isGeneratedFile(filePath)) continue;
    if (hideTestFiles && isTestFile(filePath)) continue;

    const absolutePath = path.join(repoPath, filePath);
    let source: string;
    try {
      source = await fs.readFile(absolutePath, 'utf-8');
    } catch {
      continue; // skip files that can't be read
    }

    const parser = filePath.endsWith('.tsx') ? tsxParser : tsParser;
    const result = parser.parse(source);
    parsedFiles.set(filePath, { tree: result.tree, source });
  }

  // Stage 3: Node extraction
  const { nodes, nodeMap } = extractNodes({
    parsedFiles,
    scipDocuments: scipIndex.documents,
    repoPath,
  });

  // Mark test file nodes
  if (!hideTestFiles) {
    for (const node of nodes) {
      node.inTestFile = isTestFile(node.filePath);
    }
  }

  // Stage 4: Edge extraction (populates referencedAt/outboundRefs inline)
  const edges = extractEdges({
    parsedFiles,
    scipDocuments: scipIndex.documents,
    nodeMap,
    repoPath,
  });

  // Stage 5: Assemble result
  return assembleResult({
    nodes,
    edges,
    repoPath,
    language: 'typescript',
    startTime,
  });
}
