import * as fs from 'node:fs';
import * as path from 'node:path';
import { DOMAIN_TO_COMMUNITIES } from './domain-taxonomy.js';
import type { EcosystemContext, EcosystemProfile, UserCommunity, CommunityType } from './types.js';

const COMMUNITY_URL_PATTERNS: Array<{ pattern: RegExp; type: CommunityType; name: string }> = [
  { pattern: /discord\.gg|discord\.com\/invite/i, type: 'discord', name: 'Discord Server' },
  { pattern: /slack\.com|join\.slack/i, type: 'slack', name: 'Slack Workspace' },
  { pattern: /groups\.google\.com|googlegroups/i, type: 'mailing-list', name: 'Google Group' },
  { pattern: /reddit\.com\/r\//i, type: 'subreddit', name: 'Subreddit' },
  { pattern: /stackoverflow\.com\/questions\/tagged/i, type: 'stack-overflow', name: 'Stack Overflow Tag' },
  { pattern: /github\.com\/.*\/discussions/i, type: 'github-discussions', name: 'GitHub Discussions' },
  { pattern: /forum\.|community\./i, type: 'forum', name: 'Community Forum' },
];

function detectExistingCommunityLinks(repoPath: string): UserCommunity[] {
  const filesToCheck = ['README.md', 'SUPPORT.md', 'CONTRIBUTING.md', '.github/SUPPORT.md'];
  const found: UserCommunity[] = [];

  for (const fileName of filesToCheck) {
    const p = path.join(repoPath, fileName);
    if (!fs.existsSync(p)) continue;
    try {
      const content = fs.readFileSync(p, 'utf-8');
      const urlMatches = content.match(/https?:\/\/[^\s\)\]>"]+/g) ?? [];
      for (const url of urlMatches) {
        for (const { pattern, type, name } of COMMUNITY_URL_PATTERNS) {
          if (pattern.test(url) && !found.some((c) => c.url === url)) {
            found.push({ name, url, type, relevance: 'high' });
            break;
          }
        }
      }
    } catch { continue; }
  }
  return found;
}

export class CommunityMapper {
  map(profile: EcosystemProfile, context: EcosystemContext): UserCommunity[] {
    const staticCommunities = (DOMAIN_TO_COMMUNITIES[profile.domain] ?? DOMAIN_TO_COMMUNITIES['general'] ?? [])
      .map((c): UserCommunity => ({
        name: c.name,
        url: c.url,
        type: c.type as CommunityType,
        relevance: c.relevance as UserCommunity['relevance'],
      }));

    const existing = detectExistingCommunityLinks(context.repoPath);

    const allUrls = new Set(existing.map((c) => c.url));
    const filtered = staticCommunities.filter((c) => !allUrls.has(c.url));

    return [...existing, ...filtered];
  }
}
