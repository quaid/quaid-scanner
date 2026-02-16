/**
 * Bot filtering module for community metrics.
 *
 * Filters bot usernames and boilerplate content from comment analysis
 * to ensure only genuine human engagement is measured.
 */

export interface BotFilterOptions {
  additional?: string[];
  exclude?: string[];
}

export interface Comment {
  author: string;
  body: string;
}

const DEFAULT_KNOWN_BOTS = new Set([
  'codecov',
  'netlify',
  'vercel',
  'sonarcloud',
  'dependabot',
  'renovate',
  'greenkeeper',
  'snyk-bot',
  'imgbot',
  'allcontributors',
  'mergify',
  'stale',
]);

const BOT_CONTENT_PATTERNS = [
  /has been (?:automatically )?marked as stale/i,
  /thanks for your (?:submission|contribution)!/i,
  /thank you for your (?:submission|contribution)!/i,
  /coverage report/i,
  /deploy preview ready/i,
  /deployed? (?:to|at) /i,
];

export class BotFilter {
  private readonly knownBots: Set<string>;

  constructor(options?: BotFilterOptions) {
    this.knownBots = new Set(DEFAULT_KNOWN_BOTS);

    if (options?.exclude) {
      for (const name of options.exclude) {
        this.knownBots.delete(name.toLowerCase());
      }
    }

    if (options?.additional) {
      for (const name of options.additional) {
        this.knownBots.add(name.toLowerCase());
      }
    }
  }

  /** Check if a username belongs to a bot. */
  isBot(username: string): boolean {
    if (!username) return false;
    const lower = username.toLowerCase();

    // [bot] suffix pattern
    if (/\[bot\]$/.test(lower)) return true;

    // -bot suffix pattern (but not just any word ending in "bot")
    if (/^.+-bot$/.test(lower)) return true;

    // Known bot names
    return this.knownBots.has(lower);
  }

  /** Check if comment content matches boilerplate bot patterns. */
  isBotContent(content: string): boolean {
    if (!content) return false;
    return BOT_CONTENT_PATTERNS.some((pattern) => pattern.test(content));
  }

  /** Filter comments to remove bot authors and boilerplate content. */
  filterComments(comments: Comment[]): Comment[] {
    return comments.filter(
      (comment) => !this.isBot(comment.author) && !this.isBotContent(comment.body),
    );
  }
}
