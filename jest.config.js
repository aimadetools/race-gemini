// jest.config.js
module.exports = {
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    "../../lib/logger": "<rootDir>/tests/mocks/logger.js"
  }
};
