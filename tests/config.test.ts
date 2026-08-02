/**
 * Tests for provenance loading in the config module (Story 8.7c #180).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildConfig, loadProvenanceFile } from '../src/config.js';

const validProvenance = {
  models: ['claude-opus-4-8'],
  inputTokens: 12450,
  outputTokens: 3210,
  totalTokens: 15660,
  sessionId: 'sess_abc123',
  agentId: 'karsten-ospo',
  generatedAt: '2026-08-02T14:23:00-07:00',
};

let dir: string;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'quaid-prov-'));
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  warnSpy.mockRestore();
});

function writeJson(name: string, contents: string): string {
  const p = join(dir, name);
  writeFileSync(p, contents);
  return p;
}

describe('loadProvenanceFile (Story 8.7c)', () => {
  it('loads and returns a valid ProvenanceInfo file', () => {
    const p = writeJson('prov.json', JSON.stringify(validProvenance));
    expect(loadProvenanceFile(p)).toEqual(validProvenance);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns and returns null when the file is missing (never throws)', () => {
    expect(loadProvenanceFile(join(dir, 'nope.json'))).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('warns and returns null when the file is not valid JSON', () => {
    const p = writeJson('bad.json', '{ not json ');
    expect(loadProvenanceFile(p)).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('warns and returns null when JSON does not conform to ProvenanceInfo', () => {
    const p = writeJson('wrong.json', JSON.stringify({ foo: 'bar' }));
    expect(loadProvenanceFile(p)).toBeNull();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('rejects a models field that is not an array of strings', () => {
    const p = writeJson('badmodels.json', JSON.stringify({ models: [1, 2], generatedAt: 'now' }));
    expect(loadProvenanceFile(p)).toBeNull();
  });
});

describe('buildConfig provenance wiring (Story 8.7c)', () => {
  it('sets config.provenance from a valid --provenance-file', () => {
    const p = writeJson('prov.json', JSON.stringify(validProvenance));
    const config = buildConfig({ provenanceFile: p });
    expect(config.provenance).toEqual(validProvenance);
  });

  it('leaves config.provenance undefined and continues when the file is invalid', () => {
    const p = writeJson('bad.json', 'not json');
    const config = buildConfig({ provenanceFile: p });
    expect(config.provenance).toBeUndefined();
    // scan still configured normally
    expect(config.depth).toBeDefined();
  });

  it('leaves config.provenance undefined when no flag is passed', () => {
    expect(buildConfig({}).provenance).toBeUndefined();
  });
});
