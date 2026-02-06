// ===========================================
// VALIDATION UNIT TESTS
// ===========================================

import { 
  createGigSchema, 
  applySchema, 
  registerSchema,
  loginSchema,
  feedbackSchema,
  deliverableSchema,
  validate 
} from '@/lib/validation';

describe('Gig Validation (createGigSchema)', () => {
  it('validates a valid gig', () => {
    const result = validate(createGigSchema, {
      title: 'Test Gig Title',
      description: 'A valid test gig description that is long enough to pass validation',
      budget_sats: 1000,
      category: 'development',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects gig with short title', () => {
    const result = validate(createGigSchema, {
      title: 'Hi',
      description: 'A valid test gig description that is long enough',
      budget_sats: 1000,
      category: 'development',
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Title');
    }
  });

  it('rejects gig with short description', () => {
    const result = validate(createGigSchema, {
      title: 'Valid Test Gig',
      description: 'Too short',
      budget_sats: 1000,
      category: 'development',
    });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Description');
    }
  });

  it('rejects gig with negative budget', () => {
    const result = validate(createGigSchema, {
      title: 'Valid Test Gig Title',
      description: 'Valid description that is definitely long enough',
      budget_sats: -100,
      category: 'development',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects gig with missing category', () => {
    const result = validate(createGigSchema, {
      title: 'Valid Test Gig Title',
      description: 'Valid description that is definitely long enough',
      budget_sats: 1000,
      category: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = validate(createGigSchema, {
      title: 'Valid Test Gig Title',
      description: 'Valid description that is definitely long enough',
      budget_sats: 1000,
      category: 'development',
      deadline: '2025-12-31T23:59:59.000Z',
      required_capabilities: ['python', 'research'],
    });
    
    expect(result.success).toBe(true);
  });
});

describe('Application Validation (applySchema)', () => {
  it('validates a valid application', () => {
    const result = validate(applySchema, {
      proposal: 'I would like to work on this gig because I have relevant experience.',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects application with short proposal', () => {
    const result = validate(applySchema, {
      proposal: 'Hi',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects application with empty proposal', () => {
    const result = validate(applySchema, {
      proposal: '',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Registration Validation (registerSchema)', () => {
  it('validates a valid registration', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects registration with invalid email', () => {
    const result = validate(registerSchema, {
      email: 'not-an-email',
      password: 'Password123',
      name: 'Test User',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects registration with short password', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'Pass1',
      name: 'Test User',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'PASSWORD123',
      name: 'Test User',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'Passworddd',
      name: 'Test User',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects registration with short name', () => {
    const result = validate(registerSchema, {
      email: 'test@example.com',
      password: 'Password123',
      name: 'A',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Login Validation (loginSchema)', () => {
  it('validates email/password login', () => {
    const result = validate(loginSchema, {
      email: 'test@example.com',
      password: 'anypassword',
    });
    
    expect(result.success).toBe(true);
  });

  it('validates api_key login', () => {
    const result = validate(loginSchema, {
      api_key: 'clawjobs_abc123xyz',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects login with neither method', () => {
    const result = validate(loginSchema, {});
    
    expect(result.success).toBe(false);
  });
});

describe('Feedback Validation (feedbackSchema)', () => {
  it('validates valid feedback', () => {
    const result = validate(feedbackSchema, {
      type: 'bug',
      message: 'Found a bug in the application form on mobile devices.',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects feedback with invalid type', () => {
    const result = validate(feedbackSchema, {
      type: 'invalid-type',
      message: 'This is a valid message length for feedback.',
    });
    
    expect(result.success).toBe(false);
  });

  it('rejects feedback with short message', () => {
    const result = validate(feedbackSchema, {
      type: 'feature',
      message: 'Short',
    });
    
    expect(result.success).toBe(false);
  });
});

describe('Deliverable Validation (deliverableSchema)', () => {
  it('validates valid deliverable', () => {
    const result = validate(deliverableSchema, {
      content: 'Here is my completed work as requested.',
    });
    
    expect(result.success).toBe(true);
  });

  it('rejects deliverable with empty content', () => {
    const result = validate(deliverableSchema, {
      content: '',
    });
    
    expect(result.success).toBe(false);
  });

  it('accepts deliverable with optional notes', () => {
    const result = validate(deliverableSchema, {
      content: 'Here is my completed work.',
      notes: 'Let me know if you need any revisions.',
    });
    
    expect(result.success).toBe(true);
  });
});
