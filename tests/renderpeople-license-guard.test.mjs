import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
  if (manifest.character.highDetail?.license === 'CC0-1.0' &&
      manifest.character.highDetail.path === './assets/characters/realistic_guide_cc0.glb') {
    allowed.add('realistic_guide_cc0.glb');
  }
  // The new photo-textured human is distributable, unlike Renderpeople.
  // Require a pinned source audit and content digest for this one binary.
  const ara=resolve(root,'museum/assets/characters/ara_museum_guide.glb');
  const reportPath=resolve(root,'research/museum-guide-ara-report.json');
  if(existsSync(ara)){
    assert.ok(existsSync(reportPath),'Ara model must have matching asset provenance');
    const report=JSON.parse(readFileSync(reportPath,'utf8'));
    assert.equal(report.generatedBy,'Ara 3D Gen 0.14.0 (MIT)');
    assert.equal(report.file,'museum/assets/characters/ara_museum_guide.glb');
    assert.equal(report.sha256,createHash('sha256').update(readFileSync(ara)).digest('hex'));
    allowed.add('ara_museum_guide.glb');
  }
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

test('private FBX preview is opt-in, lazy and keeps source bytes local', () => {
  const museum = read('museum/museum.js');
  const preview = read('museum/private-renderpeople-preview.js');
  const character = read('museum/character.js');
  assert.match(museum, /new URLSearchParams\(window\.location\.search\)\.has\('private-character'\)/);
  assert.match(museum, /import\('\.\/private-renderpeople-preview\.js'\)/);
  assert.match(preview, /file\.name\.toLowerCase\(\)/);
  assert.match(preview, /fbx\.arrayBuffer\(\)/);
  assert.match(preview, /new FBXLoader\(manager\)/);
  assert.match(preview, /visitor\.installPrivateModel\(obj\)/);
  assert.doesNotMatch(preview, /fetch\(|XMLHttpRequest|sendBeacon|FormData/);
  assert.match(character, /function installPrivateModel\(obj\)/);
  assert.match(character, /privatePreview/);
  assert.ok(!read('museum/index.html').includes('private-renderpeople-preview.js'),
    'The default 3D museum must not eagerly load the private preview');
});
