// jest.config.js
module.exports = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@google/generative-ai|nanoid|uuid|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)).+\\.js$',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    "^.*\\/lib\\/logger(\\.js)?$": "<rootDir>/tests/mocks/logger.js",
    "^.*\\/lib\\/email(\\.js)?$": "<rootDir>/tests/mocks/email.js",
    "^.*\\/lib\\/html-parser(\\.js)?$": "<rootDir>/tests/mocks/html-parser.js",
    "^.*\\/db\\/index(\\.js)?$": "<rootDir>/db/mockDb.js"
  },
  testTimeout: 30000,
};
