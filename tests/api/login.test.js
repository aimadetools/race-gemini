const loginHandler = require('../../api/login').default;
const signupHandler = require('../../api/signup').default; // Needed for user creation in setup
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // To verify JWT tokens

// Set a consistent JWT secret for testing
process.env.JWT_SECRET = 'test_jwt_secret_key';

// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        return mockKvStore.get(key);
    },
    async set(key, value) {
        mockKvStore.set(key, value);
    },
    async delete(key) {
        mockKvStore.delete(key);
    },
    // Add other KV methods if used in login.js and needed for tests
};

// Helper to create mock response object
const createMockRes = () => {
    const headers = {};
    const res = {
        _status: 200,
        _json: {},
        status(statusCode) {
            this._status = statusCode;
            return this;
        },
        json(data) {
            this._json = data;
            return this;
        },
        setHeader(name, value) {
            headers[name] = value;
        },
        _getHeaders() {
            return headers;
        },
        // For internal server error logging
        end(message) {
            this._json = { message };
        }
    };
    return res;
};


async function runTests() {
    console.log('Running tests for /api/login...');

    // Clear the mock KV store at the beginning of the test run to ensure a clean state
    mockKvStore.clear();

    // --- Test Setup: Create a user to test login ---
    const testUserEmail = `test-login-${Date.now()}@example.com`;
    const testUserPassword = 'a-secure-password';
    const signupReq = {
        method: 'POST',
        body: { email: testUserEmail, password: testUserPassword },
    };
    const signupRes = createMockRes();

    await signupHandler(signupReq, signupRes, mockKv);

    if (signupRes._status !== 201) {
        console.error('❌ CRITICAL FAILURE: Could not create user for login tests. Aborting.');
        console.error('Error details:', signupRes._json);
        return;
    }
    console.log('✓ Test setup complete: User created successfully.');
    // --- End Test Setup ---


    // Run all test cases
    await testSuccessfulLogin(testUserEmail, testUserPassword);
    await testWrongPassword(testUserEmail);
    await testNonExistentEmail();
    await testMissingEmail();
    await testMissingPassword(testUserEmail);
    await testBothMissing();

    console.log('All tests finished for /api/login.');
}

async function testSuccessfulLogin(email, password) {
    console.log('--- Test Case 1: Successful Login ---');
    const req = {
        method: 'POST',
        body: { email, password },
        // Mock process.env.JWT_SECRET for consistent token generation
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 200 && res._json.message === 'Logged in successfully!' && res._json.userId) {
            // Verify JWT token
            const headers = res._getHeaders();
            const setCookieHeader = headers['Set-Cookie'];
            const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            if (cookieHeaders && cookieHeaders.length > 0) {
                const authTokenCookie = cookieHeaders.find(cookie => cookie.startsWith('authToken='));
                if (authTokenCookie) {
                    const token = authTokenCookie.split(';')[0].split('authToken=')[1];
                    try {
                        const decoded = jwt.verify(token, 'test_jwt_secret_key'); // Use mocked secret
                        if (decoded.userId === res._json.userId) {
                            console.log('✅ Test Case 1 Passed: Successful login received expected response and valid token.');
                        } else {
                            console.error('❌ Test Case 1 Failed: Token verification failed (userId mismatch).');
                        }
                    } catch (jwtError) {
                        console.error('❌ Test Case 1 Failed: JWT token verification failed:', jwtError.message);
                    }
                } else {
                    console.error('❌ Test Case 1 Failed: AuthToken cookie not found in Set-Cookie header.');
                }
            } else {
                console.error('❌ Test Case 1 Failed: Set-Cookie header not found.');
            }
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful login.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful login test:', error.message);
    }
}

async function testWrongPassword(email) {
    console.log('--- Test Case 2: Wrong Password ---');
    const req = {
        method: 'POST',
        body: { email, password: 'this-is-the-wrong-password' },
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 401 && res._json.message === 'Invalid credentials.') {
            console.log('✅ Test Case 2 Passed: Wrong password handled correctly.');
        } else {
            console.error('❌ Test Case 2 Failed: Unexpected response for wrong password.');
        }
    } catch (error) {
        console.error('❌ Test Case 2 Failed: Error during wrong password test:', error.message);
    }
}

async function testNonExistentEmail() {
    console.log('--- Test Case 3: Non-Existent Email ---');
    const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
    const req = {
        method: 'POST',
        body: { email: nonExistentEmail, password: 'anypassword' },
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        // The current implementation of login.js returns 401 for both wrong password and non-existent user
        // This is a common security practice to avoid user enumeration.
        if (res._status === 401 && res._json.message === 'Invalid credentials.') {
            console.log('✅ Test Case 3 Passed: Non-existent email handled correctly (as invalid credentials).');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for non-existent email.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during non-existent email test:', error.message);
    }
}

async function testMissingEmail() {
    console.log('--- Test Case 4: Missing Email ---');
    const req = {
        method: 'POST',
        body: { password: 'any-password' },
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 4 Passed: Missing email handled correctly.');
        } else {
            console.error('❌ Test Case 4 Failed: Unexpected response for missing email.');
        }
    } catch (error) {
        console.error('❌ Test Case 4 Failed: Error during missing email test:', error.message);
    }
}

async function testMissingPassword(email) {
    console.log('--- Test Case 5: Missing Password ---');
    const req = {
        method: 'POST',
        body: { email },
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 5 Passed: Missing password handled correctly.');
        } else {
            console.error('❌ Test Case 5 Failed: Unexpected response for missing password.');
        }
    } catch (error) {
        console.error('❌ Test Case 5 Failed: Error during missing password test:', error.message);
    }
}

async function testBothMissing() {
    console.log('--- Test Case 6: Both Email and Password Missing ---');
    const req = {
        method: 'POST',
        body: {},
        process: { env: { JWT_SECRET: 'test_jwt_secret_key' } }
    };
    const res = createMockRes();

    try {
        await loginHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 6 Passed: Both email and password missing handled correctly.');
        } else {
            console.error('❌ Test Case 6 Failed: Unexpected response for both missing.');
        }
    } catch (error) {
        console.error('❌ Test Case 6 Failed: Error during both missing test:', error.message);
    }
}

runTests();
