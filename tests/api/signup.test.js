const signupHandler = require('../../api/signup').default; // Import the refactored handler
const path = require('path');
const fs = require('fs');

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
    // Add other KV methods if used in signup.js and needed for tests
};

// Helper to create mock response object
const createMockRes = () => {
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
        // For internal server error logging
        end(message) {
            this._json = { message };
        }
    };
    return res;
};

async function runTests() {
    console.log('Running tests for /api/signup...');

    // Clear the mock KV store at the beginning of the test run to ensure a clean state
    mockKvStore.clear();

    // Test Case 1: Successful signup
    await testSuccessfulSignup();

    // Test Case 2: Missing email
    await testMissingEmail();

    // Test Case 3: Missing password
    await testMissingPassword();

    // Test Case 4: Both email and password missing
    await testBothMissing();

    // Test Case 5: Email already exists
    await testEmailAlreadyExists();

    console.log('All tests finished for /api/signup.');
}

async function generateUniqueEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
}

async function testSuccessfulSignup() {
    console.log('--- Test Case 1: Successful Signup ---');
    const email = await generateUniqueEmail();
    const password = 'securepassword123';
    const req = {
        method: 'POST',
        body: { email, password },
    };
    const res = createMockRes();

    try {
        await signupHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 201 && res._json.message === 'User registered successfully!' && res._json.userId) {
            console.log('✅ Test Case 1 Passed: Successful signup received expected response.');
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful signup.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful signup test:', error.message);
    }
}

async function testMissingEmail() {
    console.log('--- Test Case 2: Missing Email ---');
    const password = 'securepassword123';
    const req = {
        method: 'POST',
        body: { password },
    };
    const res = createMockRes();

    try {
        await signupHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 2 Passed: Missing email handled correctly.');
        } else {
            console.error('❌ Test Case 2 Failed: Unexpected response for missing email.');
        }
    } catch (error) {
        console.error('❌ Test Case 2 Failed: Error during missing email test:', error.message);
    }
}

async function testMissingPassword() {
    console.log('--- Test Case 3: Missing Password ---');
    const email = await generateUniqueEmail();
    const req = {
        method: 'POST',
        body: { email },
    };
    const res = createMockRes();

    try {
        await signupHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 3 Passed: Missing password handled correctly.');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for missing password.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during missing password test:', error.message);
    }
}

async function testBothMissing() {
    console.log('--- Test Case 4: Both Email and Password Missing ---');
    const req = {
        method: 'POST',
        body: {},
    };
    const res = createMockRes();

    try {
        await signupHandler(req, res, mockKv);

        console.log('Response Status:', res._status);
        console.log('Response Data:', res._json);

        if (res._status === 400 && res._json.message === 'Email and password are required.') {
            console.log('✅ Test Case 4 Passed: Both email and password missing handled correctly.');
        } else {
            console.error('❌ Test Case 4 Failed: Unexpected response for both missing.');
        }
    } catch (error) {
        console.error('❌ Test Case 4 Failed: Error during both missing test:', error.message);
    }
}

async function testEmailAlreadyExists() {
    console.log('--- Test Case 5: Email Already Exists ---');
    const email = await generateUniqueEmail();
    const password = 'anothersecurepassword';
    const req1 = {
        method: 'POST',
        body: { email, password },
    };
    const res1 = createMockRes();

    const req2 = {
        method: 'POST',
        body: { email, password: 'differentpassword' },
    };
    const res2 = createMockRes();

    try {
        // First, successfully sign up the user
        await signupHandler(req1, res1, mockKv);

        // Then, try to sign up with the same email again
        await signupHandler(req2, res2, mockKv);

        console.log('Response Status:', res2._status);
        console.log('Response Data:', res2._json);

        if (res2._status === 409 && res2._json.message === 'User with this email already exists.') {
            console.log('✅ Test Case 5 Passed: Email already exists handled correctly.');
        } else {
            console.error('❌ Test Case 5 Failed: Unexpected response for email already exists.');
        }
    } catch (error) {
        console.error('❌ Test Case 5 Failed: Error during email already exists test:', error.message);
    }
}

runTests();