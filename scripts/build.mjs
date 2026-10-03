import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { minify } from 'terser';
const source = await readFile(new URL('../src/numbase.js', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} | MIT | Saiya */\n`;
const wrapped = `${banner}(function (root, factory) {
  if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function () { return factory(); });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.NumBase = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {
${source}
return NumBase;
}));\n`;
const minified = await minify(wrapped, { ecma: 5, format: { comments: /^!/ } });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/numbase.js', import.meta.url), wrapped);
await writeFile(new URL('../dist/numbase.min.js', import.meta.url), minified.code + '\n');
await writeFile(new URL('../dist/numbase.mjs', import.meta.url), banner + source + '\nexport default NumBase;\n');
const types = await readFile(new URL('../src/numbase.d.ts', import.meta.url), 'utf8');
await writeFile(new URL('../dist/numbase.d.ts', import.meta.url), types);
await writeFile(new URL('../dist/numbase.d.mts', import.meta.url), types.replace('export = NumBase;', 'export default NumBase;'));
console.log('Built CommonJS/browser UMD, opt-in ESM, and declarations without changing the version');
