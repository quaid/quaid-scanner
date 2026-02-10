import { describe, it, expect, beforeEach } from 'vitest';
import { ScannerRegistry } from '../../src/scanner/registry.js';
import { Pillar, Severity } from '../../src/types/index.js';
import type { Scanner, ScanContext, Finding } from '../../src/types/index.js';

/**
 * Helper to create a minimal valid scanner for testing.
 */
function createMockScanner(overrides: Partial<Scanner> = {}): Scanner {
  return {
    name: 'test-scanner',
    displayName: 'Test Scanner',
    pillar: Pillar.SECURITY,
    async run(_context: ScanContext): Promise<Finding[]> {
      return [];
    },
    ...overrides,
  };
}

describe('ScannerRegistry', () => {
  let registry: ScannerRegistry;

  beforeEach(() => {
    registry = new ScannerRegistry();
  });

  describe('register() and get()', () => {
    it('registers a scanner and retrieves it by name', () => {
      const scanner = createMockScanner({ name: 'license-check' });
      registry.register(scanner);

      const retrieved = registry.get('license-check');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('license-check');
      expect(retrieved!.displayName).toBe('Test Scanner');
      expect(retrieved!.pillar).toBe(Pillar.SECURITY);
    });

    it('returns undefined for an unknown scanner name', () => {
      const result = registry.get('nonexistent-scanner');
      expect(result).toBeUndefined();
    });
  });

  describe('getByPillar()', () => {
    it('returns scanners matching a given pillar', () => {
      const secScanner1 = createMockScanner({
        name: 'sec-1',
        pillar: Pillar.SECURITY,
      });
      const secScanner2 = createMockScanner({
        name: 'sec-2',
        pillar: Pillar.SECURITY,
      });
      const govScanner = createMockScanner({
        name: 'gov-1',
        pillar: Pillar.GOVERNANCE,
      });

      registry.register(secScanner1);
      registry.register(secScanner2);
      registry.register(govScanner);

      const securityScanners = registry.getByPillar(Pillar.SECURITY);
      expect(securityScanners).toHaveLength(2);
      expect(securityScanners.map((s) => s.name)).toEqual(['sec-1', 'sec-2']);

      const governanceScanners = registry.getByPillar(Pillar.GOVERNANCE);
      expect(governanceScanners).toHaveLength(1);
      expect(governanceScanners[0].name).toBe('gov-1');
    });

    it('returns an empty array for a pillar with no registered scanners', () => {
      const scanner = createMockScanner({ pillar: Pillar.SECURITY });
      registry.register(scanner);

      const result = registry.getByPillar(Pillar.COMMUNITY);
      expect(result).toEqual([]);
    });
  });

  describe('getAll()', () => {
    it('returns all registered scanners', () => {
      const scanner1 = createMockScanner({ name: 'scanner-a' });
      const scanner2 = createMockScanner({ name: 'scanner-b' });
      const scanner3 = createMockScanner({ name: 'scanner-c' });

      registry.register(scanner1);
      registry.register(scanner2);
      registry.register(scanner3);

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.name)).toEqual([
        'scanner-a',
        'scanner-b',
        'scanner-c',
      ]);
    });

    it('returns an empty array when no scanners are registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('duplicate registration', () => {
    it('throws an error when registering a scanner with a duplicate name', () => {
      const scanner1 = createMockScanner({ name: 'duplicate-name' });
      const scanner2 = createMockScanner({
        name: 'duplicate-name',
        displayName: 'Different Display Name',
      });

      registry.register(scanner1);

      expect(() => registry.register(scanner2)).toThrow(
        /already registered.*duplicate-name/i
      );
    });
  });

  describe('validation on register', () => {
    it('throws when scanner is missing name', () => {
      const scanner = createMockScanner({ name: '' });
      expect(() => registry.register(scanner)).toThrow(/name/i);
    });

    it('throws when scanner is missing displayName', () => {
      const scanner = createMockScanner({ displayName: '' });
      expect(() => registry.register(scanner)).toThrow(/displayName/i);
    });

    it('throws when scanner is missing pillar', () => {
      const scanner = createMockScanner();
      // Force pillar to be undefined to simulate missing field
      (scanner as Record<string, unknown>).pillar = undefined;
      expect(() => registry.register(scanner)).toThrow(/pillar/i);
    });

    it('throws when scanner is missing run function', () => {
      const scanner = createMockScanner();
      // Force run to be undefined to simulate missing field
      (scanner as Record<string, unknown>).run = undefined;
      expect(() => registry.register(scanner)).toThrow(/run/i);
    });

    it('throws when scanner run is not a function', () => {
      const scanner = createMockScanner();
      (scanner as Record<string, unknown>).run = 'not-a-function';
      expect(() => registry.register(scanner)).toThrow(/run/i);
    });
  });

  describe('clear()', () => {
    it('removes all registered scanners', () => {
      registry.register(createMockScanner({ name: 'a' }));
      registry.register(createMockScanner({ name: 'b' }));
      expect(registry.getAll()).toHaveLength(2);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.get('a')).toBeUndefined();
      expect(registry.get('b')).toBeUndefined();
    });
  });
});
