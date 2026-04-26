import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EcosystemActor, EcosystemContext } from './types.js';

const INTEGRATION_PATTERNS = /integrat(?:es?|ion)\s+with|built\s+on\s+top\s+of|powered\s+by|works\s+with|plugin\s+for/i;

function readPackageDeps(repoPath: string): string[] {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8') as string) as Record<string, unknown>;
    return [
      ...Object.keys((pkg['dependencies'] as Record<string, unknown>) ?? {}),
      ...Object.keys((pkg['peerDependencies'] as Record<string, unknown>) ?? {}),
    ];
  } catch {
    return [];
  }
}

function readPythonDeps(repoPath: string): string[] {
  const reqPath = path.join(repoPath, 'requirements.txt');
  if (!fs.existsSync(reqPath)) return [];
  try {
    return fs.readFileSync(reqPath, 'utf-8')
      .split('\n')
      .map((l) => l.split(/[>=<;]/)[0].trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readGoDeps(repoPath: string): string[] {
  const goModPath = path.join(repoPath, 'go.mod');
  if (!fs.existsSync(goModPath)) return [];
  try {
    return fs.readFileSync(goModPath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim().startsWith('require') || /^\s+\S+\s+v\d/.test(l))
      .map((l) => {
        const m = l.match(/\s+(\S+)\s+v/);
        return m ? m[1] : '';
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function extractReadmeIntegrations(repoPath: string): string[] {
  const readmeNames = ['README.md', 'README.rst', 'README.txt', 'README'];
  for (const name of readmeNames) {
    const p = path.join(repoPath, name);
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const matches: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        if (INTEGRATION_PATTERNS.test(line)) {
          const words = line.match(/[A-Z][a-zA-Z0-9]+/g) ?? [];
          matches.push(...words.filter((w) => w.length > 3));
        }
      }
      return [...new Set(matches)];
    } catch { continue; }
  }
  return [];
}

export class PartnerFinder {
  find(context: EcosystemContext): EcosystemActor[] {
    const { repoPath } = context;

    const deps = [
      ...readPackageDeps(repoPath),
      ...readPythonDeps(repoPath),
      ...readGoDeps(repoPath),
    ];

    const notableDeps = deps
      .filter((d) => !d.startsWith('@types/') && !d.startsWith('eslint') && !d.startsWith('@typescript'))
      .slice(0, 8);

    const readmeIntegrations = extractReadmeIntegrations(repoPath).slice(0, 5);

    const actors: EcosystemActor[] = [];

    for (const dep of notableDeps) {
      actors.push({
        name: dep,
        repoUrl: null,
        role: 'upstream',
        rationale: `Direct dependency in project manifest`,
        similarityScore: null,
        tags: ['dependency'],
      });
    }

    for (const name of readmeIntegrations) {
      if (!actors.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
        actors.push({
          name,
          repoUrl: null,
          role: 'partner',
          rationale: `Mentioned as integration in README`,
          similarityScore: null,
          tags: ['integration', 'readme'],
        });
      }
    }

    return actors;
  }
}
