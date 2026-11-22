#!/usr/bin/env python3
"""Validate a CC0 rigged visitor GLB before publishing into a static website."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import struct

def inspect_glb(path: Path, size_cap: int) -> dict:
    size=path.stat().st_size
    if not (1_000_000 <= size <= size_cap):
        raise ValueError(f"Visitor GLB size {size} exceeds allowed range (max {size_cap})")
    with path.open('rb') as f:
        header=f.read(20)
        if len(header)!=20:
            raise ValueError("Truncated GLB header")
        magic,version,total,json_size,json_type=struct.unpack('<4sIIII',header)
        if (magic,version,total,json_type)!=(b'glTF',2,size,0x4E4F534A):
            raise ValueError("Invalid GLB header or JSON chunk")
        if not (64 <= json_size < 4_000_000):
            raise ValueError("Invalid JSON chunk size")
        gltf=json.loads(f.read(json_size).decode('utf-8').strip('\x00 '))
    names=[str(a.get('name') or '') for a in gltf.get('animations',[])]
    if not any(re.search(r'idle|standing|rest',x,re.I) for x in names):
        raise ValueError(f"No named idle clip; saw: {names!r}")
    if not any(re.search(r'walk|stride|locomotion',x,re.I) for x in names):
        raise ValueError(f"No named walking clip; saw: {names!r}")
    if not gltf.get('skins') or not gltf.get('meshes') or not gltf.get('nodes'):
        raise ValueError("Expected skinned, articulated 3D human")
    if not gltf.get('materials') or not gltf.get('textures'):
        raise ValueError("Expected textured human materials")
    required=set(gltf.get('extensionsRequired') or [])
    incompatible=required & {'KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'}
    if incompatible:
        raise ValueError(f"Decoder-dependent format unsupported by existing museum loader: {incompatible}")
    return {
       'sizeBytes':size,'animationNames':names,'bones':sum(len(s.get('joints',[])) for s in gltf['skins']),
       'skins':len(gltf['skins']),'meshes':len(gltf['meshes']),
       'textures':len(gltf['textures']),'extensionsRequired':sorted(required)
    }

def main() -> None:
    p=argparse.ArgumentParser()
    p.add_argument('file',type=Path)
    p.add_argument('--max-bytes',type=int,default=24_000_000)
    p.add_argument('--report',type=Path)
    a=p.parse_args()
    report=inspect_glb(a.file,a.max_bytes)
    print(json.dumps(report,indent=2))
    if a.report:a.report.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    main()
