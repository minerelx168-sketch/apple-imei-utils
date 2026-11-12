import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const compiler = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const config of ['tsconfig.json', 'tsconfig.cjs.json']) {
  execFileSync(process.execPath, [compiler, '-p', config], { cwd: root, stdio: 'inherit' });
}
copyFileSync(join(dist, 'cjs', 'index.js'), join(dist, 'index.cjs'));
copyFileSync(join(dist, 'esm', 'index.js'), join(dist, 'index.js'));
copyFileSync(join(dist, 'esm', 'index.d.ts'), join(dist, 'index.d.ts'));
copyFileSync(join(dist, 'esm', 'index.d.ts'), join(dist, 'index.d.cts'));
rmSync(join(dist, 'esm'), { recursive: true, force: true });
rmSync(join(dist, 'cjs'), { recursive: true, force: true });
