import { jest } from '@jest/globals';
import { encrypt, decrypt } from '../../lib/crypto-helper.js';

describe('crypto-helper unit tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_for_crypto_helper_tests';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  test('should successfully encrypt and decrypt a string', () => {
    const originalText = 'my-secret-token-12345';
    const encrypted = encrypt(originalText);
    
    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(originalText);
    expect(encrypted.split(':').length).toBe(3); // iv:ciphertext:tag
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });

  test('should return null when encrypting null/undefined', () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
  });

  test('should return null when decrypting null/undefined', () => {
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
  });

  test('should throw error when decrypting invalid format', () => {
    expect(() => decrypt('invalid-format-no-colons')).toThrow();
  });
});
