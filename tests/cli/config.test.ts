/**
 * Tests for buildConfig environment variable fallback behaviour (issue #61).
 *
 * buildConfig must read GITHUB_TOKEN and GITHUB_PERSONAL_ACCESS_TOKEN from
 * the environment when neither is supplied by the caller.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildConfig } from '../../src/config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildConfig — GITHUB_TOKEN env fallback', () => {
  it('reads githubToken from GITHUB_TOKEN env var when not set by caller', () => {
    // Arrange
    vi.stubEnv('GITHUB_TOKEN', 'ghp_test');
    vi.stubEnv('GITHUB_PERSONAL_ACCESS_TOKEN', '');

    // Act
    const config = buildConfig({});

    // Assert
    expect(config.githubToken).toBe('ghp_test');
  });

  it('reads githubToken from GITHUB_PERSONAL_ACCESS_TOKEN when GITHUB_TOKEN is absent', () => {
    // Arrange
    vi.stubEnv('GITHUB_TOKEN', '');
    vi.stubEnv('GITHUB_PERSONAL_ACCESS_TOKEN', 'ghp_pat_value');

    // Act
    const config = buildConfig({});

    // Assert
    expect(config.githubToken).toBe('ghp_pat_value');
  });

  it('gives GITHUB_TOKEN precedence over GITHUB_PERSONAL_ACCESS_TOKEN when both are set', () => {
    // Arrange
    vi.stubEnv('GITHUB_TOKEN', 'ghp_primary');
    vi.stubEnv('GITHUB_PERSONAL_ACCESS_TOKEN', 'ghp_fallback');

    // Act
    const config = buildConfig({});

    // Assert
    expect(config.githubToken).toBe('ghp_primary');
  });

  it('returns null for githubToken when neither env var is set', () => {
    // Arrange — ensure both vars are absent
    vi.stubEnv('GITHUB_TOKEN', '');
    vi.stubEnv('GITHUB_PERSONAL_ACCESS_TOKEN', '');

    // Act
    const config = buildConfig({});

    // Assert
    expect(config.githubToken).toBeNull();
  });
});
