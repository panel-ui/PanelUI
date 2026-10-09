import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '../bin/panelui.mjs');
const generated = path.resolve(here, '../../../apps/docs/public/r/index.json');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panelui-discovery-'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

function waitForLine(stream) {
  return new Promise((resolve) => {
    let output = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      output += chunk;
      if (output.includes('\n')) resolve(output.split('\n')[0].trim());
    });
  });
}

function run(registry, args) {
  return spawnSync(process.execPath, [cli, 'list', '--registry', registry, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
}

function searchMcp(registry, query) {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'panelui_search_components', arguments: { query } },
  };
  const result = spawnSync(process.execPath, [cli, 'mcp', '--registry', registry], {
    input: `${JSON.stringify(request)}\n`,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).result.content[0].text;
}

test('list filters and ranks the generated discovery index', async () => {
  const current = path.join(root, 'current');
  const legacy = path.join(root, 'legacy');
  fs.mkdirSync(current);
  fs.mkdirSync(legacy);
  fs.copyFileSync(generated, path.join(current, 'index.json'));
  fs.writeFileSync(
    path.join(legacy, 'index.json'),
    JSON.stringify([
      { name: 'old-hook', type: 'registry:hook', description: 'Legacy hook.' },
      { name: 'old-button', type: 'registry:ui', description: 'Legacy button.' },
    ])
  );

  const server = spawn(
    process.execPath,
    [
      '-e',
      `const h=require('node:http'),f=require('node:fs'),p=require('node:path'),r=process.argv[1];h.createServer((q,s)=>{const x=p.join(r,q.url);if(!f.existsSync(x))return s.writeHead(404).end();s.end(f.readFileSync(x))}).listen(0,'127.0.0.1',function(){console.log(this.address().port)})`,
      root,
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] }
  );

  try {
    const port = await waitForLine(server.stdout);
    const registry = `http://127.0.0.1:${port}/current`;
    const all = run(registry, ['--json']);
    assert.equal(all.status, 0, `${all.stdout}${all.stderr}`);
    assert.equal(run(registry, ['--json']).stdout, all.stdout);
    const items = JSON.parse(all.stdout);
    assert.deepEqual([...new Set(items.map((item) => item.kind))].sort(), [
      'block',
      'chart',
      'hook',
      'lib',
      'theme',
      'ui',
    ]);
    assert.ok(items.every((item) => item.group && item.stability));
    for (const type of ['ui', 'chart', 'block', 'hook', 'lib', 'theme']) {
      const filtered = run(registry, ['--type', type, '--json']);
      assert.equal(filtered.status, 0);
      assert.ok(JSON.parse(filtered.stdout).every((item) => item.kind === type));
      assert.notEqual(JSON.parse(filtered.stdout).length, 0);
    }
    for (const name of [
      'collapse',
      'scroll-progress',
      'use-back-handler',
      'use-direction',
      'use-reveal-progress',
      'use-scroll-sections',
    ]) {
      const item = items.find((candidate) => candidate.name === name);
      assert.notEqual(item.description, `${name}.`);
    }

    const charts = run(registry, ['--type', 'chart']);
    assert.equal(charts.status, 0);
    assert.match(charts.stdout, /Charts[\s\S]*bar-chart/);
    assert.doesNotMatch(charts.stdout, /button\s/);

    const searched = run(registry, ['--search', 'scroll progress', '--json']);
    assert.equal(searched.status, 0);
    assert.equal(JSON.parse(searched.stdout)[0].name, 'scroll-progress');
    assert.match(searchMcp(registry, 'scroll progress').split('\n')[0], /^scroll-progress —/);

    const unknown = run(registry, ['--type', 'unknown']);
    assert.equal(unknown.status, 1);
    assert.match(`${unknown.stdout}${unknown.stderr}`, /Unknown registry type/);

    const old = run(`http://127.0.0.1:${port}/legacy`, ['--type', 'hook', '--json']);
    assert.equal(old.status, 0);
    assert.deepEqual(JSON.parse(old.stdout).map((item) => item.name), ['old-hook']);
  } finally {
    server.kill();
  }
});
