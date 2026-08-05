import { describe, expect, it } from 'vitest';
import { customerSignUpSchema, passwordSchema, signInSchema } from './auth';

describe('customerSignUpSchema', () => {
  const validPayload = {
    displayName: 'Juana Dela Cruz',
    email: 'juana@example.com',
    password: 'StrongPass1',
    acceptedTermsOfService: true as const,
    acceptedPrivacyPolicy: true as const,
    confirmedTruthfulReviews: true as const,
  };

  it('accepts a fully valid customer sign-up payload', () => {
    const result = customerSignUpSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects when Terms of Service is not accepted', () => {
    const result = customerSignUpSchema.safeParse({
      ...validPayload,
      acceptedTermsOfService: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a weak password', () => {
    const result = customerSignUpSchema.safeParse({ ...validPayload, password: 'weak' });
    expect(result.success).toBe(false);
  });

  it('lowercases and trims email', () => {
    const result = customerSignUpSchema.safeParse({
      ...validPayload,
      email: '  Juana@Example.com  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('juana@example.com');
    }
  });
});

describe('passwordSchema', () => {
  it('requires upper, lower, and a digit', () => {
    expect(passwordSchema.safeParse('alllowercase').success).toBe(false);
    expect(passwordSchema.safeParse('ALLUPPERCASE1').success).toBe(false);
    expect(passwordSchema.safeParse('NoDigitsHere').success).toBe(false);
    expect(passwordSchema.safeParse('GoodPass1').success).toBe(true);
  });
});

describe('signInSchema', () => {
  it('rejects an empty password', () => {
    const result = signInSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
  });
});
