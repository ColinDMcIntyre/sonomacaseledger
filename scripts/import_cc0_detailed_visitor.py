#!/usr/bin/env python3
"""Import an explicitly vetted CC0 human GLB without exposing Renderpeople assets.

The ONLY external asset source is Innerscene's CC0 Jordan collection.
This script downloads a candidate; the GitHub Action handles compression,
validation, and manifest update before any public publication.
"""
from __future__ import annotations
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import argparse

MODEL_URL = ('https://www.innerscene.com/api/library/'
             'locomotion-collection-jordan-3d-person-animated-911f1584/download')
HOSTS = {'www.innerscene.com', 'files.innerscene.com'}
MAX_BYTES = 30_000_000

def download(destination: Path) -> None:
    req = Request(MODEL_URL, headers={'User-Agent':'SonomaCaseLedgerCC0Importer/1.0'})
    with urlopen(req,timeout=60) as response:
        url=response.geturl()
        location=urlsplit(url)
        if location.scheme!='https' or location.hostname not in HOSTS:
            raise RuntimeError('Untrusted model redirect location')
        content_length=response.headers.get('Content-Length')
        if content_length and int(content_length)>MAX_BYTES:
            raise RuntimeError('CC0 model download exceeds allowed size')
        data=response.read(MAX_BYTES+1)
    if not 1_000_000<=len(data)<=MAX_BYTES or data[:4]!=b'glTF':
        raise RuntimeError('Unexpected binary or size from trusted CC0 model source')
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_bytes(data)
    print('Downloaded',len(data),'bytes from',location.hostname,'to',destination)

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('output',type=Path)
    download(p.parse_args().output)
