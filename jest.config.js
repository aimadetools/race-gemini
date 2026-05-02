// jest.config.js
export default {
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  extensionsToTreatAsEsm: [],
  testEnvironment: 'node',
  // Transform all modules, including those in node_modules,
  // except for specific ones that are already transpiled or Jest-compatible.
  // We need to transform @vercel/kv because it uses ES modules and our code imports from it.
  // We also need to transform our API files and test files.
  transformIgnorePatterns: [], // An empty array ensures everything is transformed.
  setupFilesAfterEnv: ['./jest.setup.js'],
};
