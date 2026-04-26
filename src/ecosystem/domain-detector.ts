import * as fs from 'node:fs';
import * as path from 'node:path';
import { DOMAIN_TAXONOMY } from './domain-taxonomy.js';
import type { EcosystemContext, EcosystemProfile } from './types.js';

const LANGUAGE_INDICATORS: Record<string, string[]> = {
  TypeScript: ['tsconfig.json', 'package.json'],
  JavaScript: ['package.json'],
  Python: ['setup.py', 'pyproject.toml', 'requirements.txt', 'setup.cfg'],
  Go: ['go.mod', 'go.sum'],
  Rust: ['Cargo.toml', 'Cargo.lock'],
  Java: ['pom.xml', 'build.gradle'],
  Ruby: ['Gemfile', 'Gemfile.lock', '.gemspec'],
  'C#': ['*.csproj', '*.sln'],
  Swift: ['Package.swift'],
  Kotlin: ['build.gradle.kts'],
};

function detectPrimaryLanguage(repoPath: string): string | null {
  for (const [lang, markers] of Object.entries(LANGUAGE_INDICATORS)) {
    for (const marker of markers) {
      if (marker.includes('*')) {
        try {
          const dir = fs.readdirSync(repoPath) as string[];
          const ext = marker.replace('*', '');
          if (dir.some((f) => f.endsWith(ext))) return lang;
        } catch { continue; }
      } else if (fs.existsSync(path.join(repoPath, marker))) {
        if (lang === 'JavaScript') {
          if (fs.existsSync(path.join(repoPath, 'tsconfig.json'))) continue;
        }
        return lang;
      }
    }
  }
  return null;
}

function extractTopicsFromReadme(repoPath: string): string[] {
  const readmeNames = ['README.md', 'README.rst', 'README.txt', 'README'];
  for (const name of readmeNames) {
    const p = path.join(repoPath, name);
    if (!fs.existsSync(p)) continue;
    try {
      return fs.readFileSync(p, 'utf-8').toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    } catch { continue; }
  }
  return [];
}

function extractPackageKeywords(repoPath: string): string[] {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8') as string) as Record<string, unknown>;
    const kw = pkg['keywords'];
    if (Array.isArray(kw)) return kw.map((k) => String(k).toLowerCase());
  } catch { }
  return [];
}

function scoreDomains(words: string[]): Record<string, number> {
  const scores: Record<string, number> = {};
  const wordSet = new Set(words);

  for (const [domain, keywords] of Object.entries(DOMAIN_TAXONOMY)) {
    if (domain === 'general') continue;
    let score = 0;
    for (const kw of keywords) {
      const kwWords = kw.toLowerCase().split(/\W+/);
      if (kwWords.every((w) => wordSet.has(w))) score += kwWords.length;
    }
    if (score > 0) scores[domain] = score;
  }
  return scores;
}

export class DomainDetector {
  detect(context: EcosystemContext): EcosystemProfile {
    const { repoPath } = context;
    const topics = [
      ...extractTopicsFromReadme(repoPath),
      ...extractPackageKeywords(repoPath),
    ];

    const scores = scoreDomains(topics);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const domain = sorted[0]?.[0] ?? 'general';
    const detectedTopics = sorted.slice(0, 5).map(([d]) => d);

    return {
      domain,
      ecosystems: [],
      standards: [],
      primaryLanguage: detectPrimaryLanguage(repoPath),
      detectedTopics,
    };
  }
}
