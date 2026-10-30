import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'panelui-remove-'));
after(() => fs.rmSync(root, { recursive: true, force: true }));
const cli = fileURLToPath(new URL('../bin/panelui.mjs', import.meta.url));

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

const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

test('remove deletes only the named root and files no other root needs', async () => {
  const registry = path.join(root, 'registry');
  const project = path.join(root, 'project');
  fs.mkdirSync(registry);
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ dependencies: {} }));
  fs.writeFileSync(
    path.join(project, 'panelui.json'),
    JSON.stringify({
      registry: 'https://panelui.dev/r',
      aliases: { components: '@/components/ui', lib: '@/lib', hooks: '@/hooks' },
    })
  );
  const item = (name, files, registryDependencies = []) =>
    fs.writeFileSync(
      path.join(registry, `${name}.json`),
      JSON.stringify({ name, files, dependencies: [], registryDependencies })
    );
  item('text', [{ path: 'ui/text.tsx', content: 'text\n' }]);
  item('check-icon', [{ path: 'ui/check-icon.tsx', content: 'icon\n' }]);
  item('checkbox', [{ path: 'ui/checkbox.tsx', content: 'checkbox\n' }], ['text', 'check-icon']);
  item('button', [{ path: 'ui/button.tsx', content: 'button\n' }], ['text']);
  item('card', [{ path: 'ui/card.tsx', content: 'card\n' }]);

  const server = spawn(
    process.execPath,
    [
      '-e',
      `const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const root=process.argv[1];const server=http.createServer((req,res)=>{const file=path.join(root,req.url);if(!fs.existsSync(file)){res.writeHead(404).end();return}res.end(fs.readFileSync(file))});server.listen(0,'127.0.0.1',()=>console.log(server.address().port));`,
      registry,
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] }
  );

  try {
    const port = await waitForLine(server.stdout);
    const common = ['--cwd', project, '--registry', `http://127.0.0.1:${port}`, '--yes'];
    const ui = (name) => path.join(project, 'components/ui', name);
    const readLock = () =>
      JSON.parse(fs.readFileSync(path.join(project, 'panelui-lock.json'), 'utf8'));

    const added = run(['add', 'checkbox', 'button', 'card', ...common]);
    assert.equal(added.status, 0, `${added.stdout}${added.stderr}`);
    fs.writeFileSync(ui('card.tsx'), 'card, edited\n');

    const unknown = run(['remove', 'text', ...common]);
    assert.equal(unknown.status, 1, 'a dependency that was never asked for is not a root');

    const preview = run(['remove', 'checkbox', '--dry-run', ...common]);
    assert.equal(preview.status, 0, `${preview.stdout}${preview.stderr}`);
    assert.ok(fs.existsSync(ui('checkbox.tsx')), 'dry run writes nothing');
    assert.match(preview.stdout, /text stays, required by button/);

    const removed = run(['remove', 'checkbox', ...common]);
    assert.equal(removed.status, 0, `${removed.stdout}${removed.stderr}`);
    assert.ok(!fs.existsSync(ui('checkbox.tsx')));
    assert.ok(!fs.existsSync(ui('check-icon.tsx')), 'an unshared dependency goes with it');
    assert.ok(fs.existsSync(ui('text.tsx')), 'a dependency button still needs stays');
    let lock = readLock();
    assert.deepEqual(Object.keys(lock.roots).sort(), ['button', 'card']);
    assert.equal(lock.files['components/ui/checkbox.tsx'], undefined);
    assert.equal(lock.files['components/ui/check-icon.tsx'], undefined);
    assert.ok(lock.files['components/ui/text.tsx']);

    const kept = run(['remove', 'card', ...common]);
    assert.equal(kept.status, 0, `${kept.stdout}${kept.stderr}`);
    assert.equal(fs.readFileSync(ui('card.tsx'), 'utf8'), 'card, edited\n', 'edits are kept');
    lock = readLock();
    assert.equal(lock.files['components/ui/card.tsx'], undefined, 'and no longer tracked');

    fs.writeFileSync(ui('button.tsx'), 'button, edited\n');
    const discarded = run(['remove', 'button', '--overwrite', ...common]);
    assert.equal(discarded.status, 0, `${discarded.stdout}${discarded.stderr}`);
    assert.ok(!fs.existsSync(ui('button.tsx')), '--overwrite discards edits');
    assert.ok(!fs.existsSync(ui('text.tsx')), 'the last root sharing text is gone');
    lock = readLock();
    assert.deepEqual(lock.roots, {});
    assert.deepEqual(lock.files, {});
  } finally {
    server.kill();
  }
});
