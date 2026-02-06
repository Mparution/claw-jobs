// ===========================================
// CRYPTO UTILITIES TESTS
// ===========================================

import {
  getSecureRandomBytes,
  getSecureRandomString,
  generateSecureApiKey,
  getSecureRandomHex,
  getSecureShortCode,
} from '@/lib/crypto-utils';

describe('getSecureRandomBytes', () => {
  it('returns Uint8Array of correct length', () => {
    const bytes = getSecureRandomBytes(16);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(16);
  });

  it('generates different values each time', () => {
    const bytes1 = getSecureRandomBytes(32);
    const bytes2 = getSecureRandomBytes(32);
    // Very unlikely to be equal
    expect(Array.from(bytes1)).not.toEqual(Array.from(bytes2));
  });

  it('handles various lengths', () => {
    expect(getSecureRandomBytes(1).length).toBe(1);
    expect(getSecureRandomBytes(64).length).toBe(64);
    expect(getSecureRandomBytes(256).length).toBe(256);
  });
});

describe('getSecureRandomString', () => {
  it('returns string of correct length', () => {
    const str = getSecureRandomString(20);
    expect(typeof str).toBe('string');
    expect(str.length).toBe(20);
  });

  it('uses default charset (alphanumeric)', () => {
    const str = getSecureRandomString(100);
    expect(str).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('respects custom charset', () => {
    const str = getSecureRandomString(20, 'abc123');
    expect(str).toMatch(/^[abc123]+$/);
    expect(str.length).toBe(20);
  });

  it('generates different values each time', () => {
    const str1 = getSecureRandomString(32);
    const str2 = getSecureRandomString(32);
    expect(str1).not.toBe(str2);
  });
});

describe('generateSecureApiKey', () => {
  it('returns key with default prefix', () => {
    const key = generateSecureApiKey();
    expect(key.startsWith('clawjobs_')).toBe(true);
    expect(key.length).toBe(9 + 48); // prefix + 48 random chars
  });

  it('respects custom prefix', () => {
    const key = generateSecureApiKey('test_');
    expect(key.startsWith('test_')).toBe(true);
    expect(key.length).toBe(5 + 48);
  });

  it('generates unique keys', () => {
    const key1 = generateSecureApiKey();
    const key2 = generateSecureApiKey();
    expect(key1).not.toBe(key2);
  });

  it('contains only alphanumeric characters after prefix', () => {
    const key = generateSecureApiKey();
    const afterPrefix = key.slice(9);
    expect(afterPrefix).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe('getSecureRandomHex', () => {
  it('returns hex string of correct length', () => {
    const hex = getSecureRandomHex(32);
    expect(hex.length).toBe(32);
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });

  it('handles odd lengths', () => {
    const hex = getSecureRandomHex(17);
    expect(hex.length).toBe(17);
  });

  it('generates different values each time', () => {
    const hex1 = getSecureRandomHex(32);
    const hex2 = getSecureRandomHex(32);
    expect(hex1).not.toBe(hex2);
  });
});

describe('getSecureShortCode', () => {
  it('returns code of default length (6)', () => {
    const code = getSecureShortCode();
    expect(code.length).toBe(6);
  });

  it('returns lowercase alphanumeric', () => {
    const code = getSecureShortCode(20);
    expect(code).toMatch(/^[a-z0-9]+$/);
  });

  it('respects custom length', () => {
    expect(getSecureShortCode(8).length).toBe(8);
    expect(getSecureShortCode(12).length).toBe(12);
  });

  it('generates unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(getSecureShortCode(10));
    }
    // All 100 should be unique
    expect(codes.size).toBe(100);
  });
});
