/**
 * Tests for Bot Filtering module.
 *
 * Validates username and content pattern filtering for bot detection
 * in community metrics.
 */

import { describe, it, expect } from 'vitest';
import {
  BotFilter,
  type BotFilterOptions,
} from '../../../src/scanner/community/bot-filter.js';

describe('BotFilter', () => {
  describe('default patterns', () => {
    const filter = new BotFilter();

    it('filters [bot] suffix usernames', () => {
      expect(filter.isBot('dependabot[bot]')).toBe(true);
      expect(filter.isBot('renovate[bot]')).toBe(true);
      expect(filter.isBot('github-actions[bot]')).toBe(true);
    });

    it('filters -bot suffix usernames', () => {
      expect(filter.isBot('codecov-bot')).toBe(true);
      expect(filter.isBot('stale-bot')).toBe(true);
    });

    it('filters known bot names', () => {
      expect(filter.isBot('codecov')).toBe(true);
      expect(filter.isBot('netlify')).toBe(true);
      expect(filter.isBot('vercel')).toBe(true);
      expect(filter.isBot('sonarcloud')).toBe(true);
      expect(filter.isBot('dependabot')).toBe(true);
      expect(filter.isBot('renovate')).toBe(true);
    });

    it('does not filter human usernames', () => {
      expect(filter.isBot('johndoe')).toBe(false);
      expect(filter.isBot('developer123')).toBe(false);
      expect(filter.isBot('robot-fan')).toBe(false);
      expect(filter.isBot('bottleneck')).toBe(false);
    });

    it('is case-insensitive for known bots', () => {
      expect(filter.isBot('Dependabot')).toBe(true);
      expect(filter.isBot('CODECOV')).toBe(true);
      expect(filter.isBot('Renovate[bot]')).toBe(true);
    });
  });

  describe('boilerplate content filtering', () => {
    const filter = new BotFilter();

    it('detects stale bot messages', () => {
      expect(filter.isBotContent('This issue has been marked as stale')).toBe(true);
      expect(filter.isBotContent('This issue has been automatically marked as stale because it has not had recent activity')).toBe(true);
    });

    it('detects automated submission responses', () => {
      expect(filter.isBotContent('Thanks for your submission!')).toBe(true);
      expect(filter.isBotContent('Thank you for your contribution!')).toBe(true);
    });

    it('detects coverage report comments', () => {
      expect(filter.isBotContent('Coverage Report\n\nLines: 85%\nBranches: 72%')).toBe(true);
    });

    it('detects deployment status comments', () => {
      expect(filter.isBotContent('Deploy preview ready at https://preview.example.com')).toBe(true);
    });

    it('does not flag genuine human comments', () => {
      expect(filter.isBotContent('I think this approach is better because...')).toBe(false);
      expect(filter.isBotContent('Can we add a test for this edge case?')).toBe(false);
      expect(filter.isBotContent('LGTM, thanks for the fix!')).toBe(false);
    });
  });

  describe('custom bot configuration', () => {
    it('adds additional bot usernames', () => {
      const opts: BotFilterOptions = { additional: ['my-custom-bot', 'internal-ci'] };
      const filter = new BotFilter(opts);
      expect(filter.isBot('my-custom-bot')).toBe(true);
      expect(filter.isBot('internal-ci')).toBe(true);
      // Default bots still work
      expect(filter.isBot('dependabot')).toBe(true);
    });

    it('excludes specified bots from filtering', () => {
      const opts: BotFilterOptions = { exclude: ['codecov'] };
      const filter = new BotFilter(opts);
      expect(filter.isBot('codecov')).toBe(false);
      // Other bots still filtered
      expect(filter.isBot('dependabot')).toBe(true);
    });

    it('handles combined additional and exclude', () => {
      const opts: BotFilterOptions = {
        additional: ['team-bot'],
        exclude: ['renovate'],
      };
      const filter = new BotFilter(opts);
      expect(filter.isBot('team-bot')).toBe(true);
      expect(filter.isBot('renovate')).toBe(false);
      expect(filter.isBot('dependabot')).toBe(true);
    });
  });

  describe('filterComments', () => {
    const filter = new BotFilter();

    it('removes comments from bot authors', () => {
      const comments = [
        { author: 'developer', body: 'Looks good!' },
        { author: 'dependabot[bot]', body: 'Bumped lodash to 4.17.21' },
        { author: 'reviewer', body: 'Please add tests' },
      ];
      const filtered = filter.filterComments(comments);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.author)).toEqual(['developer', 'reviewer']);
    });

    it('removes comments with bot content', () => {
      const comments = [
        { author: 'codecov-bot', body: 'Coverage Report\nLines: 85%' },
        { author: 'human', body: 'This issue has been marked as stale' },
        { author: 'developer', body: 'I will look into this' },
      ];
      const filtered = filter.filterComments(comments);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].author).toBe('developer');
    });

    it('returns empty array when all comments are bots', () => {
      const comments = [
        { author: 'dependabot[bot]', body: 'Bumped deps' },
        { author: 'codecov', body: 'Coverage Report' },
      ];
      const filtered = filter.filterComments(comments);
      expect(filtered).toHaveLength(0);
    });

    it('returns all comments when none are bots', () => {
      const comments = [
        { author: 'alice', body: 'Great work!' },
        { author: 'bob', body: 'I agree' },
      ];
      const filtered = filter.filterComments(comments);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    const filter = new BotFilter();

    it('handles empty username', () => {
      expect(filter.isBot('')).toBe(false);
    });

    it('handles empty content', () => {
      expect(filter.isBotContent('')).toBe(false);
    });

    it('handles empty comments array', () => {
      expect(filter.filterComments([])).toEqual([]);
    });
  });
});
