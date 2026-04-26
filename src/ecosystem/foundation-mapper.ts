import { DOMAIN_TO_FOUNDATIONS, DOMAIN_TO_STANDARDS } from './domain-taxonomy.js';
import type { EcosystemProfile } from './types.js';

export class FoundationMapper {
  enrich(profile: EcosystemProfile): EcosystemProfile {
    const ecosystems = DOMAIN_TO_FOUNDATIONS[profile.domain] ?? DOMAIN_TO_FOUNDATIONS['general'] ?? [];
    const standards = DOMAIN_TO_STANDARDS[profile.domain] ?? [];

    return {
      ...profile,
      ecosystems: [...new Set([...profile.ecosystems, ...ecosystems])],
      standards: [...new Set([...profile.standards, ...standards])],
    };
  }
}
