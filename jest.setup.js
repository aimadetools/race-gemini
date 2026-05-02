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

// Mock KV store for in-memory testing (global mock for @vercel/kv)
const mockKvStore = new Map();

jest.mock('@vercel/kv', () => ({
    kv: {
        get: jest.fn(async (key) => {
            const value = mockKvStore.get(key);
            return value;
        }),
        set: jest.fn(async (key, value) => {
            mockKvStore.set(key, typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
        }),
        delete: jest.fn(async (key) => {
            mockKvStore.delete(key);
        }),
        incr: jest.fn(async (key) => {
            let current = parseInt(mockKvStore.get(key) || '0', 10);
            current += 1;
            mockKvStore.set(key, current.toString());
            return current;
        }),
    }
}));