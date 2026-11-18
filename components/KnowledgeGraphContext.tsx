import React from 'react';
import { Link } from 'react-router-dom';
import { KNOWLEDGE_GRAPH_CONTEXT } from '../contentDiscovery';

export const KNOWLEDGE_GRAPH_SLUG = KNOWLEDGE_GRAPH_CONTEXT.slug;

// Hub-side reading context. The underlying essay remains the unchanged,
// substrate-owned September snapshot; these figures are not a new runtime audit.
export function KnowledgeGraphContext() {
  return (
    <aside aria-labelledby="measurement-context" className="my-8 rounded-lg border border-copper-500/30 bg-navy-deep/60 p-5 sm:p-7">
      <h2 id="measurement-context" className="scroll-mt-32 text-xl font-semibold text-white">What the measurements cover</h2>
      <p className="mt-2 font-mono text-xs text-slate-400">Context and companion example updated {KNOWLEDGE_GRAPH_CONTEXT.modified}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">This is a September 30, 2026 operating snapshot. The essay reports monthly Cognee search counts from March through September and a separate caller audit for the preceding 30 days.</p>
      <dl className="mt-5 space-y-4 text-sm leading-relaxed">
        <div><dt className="font-semibold text-white">Counted</dt><dd className="mt-1 text-slate-300">Searches, tool calls, successful recalls and graph size. These are different counters; they do not measure answer quality or business impact.</dd></div>
        <div><dt className="font-semibold text-white">Observed</dt><dd className="mt-1 text-slate-300">Monthly searches fell from 64,951 in March to 1 in September. The remaining chunk-recall path made 7 calls, 5 successful. The graph held 8,707 nodes and 15,279 relationships, unchanged from July.</dd></div>
        <div><dt className="font-semibold text-white">Changed then</dt><dd className="mt-1 text-slate-300">Agent write paths were removed, an almost-unused desktop integration was removed, and monthly re-ingest was stopped. Retrieval remained advisory.</dd></div>
      </dl>
      <p className="mt-5 text-sm text-slate-400">Source: <a href="#what-it-does-today-measured" className="text-copper-400 underline underline-offset-4">the published tables below</a>. The underlying logs are not public and these counts have not been remeasured for this page update. The archive plan in the original essay is a plan, not a claim that archival has happened.</p>
      <figure className="mt-6">
        <img src="/assets/guides/conversation-branches/preserve-branches.webp" width="1200" height="630" alt="A synthetic conversation forks from u1 to a1 and a2. Each answer has its own continuation. The selected path u1, a2, u3 is highlighted while the alternate branch remains stored." loading="lazy" className="h-auto w-full rounded-sm" />
        <figcaption className="mt-2 text-xs leading-relaxed text-slate-400">Synthetic example of the branch-preservation idea, separate from the measured graph. Both answers remain stored; only one ancestry path becomes a transcript.</figcaption>
      </figure>
      <p className="mt-4 text-sm"><Link to="/guides/preserving-conversation-branches-neo4j" className="text-copper-400 underline underline-offset-4">Run the five-message example and inspect its Neo4j graph</Link>.</p>
    </aside>
  );
}
