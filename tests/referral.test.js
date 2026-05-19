import { jest } from '@jest/globals';
import fetch from 'node-fetch';

describe('Referral Program E2E Test', () => {
  const API_URL = 'http://localhost:3000';

  let mockUsers = [];
  let mockReferrals = [];
  let userIdCounter = 1;

  const query = jest.fn(); // Explicitly make query a Jest mock function

  beforeEach(() => {
    // Reset mock data before each test
    mockUsers = [];
    mockReferrals = [];
    userIdCounter = 1;

    // Define a function that returns the mock query implementation
    const getMockQueryImplementation = () => jest.fn(async (text, params) => {
        console.log('Mock query called with:', { text, params });
      // Simulate INSERT INTO users
      if (text.startsWith('INSERT INTO users')) {
        const [email, password_hash, referral_code] = params;
        const newUser = { id: userIdCounter++, email, password_hash, referral_code };
        mockUsers.push(newUser);
        const result = { rows: [{ id: newUser.id }] };
        console.log('Mock query returning (INSERT users):', result);
        return result;
      }

      // Simulate SELECT id, password_hash FROM users WHERE email = $1 (login)
      if (text.startsWith('SELECT id, password_hash FROM users') && text.includes('WHERE email = $1')) {
        const [email] = params;
        const user = mockUsers.find(u => u.email === email);
        const result = { rows: user ? [user] : [] };
        console.log('Mock query returning (SELECT users for login):', result);
        return result;
      }

      // Simulate SELECT id FROM users WHERE referral_code = $1 (referral-signup checking referrer)
      if (text.startsWith('SELECT id FROM users') && text.includes('WHERE referral_code = $1')) {
        const [referralCode] = params;
        const user = mockUsers.find(u => u.referral_code === referralCode);
        const result = { rows: user ? [{ id: user.id }] : [] };
        console.log('Mock query returning (SELECT referrer by code):', result);
        return result;
      }

      // Simulate INSERT INTO referrals
      if (text.startsWith('INSERT INTO referrals')) {
        const [referrer_id, referred_id] = params;
        const newReferral = {
          referrer_id,
          referred_id,
          created_at: new Date().toISOString(),
          status: 'pending', // Default status
          commission_earned: 0,
        };
        mockReferrals.push(newReferral);
        const result = { rows: [] };
        console.log('Mock query returning (INSERT referrals):', result);
        return result;
      }

      // Simulate SELECT referral_code FROM users WHERE id = $1 (user-referral-data)
      if (text.startsWith('SELECT referral_code FROM users') && text.includes('WHERE id = $1')) {
        const [userId] = params;
        const user = mockUsers.find(u => u.id === userId);
        const result = { rows: user ? [{ referral_code: user.referral_code }] : [] };
        console.log('Mock query returning (SELECT referral_code):', result);
        return result;
      }

      // Simulate SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 (user-referral-data stats)
      if (text.includes('COUNT(*) AS signups') && text.includes('FROM referrals') && text.includes('WHERE referrer_id = $1')) {
        const [userId] = params;
        const signups = mockReferrals.filter(r => r.referrer_id === userId).length;
        const totalEarned = mockReferrals
          .filter(r => r.referrer_id === userId)
          .reduce((sum, r) => sum + r.commission_earned, 0);
        const result = { rows: [{ signups, totalearned: totalEarned }] };
        console.log('Mock query returning (SELECT signups/earned):', result);
        return result;
      }

      // Simulate SELECT u.email, r.created_at ... FROM referrals r JOIN users u ... WHERE r.referrer_id = $1 (user-referral-data referred users)
      if (text.includes('FROM referrals r JOIN users u') && text.includes('WHERE r.referrer_id = $1')) {
        const [userId] = params;
        const referredUsersData = mockReferrals
          .filter(r => r.referrer_id === userId)
          .map(r => {
            const referredUser = mockUsers.find(u => u.id === r.referred_id);
            return {
              email: referredUser ? referredUser.email : 'unknown@example.com',
              date: r.created_at,
              status: r.status,
              commission: r.commission_earned,
            };
          });
        const result = { rows: referredUsersData };
        console.log('Mock query returning (SELECT referred users):', result);
        return result;
      }

      // Default case for unhandled queries or non-matching queries
      console.warn('Unhandled mock query:', text, params);
      return { rows: [] };
    });

    // Reset the mock implementation for query
    query.mockImplementation(getMockQueryImplementation());
  });

  let referrer = {
    email: `referrer-${Date.now()}@test.com`,
    password: 'password123',
    referralCode: null,
    cookie: null,
  };

  let referred = {
    email: `referred-${Date.now()}@test.com`,
    password: 'password123',
  };

  it('should create a new referrer user', async () => {
    console.log('Creating referrer user...');
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    console.log('Referrer user creation response:', res.status);
    expect(res.status).toBe(201);
  });

  it('should login the referrer and get their referral code', async () => {
    console.log('Logging in referrer...');
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    console.log('Referrer login response:', res.status);
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeDefined();
    referrer.cookie = cookie;

    console.log('Fetching referrer data...');
    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
        headers: { Cookie: referrer.cookie },
    });
    console.log('Referrer data response:', dataRes.status);
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    expect(data.referralCode).toBeDefined();
    referrer.referralCode = data.referralCode;
    console.log('Referrer referral code:', referrer.referralCode);
  });

  it(`should create a new referred user with the referrer's code`, async () => {
    console.log('Creating referred user...');
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: referred.email,
        password: referred.password,
        referralCode: referrer.referralCode,
      }),
    });
    console.log('Referred user creation response:', res.status);
    expect(res.status).toBe(201);
  });

  it(`should show the referred user in the referrer's dashboard`, async () => {
    console.log('Fetching referrer data again...');
    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
      headers: { Cookie: referrer.cookie },
    });
    console.log('Referrer data response (after referral):', dataRes.status);
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    console.log('Referrer data:', data);
    expect(data.signups).toBe(1);
    expect(data.referredUsers.length).toBe(1);
    expect(data.referredUsers[0].email).toBe(referred.email);
  });
});
