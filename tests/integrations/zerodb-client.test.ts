import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

function fail(status: number, body: unknown = {}) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('ZeroDBClient', () => {
  let client: ZeroDBClient;

  beforeEach(() => {
    vi.resetAllMocks();
    client = new ZeroDBClient('http://localhost:8100', 'test-key', 'proj-123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization header on every request', async () => {
    mockFetch.mockResolvedValue(ok({ data: [] }));
    await client.tableQuery('my_table', {});
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-key' });
  });

  describe('tableInsert', () => {
    it('posts to the correct endpoint', async () => {
      mockFetch.mockResolvedValue(ok({ row_id: 'r1', row_data: { id: 'r1' } }));
      const result = await client.tableInsert('scan_history', { id: 'r1', score: 7.5 });
      expect(result).toMatchObject({ row_id: 'r1' });
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/database/tables/scan_history/rows');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue(fail(500, { detail: 'server error' }));
      await expect(client.tableInsert('scan_history', {})).rejects.toThrow();
    });
  });

  describe('tableQuery', () => {
    it('returns data array', async () => {
      const rows = [{ row_data: { id: 'r1' } }, { row_data: { id: 'r2' } }];
      mockFetch.mockResolvedValue(ok({ data: rows }));
      const result = await client.tableQuery('scan_history', { repo: 'foo/bar' });
      expect(result).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      mockFetch.mockRejectedValue(new Error('network error'));
      const result = await client.tableQuery('scan_history', {});
      expect(result).toEqual([]);
    });
  });

  describe('vectorUpsert', () => {
    it('posts vector with metadata', async () => {
      mockFetch.mockResolvedValue(ok({ id: 'v1' }));
      await client.vectorUpsert('v1', [0.1, 0.2, 0.3], { repo: 'foo/bar' });
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('/vectors');
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.vector).toHaveLength(3);
      expect(body.metadata).toMatchObject({ repo: 'foo/bar' });
    });
  });

  describe('vectorSearch', () => {
    it('returns similar vectors above threshold', async () => {
      const results = [{ id: 'v1', score: 0.95, metadata: { repo: 'a/b' } }];
      mockFetch.mockResolvedValue(ok({ results }));
      const hits = await client.vectorSearch([0.1, 0.2], 5, 0.75);
      expect(hits).toHaveLength(1);
      expect(hits[0].score).toBe(0.95);
    });

    it('returns empty array on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('timeout'));
      const hits = await client.vectorSearch([0.1], 5, 0.75);
      expect(hits).toEqual([]);
    });
  });

  describe('tableCreate', () => {
    it('ignores 409 conflict (table already exists)', async () => {
      mockFetch.mockResolvedValue(fail(409, { detail: 'already exists' }));
      await expect(client.tableCreate('scan_history', [])).resolves.not.toThrow();
    });

    it('throws on other errors', async () => {
      mockFetch.mockResolvedValue(fail(500, { detail: 'server error' }));
      await expect(client.tableCreate('scan_history', [])).rejects.toThrow();
    });
  });
});
