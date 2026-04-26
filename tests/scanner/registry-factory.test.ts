import { describe, it, expect } from 'vitest';
import { createDefaultRegistry } from '../../src/scanner/registry-factory.js';
import { Pillar } from '../../src/types/index.js';

describe('createDefaultRegistry', () => {
  it('returns a registry with scanners registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll().length).toBeGreaterThan(0);
  });

  it('has scanners for all six pillars', () => {
    const registry = createDefaultRegistry();
    for (const pillar of Object.values(Pillar)) {
      expect(registry.getByPillar(pillar).length).toBeGreaterThan(0);
    }
  });

  it('has at least 38 scanners registered', () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll().length).toBeGreaterThanOrEqual(38);
  });

  it('all registered scanners have unique names', () => {
    const registry = createDefaultRegistry();
    const names = registry.getAll().map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('can retrieve a scanner by name', () => {
    const registry = createDefaultRegistry();
    const scanner = registry.get('license-detection-scanner');
    expect(scanner).toBeDefined();
    expect(scanner?.name).toBe('license-detection-scanner');
  });

  it('creates independent registry instances each call', () => {
    const r1 = createDefaultRegistry();
    const r2 = createDefaultRegistry();
    expect(r1).not.toBe(r2);
  });
});
