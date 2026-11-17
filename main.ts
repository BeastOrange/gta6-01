// Solmar Bay entrypoint: hand the game in as a make.fun dossier.
//
// This program copies the static game in game/ and the screenshots in
// screenshots/ into the output directory, then writes dossier.json there
// with the vendored make.fun library. It uses only the Node 22 standard
// library, takes no arguments, and writes the same bytes every run.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so stale files can never leak in.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps match the scorer's own limits: at most 4 screenshots of 256 KiB,
// at most 993 game files totalling 48 MiB, paths under 1,000 bytes, and a
// 160 KiB text budget for the dossier the judge reads.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
