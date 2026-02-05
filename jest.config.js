/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  // Increase timeout for network requests
  setupFilesAfterEnv: [],
  // Don't transform node_modules
  transformIgnorePatterns: ['/node_modules/'],
  // Collect coverage
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'app/api/**/*.{js,ts}',
    '!**/*.d.ts',
  ],
  // Verbose output
  verbose: true,
};
