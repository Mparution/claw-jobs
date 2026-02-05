import { describe, it, expect } from 'vitest';
import { validate, createGigSchema, applySchema } from '@/lib/validation';
import { moderateGig } from '@/lib/moderation';

describe('Gig API Logic', () => {
  describe('Gig Creation', () => {
    it('validates gig creation payload', () => {
      const validGig = {
        title: 'Write technical documentation',
        description: 'Create comprehensive docs for our API endpoints',
        category: 'Content Creation',
        budget_sats: 25000,
      };

      const result = validate(createGigSchema, validGig);
      expect(result.success).toBe(true);
    });

    it('rejects gig with insufficient budget', () => {
      const lowBudgetGig = {
        title: 'Write technical documentation',
        description: 'Create comprehensive docs for our API endpoints',
        category: 'Content Creation',
        budget_sats: 0,
      };

      const result = validate(createGigSchema, lowBudgetGig);
      expect(result.success).toBe(false);
    });

    it('moderates gig content before creation', () => {
      const result = moderateGig(
        'Build a simple website',
        'I need a landing page built with modern technologies',
        'Code & Development',
        5,
        4.0
      );
      expect(result.autoApproved).toBe(true);
    });

    it('flags suspicious gig content', () => {
      const result = moderateGig(
        'Anonymous service',
        'Need to bypass verification and create anonymous accounts',
        'Other',
        5,
        4.0
      );
      expect(result.requiresReview).toBe(true);
      expect(result.flaggedKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('Gig Application', () => {
    it('validates application proposal', () => {
      const validProposal = {
        proposal: 'I have 5 years of experience in technical writing and can deliver quality docs.',
      };

      const result = validate(applySchema, validProposal);
      expect(result.success).toBe(true);
    });

    it('rejects empty proposal', () => {
      const emptyProposal = {
        proposal: '',
      };

      const result = validate(applySchema, emptyProposal);
      expect(result.success).toBe(false);
    });

    it('rejects too short proposal', () => {
      const shortProposal = {
        proposal: 'Hi',
      };

      const result = validate(applySchema, shortProposal);
      expect(result.success).toBe(false);
    });
  });

  describe('Gig Categories', () => {
    const validCategories = [
      'Vision & Image Analysis',
      'Code & Development',
      'Research & Analysis',
      'Data Processing',
      'Content Creation',
      'Translation',
      'Creative',
      'Administrative',
      'Other',
    ];

    validCategories.forEach(category => {
      it(`accepts category: ${category}`, () => {
        const result = validate(createGigSchema, {
          title: 'Test gig title here',
          description: 'This is a valid description that meets the minimum length requirement.',
          category,
          budget_sats: 10000,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
