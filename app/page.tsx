'use client';

import { useState, useEffect } from 'react';
import RepositorySelector from './components/RepositorySelector';
import DefaultView from './components/default-view/DefaultView';
import CompareBar from './components/diff/CompareBar';
import { useDiff } from './components/diff/useDiff';
import type { AnalysisResult } from '@/lib/analysis/types';

/**
 * Main application page: repository selection, analysis, and the default
 * view with an optional diff mode.
 *
 * @remarks
 * Holds the repo path, the analysis result and the diff-mode toggle. In diff
 * mode the default view draws the diff result from {@link useDiff} instead of
 * the plain analysis, and the compare bar picks the two refs.
 */
export default function HomePage() {
  const [repoPath, setRepoPath] = useState<string>('');
  const [diffMode, setDiffMode] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diffState = useDiff(repoPath);

  useEffect(() => {
    if (!repoPath) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/repo-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoPath, hideTestFiles: true }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((result) => {
        if (result.success) {
          setAnalysisData(result.data);
        } else {
          setError(result.error || 'Analysis failed');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Network error');
        setLoading(false);
      });

    return () => controller.abort();
  }, [repoPath]);

  const diffData = diffState.result?.success && diffState.result.state === 'ok' ? diffState.result.data : null;

  return (
    <main className="h-screen flex flex-col p-2 gap-2 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <RepositorySelector onRepositorySelected={setRepoPath} currentPath={repoPath} />
        </div>
        <button
          aria-pressed={diffMode}
          onClick={() => setDiffMode(!diffMode)}
          disabled={!repoPath}
          className={`px-3 py-1.5 rounded-md text-sm border disabled:opacity-40 ${
            diffMode ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Diff
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {!repoPath ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-lg">
            Select a repository to visualize
          </div>
        ) : (
          <div className="h-full min-w-0 flex flex-col gap-2">
            {diffMode && <CompareBar diffState={diffState} />}
            <div className="flex-1 min-h-0">
              <DefaultView
                analysisData={diffMode && diffData ? diffData : analysisData}
                loading={loading}
                error={error}
                diffMode={diffMode && !!diffData}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
