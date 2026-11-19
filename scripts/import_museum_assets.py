#!/usr/bin/env python3
"""Download selected CC0 Poly Haven models, with glTF companions, for the museum.

Run from repository root: python3 scripts/import_museum_assets.py
Source API: https://polyhaven.com/our-api
"""
from __future__ import annotations
import json
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit, unquote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "museum" / "assets"
MANIFEST = DEST / "manifest.json"
UA = "SonomaCaseLedgerMuseumImporter/1.0 (CC0 Poly Haven models)"
CORE_ASSETS = {
    "displayCase": "vintage_cabinet_01",
    "directoryDesk": "ClassicConsole_01",
    "armchair": "ArmChair_01",
    "gothicCabinet": "GothicCabinet_01",
}
CASE_ASSETS = {
    "coveredCar": "covered_car",
    "schoolDesk": "SchoolDesk_01",
    "notepads": "office_notepads",
    "binder": "binder_notebook",
    "officeDesk": "metal_office_desk",
    "stationery": "stationery_supplies",
    "cashRegister": "CashRegister_01",
    "stapler": "vintage_stapler",
}
ASSETS = {"props": CORE_ASSETS, "caseProps": CASE_ASSETS}
TOTAL = 0
MAX_TOTAL = 140 * 1024 * 1024
MAX_FILE = 24 * 1024 * 1024


def fetch(url: str, maximum: int) -> bytes:
    global TOTAL
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.hostname not in ("api.polyhaven.com", "dl.polyhaven.org"):
        raise ValueError("Unexpected download domain")
    with urlopen(Request(url, headers={"User-Agent": UA}), timeout=60) as response:
        redirected = urlsplit(response.geturl())
        if redirected.scheme != "https" or redirected.hostname not in ("api.polyhaven.com", "dl.polyhaven.org"):
            raise ValueError("Unexpected redirect")
        body = response.read(maximum + 1)
    if len(body) > maximum:
        raise ValueError("Download too large")
    TOTAL += len(body)
    if TOTAL > MAX_TOTAL:
        raise ValueError("Import size limit exceeded")
    return body


def safe_relative(path: str) -> Path:
    p = PurePosixPath(path)
    if p.is_absolute() or not p.parts or any(part in (".", "..") for part in p.parts):
        raise ValueError("Unsafe companion file path")
    if "\\" in path or ":" in path:
        raise ValueError("Unexpected path separator")
    return Path(*p.parts)


def import_model(asset_id: str) -> str:
    data = json.loads(fetch(f"https://api.polyhaven.com/files/{asset_id}", 3_000_000))
    gltf = data.get("gltf", {})
    entry = gltf.get("1k", {}).get("gltf") or gltf.get("2k", {}).get("gltf")
    if not entry or not entry.get("url"):
        raise ValueError("No 1K or 2K glTF available")
    base = DEST / "models" / asset_id
    base.mkdir(parents=True, exist_ok=True)
    for name, companion in (entry.get("include") or {}).items():
        path = base / safe_relative(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(fetch(companion["url"], MAX_FILE))
    name = unquote(PurePosixPath(urlsplit(entry["url"]).path).name)
    path = base / safe_relative(name)
    path.write_bytes(fetch(entry["url"], MAX_FILE))
    (base / "LICENSE.txt").write_text(
        f"CC0 1.0 Universal - Poly Haven\nhttps://polyhaven.com/a/{asset_id}\n",
        encoding="utf-8",
    )
    return f"./assets/models/{asset_id}/{name}"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    failures = []
    successes = 0
    total = sum(len(roles) for roles in ASSETS.values())
    for section, roles in ASSETS.items():
        manifest.setdefault(section, {})
        for role, asset_id in roles.items():
            item = manifest[section].setdefault(role, {})
            previous = item.get("path")
            if isinstance(previous, str) and previous.startswith("./assets/"):
                existing = DEST / previous.removeprefix("./assets/")
                if existing.is_file():
                    print(f"{section}/{role}: already installed", flush=True)
                    successes += 1
                    continue
            try:
                path = import_model(asset_id)
                item["path"] = path
                print(f"{section}/{role}: {path}", flush=True)
                successes += 1
            except Exception as error:
                item["path"] = None
                failures.append(f"{section}/{role}")
                print(f"{section}/{role}: {error}", flush=True)
    manifest["status"] = "imported" if successes else "awaiting-asset-import"
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Available {successes}/{total} models; downloaded {TOTAL/1048576:.1f} MiB")
    if failures:
        print("Unresolved models (procedural fallbacks remain visible): " + ", ".join(failures))
    if not successes:
        raise SystemExit("No usable models were imported")


if __name__ == "__main__":
    main()
