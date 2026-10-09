"""# Inventory existing original SVG files without claiming exhaustive visual QA."""
import hashlib  # # File hashes identify the exact redistributed artwork.
import json  # # The manifest is consumable without running this audit.
from pathlib import Path  # # Resolve all files relative to this repository.
import xml.etree.ElementTree as ET  # # Standard-library XML validation needs no new package.

root = Path(__file__).resolve().parents[1]  # # Never inspect personal browser data or backups.
art = root / "public/assets/original"  # # Only project-original SVGs belong to this scope.
manifest_path = art / "manifest.json"  # # Preserve existing legacy placement anchors.
manifest = json.loads(manifest_path.read_text())  # # Previous palette and anchors remain documented.
files = []  # # Include files that actually exist, not hypothetical exports.
symbols = {}  # # Track owned symbol IDs separately from standalone files.
for path in sorted(art.glob("*.svg")):  # # This excludes third-party fonts and personal files.
    raw = path.read_bytes()  # # Hash exact bytes, without rewriting art.
    tree = ET.fromstring(raw)  # # A malformed SVG stops the audit.
    ids = [node.attrib["id"] for node in tree.iter("{http://www.w3.org/2000/svg}symbol")]  # # External-use symbols are actual XML elements.
    if len(ids) != len(set(ids)):  # # Duplicate symbols cannot be reliably selected.
        raise ValueError(f"Duplicate symbol IDs in {path.name}")  # # Do not publish an ambiguous inventory.
    symbols[path.name] = ids  # # Record all symbol IDs present in this file.
    files.append({"file": path.name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "viewBox": tree.attrib.get("viewBox"), "symbols": ids})  # # Inventory facts come from the checked files.
manifest["version"] = 2  # # This replaces the stale standalone-sprite inventory.
manifest["source"] = "Original integer-grid geometry, without copied or traced commercial game assets. The legacy Blue Horizon mood reference is retained below; the current seasonal living world uses project-original geometry and independently selected palettes."  # # Inspiration is distinct from an asset licence.
for sprite in manifest.get("sprites", []):  # # Legacy sprites are symbols, not missing standalone files.
    sprite.pop("file", None)  # # Remove only the inaccurate file field, retaining symbol/placement metadata.
manifest["paletteScope"] = "Legacy base habitat palette; the living-world seasonal palettes are defined in src/world/environment.ts."  # # Do not present old ochre colours as the current UI.
manifest["svgFiles"] = files  # # Inventory all actual original SVGs, including the native wooden frame additions.
manifest["livingWorld"] = {"component": "src/world/LivingScene.tsx", "sceneViewBox": [0, 0, 640, 320], "spriteSheet": "world-life.svg", "symbols": symbols.get("world-life.svg", []), "seasons": ["spring", "summer", "autumn", "winter"], "animation": "CSS steps with independent durations, offsets, pauses and turns; no React per-frame loop", "codeLicence": "MIT", "standaloneSvgLicence": "CC0-1.0"}  # # Code and standalone art retain their separate licence scopes.
manifest["verification"] = {"xml": f"All {len(files)} existing original SVG files parsed successfully.", "totalSvgBytes": sum(item["bytes"] for item in files), "symbolCount": sum(len(ids) for ids in symbols.values()), "visualScope": "Chromium screenshots and motion checks cover the current home, seasonal worlds and earned residents. XML parsing and inventory counts do not prove every legacy sprite was visually reviewed."}  # # Report only the audit's actual scope.
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")  # # Commit the reproducible inventory with the distributed assets.
print(f"Verified {len(files)} original SVGs and {manifest['verification']['symbolCount']} symbols.")  # # No private paths or user data appear in this report.
