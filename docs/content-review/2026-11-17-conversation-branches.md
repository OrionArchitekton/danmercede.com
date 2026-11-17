# Conversation branch companion review

## Scope and ownership

This is a new public guide and synthetic example. It does not modify `constants.generated.ts`, consume private conversation exports, query a knowledge store, or change the source essay. All five message strings are invented for this demonstration.

The fixture is exactly conversation `branch-demo`:

- Root `u1`: user, `Can we ship?`
- Alternate path: `a1` (`Check tests`) with parent `u1`, then `u2` (`Tests passed`) with parent `a1`.
- Selected path: `a2` (`Check rollback`) with parent `u1`, then `u3` (`Rollback ready`) with parent `a2`.
- Selected leaf: `u3`.

Expected counts: five message nodes, four parent edges, two root-to-leaf paths. A separate Neo4j conversation node is not included in the message-node count.

## Exported API

`public/examples/conversation-branches/branches.mjs` exports:

- `validateConversation(input)`: validate and return a normalized copy.
- `conversationPaths(input)`: deterministic root-to-leaf ID arrays, sorted by leaf ID.
- `selectedTranscript(input)`: selected ancestry as message objects in reading order.
- `toCypher(input)`: generate text only, after validation.

The CLI reads `fixture.json` beside the script by default and optionally accepts a different local file. `--cypher` prints the Neo4j example. It has no dependencies or network/database client.

## Local verification performed

Executed the CLI summary and Cypher generation. Verified exact fixture counts and paths, switching selection to `u2`, reversed input-array order, duplicate IDs, dangling parents, a cycle, a missing selected node, a non-leaf selection, and multiple roots. Invalid input is rejected by both validation and Cypher generation. Also checked scoped uniqueness text, a single selected-leaf property, bounded ancestry traversal, deterministic output, and quote/backslash/newline escaping.

The guide frontmatter compiles, has no banned long dash codepoints, and passes the whitespace diff check. These are local Node and source checks. **Neo4j execution was not performed.** The guide states that limitation adjacent to its evidence and query expectation.

## Neo4j design and references

- [MERGE](https://neo4j.com/docs/cypher-manual/current/clauses/merge/): merge identities before parent relationships. Repeating the unchanged fixture is designed to reuse nodes and relationships.
- [Uniqueness constraints](https://neo4j.com/docs/cypher-manual/current/schema/constraints/create-constraints/): conversation ID is unique; message identity is the pair `(conversation_id, id)`.
- [Variable-length paths](https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-paths/): traverse `REPLIES_TO` from the selected leaf toward the root and reverse the resulting nodes for reading order.
- [String literals](https://neo4j.com/docs/cypher-manual/current/values-and-types/boolean-numeric-string/): generated data uses quoted, escaped values, never dynamic Cypher identifiers.

Labels are isolated as `BranchExampleConversation` and `BranchExampleMessage`. The emitter contains no delete/drop operation. Content is set only on node creation, while `selected_leaf` is updated on the conversation. It is an illustrative serial import, not a concurrent or version-reconciliation pipeline. Changed message content or ancestry needs a new conversation ID; existing conflicting graph state is outside the example's contract.

## Relationship to the field report

The September 30 essay contains a preceding 30-day caller audit and a separate March-through-September monthly search history. The guide links those observations without relabeling them as a new November measurement or conflating their windows. Preserved conversation history remains advisory; current code, tests and repository instructions retain authority.
