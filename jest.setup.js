// jest.setup.js
import { jest } from '@jest/globals';

// Mock fs and path globally to prevent actual file system operations during tests
jest.mock('fs', () => ({
    promises: {
        access: jest.fn(() => Promise.resolve()),
    },
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    appendFileSync: jest.fn(),
}));

jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
}));

// Mock the bcrypt module globally for predictable hashing and comparison
jest.mock('bcrypt', () => ({
    hash: jest.fn((password) => Promise.resolve(`mock-hashed-${password}`)),
    compare: jest.fn((data, hash) => Promise.resolve(hash === `mock-hashed-${data}`)),
}));