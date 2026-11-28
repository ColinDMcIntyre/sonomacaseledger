import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const homepage = read('index.html');
const sitemap = read('sitemap.xml');
const robots = read('robots.txt');

test('landing page stays lightweight and does not eagerly request the 3D museum', () => {
  assert.ok(Buffer.byteLength(homepage, 'utf8') < 16000,
    'Keep homepage HTML, text and critical CSS below 16 KB');
  assert.match(homepage, /<style>[\s\S]*?<\/style>/);
  assert.doesNotMatch(homepage, /<link[^>]+rel=["']stylesheet["']/i);
  assert.doesNotMatch(homepage, /<script[^>]+src=/i);
  assert.doesNotMatch(homepage, /<script[^>]+type=["']module["']/i);
  assert.doesNotMatch(homepage, /<(?:img|picture|video|iframe|canvas)\b/i);
  assert.doesNotMatch(homepage, /http-equiv=["']refresh["']/i);
  assert.doesNotMatch(homepage, /<link[^>]+rel=["'](?:preload|prefetch)["'][^>]+museum/i);
});

test('both experiences are visible, accessible, and real crawlable links', () => {
  assert.match(homepage, /Choose your experience/);
  assert.match(homepage, /<a class="choice" href="\.\/cases\/"[^>]*>/);
  assert.match(homepage, /<a class="choice choice--museum" href="\.\/museum\/"[^>]*>/);
  assert.match(homepage, /Traditional website/);
  assert.match(homepage, /3D interactive experience/);
  assert.match(homepage, /class="skip" href="#main"/);
  assert.match(homepage, /id="main"/);
  assert.match(homepage, /focus-visible/);
  assert.match(homepage, /prefers-reduced-motion/);
  assert.ok(read('cases/index.html').includes('Sonoma County case archive'));
  assert.ok(read('museum/index.html').includes('museum-app'));
});

test('SEO signals preserve indexable content and official caveats', () => {
  assert.match(homepage, /<title>Sonoma Case Ledger \| Sonoma County Court Records/);
  assert.match(homepage, /<meta name="description" content="[^"]{80,180}"/);
  assert.match(homepage, /<meta name="robots" content="index,follow"/);
  assert.match(homepage, /<link rel="canonical" href="https:\/\/colindmcintyre\.github\.io\/sonomacaseledger\/"/);
  const ld = homepage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ld);
  const json = JSON.parse(ld[1]);
  assert.equal(json['@type'], 'WebSite');
  assert.equal(json.name, 'Sonoma Case Ledger');
  assert.match(homepage, /Documented case summaries/);
  assert.match(homepage, /Read the court record, not just the headline/);
  assert.match(homepage, /14 county case profiles have matching criminal court-record details/);
  assert.match(homepage, /17 still require a confirmed matching docket/);
  assert.match(homepage, /not affiliated with the Sonoma County Superior Court/);
  assert.match(homepage, /professional relationship with Constantine Petros, including work on his personal website/);
  for (const href of ['./cases/', './federal/', './records/', './corrections/', './sitemap.xml']) {
    assert.ok(homepage.includes('href="' + href + '"'), 'Missing crawlable '+href);
  }
  for (const target of ['main','method','cases','about','source-grades']) {
    assert.ok(homepage.includes('id="' + target + '"'), 'Broken legacy anchor #'+target);
  }
  assert.ok(sitemap.includes('/cases/'));
  assert.ok(sitemap.includes('/museum/'));
  assert.ok(robots.includes('Sitemap:'));
});
