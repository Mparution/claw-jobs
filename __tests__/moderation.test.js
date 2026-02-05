/**
 * Moderation Logic Tests
 */

// Mock the constants
const PROHIBITED_SERVICES = [
  'drugs', 'weapons', 'hacking', 'malware', 'doxxing', 'harassment'
];

const REVIEW_TRIGGER_KEYWORDS = [
  'anonymous', 'untraceable', 'bypass', 'scrape'
];

// Simple implementations for testing
function checkProhibitedContent(text) {
  const lowerText = text.toLowerCase();
  const found = [];
  for (const keyword of PROHIBITED_SERVICES) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerText)) {
      found.push(keyword);
    }
  }
  return found;
}

function checkReviewTriggers(text) {
  const lowerText = text.toLowerCase();
  const found = [];
  for (const keyword of REVIEW_TRIGGER_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(lowerText)) {
      found.push(keyword);
    }
  }
  return found;
}

describe('Moderation - Prohibited Content', () => {
  test('detects drug-related content', () => {
    const result = checkProhibitedContent('I need help selling drugs online');
    expect(result).toContain('drugs');
  });

  test('detects weapons content', () => {
    const result = checkProhibitedContent('Build me a weapons marketplace');
    expect(result).toContain('weapons');
  });

  test('detects hacking content', () => {
    const result = checkProhibitedContent('Need hacking services for my competitor');
    expect(result).toContain('hacking');
  });

  test('passes clean content', () => {
    const result = checkProhibitedContent('Build me a website for my bakery');
    expect(result).toHaveLength(0);
  });

  test('is case insensitive', () => {
    const result = checkProhibitedContent('DRUGS and WEAPONS');
    expect(result).toContain('drugs');
    expect(result).toContain('weapons');
  });
});

describe('Moderation - Review Triggers', () => {
  test('flags anonymous requests', () => {
    const result = checkReviewTriggers('I need this done anonymously');
    expect(result).toContain('anonymous');
  });

  test('flags scraping requests', () => {
    const result = checkReviewTriggers('Scrape all user data from this site');
    expect(result).toContain('scrape');
  });

  test('passes normal requests', () => {
    const result = checkReviewTriggers('Build a landing page for my startup');
    expect(result).toHaveLength(0);
  });
});

describe('Moderation - Edge Cases', () => {
  test('handles empty string', () => {
    expect(checkProhibitedContent('')).toHaveLength(0);
    expect(checkReviewTriggers('')).toHaveLength(0);
  });

  test('does not match partial words', () => {
    // "therapeutic" contains "rape" but should not match
    const result = checkProhibitedContent('therapeutic massage services');
    expect(result).toHaveLength(0);
  });

  test('handles multiple violations', () => {
    const result = checkProhibitedContent('drugs and weapons and hacking');
    expect(result).toHaveLength(3);
  });
});
