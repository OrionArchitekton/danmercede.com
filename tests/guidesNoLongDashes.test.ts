import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Long dashes are banned from public-facing content by ~/.claude/rules/no-em-dashes.md.
 *
 * A PreToolUse hook already blocks them, but it inspects COMMAND TEXT, so a dash that
 * arrives inside a file (an edited guide, a `git commit -F` message, a `gh pr create
 * --body-file`) is outside what that hook can see. The rule names that gap explicitly and
 * leaves the file-authored path to operator habit.
 *
 * This closes the guide half of that gap mechanically. It caught a real leak: the
 * fail-closed-harness guide quoted a banned dash to demonstrate the ban, which reached the
 * rendered page through the guides bundle even though the prerender body strips code
 * fences. Quoting the codepoint (U+2014) conveys the same thing and violates nothing.
 */

const BANNED: Record<number, string> = {
  0x2013: 'en dash (U+2013)',
  0x2014: 'em dash (U+2014)',
  0x2015: 'horizontal bar (U+2015)',
};

function scan(label: string, text: string): string[] {
  const problems: string[] = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const [cp, name] of Object.entries(BANNED)) {
      if (line.includes(String.fromCodePoint(Number(cp)))) {
        problems.push(`${label}:${i + 1} contains a ${name}: ${line.trim().slice(0, 90)}`);
      }
    }
  });
  return problems;
}

test('no published guide source carries a long dash, fenced blocks included', () => {
  const dir = path.join(projectRoot, 'content', 'guides');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  // Positive evidence: an empty corpus must not pass vacuously.
  assert.ok(files.length > 0, 'expected at least one published guide to scan');

  const problems = files.flatMap((f) =>
    scan(`content/guides/${f}`, fs.readFileSync(path.join(dir, f), 'utf-8'))
  );

  assert.deepEqual(
    problems,
    [],
    `long dashes are banned in public content, quote the codepoint instead:\n  ${problems.join('\n  ')}`
  );
});

test('the compiled guides bundle carries no long dash either', () => {
  // The bundle is what actually ships to a browser. The source being clean does not
  // prove the shipped artifact is, if compilation ever introduces or restores one.
  const bundle = path.join(projectRoot, 'constants.guides.generated.ts');
  assert.ok(fs.existsSync(bundle), 'expected the generated guides bundle to exist');

  const text = fs.readFileSync(bundle, 'utf-8');
  assert.ok(text.length > 1000, `bundle is only ${text.length} chars, the reader is probably broken`);

  const problems = scan('constants.guides.generated.ts', text);
  assert.deepEqual(problems, [], `shipped guides bundle contains long dashes:\n  ${problems.join('\n  ')}`);
});

test('the scanner actually detects each banned character', () => {
  // Without this, a broken scanner and a clean corpus are indistinguishable: both
  // report zero problems. Fixture-drive the detector before trusting its silence.
  for (const [cp, name] of Object.entries(BANNED)) {
    const sample = `a ${String.fromCodePoint(Number(cp))} b`;
    assert.notDeepEqual(scan('fixture', sample), [], `scanner failed to flag ${name}`);
  }
  // And must not fire on a plain hyphen, which is legitimate.
  assert.deepEqual(scan('fixture', 'a well-formed compound-word and 8-10 range'), []);
});
