// jest.config.js
module.exports = {
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    "../../lib/logger": "<rootDir>/tests/mocks/logger.js",
    "../../lib/email": "<rootDir>/tests/mocks/email.js"
  }
};
