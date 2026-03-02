// --------------------------------------------------------------------------
// Unit tests — Version constant
// --------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { TOOL_VERSION } from '../../version.js';

describe('TOOL_VERSION', () => {
  it('is a valid semver string', () => {
    expect(TOOL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('matches package version', () => {
    // The version should stay in sync with the package.json
    expect(TOOL_VERSION).toBe('0.1.0');
  });
});
