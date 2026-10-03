import { defineConfig } from 'vite';
import ts from 'typescript';
import { minify } from 'terser';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} | MIT | Saiya */\n`;

export default defineConfig({
  build: {
    target: 'es2015',
    minify: false,
    lib: {
      entry: 'src/numbase.ts',
      name: 'NumBase',
      formats: ['es', 'cjs'],
      fileName: format => format === 'es' ? 'numbase.mjs' : 'numbase.js',
    },
    rolldownOptions: { output: { exports: 'default' } },
  },
  plugins: [{
    name: 'numbase-legacy-distribution',
    // Vite handles bundling; TypeScript preserves ES5 syntax in legacy entries.
    renderChunk(code) {
      return { code: ts.transpileModule(code, {
        compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ESNext, removeComments: false },
      }).outputText, map: null };
    },
    async generateBundle(options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.isEntry) continue;
        if (options.format === 'es') {
          output.code = banner + output.code;
          continue;
        }
        // Preserve the historical AMD/CMD, CommonJS constructor, and global export.
        output.code = `${banner}(function (root, factory) {
  if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function () { return factory(); });
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.NumBase = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {
  var module = { exports: {} };
${output.code}
  return module.exports;
}));\n`;
        const minified = await minify(output.code, { ecma: 5, format: { comments: /^!/ } });
        this.emitFile({ type: 'asset', fileName: 'numbase.min.js', source: minified.code + '\n' });
      }
    },
  }],
});
