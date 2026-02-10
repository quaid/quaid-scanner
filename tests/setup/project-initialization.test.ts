import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..', '..');

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf-8'));
}

describe('Story 1.1: Project Initialization', () => {
  describe('1.1.1: package.json schema', () => {
    const pkg = readJson('package.json') as Record<string, unknown>;

    it('has name "quaid-scanner"', () => {
      expect(pkg.name).toBe('quaid-scanner');
    });

    it('has a version', () => {
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('has a description', () => {
      expect(typeof pkg.description).toBe('string');
      expect((pkg.description as string).length).toBeGreaterThan(10);
    });

    it('has main pointing to dist/index.js', () => {
      expect(pkg.main).toBe('dist/index.js');
    });

    it('has types pointing to dist/index.d.ts', () => {
      expect(pkg.types).toBe('dist/index.d.ts');
    });

    it('has bin for quaid-scanner', () => {
      expect((pkg.bin as Record<string, string>)['quaid-scanner']).toBe('dist/cli.js');
    });

    it('has required scripts: build, test, lint', () => {
      const scripts = pkg.scripts as Record<string, string>;
      expect(scripts.build).toBeDefined();
      expect(scripts.test).toBeDefined();
      expect(scripts.lint).toBeDefined();
    });

    it('has keywords array', () => {
      expect(Array.isArray(pkg.keywords)).toBe(true);
      expect((pkg.keywords as string[]).length).toBeGreaterThan(0);
    });

    it('has Apache-2.0 license', () => {
      expect(pkg.license).toBe('Apache-2.0');
    });

    it('requires node >= 18.0.0', () => {
      expect((pkg.engines as Record<string, string>).node).toBe('>=18.0.0');
    });
  });

  describe('1.1.2: tsconfig.json flags', () => {
    const tsconfig = readJson('tsconfig.json') as Record<string, unknown>;
    const opts = tsconfig.compilerOptions as Record<string, unknown>;

    it('has strict mode enabled', () => {
      expect(opts.strict).toBe(true);
    });

    it('has noUnusedLocals enabled', () => {
      expect(opts.noUnusedLocals).toBe(true);
    });

    it('has noUnusedParameters enabled', () => {
      expect(opts.noUnusedParameters).toBe(true);
    });

    it('has noImplicitReturns enabled', () => {
      expect(opts.noImplicitReturns).toBe(true);
    });

    it('targets ES2022', () => {
      expect(opts.target).toBe('ES2022');
    });

    it('uses NodeNext module system', () => {
      expect(opts.module).toBe('NodeNext');
    });
  });

  describe('1.1.3: ESLint configuration', () => {
    it('has an ESLint config file', () => {
      const hasConfig =
        existsSync(resolve(ROOT, '.eslintrc.json')) ||
        existsSync(resolve(ROOT, '.eslintrc.js')) ||
        existsSync(resolve(ROOT, '.eslintrc.cjs')) ||
        existsSync(resolve(ROOT, '.eslintrc.yml'));
      expect(hasConfig).toBe(true);
    });

    it('extends @typescript-eslint/recommended', () => {
      const config = readJson('.eslintrc.json') as Record<string, unknown>;
      const ext = config.extends as string[];
      expect(ext).toContain('plugin:@typescript-eslint/recommended');
    });
  });

  describe('1.1.4: Prettier configuration', () => {
    it('has a Prettier config file', () => {
      const hasConfig =
        existsSync(resolve(ROOT, '.prettierrc')) ||
        existsSync(resolve(ROOT, '.prettierrc.json')) ||
        existsSync(resolve(ROOT, '.prettierrc.js'));
      expect(hasConfig).toBe(true);
    });

    it('uses semi: true, singleQuote: true, tabWidth: 2', () => {
      const config = readJson('.prettierrc.json') as Record<string, unknown>;
      expect(config.semi).toBe(true);
      expect(config.singleQuote).toBe(true);
      expect(config.tabWidth).toBe(2);
    });
  });

  describe('1.1.5: Vitest configuration', () => {
    it('has vitest.config.ts', () => {
      expect(existsSync(resolve(ROOT, 'vitest.config.ts'))).toBe(true);
    });
  });

  describe('1.1.6: Build succeeds', () => {
    it('src/index.ts exists as entry point', () => {
      expect(existsSync(resolve(ROOT, 'src', 'index.ts'))).toBe(true);
    });
  });

  describe('1.1.7: Types entry exists', () => {
    it('src/types/index.ts exists', () => {
      expect(existsSync(resolve(ROOT, 'src', 'types', 'index.ts'))).toBe(true);
    });
  });
});
