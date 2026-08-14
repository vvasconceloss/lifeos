import { describe, expect, it } from 'vitest';
import {
  passwordSchema,
  registerBodySchema,
  isCommonPassword,
  passwordByteLength,
  PASSWORD_ERRORS,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
} from '@lifeos/shared';

const VALID_PASSWORDS = [
  'CorrectHorse1!',
  'Str0ng!Pass',
  'N0t@common#Pass',
  'aA1!bcdefgh',
];

describe('passwordSchema', () => {
  describe('accepts valid passwords', () => {
    it.each(VALID_PASSWORDS)('accepts %s', (password) => {
      expect(passwordSchema.safeParse(password).success).toBe(true);
    });
  });

  describe('rejects each violation individually', () => {
    it.each<[string, string]>([
      ['short', PASSWORD_ERRORS.MIN_LENGTH],
      ['12345678', PASSWORD_ERRORS.LOWERCASE],
      ['abcdefgh', PASSWORD_ERRORS.UPPERCASE],
      ['Abcdefgh', PASSWORD_ERRORS.NUMBER],
      ['Abcdef12', PASSWORD_ERRORS.SPECIAL],
      ['password1', PASSWORD_ERRORS.COMMON],
      [`A1!${'a'.repeat(72)}`, PASSWORD_ERRORS.MAX_BYTES],
    ])('rejects %s', (password, message) => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
      expect(result.success ? '' : result.error.issues.map((i) => i.message)).toContain(message);
    });
  });

  describe('passwordNotEqualToEmail via registerBodySchema', () => {
    it('rejects a password equal to the email (case-insensitive)', () => {
      const result = registerBodySchema.safeParse({
        email: 'User@Example.com',
        password: 'user@example.com',
        name: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.success ? '' : result.error.issues.map((i) => i.message)).toContain(
        PASSWORD_ERRORS.EMAIL_EQUAL,
      );
    });

    it('accepts a password different from the email', () => {
      const result = registerBodySchema.safeParse({
        email: 'user@example.com',
        password: 'Str0ng!Pass',
        name: 'Test',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('isCommonPassword', () => {
  it.each(['password', '123456', 'qwerty', 'letmein', 'password1'])(
    'flags %s as common',
    (password) => {
      expect(isCommonPassword(password)).toBe(true);
    },
  );

  it('is case-insensitive', () => {
    expect(isCommonPassword('PASSWORD')).toBe(true);
    expect(isCommonPassword('LetMeIn')).toBe(true);
  });

  it('does not flag a unique password', () => {
    expect(isCommonPassword('CorrectHorseBatteryStaple')).toBe(false);
  });
});

describe('passwordByteLength', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(passwordByteLength('á'.repeat(36))).toBe(72);
    expect(passwordByteLength('a'.repeat(72))).toBe(72);
    expect(passwordByteLength('a'.repeat(73))).toBe(73);
  });
});

describe('policy constants', () => {
  it('exposes the documented limits', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_BYTES).toBe(72);
  });
});
