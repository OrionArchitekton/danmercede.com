// Synthetic conversation-tree example. No dependencies, network or database calls.
// This normalized format is not a vendor export schema.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const roles = new Set(['system', 'user', 'assistant', 'tool']);
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/** Validate a single rooted conversation tree; return a normalized copy. */
export function validateConversation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Expected a normalized conversation object.');
  }
  if (!nonEmptyString(input.id)) throw new TypeError('Conversation id must be a non-empty string.');
  if (!nonEmptyString(input.selected_leaf)) throw new TypeError('selected_leaf must name a message.');
  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    throw new TypeError('messages must be a non-empty array of normalized message objects.');
  }

  const byId = new Map();
  const messages = input.messages.map((message, index) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new TypeError(`Message ${index} must be an object; null export nodes need an explicit adapter.`);
    }
    if (!nonEmptyString(message.id)) throw new TypeError(`Message ${index} has an invalid id.`);
    if (byId.has(message.id)) throw new TypeError(`Duplicate message id: ${message.id}`);
    if (message.parent_id !== null && !nonEmptyString(message.parent_id)) {
      throw new TypeError(`Message ${message.id} needs parent_id as a message id or null.`);
    }
    if (!roles.has(message.role) || typeof message.content !== 'string') {
      throw new TypeError(`Message ${message.id} needs a supported role and string content.`);
    }
    const normalized = {
      id: message.id, parent_id: message.parent_id, role: message.role, content: message.content,
    };
    byId.set(normalized.id, normalized);
    return normalized;
  });

  for (const message of messages) {
    if (message.parent_id !== null && !byId.has(message.parent_id)) {
      throw new TypeError(`Dangling parent ${message.parent_id} on message ${message.id}.`);
    }
  }

  // Follow parent links rather than input order. Mark each completed chain so
  // validation is linear and does not use the JavaScript recursion stack.
  const completed = new Set();
  for (const message of messages) {
    const chain = new Set();
    let cursor = message;
    while (cursor && !completed.has(cursor.id)) {
      if (chain.has(cursor.id)) throw new TypeError(`Cycle in parent links at message ${cursor.id}.`);
      chain.add(cursor.id);
      cursor = cursor.parent_id === null ? null : byId.get(cursor.parent_id);
    }
    for (const id of chain) completed.add(id);
  }
  if (messages.filter((message) => message.parent_id === null).length !== 1) {
    throw new TypeError('The example requires exactly one root message.');
  }
  if (!byId.has(input.selected_leaf)) throw new TypeError('selected_leaf does not exist.');
  if (messages.some((message) => message.parent_id === input.selected_leaf)) {
    throw new TypeError('selected_leaf must be a leaf, not an ancestor with children.');
  }
  return { id: input.id, selected_leaf: input.selected_leaf, messages };
}

function ancestry(byId, leafId) {
  const result = [];
  let cursor = byId.get(leafId);
  while (cursor) {
    result.push(cursor);
    cursor = cursor.parent_id === null ? null : byId.get(cursor.parent_id);
  }
  return result.reverse();
}

/** All root-to-leaf ID paths, sorted by leaf id for deterministic output. */
export function conversationPaths(input) {
  const conversation = validateConversation(input);
  const byId = new Map(conversation.messages.map((message) => [message.id, message]));
  const parents = new Set(conversation.messages.map((message) => message.parent_id));
  return conversation.messages
    .filter((message) => !parents.has(message.id))
    .map((message) => message.id)
    .sort()
    .map((id) => ancestry(byId, id).map((message) => message.id));
}

/** Only the chosen leaf's ancestry, in root-first order. */
export function selectedTranscript(input) {
  const conversation = validateConversation(input);
  const byId = new Map(conversation.messages.map((message) => [message.id, message]));
  return ancestry(byId, conversation.selected_leaf);
}

// Strings are values, never Cypher identifiers or executable fragments. JSON's
// quote/backslash/control escapes also form valid double-quoted Cypher strings.
const cypherString = (value) => JSON.stringify(value).replace(/[\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16)}`);

/** Emit an import and ancestry query as text. This function does not execute it. */
export function toCypher(input) {
  const conversation = validateConversation(input);
  const rows = conversation.messages.map((message) => (
    `  {id: ${cypherString(message.id)}, parent_id: ${message.parent_id === null ? 'null' : cypherString(message.parent_id)}, role: ${cypherString(message.role)}, content: ${cypherString(message.content)}}`
  )).join(',\n');
  return `// Synthetic example only. Review before running in a disposable Neo4j database.
// Repeating this unchanged fixture is idempotent. Use a new conversation id for
// changed message content or ancestry; this is not a synchronization importer.
CREATE CONSTRAINT branch_example_conversation_id IF NOT EXISTS
FOR (c:BranchExampleConversation) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT branch_example_message_key IF NOT EXISTS
FOR (m:BranchExampleMessage) REQUIRE (m.conversation_id, m.id) IS UNIQUE;

WITH ${cypherString(conversation.id)} AS conversation_id,
     ${cypherString(conversation.selected_leaf)} AS selected_leaf,
[
${rows}
] AS messages
MERGE (c:BranchExampleConversation {id: conversation_id})
SET c.selected_leaf = selected_leaf
WITH c, messages
UNWIND messages AS row
MERGE (m:BranchExampleMessage {conversation_id: c.id, id: row.id})
ON CREATE SET m.role = row.role, m.content = row.content
WITH c, messages, count(m) AS message_count
UNWIND messages AS row
WITH c, message_count, row WHERE row.parent_id IS NOT NULL
MATCH (child:BranchExampleMessage {conversation_id: c.id, id: row.id})
MATCH (parent:BranchExampleMessage {conversation_id: c.id, id: row.parent_id})
MERGE (child)-[:REPLIES_TO]->(parent)
RETURN c.id AS conversation, message_count, count(*) AS parent_edges;

// Follow the selected leaf toward its ancestors, then reverse to reading order.
MATCH (c:BranchExampleConversation {id: ${cypherString(conversation.id)}})
MATCH p=(leaf:BranchExampleMessage {conversation_id: c.id, id: c.selected_leaf})
        -[:REPLIES_TO*0..${conversation.messages.length - 1}]->(root:BranchExampleMessage)
WHERE NOT (root)-[:REPLIES_TO]->(:BranchExampleMessage)
  AND all(m IN nodes(p) WHERE m:BranchExampleMessage AND m.conversation_id = c.id)
RETURN [m IN reverse(nodes(p)) | {id: m.id, role: m.role, content: m.content}] AS selected_transcript;
`;
}

async function main(args) {
  if (args.includes('--help')) {
    console.log('Usage: node branches.mjs [--cypher] [fixture.json]\nWithout --cypher, print the validated tree summary. --cypher prints text only.');
    return;
  }
  const printCypher = args.includes('--cypher');
  const files = args.filter((arg) => arg !== '--cypher');
  if (files.length > 1 || files.some((arg) => arg.startsWith('--')) || args.filter((arg) => arg === '--cypher').length > 1) {
    throw new TypeError('Usage: node branches.mjs [--cypher] [fixture.json]');
  }
  const input = JSON.parse(await readFile(files[0] ?? new URL('./fixture.json', import.meta.url), 'utf8'));
  const conversation = validateConversation(input);
  if (printCypher) {
    process.stdout.write(toCypher(conversation));
    return;
  }
  const paths = conversationPaths(conversation);
  const transcript = selectedTranscript(conversation);
  console.log(JSON.stringify({
    conversation: conversation.id,
    message_nodes: conversation.messages.length,
    parent_edges: conversation.messages.filter((message) => message.parent_id !== null).length,
    root_to_leaf_paths: paths.length,
    paths,
    selected_leaf: conversation.selected_leaf,
    selected_path: transcript.map((message) => message.id),
    selected_transcript: transcript.map(({ id, role, content }) => ({ id, role, content })),
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`Conversation example refused: ${error.message}`);
    process.exitCode = 1;
  });
}
