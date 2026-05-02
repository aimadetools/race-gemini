const fetch = require('node-fetch');

const SIGNUP_API_ENDPOINT = 'http://localhost:3000/api/signup';
const LOGIN_API_ENDPOINT = 'http://localhost:3000/api/login';

async function runTests() {
    console.log('Running tests for /api/login...');

    // --- Test Setup: Create a user to test login ---
    const testUserEmail = `test-login-${Date.now()}@example.com`;
    const testUserPassword = 'a-secure-password';
    const signupResponse = await fetch(SIGNUP_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: testUserPassword }),
    });

    if (signupResponse.status !== 201) {
        console.error('❌ CRITICAL FAILURE: Could not create user for login tests. Aborting.');
        const errorBody = await signupResponse.json();
        console.error('Error details:', errorBody);
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
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 200 && data.message === 'Login successful!' && data.token) {
            console.log('✅ Test Case 1 Passed: Successful login received expected response and token.');
        } else {
            console.error('❌ Test Case 1 Failed: Unexpected response for successful login.');
        }
    } catch (error) {
        console.error('❌ Test Case 1 Failed: Error during successful login test:', error.message);
    }
}

async function testWrongPassword(email) {
    console.log('--- Test Case 2: Wrong Password ---');
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'this-is-the-wrong-password' }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 401 && data.message === 'Invalid credentials.') {
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
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: nonExistentEmail, password: 'anypassword' }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        // The current implementation of login.js returns 401 for both wrong password and non-existent user
        // This is a common security practice to avoid user enumeration.
        if (response.status === 401 && data.message === 'Invalid credentials.') {
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
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: 'any-password' }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
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
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
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
    try {
        const response = await fetch(LOGIN_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Data:', data);

        if (response.status === 400 && data.message === 'Email and password are required.') {
            console.log('✅ Test Case 6 Passed: Both email and password missing handled correctly.');
        } else {
            console.error('❌ Test Case 6 Failed: Unexpected response for both missing.');
        }
    } catch (error) {
        console.error('❌ Test Case 6 Failed: Error during both missing test:', error.message);
    }
}


// Ensure a local development server (e.g., `vercel dev`) is running on port 3000 before executing tests.
runTests();
