import { GUIDES, WORKS } from './constants';

export interface GuideJourney {
  read: string;
  work?: string;
  example?: { href: string; title: string; description: string };
}

export const GROKBOT_EXAMPLE_URL = 'https://github.com/OrionArchitekton/orion-skills/tree/e8474511988d3103f226619d5765961537cb9c21/skills/grokbot';

export const KNOWLEDGE_GRAPH_CONTEXT = {
  slug: '2026-09-30-the-knowledge-graph-my-agents-stopped-asking',
  modified: '2026-11-17',
  image: '/assets/guides/conversation-branches/preserve-branches.webp',
  imageAlt: 'Synthetic conversation graph retaining two branches and highlighting the selected ancestry path u1, a2, u3.',
} as const;

// Editorial relationships, not a newest-first recommendation shared by every
// subject. Keep the next read close to the problem the reader just solved.
export const GUIDE_JOURNEYS: Record<string, GuideJourney> = {
  'regression-test-ai-agent-prompt-model-change': {
    read: 'why-agent-code-needs-layered-review',
    work: 'proctor',
    example: {
      href: '/proof?scenario=proctor-drift#gate-simulator',
      title: 'Compare the Proctor approval boundary',
      description: 'An interactive illustration of a drift finding held for review. The guide provides the runnable engine demo.',
    },
  },
  'where-claude-code-usage-goes': { read: 'claude-code-controls-grok-bot', work: 'mcp-context-budget' },
  'claude-code-controls-grok-bot': {
    read: 'where-claude-code-usage-goes',
    example: {
      href: GROKBOT_EXAMPLE_URL,
      title: 'Inspect the bridge and protocol tests',
      description: 'Pinned public source for the request, outbox and unknown-send handling described in this guide.',
    },
  },
  'preserving-conversation-branches-neo4j': {
    read: 'agent-development-evidence-handoff',
    example: {
      href: '/examples/conversation-branches/branches.mjs',
      title: 'Run the synthetic branch validator',
      description: 'Download the Node.js example and its JSON fixture from the guide; no database or API key is needed for validation.',
    },
  },
  'build-a-supervisor-agent': { read: 'coordinate-local-agents-with-orion-pm', work: 'orion-pm' },
  'agent-development-evidence-handoff': { read: 'capture-agent-results-with-byte-bounded-snapshots', work: 'orion-handoff' },
  'done-needs-a-receipt': { read: 'regression-test-ai-agent-prompt-model-change', work: 'proctor' },
  'git-worktree-overlap-report': { read: 'coordinate-local-agents-with-orion-pm', work: 'orion-worktree-report' },
  'capture-agent-results-with-byte-bounded-snapshots': { read: 'agent-development-evidence-handoff', work: 'orion-results' },
  'continue-agent-tasks-with-orion-starter': { read: 'hand-off-local-agent-tasks', work: 'orion-handoff' },
  'hand-off-local-agent-tasks': { read: 'agent-development-evidence-handoff', work: 'orion-handoff' },
  'agent-android-phones': { read: 'multi-agent-browser-pool', work: 'orion-phone' },
  'coordinate-local-agents-with-orion-pm': { read: 'git-worktree-overlap-report', work: 'orion-pm' },
  'operating-ai-agents-windows-wsl-linux': { read: 'self-hosting-websites-and-apps', work: 'orion-skills' },
  'quality-video-on-local-hardware': { read: 'done-needs-a-receipt', work: 'agent-demo-video' },
  'multi-agent-browser-pool': { read: 'giving-your-agent-web-access', work: 'orion-browser' },
  'openai-dot-starts-claude-code-sessions': { read: 'claude-code-controls-grok-bot' },
  'the-fail-closed-harness': {
    read: 'regression-test-ai-agent-prompt-model-change',
    work: 'failclosed',
    example: {
      href: '/proof?scenario=failclosed-drift#gate-simulator',
      title: 'Inspect a simulated merge refusal',
      description: 'Compare advisory checks with a required gate and inspect the illustrative decision receipt.',
    },
  },
  'agent-built-infrastructure-you-can-trust': { read: 'the-fail-closed-harness', work: 'failclosed' },
  'off-budget-subagents-under-claude-code': { read: 'where-claude-code-usage-goes', work: 'orion-skills' },
  'giving-your-agent-web-access': { read: 'multi-agent-browser-pool', work: 'mcp-context-budget' },
  'why-agent-code-needs-layered-review': { read: 'regression-test-ai-agent-prompt-model-change', work: 'failclosed' },
  'governed-double-send-safe-delivery': { read: 'claude-code-controls-grok-bot' },
  'why-llm-schemas-get-rejected': { read: 'regression-test-ai-agent-prompt-model-change', work: 'schemafit' },
  'verifier-abstention-not-refutation': { read: 'why-agent-code-needs-layered-review', work: 'proctor' },
  'self-hosting-websites-and-apps': { read: 'operating-ai-agents-windows-wsl-linux' },
};

export function guideJourney(slug: string) {
  const choice = GUIDE_JOURNEYS[slug];
  if (!choice) return null;
  const read = GUIDES.find((guide) => guide.slug === choice.read);
  if (!read || read.slug === slug) throw new Error(`Invalid related guide for ${slug}: ${choice.read}`);
  const work = choice.work ? WORKS.find((item) => item.slug === choice.work) : undefined;
  if (choice.work && !work) throw new Error(`Invalid related project for ${slug}: ${choice.work}`);
  return { read, work, example: choice.example };
}

export const PRIORITY_GUIDE_SLUGS = [
  'regression-test-ai-agent-prompt-model-change',
  'where-claude-code-usage-goes',
  'claude-code-controls-grok-bot',
] as const;
