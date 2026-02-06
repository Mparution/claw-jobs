import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createGigSchema,
  applySchema,
  feedbackSchema,
  deliverableSchema,
  validate,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('validates correct registration data', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'SecurePass1',
        name: 'Test User',
        type: 'human',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = validate(registerSchema, {
        email: 'not-an-email',
        password: 'SecurePass1',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('rejects weak password - too short', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'Aa1',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('8 characters');
    });

    it('rejects password without uppercase', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'securepass1',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('rejects password without lowercase', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'SECUREPASS1',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('rejects password without number', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'SecurePass',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('number');
    });

    it('rejects too short name', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'SecurePass1',
        name: 'A',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('2 characters');
    });

    it('defaults type to human', () => {
      const result = validate(registerSchema, {
        email: 'user@example.com',
        password: 'SecurePass1',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('human');
      }
    });

    it('accepts agent type', () => {
      const result = validate(registerSchema, {
        email: 'agent@example.com',
        password: 'SecurePass1',
        name: 'AI Agent',
        type: 'agent',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('agent');
      }
    });
  });

  describe('loginSchema', () => {
    it('validates email/password login', () => {
      const result = validate(loginSchema, {
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('validates api_key login', () => {
      const result = validate(loginSchema, {
        api_key: 'clawjobs_abc123xyz',
      });
      expect(result.success).toBe(true);
    });

    it('rejects login without credentials', () => {
      const result = validate(loginSchema, {});
      expect(result.success).toBe(false);
    });

    it('rejects email without password', () => {
      const result = validate(loginSchema, {
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createGigSchema', () => {
    it('validates correct gig data', () => {
      const result = validate(createGigSchema, {
        title: 'Summarize quarterly report',
        description: 'Please read the attached Q4 report and create a summary.',
        category: 'Research & Analysis',
        budget_sats: 10000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects too short title', () => {
      const result = validate(createGigSchema, {
        title: 'Hi',
        description: 'Please read the attached Q4 report and create a summary.',
        category: 'Research & Analysis',
        budget_sats: 10000,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('5 characters');
    });

    it('rejects too short description', () => {
      const result = validate(createGigSchema, {
        title: 'Summarize quarterly report',
        description: 'Too short',
        category: 'Research & Analysis',
        budget_sats: 10000,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('20 characters');
    });

    it('rejects negative budget', () => {
      const result = validate(createGigSchema, {
        title: 'Summarize quarterly report',
        description: 'Please read the attached Q4 report and create a summary.',
        category: 'Research & Analysis',
        budget_sats: -100,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('rejects zero budget', () => {
      const result = validate(createGigSchema, {
        title: 'Summarize quarterly report',
        description: 'Please read the attached Q4 report and create a summary.',
        category: 'Research & Analysis',
        budget_sats: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty category', () => {
      const result = validate(createGigSchema, {
        title: 'Summarize quarterly report',
        description: 'Please read the attached Q4 report and create a summary.',
        category: '',
        budget_sats: 10000,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('applySchema', () => {
    it('validates correct proposal', () => {
      const result = validate(applySchema, {
        proposal: 'I have extensive experience in this area.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects too short proposal', () => {
      const result = validate(applySchema, {
        proposal: 'Hi',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('10 characters');
    });
  });

  describe('feedbackSchema', () => {
    it('validates complete feedback', () => {
      const result = validate(feedbackSchema, {
        type: 'bug',
        message: 'Found a bug on the gig detail page.',
        email: 'user@example.com',
        page: '/gigs/123',
      });
      expect(result.success).toBe(true);
    });

    it('validates minimal feedback', () => {
      const result = validate(feedbackSchema, {
        type: 'feature',
        message: 'Please add dark mode support.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = validate(feedbackSchema, {
        type: 'invalid',
        message: 'This should fail validation.',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('deliverableSchema', () => {
    it('validates correct deliverable', () => {
      const result = validate(deliverableSchema, {
        content: 'Here is the completed work.',
        notes: 'Delivered ahead of schedule.',
      });
      expect(result.success).toBe(true);
    });

    it('validates deliverable without notes', () => {
      const result = validate(deliverableSchema, {
        content: 'Here is the completed work.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty content', () => {
      const result = validate(deliverableSchema, {
        content: '',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
