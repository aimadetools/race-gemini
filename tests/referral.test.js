import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000'; // Assuming the app runs on port 3000

describe('Referral Program E2E Test', () => {
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
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    expect(res.status).toBe(201);
  });

  it('should login the referrer and get their referral code', async () => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: referrer.email, password: referrer.password }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toBeDefined();
    referrer.cookie = cookie;

    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
        headers: { Cookie: referrer.cookie },
    });
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    expect(data.referralCode).toBeDefined();
    referrer.referralCode = data.referralCode;
  });

  it(`should create a new referred user with the referrer's code`, async () => {
    const res = await fetch(`${API_URL}/api/referral-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: referred.email,
        password: referred.password,
        referralCode: referrer.referralCode,
      }),
    });
    expect(res.status).toBe(201);
  });

  it(`should show the referred user in the referrer's dashboard`, async () => {
    const dataRes = await fetch(`${API_URL}/api/user-referral-data`, {
      headers: { Cookie: referrer.cookie },
    });
    expect(dataRes.status).toBe(200);
    const data = await dataRes.json();
    expect(data.signups).toBe(1);
    expect(data.referredUsers.length).toBe(1);
    expect(data.referredUsers[0].email).toBe(referred.email);
  });
});
