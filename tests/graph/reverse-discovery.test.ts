import { describe, it, expect, vi } from 'vitest';
import { queryReverseDependencies } from '../../src/graph/reverse-discovery.js';
import type { ZeroDBClient } from '../../src/integrations/zerodb-client.js';

function makeMockClient(overrides = {}): ZeroDBClient {
  return {
    tableCreate: vi.fn().mockResolvedValue(undefined),
    tableInsert: vi.fn().mockResolvedValue({ row_id: 'r1' }),
    tableQuery: vi.fn().mockResolvedValue([]),
    vectorUpsert: vi.fn().mockResolvedValue(undefined),
    vectorSearch: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as ZeroDBClient;
}

describe('queryReverseDependencies', () => {
  it('returns empty result when no edges are found', async () => {
    // Arrange
    const client = makeMockClient();

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result).toEqual({ count: 0, repos: [], totalDownstreamScore: 0 });
  });

  it('returns correct count and repos when edges are found', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockImplementation((table: string) => {
        if (table === 'graph_edges') return Promise.resolve([
          { row_data: { from_repo: 'org/consumer-a', to_repo: 'org/target', edge_type: 'depends_on', weight: 1.0 } },
        ]);
        if (table === 'graph_nodes') return Promise.resolve([
          { row_data: { repo: 'org/consumer-a', overall_score: 7.5 } },
        ]);
        return Promise.resolve([]);
      }),
    });

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result.count).toBe(1);
    expect(result.repos).toContain('org/consumer-a');
  });

  it('sums overall_score from matched graph_nodes rows for totalDownstreamScore', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockImplementation((table: string) => {
        if (table === 'graph_edges') return Promise.resolve([
          { row_data: { from_repo: 'org/consumer-a', to_repo: 'org/target', edge_type: 'depends_on', weight: 1.0 } },
        ]);
        if (table === 'graph_nodes') return Promise.resolve([
          { row_data: { repo: 'org/consumer-a', overall_score: 7.5 } },
        ]);
        return Promise.resolve([]);
      }),
    });

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result.totalDownstreamScore).toBe(7.5);
  });

  it('uses 0 for score when a dependent repo is not found in graph_nodes', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockImplementation((table: string) => {
        if (table === 'graph_edges') return Promise.resolve([
          { row_data: { from_repo: 'org/unknown-consumer', to_repo: 'org/target', edge_type: 'depends_on', weight: 1.0 } },
        ]);
        // graph_nodes returns empty — repo not registered
        return Promise.resolve([]);
      }),
    });

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result.totalDownstreamScore).toBe(0);
    expect(result.repos).toContain('org/unknown-consumer');
  });

  it('deduplicates repos when multiple edges exist from the same repo', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockImplementation((table: string) => {
        if (table === 'graph_edges') return Promise.resolve([
          { row_data: { from_repo: 'org/consumer-a', to_repo: 'org/target', edge_type: 'depends_on', weight: 1.0 } },
          { row_data: { from_repo: 'org/consumer-a', to_repo: 'org/target', edge_type: 'depends_on', weight: 0.5 } },
        ]);
        if (table === 'graph_nodes') return Promise.resolve([
          { row_data: { repo: 'org/consumer-a', overall_score: 7.5 } },
        ]);
        return Promise.resolve([]);
      }),
    });

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result.repos).toEqual(['org/consumer-a']);
    expect(result.count).toBe(1);
  });

  it('returns empty result without throwing when tableQuery rejects', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockRejectedValue(new Error('ZeroDB unavailable')),
    });

    // Act & Assert
    await expect(queryReverseDependencies('org/target', client)).resolves.toEqual({
      count: 0,
      repos: [],
      totalDownstreamScore: 0,
    });
  });

  it('repos array contains the correct from_repo values', async () => {
    // Arrange
    const client = makeMockClient({
      tableQuery: vi.fn().mockImplementation((table: string) => {
        if (table === 'graph_edges') return Promise.resolve([
          { row_data: { from_repo: 'org/consumer-a', to_repo: 'org/target', edge_type: 'depends_on', weight: 1.0 } },
          { row_data: { from_repo: 'org/consumer-b', to_repo: 'org/target', edge_type: 'depends_on', weight: 0.8 } },
        ]);
        if (table === 'graph_nodes') return Promise.resolve([
          { row_data: { repo: 'org/consumer-a', overall_score: 6.0 } },
          { row_data: { repo: 'org/consumer-b', overall_score: 8.0 } },
        ]);
        return Promise.resolve([]);
      }),
    });

    // Act
    const result = await queryReverseDependencies('org/target', client);

    // Assert
    expect(result.repos).toContain('org/consumer-a');
    expect(result.repos).toContain('org/consumer-b');
    expect(result.repos).toHaveLength(2);
    expect(result.count).toBe(2);
    expect(result.totalDownstreamScore).toBe(14.0);
  });
});
