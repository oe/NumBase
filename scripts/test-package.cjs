const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'numbase-package-'));
function command(args) {
  const result = spawnSync('npm', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
(async () => {
  try {
    const [packed] = JSON.parse(command(['pack', '--json', '--pack-destination', temporary]));
    assert.ok(packed.files.every(file => file.path.startsWith('dist/') || ['LICENSE', 'package.json', 'readme.md'].includes(file.path)));
    const consumer = path.join(temporary, 'consumer');
    command(['install', '--prefix', consumer, '--ignore-scripts', '--no-audit', '--no-fund', path.join(temporary, packed.filename)]);
    const root = path.join(consumer, 'node_modules/numbase');
    const Constructor = require(root);
    assert.equal(typeof Constructor, 'function');
    const decimal = '900719925474099312345678901234567890';
    const base = new Constructor();
    assert.equal(base.decode(base.encode(decimal)), decimal);
    assert.equal(new (require(root + '/dist/numbase'))().encode('10'), 'a');
    const esm = await import(pathToFileURL(root + '/dist/numbase.mjs'));
    assert.equal(new esm.default().decode('a'), '10');
    const pkg = require(root + '/package.json');
    assert.ok(fs.existsSync(path.join(root, pkg.types)));
    assert.ok(fs.existsSync(path.join(root, 'dist/numbase.d.mts')));
    console.log('Packed package installs with CommonJS, deep imports, ESM, and declarations');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
