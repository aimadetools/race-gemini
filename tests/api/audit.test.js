// tests/api/audit.test.js
const { Readable } = require('stream');
const path = require('path');

jest.mock('child_process');
jest.mock('../../lib/logger');

let handler;
const MOCK_CWD = '/home/user/app'; // Define a consistent mock CWD

describe('audit API', () => {
    let consoleErrorSpy;
    let originalCwd;
    let mockSpawn;

    beforeAll(() => {
        originalCwd = process.cwd;
        process.cwd = jest.fn(() => MOCK_CWD); // Mock process.cwd before handler import
        handler = require('../../api/audit.js').default || require('../../api/audit.js');
        mockSpawn = require('child_process').spawn;
    });

    afterAll(() => {
        process.cwd = originalCwd; // Restore original cwd
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (consoleErrorSpy) {
            consoleErrorSpy.mockRestore();
        }
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
                    setImmediate(() => callback(exitCode));
                }
            }),
        };
        return mockProcess;
    };

    it('should return 405 if not a POST request', async () => {
        const req = { method: 'GET' };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(405);
        expect(res.json).toHaveBeenCalledWith({ message: 'Method Not Allowed' });
    });

    it('should return 400 if URL is missing', async () => {
        const req = { method: 'POST', body: {} };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'URL is required.' });
    });

    it('should return 400 if URL format is invalid', async () => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const req = { method: 'POST', body: { url: 'invalid-url' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        await handler(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid URL format.' });
    });

    it('should return 200 with audit results for a valid URL', async () => {
        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        mockSpawn.mockImplementation(() => simulatePythonProcess(JSON.stringify({ mock: 'data' })));

        await handler(req, res);
        
        const pythonExecutable = path.resolve(MOCK_CWD, 'venv', 'bin', 'python');
        const auditorCliPath = path.resolve(MOCK_CWD, 'scripts', 'auditor_cli.py');

        expect(mockSpawn).toHaveBeenCalledTimes(13);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutable, [auditorCliPath, 'html', 'alt-attributes', 'https://example.com']);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutable, [auditorCliPath, 'html', 'h1-tags', 'https://example.com']);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            'alt-attributes': { mock: 'data' },
            'h1-tags': { mock: 'data' },
            'broken-links': { mock: 'data' },
            'h2-h3-tags': { mock: 'data' },
            'structured-data': { mock: 'data' },
            'readability': { mock: 'data' },
            'page-load-times': { mock: 'data' },
            'robots-txt': { mock: 'data' },
            'canonical-tags': { mock: 'data' },
            'sitemap-xml': { mock: 'data' },
            'schema-markup': { mock: 'data' },
            'meta-tags': { mock: 'data' },
            'header-response-codes': { mock: 'data' },
            'mobile-friendliness': {
                error: 'GOOGLE_PAGE_SPEED_API_KEY environment variable is not set. Cannot perform mobile-friendliness audit.'
            },
            'gbp_category_check': {
                error: 'OpenCage API key is not configured.'
            },
            'detected_city': expect.any(String),
            'grid': expect.any(Array)
        });
    });
    
    it('should include locations audit if locations are provided', async () => {
        const req = { method: 'POST', body: { url: 'https://example.com', locations: ['New York', 'London'] } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        mockSpawn.mockImplementation(() => simulatePythonProcess(JSON.stringify({ mock: 'data' })));

        await handler(req, res);
        
        const pythonExecutable = path.resolve(MOCK_CWD, 'venv', 'bin', 'python');
        const auditorCliPath = path.resolve(MOCK_CWD, 'scripts', 'auditor_cli.py');

        expect(mockSpawn).toHaveBeenCalledTimes(14);
        expect(mockSpawn).toHaveBeenCalledWith(pythonExecutable, [auditorCliPath, 'locations', 'https://example.com', '--locations-db', 'New York,London']);
        
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle audit failures gracefully', async () => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const req = { method: 'POST', body: { url: 'https://example.com' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        
        const errorMessage = 'Audit script failed';

        // Make the first call fail and the rest succeed
        mockSpawn.mockImplementationOnce(() => simulatePythonProcess('', errorMessage, 1))
                 .mockImplementation(() => simulatePythonProcess(JSON.stringify({ mock: 'data' })));

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseJson = res.json.mock.calls[0][0];
        
        expect(responseJson['alt-attributes'].error).toBeDefined();
        expect(responseJson['alt-attributes'].error.message).toContain('Error executing audit');
        expect(responseJson['h1-tags']).toEqual({ mock: 'data' }); // Check if others succeeded
    });
});
