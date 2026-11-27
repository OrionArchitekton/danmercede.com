"""Pytest mirror for danmercede-com Layer-B brand-kit completeness."""

from __future__ import annotations

import hashlib
import json
import pathlib
import re
import xml.etree.ElementTree as ET

import yaml

REPO_ROOT = pathlib.Path(__file__).resolve().parents[1]
KIT_DIR = REPO_ROOT / "brand-kit"
BANNED_DASH_RE = re.compile(r"[\u2013\u2014\u2015]")

REQUIRED_FILES = (
    "DESIGN.md",
    "tokens/brand.tokens.json",
    "positioning.yaml",
    "voice-profile.yaml",
    "claims-allowlist.yaml",
    "cta-library.yaml",
    "platform-policy.yaml",
    "assets/logos.manifest.json",
)

REQUIRED_ROLES = {
    "mark_primary",
    "avatar_square",
    "banner_youtube",
    "banner_linkedin",
    "banner_x",
    "banner_facebook",
    "banner_og",
}


def _sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_brand_kit_required_files_exist_and_are_dash_clean() -> None:
    for rel in REQUIRED_FILES:
        path = KIT_DIR / rel
        assert path.is_file(), f"Missing required brand-kit file: {rel}"
        text = path.read_text(encoding="utf-8")
        assert text.strip(), f"Empty brand-kit file: {rel}"
        assert BANNED_DASH_RE.search(text) is None, f"Banned long dash in {rel}"


def test_logos_manifest_sha256_and_svg_safe_zones() -> None:
    voice = yaml.safe_load((KIT_DIR / "voice-profile.yaml").read_text(encoding="utf-8"))
    assert voice["schema_version"] == "VoiceProfile.v1"
    assert voice["ban_long_dashes"] is True

    manifest = json.loads((KIT_DIR / "assets/logos.manifest.json").read_text(encoding="utf-8"))
    assert manifest["vault_sync_gate"] == "HUMAN_REQUIRED (Checkpoint G1)"
    assert manifest["voice_profile_sha256"] == _sha256(KIT_DIR / "voice-profile.yaml")
    assert manifest["dtcg_pack_sha256"] == _sha256(KIT_DIR / "tokens/brand.tokens.json")

    seen_roles: set[str] = set()
    for item in manifest["assets"]:
        assert ".." not in pathlib.PurePosixPath(item["path"]).parts
        asset_path = KIT_DIR / "assets" / item["path"]
        assert not asset_path.is_symlink(), f"Symlink asset forbidden: {item['path']}"
        assert asset_path.is_file(), f"Missing SVG asset: {item['path']}"
        assert _sha256(asset_path) == item["sha256"], f"SHA mismatch on {item['path']}"
        seen_roles.add(item["role"])

        svg_text = asset_path.read_text(encoding="utf-8")
        assert BANNED_DASH_RE.search(svg_text) is None
        assert re.search(r"\bArial\b", svg_text, re.IGNORECASE) is None
        root = ET.fromstring(svg_text)
        assert "viewBox" in root.attrib
        vb_parts = [float(v) for v in root.attrib["viewBox"].split()]
        assert (int(vb_parts[2]), int(vb_parts[3])) == (item["width"], item["height"])
        sz = item["safe_zone"]
        assert sz["x"] >= 0 and sz["y"] >= 0
        assert sz["x"] + sz["width"] <= item["width"]
        assert sz["y"] + sz["height"] <= item["height"]
        if item["role"] == "banner_youtube":
            safe = item["safe_zone"]
            assert (safe["x"], safe["y"], safe["width"], safe["height"]) == (507, 508, 1546, 423)

    assert REQUIRED_ROLES.issubset(seen_roles)
