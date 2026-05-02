const resetPasswordHandler = require('../../api/reset-password').default;
const signupHandler = require('../../api/signup').default; // Needed for user creation in setup
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // For generating reset tokens

// Mock KV store for in-memory testing
const mockKvStore = new Map();

const mockKv = {
    async get(key) {
        const value = mockKvStore.get(key);
        return value; // Return raw string
    },
    async set(key, value) {
        // Store objects as JSON strings. If value is already a string, assume it's already stringified JSON.
        mockKvStore.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    },
    async del(key) {
        // console.log(`KV DEL: ${key}`);
        mockKvStore.delete(key);
    },
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
    };
    return res;
};

async function runTests() {
    console.log('Running tests for /api/reset-password...');

    // Clear the mock KV store at the beginning of the test run to ensure a clean state
    mockKvStore.clear();

    const testUserEmail = `reset-test-${Date.now()}@example.com`;
    const initialPassword = 'initial-secure-password';
    const newPassword = 'new-secure-password';
    let resetToken = '';
    let expiredToken = '';
    let invalidToken = '';

    // --- Test Setup: Create a user and a reset token ---
    console.log('--- Test Setup: Creating user and reset token ---');
    const signupReq = {
        method: 'POST',
        body: { email: testUserEmail, password: initialPassword },
    };
    const signupRes = createMockRes();

    await signupHandler(signupReq, signupRes, mockKv);

    if (signupRes._status !== 201) {
        console.error('❌ CRITICAL FAILURE: Could not create user for reset password tests. Aborting.');
        console.error('Error details:', signupRes._json);
        return;
    }
    console.log('✓ Test setup complete: User created successfully.');

    // Generate a valid reset token and store it in KV
    resetToken = uuidv4();
    const expiryTime = Date.now() + 3600000; // 1 hour from now
    await mockKv.set(`password-reset:${resetToken}`, { email: testUserEmail, expiry: expiryTime });

    // Generate an expired token
    expiredToken = uuidv4();
    const expiredTime = Date.now() - 3600000; // 1 hour ago
    await mockKv.set(`password-reset:${expiredToken}`, { email: testUserEmail, expiry: expiredTime });

    // Generate an invalid token (not stored in KV)
    invalidToken = uuidv4();

    // Run all test cases
    await testSuccessfulPasswordReset(testUserEmail, resetToken, newPassword);
    await testMissingTokenOrPassword();
    await testInvalidToken(invalidToken);
    await testExpiredToken(expiredToken, newPassword);
    await testUserNotFound(resetToken, newPassword);
    await testNonPostMethod();

    console.log('All tests finished for /api/reset-password.');
}

// Recreate a token for specific tests if it was consumed
async function recreateToken(email) {
    const newToken = uuidv4();
    const expiryTime = Date.now() + 3600000; // 1 hour from now
    await mockKv.set(`password-reset:${newToken}`, { email: email, expiry: expiryTime });
    return newToken;
}


async function testSuccessfulPasswordReset(email, token, newPass) {
    console.log('--- Test Case 1: Successful Password Reset ---');
    const req = {
        method: 'POST',
        body: { token, newPassword: newPass },
    };
    const res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);

        if (res._status === 200 && res._json.message === 'Password reset successfully.') {
            // Verify password actually changed
            const userString = await mockKv.get(`user:${email}`);
            const user = JSON.parse(userString);
            const passwordMatch = await bcrypt.compare(newPass, user.password);

            // Verify token was deleted
            const tokenInKv = await mockKv.get(`password-reset:${token}`);

            if (passwordMatch && !tokenInKv) {
                console.log('✅ Test Case 1 Passed: Password reset successful and token invalidated.');
            } else {
                console.error('❌ Test Case 1 Failed: Password not updated or token not invalidated.');
            }
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful password reset.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful password reset test:', error.message);
    }
}

async function testMissingTokenOrPassword() {
    console.log('--- Test Case 2: Missing Token or New Password ---');
    let req = {
        method: 'POST',
        body: { newPassword: 'somepassword' }, // Missing token
    };
    let res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);
        if (res._status === 400 && res._json.message === 'Token and new password are required.') {
            console.log('✅ Test Case 2a Passed: Missing token handled correctly.');
        } else {
            console.error('❌ Test Case 2a Failed: Unexpected response for missing token.');
        }
    } catch (error) {
        console.error('❌ Test Case 2a Failed: Error during missing token test:', error.message);
    }

    req = {
        method: 'POST',
        body: { token: uuidv4() }, // Missing newPassword
    };
    res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);
        if (res._status === 400 && res._json.message === 'Token and new password are required.') {
            console.log('✅ Test Case 2b Passed: Missing new password handled correctly.');
        } else {
            console.error('❌ Test Case 2b Failed: Unexpected response for missing new password.');
        }
    } catch (error) {
        console.error('❌ Test Case 2b Failed: Error during missing new password test:', error.message);
    }
}

async function testInvalidToken(invalidToken) {
    console.log('--- Test Case 3: Invalid Token (not in KV) ---');
    const req = {
        method: 'POST',
        body: { token: invalidToken, newPassword: 'another-new-password' },
    };
    const res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);

        if (res._status === 400 && res._json.message === 'Invalid or expired token.') {
            console.log('✅ Test Case 3 Passed: Invalid token handled correctly.');
        } else {
            console.error('❌ Test Case 3 Failed: Unexpected response for invalid token.');
        }
    } catch (error) {
        console.error('❌ Test Case 3 Failed: Error during invalid token test:', error.message);
    }
}

async function testExpiredToken(expiredToken, newPass) {
    console.log('--- Test Case 4: Expired Token ---');
    const req = {
        method: 'POST',
        body: { token: expiredToken, newPassword: newPass },
    };
    const res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);

        if (res._status === 400 && res._json.message === 'Invalid or expired token.') {
            // Verify expired token was cleaned up
            const tokenInKv = await mockKv.get(`password-reset:${expiredToken}`);
            if (!tokenInKv) {
                console.log('✅ Test Case 4 Passed: Expired token handled correctly and cleaned up.');
            } else {
                console.error('❌ Test Case 4 Failed: Expired token not cleaned up.');
            }
        } else {
            console.error('❌ Test Case 4 Failed: Unexpected response for expired token.');
        }
    } catch (error) {
        console.error('❌ Test Case 4 Failed: Error during expired token test:', error.message);
    }
}

async function testUserNotFound(originalToken, newPass) {
    console.log('--- Test Case 5: User Not Found (after token validation) ---');
    // We need to create a token that points to a non-existent user
    const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;
    const tokenForNonExistentUser = uuidv4();
    const expiryTime = Date.now() + 3600000;
    await mockKv.set(`password-reset:${tokenForNonExistentUser}`, { email: nonExistentEmail, expiry: expiryTime });

    const req = {
        method: 'POST',
        body: { token: tokenForNonExistentUser, newPassword: newPass },
    };
    const res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);

        if (res._status === 404 && res._json.message === 'User not found.') {
            // Ensure the token was consumed/deleted even if user not found
            const tokenInKv = await mockKv.get(`password-reset:${tokenForNonExistentUser}`);
            if (!tokenInKv) {
                console.log('✅ Test Case 5 Passed: User not found handled correctly and token invalidated.');
            } else {
                console.error('❌ Test Case 5 Failed: Token not invalidated when user not found.');
            }
        } else {
            console.error('❌ Test Case 5 Failed: Unexpected response for user not found.');
        }
    } catch (error) {
        console.error('❌ Test Case 5 Failed: Error during user not found test:', error.message);
    }
    // Clean up the token created for this test
    await mockKv.del(`password-reset:${tokenForNonExistentUser}`);
}


async function testNonPostMethod() {
    console.log('--- Test Case 6: Non-POST Method ---');
    const req = {
        method: 'GET', // Using GET instead of POST
        body: { token: uuidv4(), newPassword: 'any-password' },
    };
    const res = createMockRes();

    try {
        await resetPasswordHandler(req, res, mockKv);

        if (res._status === 405 && res._json.message === 'Method Not Allowed') {
            console.log('✅ Test Case 6 Passed: Non-POST method handled correctly.');
        } else {
            console.error('❌ Test Case 6 Failed: Unexpected response for non-POST method.');
        }
    } catch (error) {
        console.error('❌ Test Case 6 Failed: Error during non-POST method test:', error.message);
    }
}


runTests();
