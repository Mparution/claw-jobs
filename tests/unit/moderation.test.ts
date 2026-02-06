import { describe, it, expect } from 'vitest';
import {
  checkProhibitedContent,
  checkReviewTriggers,
  isValidCategory,
  moderateGig,
  getUserTrustLevel,
  canReleaseEscrow,
  sanitizeInput,
} from '@/lib/moderation';
import { MODERATION_STATUS } from '@/lib/constants';

describe('Moderation Utilities', () => {
  describe('checkProhibitedContent', () => {
    it('detects prohibited keywords', () => {
      expect(checkProhibitedContent('I need help with drugs')).toContain('drugs');
      expect(checkProhibitedContent('Looking for hacking services')).toContain('hacking');
      expect(checkProhibitedContent('Need malware development')).toContain('malware');
    });

    it('returns empty array for clean content', () => {
      expect(checkProhibitedContent('I need help writing a blog post')).toEqual([]);
      expect(checkProhibitedContent('Looking for research assistance')).toEqual([]);
    });

    it('is case insensitive', () => {
      expect(checkProhibitedContent('WEAPONS for sale')).toContain('weapons');
      expect(checkProhibitedContent('WEaPoNs')).toContain('weapons');
    });

    it('detects multiple prohibited keywords', () => {
      const result = checkProhibitedContent('Need drugs and weapons');
      expect(result).toContain('drugs');
      expect(result).toContain('weapons');
      expect(result.length).toBe(2);
    });
  });

  describe('checkReviewTriggers', () => {
    it('detects review trigger keywords', () => {
      expect(checkReviewTriggers('Need anonymous access')).toContain('anonymous');
      expect(checkReviewTriggers('Help bypass security')).toContain('bypass');
      expect(checkReviewTriggers('Scrape data from website')).toContain('scrape');
    });

    it('returns empty array for clean content', () => {
      expect(checkReviewTriggers('Help me write documentation')).toEqual([]);
    });

    it('is case insensitive', () => {
      expect(checkReviewTriggers('ANONYMOUS login')).toContain('anonymous');
    });
  });

  describe('isValidCategory', () => {
    it('accepts valid categories', () => {
      expect(isValidCategory('Code & Development')).toBe(true);
      expect(isValidCategory('Research & Analysis')).toBe(true);
      expect(isValidCategory('Content Creation')).toBe(true);
      expect(isValidCategory('Vision & Image Analysis')).toBe(true);
      expect(isValidCategory('Data Processing')).toBe(true);
      expect(isValidCategory('Translation')).toBe(true);
      expect(isValidCategory('Creative')).toBe(true);
      expect(isValidCategory('Administrative')).toBe(true);
      expect(isValidCategory('Other')).toBe(true);
    });

    it('rejects invalid categories', () => {
      expect(isValidCategory('Invalid Category')).toBe(false);
      expect(isValidCategory('Hacking')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });

  describe('moderateGig', () => {
    it('rejects gigs with prohibited content', () => {
      const result = moderateGig(
        'Need help with hacking',
        'Looking for someone to hack into a website',
        'Code & Development',
        0,
        0
      );
      expect(result.status).toBe(MODERATION_STATUS.REJECTED);
      expect(result.prohibitedKeywords).toContain('hacking');
      expect(result.autoApproved).toBe(false);
    });

    it('rejects gigs with invalid category', () => {
      const result = moderateGig(
        'Clean gig title',
        'This is a perfectly valid description',
        'Invalid Category',
        10,
        5
      );
      expect(result.status).toBe(MODERATION_STATUS.REJECTED);
      expect(result.reason).toContain('Invalid category');
    });

    it('flags gigs with review triggers for pending review', () => {
      const result = moderateGig(
        'Anonymous data collection',
        'Need to collect data anonymously from various sources',
        'Data Processing',
        10,
        5
      );
      expect(result.status).toBe(MODERATION_STATUS.PENDING);
      expect(result.flaggedKeywords).toContain('anonymous');
      expect(result.requiresReview).toBe(true);
    });

    it('requires review for new users', () => {
      const result = moderateGig(
        'Write a blog post',
        'I need help writing a 1000 word blog post about technology',
        'Content Creation',
        0,
        0
      );
      expect(result.status).toBe(MODERATION_STATUS.PENDING);
      expect(result.requiresReview).toBe(true);
      expect(result.reason).toContain('New user');
    });

    it('auto-approves gigs from established users with clean content', () => {
      const result = moderateGig(
        'Write documentation',
        'I need comprehensive documentation for my software project',
        'Content Creation',
        10,
        5
      );
      expect(result.status).toBe(MODERATION_STATUS.APPROVED);
      expect(result.autoApproved).toBe(true);
      expect(result.requiresReview).toBe(false);
    });
  });

  describe('getUserTrustLevel', () => {
    it('identifies new users correctly', () => {
      const result = getUserTrustLevel(0, 0);
      expect(result.isEstablished).toBe(false);
      expect(result.requiresGigReview).toBe(true);
      expect(result.escrowDelayHours).toBe(48);
    });

    it('identifies established users correctly', () => {
      const result = getUserTrustLevel(10, 4.5);
      expect(result.isEstablished).toBe(true);
      expect(result.requiresGigReview).toBe(false);
      expect(result.escrowDelayHours).toBe(24);
    });

    it('requires gig review for users below threshold', () => {
      const result = getUserTrustLevel(2, 4.0);
      expect(result.requiresGigReview).toBe(true);
    });

    it('does not require gig review for users at threshold', () => {
      const result = getUserTrustLevel(3, 4.0);
      expect(result.requiresGigReview).toBe(false);
    });
  });

  describe('canReleaseEscrow', () => {
    it('returns false if escrow delay not met', () => {
      const approvedAt = new Date();
      expect(canReleaseEscrow(approvedAt, 24)).toBe(false);
    });

    it('returns true if escrow delay met', () => {
      const approvedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(canReleaseEscrow(approvedAt, 24)).toBe(true);
    });

    it('handles edge case at exact delay time', () => {
      const delay = 24;
      const approvedAt = new Date(Date.now() - delay * 60 * 60 * 1000);
      expect(canReleaseEscrow(approvedAt, delay)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('escapes HTML special characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('escapes single quotes', () => {
      expect(sanitizeInput("It's a test")).toBe("It&#x27;s a test");
    });

    it('handles clean input', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });

    it('handles empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });
});
