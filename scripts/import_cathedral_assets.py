#!/usr/bin/env python3
"""Import the Cathedral Museum CC0 PBR maps, church HDRI and animated visitor.

Only official Poly Haven API/CDN links and the pinned CC0 Casual Walker source
are requested; no unknown model executables. Safe to rerun.
"""
from __future__ import annotations

import json
import struct
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/"museum"/"assets"/"cathedral"
MANIFEST=ROOT/"museum"/"assets"/"manifest.json"
USER_AGENT="SonomaCaseLedgerCathedralImporter/1.0 (CC0 museum material build)"
MATERIALS={
    "stone":"beige_wall_001",
    "floor":"tiled_floor_001",
    "wood":"walnut_veneer",
    "vault":"white_plaster_02",
}
ROLE_MAPS={
    "map":("diffuse","diff","basecolor","albedo"),
    "normalMap":("nor_gl","normalgl","normal"),
    "roughnessMap":("roughness","rough"),
    "aoMap":("ambientocclusion","ambient_occlusion","ao"),
    "heightMap":("displacement","disp","height"),
}
MAX_FILE=9_000_000
MAX_TOTAL=88_000_000
total=0


def fetch(url: str, max_size=MAX_FILE, valid_hosts=None):
    global total
    host=urlsplit(url).hostname
    if urlsplit(url).scheme!="https":
        raise ValueError("HTTPS required")
    if valid_hosts and host not in valid_hosts:
        raise ValueError("Unexpected source host: "+str(host))
    with urlopen(Request(url,headers={"User-Agent":USER_AGENT}),timeout=65) as response:
        data=response.read(max_size+1)
    if len(data)>max_size:
        raise ValueError("Oversize media download")
    total+=len(data)
    if total>MAX_TOTAL:
        raise ValueError("Asset download budget exceeded")
    return data


def poly_meta(asset_id):
    data=fetch("https://api.polyhaven.com/files/"+asset_id,2_000_000,{"api.polyhaven.com"})
    return json.loads(data)


def select_map(maps,possible):
    # Poly Haven uses keys such as Diffuse, Normal, Rough. API variants can
    # differ by texture generation; compare case-insensitively.
    ordered=sorted(maps.items(), key=lambda item:
        0 if "nor_gl" in possible and ("opengl" in item[0].casefold()
        or "gl" in item[0].casefold()) else 1)
    for label,variants in ordered:
        norm=label.casefold().replace("_","").replace(" ","")
        # Never import DirectX normals into Three.js, which expects OpenGL Y.
        if "nor_gl" in possible and ("directx" in norm or norm.endswith("dx")):
            continue
        if not any(norm==p.replace("_","") or norm.startswith(p.replace("_","")) for p in possible):
            continue
        if not isinstance(variants,dict):
            continue
        for size in ("1k","2k"):
            options=variants.get(size,{})
            if not isinstance(options,dict):
                continue
            for format_name in ("jpg","png"):
                candidate=options.get(format_name)
                if isinstance(candidate,dict) and candidate.get("url"):
                    return candidate["url"]
    return None


def download_materials():
    ART.mkdir(parents=True,exist_ok=True)
    previous=ART/"materials.json"
    try:
        result=json.loads(previous.read_text(encoding="utf-8"))
        if not isinstance(result,dict):
            result={}
    except (ValueError,OSError):
        result={}
    for role,asset_id in MATERIALS.items():
        # Preserve the already-approved floor textures and their manifest.
        # Avoid rewriting files, even when this workflow is run repeatedly.
        if role=="floor" and result.get("floor",{}).get("map"):
            print("PBR floor preserved (existing approved assets)",flush=True)
            continue
        try:
            metadata=poly_meta(asset_id)
            maps={}
            for name,possible in ROLE_MAPS.items():
                url=select_map(metadata,possible)
                if not url:
                    continue
                suffix="png" if urlsplit(url).path.lower().endswith(".png") else "jpg"
                filename=f"{role}_{name}.{suffix}"
                data=fetch(url,MAX_FILE,{"dl.polyhaven.org"})
                (ART/filename).write_bytes(data)
                maps[name]="./assets/cathedral/"+filename
            if not maps.get("map"):
                raise ValueError("Diffuse/base-color map unavailable")
            result[role]=maps
            print("PBR",role,",".join(maps),flush=True)
        except Exception as exc:
            print("PBR",role,"failed:",exc,flush=True)
    (ART/"materials.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    return result


def download_hdri():
    try:
        meta=poly_meta("church_meeting_room")
        hdr=meta.get("hdri",{}).get("1k",{}).get("hdr",{})
        url=hdr["url"]
        data=fetch(url,MAX_FILE,{"dl.polyhaven.org"})
        (ART/"church_meeting_room_1k.hdr").write_bytes(data)
        print("HDR imported:",len(data),"bytes",flush=True)
        return True
    except Exception as exc:
        print("HDR import failed:",exc,flush=True)
        return False


def download_visitor():
    # tevy.dev/published v1, 27,997-triangle, CC0, four named animations.
    source="https://tevy.dev/models/casual-walker/v1/lod0.glb"
    try:
        data=fetch(source,5_000_000,{"tevy.dev"})
        if len(data)<32 or data[:4]!=b"glTF":
            raise ValueError("Not a GLB file")
        version,length=struct.unpack_from("<II",data,4)
        if version!=2 or length!=len(data):
            raise ValueError("Invalid glTF 2.0 binary header")
        folder=ROOT/"museum"/"assets"/"characters"
        folder.mkdir(parents=True,exist_ok=True)
        (folder/"visitor.glb").write_bytes(data)
        manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
        manifest["character"]={
            "path":"./assets/characters/visitor.glb",
            "expectedClips":["idle","walk"],
            "source":"https://tevy.dev/models/casual-walker",
            "license":"CC0-1.0",
            "status":"Installed pinned v1 LOD0; animations validated by runtime loader"
        }
        MANIFEST.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
        print("Animated character imported:",len(data),"bytes",flush=True)
        return True
    except Exception as exc:
        print("Character import failed:",exc,flush=True)
        return False


def main():
    result=download_materials()
    hdri=download_hdri()
    visitor=download_visitor()
    (ART/"LICENSES.txt").write_text(
        "Poly Haven: https://polyhaven.com/our-api - CC0 1.0\n"
        +"\n".join("https://polyhaven.com/a/"+x for x in MATERIALS.values())
        +"\nhttps://polyhaven.com/a/church_meeting_room\n"
        +"Casual Walker: https://tevy.dev/models/casual-walker - CC0 1.0\n",
        encoding="utf-8",
    )
    print("Import summary:",len(result),"/4 PBR surfaces,",
        "HDR:",hdri,"visitor:",visitor,"total MiB:",round(total/1048576,2),flush=True)
    if not result and not hdri and not visitor:
        raise SystemExit("No media imported; inspect asset API availability")


if __name__=="__main__":
    main()
