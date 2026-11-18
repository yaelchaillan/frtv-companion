// Copie les drapeaux 4:3 de flag-icons (MIT) dans public/flags : ils sont servis par
// l'extension elle-même (la page FACEIT bloque les images distantes).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', 'flag-icons', 'flags', '4x3');
const dest = join('public', 'flags');
if (!existsSync(src)) {
  console.warn('[flags] flag-icons absent, drapeaux non copiés');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith('.svg'));
for (const file of files) copyFileSync(join(src, file), join(dest, file));
copyFileSync(join('node_modules', 'flag-icons', 'LICENSE'), join(dest, 'LICENSE.txt'));
console.log(`[flags] ${files.length} drapeaux copiés dans public/flags`);
