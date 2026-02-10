/**
 * Scanner plugin registry for quaid-scanner.
 *
 * Manages registration, retrieval, and lifecycle of scanner plugins.
 * Scanners are organized by pillar and identified by unique names.
 */

import type { Scanner, Pillar } from '../types/index.js';

/**
 * Registry that manages scanner plugin instances.
 *
 * Provides methods to register, retrieve, and query scanners
 * by name or by pillar. Validates scanner fields on registration
 * and prevents duplicate names.
 */
export class ScannerRegistry {
  private readonly scanners: Map<string, Scanner> = new Map();

  /**
   * Register a scanner plugin.
   *
   * @param scanner - The scanner to register
   * @throws Error if scanner is missing required fields
   * @throws Error if a scanner with the same name is already registered
   */
  register(scanner: Scanner): void {
    this.validate(scanner);

    if (this.scanners.has(scanner.name)) {
      throw new Error(
        `Scanner already registered: "${scanner.name}". Each scanner must have a unique name.`
      );
    }

    this.scanners.set(scanner.name, scanner);
  }

  /**
   * Retrieve a scanner by its unique name.
   *
   * @param name - The scanner name to look up
   * @returns The scanner if found, or undefined
   */
  get(name: string): Scanner | undefined {
    return this.scanners.get(name);
  }

  /**
   * Retrieve all scanners belonging to a specific pillar.
   *
   * @param pillar - The pillar to filter by
   * @returns Array of scanners for the given pillar (may be empty)
   */
  getByPillar(pillar: Pillar): Scanner[] {
    const result: Scanner[] = [];
    for (const scanner of this.scanners.values()) {
      if (scanner.pillar === pillar) {
        result.push(scanner);
      }
    }
    return result;
  }

  /**
   * Retrieve all registered scanners.
   *
   * @returns Array of all scanners in registration order
   */
  getAll(): Scanner[] {
    return Array.from(this.scanners.values());
  }

  /**
   * Remove all registered scanners. Primarily used for testing.
   */
  clear(): void {
    this.scanners.clear();
  }

  /**
   * Validate that a scanner has all required fields.
   *
   * @param scanner - The scanner to validate
   * @throws Error if any required field is missing or invalid
   */
  private validate(scanner: Scanner): void {
    if (!scanner.name || typeof scanner.name !== 'string') {
      throw new Error(
        'Scanner validation failed: "name" is required and must be a non-empty string.'
      );
    }

    if (!scanner.displayName || typeof scanner.displayName !== 'string') {
      throw new Error(
        'Scanner validation failed: "displayName" is required and must be a non-empty string.'
      );
    }

    if (!scanner.pillar) {
      throw new Error(
        'Scanner validation failed: "pillar" is required.'
      );
    }

    if (!scanner.run || typeof scanner.run !== 'function') {
      throw new Error(
        'Scanner validation failed: "run" is required and must be a function.'
      );
    }
  }
}
