---
title: "Preserving Conversation Branches in Neo4j: A Runnable Example"
slug: preserving-conversation-branches-neo4j
date: 2026-11-17
reviewed: 2026-11-17
category: Agent Engineering
description: "Preserve conversation branches with parent links and a selected leaf. Run a five-message example locally, then inspect scoped Neo4j MERGE and ancestry queries."
lead: "Store each message with its parent, retain alternate branches, and keep the selected leaf separately. Reconstruct a transcript from that leaf's ancestry instead of flattening every message into one conversation."
image: /assets/guides/conversation-branches/preserve-branches.webp
image_alt: "Five synthetic messages fork after u1: one branch is u1, a1, u2; the selected branch is u1, a2, u3. Four parent links preserve both histories."
---

## How do you preserve a conversation's branches?

Give every message a stable ID, preserve its parent ID, and store the selected leaf as a separate value. Follow only that leaf's parents when constructing the selected transcript. Keep the other messages and edges so another branch can still be recovered. Sorting all messages into one list can join answers that belonged to different paths.

**Scope:** this is a synthetic, normalized five-message tree. It is not a ChatGPT export specification, a production ingestion pipeline, or a sample from private conversations. The local program validates the tree and generates Cypher text; it makes no network or database calls.

**Evidence:** the [fixture](/examples/conversation-branches/fixture.json) and [dependency-free program](/examples/conversation-branches/branches.mjs) are published with this page. The Node example was executed for this release. The generated Cypher was checked against Neo4j's documentation, but was not executed against a Neo4j database for this guide.

![Five synthetic messages fork after u1: one branch is u1, a1, u2; the selected branch is u1, a2, u3. Four parent links preserve both histories.](/assets/guides/conversation-branches/preserve-branches.webp "Synthetic conversation branch-demo. Selecting u3 keeps the rollback path active while preserving the tests path.")

## What does the small example contain?

Conversation `branch-demo` has five messages. The two assistant replies share the same parent; they are alternatives, not consecutive turns.

| Message | Role | Text | Parent |
|---|---|---|---|
| `u1` | user | Can we ship? | `null` |
| `a1` | assistant | Check tests | `u1` |
| `u2` | user | Tests passed | `a1` |
| `a2` | assistant | Check rollback | `u1` |
| `u3` | user | Rollback ready | `a2` |

The selected leaf is `u3`. Its transcript is `u1`, `a2`, `u3`: “Can we ship?”, “Check rollback”, “Rollback ready”. The alternate path `u1`, `a1`, `u2` remains available. Appending all five messages would falsely put both assistant replies and their follow-ups into the same exchange.

This model has **five message nodes, four parent edges and two root-to-leaf paths**. A separate conversation node in Neo4j holds the conversation ID and selected-leaf property; it is not included in the five-message count.

## Run the branch-preserving example locally

Download [branches.mjs](/examples/conversation-branches/branches.mjs) and [fixture.json](/examples/conversation-branches/fixture.json) into the same directory. With Node.js 20 or later:

```sh
node branches.mjs
```

The output includes these fields, followed by the selected messages with their roles and text:

```json
{
  "conversation": "branch-demo",
  "message_nodes": 5,
  "parent_edges": 4,
  "root_to_leaf_paths": 2,
  "paths": [["u1", "a1", "u2"], ["u1", "a2", "u3"]],
  "selected_leaf": "u3",
  "selected_path": ["u1", "a2", "u3"]
}
```

Change only `selected_leaf` to `u2`, rerun the command, and the selected path becomes `u1`, `a1`, `u2`. Both branches remain stored. This is selection over preserved history; it does not rewrite message ancestry.

The script rejects duplicate message IDs, unknown parents, cycles, multiple roots, missing selections and a selected node that still has children. These checks run before it prints a summary or emits Cypher. Message order in the JSON array is not used to infer ancestry.

## How does the model map to Neo4j?

The generated example uses isolated labels:

| Model element | Neo4j representation |
|---|---|
| Conversation | `BranchExampleConversation`, unique `id` |
| Message | `BranchExampleMessage`, unique pair `(conversation_id, id)` |
| Parent link | `(child)-[:REPLIES_TO]->(parent)` |
| Current selection | `selected_leaf` property on the conversation |

Message IDs are scoped to their conversation. The selected leaf is a property, so changing the selection does not accumulate competing “current” relationships. The parent edges point backward toward the root; reading order is obtained by reversing the resulting ancestry path.

Restore `selected_leaf` to `u3` in `fixture.json` to reproduce the selected transcript shown below. Then generate the Cypher locally.

```sh
node branches.mjs --cypher > branch-demo.cypher
```

Inspect the file before running it in a disposable Neo4j database. It creates two named uniqueness constraints, merges the conversation and message identities, and merges the four parent relationships. It contains no deletion command. Neo4j documents [MERGE's match-or-create behavior](https://neo4j.com/docs/cypher-manual/current/clauses/merge/) and [composite property uniqueness constraints](https://neo4j.com/docs/cypher-manual/current/schema/constraints/create-constraints/).

Repeating the unchanged fixture is designed to reuse the same nodes and edges. Message content is set only when a message is created; the selected-leaf property is updated independently. **This is not a synchronization algorithm:** use a new conversation ID for a changed content or ancestry snapshot. Reusing identities for different parent links could leave old edges behind. A production importer needs an explicit revision and conflict policy.

## Read only the selected ancestry

The generated file ends with this query for the five-message fixture:

```cypher
MATCH (c:BranchExampleConversation {id: "branch-demo"})
MATCH p=(leaf:BranchExampleMessage {conversation_id: c.id, id: c.selected_leaf})
        -[:REPLIES_TO*0..4]->(root:BranchExampleMessage)
WHERE NOT (root)-[:REPLIES_TO]->(:BranchExampleMessage)
  AND all(m IN nodes(p) WHERE m:BranchExampleMessage AND m.conversation_id = c.id)
RETURN [m IN reverse(nodes(p)) | {id: m.id, role: m.role, content: m.content}]
       AS selected_transcript;
```

Starting at `u3` and following parent edges can reach `a2` and `u1`; it cannot move down the other branch to `a1` or `u2`. The predicate limits the path to this conversation and ends at a root. The four-edge ceiling is derived from this fixture's node count, not a recommended limit for every conversation. See Neo4j's [variable-length path documentation](https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-paths/) for the underlying traversal syntax.

The expected selected IDs are `u1`, `a2`, `u3`. That is a documentation-checked query expectation, not a reported Neo4j execution result.

## What must an adapter do with a real export?

Normalize a supported export shape before using this example's validator. An export can contain structural roots with `message: null`, missing content, edited nodes or vendor-specific selection fields. Do not turn a structural root into an invented human message, silently discard its descendants, or guess parentage from timestamps.

An adapter should retain the source identifiers and ancestry, state how structural nodes are represented, and reject unsupported shapes. This sample requires exactly one message root and one selected leaf; it deliberately rejects raw export objects that do not satisfy that contract. Keep versioned fixtures for every export shape the adapter claims to support.

## What does this prove about the larger knowledge graph?

This example proves a small data-model property locally: two branches survive, and selecting one returns only its ancestry. It does not measure retrieval quality, agent usefulness or production ingestion reliability.

The [original knowledge-graph field report](/thoughts/2026-09-30-the-knowledge-graph-my-agents-stopped-asking) covers a different question. Its September 30, 2026 snapshot includes a preceding 30-day caller audit and a separate March-through-September monthly search history. Those windows should not be combined into one measurement. This companion adds no new usage observations.

Preserving history also does not grant it authority. Retrieved conversation content remains advisory context; current repository instructions, code and tests still govern the work. For the behavior check after an agent changes, continue to the [Proctor regression-testing guide](/guides/regression-test-ai-agent-prompt-model-change).
