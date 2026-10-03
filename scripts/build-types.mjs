import { readFile, writeFile } from 'node:fs/promises';
const declaration = await readFile(new URL('../dist/numbase.d.ts', import.meta.url), 'utf8');
await writeFile(new URL('../dist/numbase.d.mts', import.meta.url), declaration);
const commonjs = declaration.replace('export default class NumBase', 'declare class NumBase').replace('export {};', '') + '\nexport = NumBase;\n';
await writeFile(new URL('../dist/numbase.d.ts', import.meta.url), commonjs);
