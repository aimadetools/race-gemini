// tests/api/audit.test.js
import { jest } from '@jest/globals';
import { Readable } from 'stream';
import * as path from 'path'; // Re-add the path import

// Mock child_process.spawn to control Python script execution
jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));

// Mock the 'path' module to control 'resolve' while retaining other functionalities
jest.mock('path', () => {
    const originalPath = jest.requireActual('path');
    return {
        ...originalPath, // Keep all original exports
        resolve: jest.fn((...args) => originalPath.resolve(...args)), // Mock resolve but call original
    };
});

const mockSpawn = require('child_process').spawn;

let handler;
const MOCK_CWD = '/home/race/race-gemini'; // Define a consistent mock CWD

describe('audit API', () => {
    let consoleErrorSpy;
    let originalCwd;


    beforeAll(async () => {
        originalCwd = process.cwd;
        process.cwd = jest.fn(() => MOCK_CWD); // Mock process.cwd before handler import



        handler = (await import('../../api/audit')).default;
    });

    afterAll(() => {
        process.cwd = originalCwd; // Restore original cwd

    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Suppress console.error for tests that expect errors
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore(); // Restore console.error after each test
    });

    // Helper to simulate a Python process
    const simulatePythonProcess = (stdoutData, stderrData = '', exitCode = 0) => {
        const stdoutStream = new Readable({
            read() {
                this.push(stdoutData);
                this.push(null);
            }
        });
        const stderrStream = new Readable({
            read() {
                this.push(stderrData);
                this.push(null);
            }
        });

        const mockProcess = {
            stdout: stdoutStream,
            stderr: stderrStream,
            on: jest.fn((event, callback) => {
                if (event === 'close') {
                    // Simulate process closing after a short delay
                    setImmediate(() => callback(exitCode));
                }
                if (event === 'error') {
                    // Only call if an error is explicitly provided
                }
            }),
        };
        mockSpawn.mockReturnValue(mockProcess);
        return mockProcess;
    };

    it('should return 405 if not a POST request', async () => {
        const req = { method: 'GET' };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('should return 400 if URL is missing', async () => {
        const req = { method: 'POST', body: {} };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'URL is required.' });
    });

    it('should return 400 if URL format is invalid', async () => {
        const req = { method: 'POST', body: { url: 'invalid-url' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid URL format.' });
    });

    it('should return 200 with audit results for a valid URL', async () => {
        const mockBrokenLinks = { broken: ['/link1'] };
        const mockAltAttributes = { missing: ['/img1'] };
        const mockPageLoadTimes = { time: '2s' };

        const pythonExecutablePath = path.resolve(MOCK_CWD, 'venv', 'bin', 'python');
        const brokenLinksScriptPath = path.resolve(MOCK_CWD, 'check_broken_links.py');
        const altAttributesScriptPath = path.resolve(MOCK_CWD, 'audit_alt_attributes.py');
        const pageLoadTimesScriptPath = path.resolve(MOCK_CWD, 'audit_page_load_times.py');


        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        // Expect 3 calls to spawn, one for each script
        mockSpawn.mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockBrokenLinks), '', 0))
                 .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockAltAttributes), '', 0))
                 .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockPageLoadTimes), '', 0));

        await handler(req, res);

        expect(mockSpawn).toHaveBeenCalledTimes(3);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutablePath, [brokenLinksScriptPath, 'https://example.com']);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutablePath, [altAttributesScriptPath, 'https://example.com']);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutablePath, [pageLoadTimesScriptPath, 'https://example.com']);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            broken_links: mockBrokenLinks,
            alt_attributes: mockAltAttributes,
            page_load_times: mockPageLoadTimes,
        });
    });

    it('should return 500 if a Python script fails', async () => {
        const mockBrokenLinks = { broken: [] };
        const mockAltAttributes = { missing: ['/img1'] };
        const pythonErrorMessage = 'Error from audit_page_load_times.py';

        // Simulate broken_links and alt_attributes success, page_load_times failure
        mockSpawn.mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockBrokenLinks), '', 0))
                 .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockAltAttributes), '', 0))
                 .mockImplementationOnce(() => simulatePythonProcess('', pythonErrorMessage, 1)); // Simulate failure for page_load_times

        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(mockSpawn).toHaveBeenCalledTimes(3);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Some audit checks failed.',
            results: {
                broken_links: mockBrokenLinks,
                alt_attributes: mockAltAttributes,
            },
            errors: expect.arrayContaining([
                expect.objectContaining({
                    script: 'audit_page_load_times.py',
                    message: 'Error executing script: audit_page_load_times.py',
                    error: pythonErrorMessage,
                }),
            ]),
        }));
        expect(consoleErrorSpy).toHaveBeenCalled(); // Ensure console.error was called due to Python script failure
    });

    it('should return 500 if a Python script returns invalid JSON', async () => {
        const mockBrokenLinks = { broken: [] };
        const invalidJsonOutput = 'This is not JSON';
        const mockPageLoadTimes = { time: '2s' }; // This script still succeeds

        // Simulate broken_links success, alt_attributes returns invalid JSON
        mockSpawn.mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockBrokenLinks), '', 0))
                 .mockImplementationOnce(() => simulatePythonProcess(invalidJsonOutput, '', 0)) // Invalid JSON for alt_attributes
                 .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify(mockPageLoadTimes), '', 0));

        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(mockSpawn).toHaveBeenCalledTimes(3);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Some audit checks failed.',
            results: {
                broken_links: mockBrokenLinks,
                page_load_times: mockPageLoadTimes, // Expect this to be present
            },
            errors: expect.arrayContaining([
                expect.objectContaining({
                    script: 'audit_alt_attributes.py',
                    message: 'Error parsing results from audit_alt_attributes.py',
                    error: invalidJsonOutput,
                }),
            ]),
        }));
        expect(consoleErrorSpy).toHaveBeenCalled(); // Ensure console.error was called due to JSON parsing error
    });

    it('should handle process spawning errors', async () => {
        const spawnError = new Error('Failed to spawn');
        spawnError.code = 'ENOENT'; // Example error code for process not found

        mockSpawn.mockImplementationOnce(() => {
            const mockProcess = {
                stdout: new Readable({ read() { this.push(null); } }),
                stderr: new Readable({ read() { this.push(null); } }),
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        setImmediate(() => callback(spawnError));
                    }
                    if (event === 'close') {
                        // This might not be called if 'error' happens first
                    }
                }),
            };
            return mockProcess;
        })
        .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify({ missing: [] }), '', 0))
        .mockImplementationOnce(() => simulatePythonProcess(JSON.stringify({ time: '2s' }), '', 0));

        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await handler(req, res);

        expect(mockSpawn).toHaveBeenCalledTimes(3);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Some audit checks failed.',
            results: expect.objectContaining({
                alt_attributes: expect.any(Object),
                page_load_times: expect.any(Object),
            }),
            errors: expect.arrayContaining([
                expect.objectContaining({
                    script: 'check_broken_links.py',
                    message: 'Failed to start process for check_broken_links.py',
                    error: 'Failed to spawn',
                }),
            ]),
        }));
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
