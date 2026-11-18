// Lance Vitest depuis le chemin réel du projet.
// Sous Windows, un dossier courant en « c:\… » (minuscule, fréquent dans VS Code) fait
// charger Vitest deux fois et casse tous les tests ; le chemin réel est en « C:\… ».
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';

const cwd = realpathSync.native(process.cwd());
const vitest = join(cwd, 'node_modules', 'vitest', 'vitest.mjs');
const { status } = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], { cwd, stdio: 'inherit' });
process.exit(status ?? 1);
