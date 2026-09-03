import { isPasswordValid, isValidEmail, isValidPhMobile, normalizePhMobile } from './formFields';

describe('normalizePhMobile', () => {
  it('accepts dashes, dots, spaces, and parentheses', () => {
    expect(normalizePhMobile('(0912) 345-6789')).toBe('09123456789');
    expect(normalizePhMobile('0912.345.6789')).toBe('09123456789');
    expect(normalizePhMobile('0912 345 6789')).toBe('09123456789');
  });

  it('converts +63 and 63 prefixes to 09', () => {
    expect(normalizePhMobile('+63 912 345 6789')).toBe('09123456789');
    expect(normalizePhMobile('639123456789')).toBe('09123456789');
  });

  it('adds a leading 0 to 10-digit numbers starting with 9', () => {
    expect(normalizePhMobile('9123456789')).toBe('09123456789');
  });
});

describe('isValidPhMobile', () => {
  it('allows empty optional numbers', () => {
    expect(isValidPhMobile('')).toBe(true);
    expect(isValidPhMobile('', { required: true })).toBe(false);
  });

  it('accepts formatted valid numbers', () => {
    expect(isValidPhMobile('+63 912-345-6789')).toBe(true);
  });
});

describe('email and password', () => {
  it('validates emails', () => {
    expect(isValidEmail('user@parsu.edu.ph')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('requires all password rules', () => {
    expect(isPasswordValid('Short1!')).toBe(false);
    expect(isPasswordValid('Password1!')).toBe(true);
  });
});
