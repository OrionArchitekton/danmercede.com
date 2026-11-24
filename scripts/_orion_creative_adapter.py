"""Shared creative adapter (schema orion-creative-adapter/v1). GENERATED FILE: do not edit by hand.

Regenerate with the creative kit `export-adapter` command. Stdlib only. The banned dash code
points are written as integers so this file never contains the characters it detects.
`verify_self()` recomputes ADAPTER_SHA256 over this file with the digest line zeroed, so any
hand edit fails closed.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

KIT_VERSION = "0.2.0"
ADAPTER_SCHEMA = "orion-creative-adapter/v1"
ADAPTER_SHA256 = "d4aa876114db2551783648b6e4059c52638dc829010a089456b746225a7e0784"

# em (U+2014), en (U+2013), horizontal bar (U+2015)
BANNED_DASHES = {0x2014: "em dash", 0x2013: "en dash", 0x2015: "horizontal bar"}

HARD_LEXEMES = (
    'delve',
    'tapestry',
    'multifaceted',
    'seamless',
    'a myriad of',
    "it's worth noting",
    "in today's digital age",
    'testament to',
    'game-changer',
    'paradigm shift',
    'navigating the landscape',
)

KOBAK_EXCESS_TERMS = (
    'intricacies',
    'meticulous',
    'meticulously',
    'notably',
    'underscores',
    'underscore',
    'pivotal',
    'fostering',
    'foster',
    'garnered',
    'bolster',
    'showcase',
    'showcasing',
    'highlighting',
    'emphasizing',
    'crucial',
    'enhance',
    'enhancing',
    'intricate',
    'elevate',
    'realm',
    'unlock',
    'empower',
    'leverage',
    'robust',
    'harness',
    'commendable',
    'versatile',
    'groundbreaking',
    'transformative',
    'streamline',
    'unprecedented',
    'comprehensive',
    'indispensable',
    'burgeoning',
    'reimagine',
    'spearhead',
    'amplify',
    'synergize',
    'catalyst',
    'paramount',
    'nuanced',
    'poised',
    'cornerstone',
    'linchpin',
    'holistic',
    'ever-evolving',
    'resonate',
)

THRILLER_CLICHES = (
    'vanished off the face of the earth',
    'in the dead of night',
    'conjured out of thin air',
    'crown-jewel',
    'nondescript office park',
    'behind closed doors',
    'ticking time bomb',
    'game of cat and mouse',
    'house of cards',
    'perfect storm',
    'shrouded in secrecy',
    'sent shockwaves',
    'double-edged sword',
)

META_ANNOUNCEMENTS = (
    'in this article',
    'in this video',
    "let's dive in",
    'make sure you watch',
    'make sure you subscribe',
    "don't forget to subscribe",
    "here's the thing",
    "here's the catch",
)

NEGATIVE_PARALLELISM_PATTERNS = (
    "\\b(?:wasn't|isn't|aren't|weren't|not)\\s+(?:just|only|merely)\\s+[^.!?\\n]{1,60}(?:,|;)\\s*(?:it\\s+(?:was|is)|it's|they're|that's|but)\\b",
    '\\bmore\\s+than\\s+just\\b',
    "\\b(?:it's|it\\s+is|this\\s+is)\\s+not\\s+about\\s+[^.!?\\n]{1,50},\\s*(?:it's|it\\s+is|this\\s+is)\\s+about\\b",
)

_LINE_SPLIT = re.compile(r"\r\n|\r|\n")
_URL_RX = re.compile(r"https?://\S+")
_DIGEST_LINE_RX = re.compile(r'^ADAPTER_SHA256 = "[0-9a-f]{64}"$', re.MULTILINE)


def _term_pattern(term):
    body = r"\s+".join(re.escape(part) for part in term.split())
    return re.compile(r"\b" + body + r"\b", re.IGNORECASE)


_HARD_PATTERNS = tuple((term, _term_pattern(term)) for term in HARD_LEXEMES)
_KOBAK_PATTERNS = tuple((term, _term_pattern(term)) for term in KOBAK_EXCESS_TERMS)
_THRILLER_PATTERNS = tuple((term, _term_pattern(term)) for term in THRILLER_CLICHES)
_META_PATTERNS = tuple((term, _term_pattern(term)) for term in META_ANNOUNCEMENTS)
_NEGPAR_PATTERNS = tuple(re.compile(p, re.IGNORECASE) for p in NEGATIVE_PARALLELISM_PATTERNS)


def find_banned_dashes(text):
    """Yield (line, col, codepoint, name, line_text) per banned dash (1-based, CRLF/CR/LF)."""
    for line_no, line in enumerate(_LINE_SPLIT.split(text), start=1):
        for col, ch in enumerate(line, start=1):
            name = BANNED_DASHES.get(ord(ch))
            if name is not None:
                yield (line_no, col, ord(ch), name, line)


def scan_hard_tier(text, *, dashes_on_raw_text=True):
    """Hard AI-tell tier: [] when clean, else one (rule, match) hit per distinct rule.

    rule is "banned_dash" (match "U+2014") or "ai_slop_lexeme" (match the listed term). URLs are
    not prose, so lexemes inside a link never count. With dashes_on_raw_text=False the dash check
    also runs on the URL-stripped text (the legacy behaviour of some consumers).
    """
    if not text:
        return []
    prose = _URL_RX.sub(" ", text)
    dash_source = text if dashes_on_raw_text else prose
    hits = []
    for codepoint in (0x2014, 0x2013, 0x2015):
        if chr(codepoint) in dash_source:
            hits.append(("banned_dash", f"U+{codepoint:04X}"))
    for term, pattern in _HARD_PATTERNS:
        if pattern.search(prose):
            hits.append(("ai_slop_lexeme", term))
    return hits


def scan_extended(text):
    """Advisory tier: thriller cliches, meta CTAs, negative parallelism, Kobak excess terms."""
    if not text:
        return []
    prose = _URL_RX.sub(" ", text)
    hits = []
    for term, pattern in _THRILLER_PATTERNS:
        if pattern.search(prose):
            hits.append(("thriller_cliche", term))
    for term, pattern in _META_PATTERNS:
        if pattern.search(prose):
            hits.append(("meta_announcement", term))
    for pattern in _NEGPAR_PATTERNS:
        match = pattern.search(prose)
        if match:
            hits.append(("negative_parallelism", match.group(0)))
    for term, pattern in _KOBAK_PATTERNS:
        if pattern.search(prose):
            hits.append(("kobak_excess_term", term))
    return hits


def adapter_digest(source_text):
    """SHA-256 of the adapter source with the ADAPTER_SHA256 line zeroed."""
    zeroed = _DIGEST_LINE_RX.sub('ADAPTER_SHA256 = "' + "0" * 64 + '"', source_text, count=1)
    return hashlib.sha256(zeroed.encode("utf-8")).hexdigest()


def verify_self():
    """True only when this file's bytes still match the digest it was generated with."""
    try:
        source = Path(__file__).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return False
    return adapter_digest(source) == ADAPTER_SHA256
