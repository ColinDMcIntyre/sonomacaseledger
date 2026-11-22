import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');

test('private Renderpeople model files must not be hosted as public browser assets', () => {
  const manifest = JSON.parse(read('museum/assets/manifest.json'));
  assert.ok(manifest.character, 'The current CC0 visitor configuration must remain present');
  assert.equal(manifest.character.path, './assets/characters/visitor.glb');
  assert.match(manifest.character.license, /CC0/i);

  const allowed = new Set(['visitor.glb']);
  const names = readdirSync(resolve(root, 'museum/assets/characters'));
  for (const name of names) {
    assert.ok(allowed.has(name),
      'Unapproved character asset in public hosting directory: ' + name);
  }

  const ignores = read('.gitignore');
  assert.match(ignores, /renderpeople.*\.glb/i);
  assert.match(ignores, /rigged.*\.fbx/i);
  assert.ok(read('research/RENDERPEOPLE-INTEGRATION-STATUS-2026-11-22.md')
    .includes('Do not commit Renderpeople'));
});

test('a private conversion prototype is not falsely described as installed', () => {
  const character = read('museum/character.js');
  assert.ok(character.includes("import {GLTFLoader}"));
  assert.ok(character.includes('if(!walk||!idle||walk===idle)'));
  const manifest = JSON.parse(read('museum/assets/manifest.json'));
  assert.doesNotMatch(manifest.character.source, /renderpeople/i);
});
