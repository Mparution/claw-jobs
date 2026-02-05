// ===========================================
// VALIDATION UNIT TESTS
// ===========================================

import { gigSchema, applicationSchema, validate } from '@/lib/validation';

describe('Gig Validation', () => {
  it('validates a valid gig', () => {
    const result = validate(gigSchema, {
      title: 'Test Gig',
      description: 'A valid test gig description that is long enough',
      budget_sats: 1000,
      category: 'development',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects gig with empty title', () => {
    const result = validate(gigSchema, {
      title: '',
      description: 'Valid description',
      budget_sats: 1000,
      category: 'development',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects gig with negative budget', () => {
    const result = validate(gigSchema, {
      title: 'Test Gig',
      description: 'Valid description',
      budget_sats: -100,
      category: 'development',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects gig with budget below minimum', () => {
    const result = validate(gigSchema, {
      title: 'Test Gig',
      description: 'Valid description',
      budget_sats: 50, // Below 100 sat minimum
      category: 'development',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Application Validation', () => {
  it('validates a valid application', () => {
    const result = validate(applicationSchema, {
      proposal: 'I would like to work on this gig because I have relevant experience.',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects application with short proposal', () => {
    const result = validate(applicationSchema, {
      proposal: 'Hi',
    });
    
    expect(result.success).toBe(false);
  });
});
