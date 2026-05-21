const mockUsers = [];
let nextId = 1;

let queryDelegate = null;
export const setQueryDelegate = (fn) => {
    queryDelegate = fn;
};

export const originalMockQuery = async (text, params) => {
    const textLower = text.toLowerCase();

    // 1. SELECT query
    if (textLower.startsWith('select')) {
        // Check WHERE clauses
        if (textLower.includes('where email = $1')) {
            const email = params[0];
            const user = mockUsers.find(u => u.email === email);
            if (user) {
                const u = {
                    id: user.id,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                    subscription_status: user.subscription_status || 'inactive',
                    stripe_subscription_id: user.stripe_subscription_id || null,
                    logo_url: user.logo_url || null,
                    primary_color: user.primary_color || null,
                };
                return { rows: [u] };
            }
            return { rows: [] };
        }
        
        if (textLower.includes('where id = $1')) {
            const id = params[0]?.toString();
            const user = mockUsers.find(u => u.id.toString() === id);
            if (user) {
                const u = {
                    id: user.id,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                    subscription_status: user.subscription_status || 'inactive',
                    stripe_subscription_id: user.stripe_subscription_id || null,
                    logo_url: user.logo_url || null,
                    primary_color: user.primary_color || null,
                };
                return { rows: [u] };
            }
            return { rows: [] };
        }

        if (textLower.includes('where referral_code = $1')) {
            const refCode = params[0];
            const user = mockUsers.find(u => u.referral_code === refCode);
            if (user) {
                const u = {
                    id: user.id,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                };
                return { rows: [u] };
            }
            return { rows: [] };
        }
    }

    // 2. INSERT query
    if (textLower.includes('insert into users')) {
        const match = text.match(/insert\s+into\s+users\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newUser = { id: (nextId++).toString() };
            cols.forEach((col, i) => {
                newUser[col] = params[i];
            });
            // Ensure credits defaults to 0 if not provided
            if (newUser.credits === undefined) {
                newUser.credits = 0;
            }
            mockUsers.push(newUser);
            return { rows: [{ id: newUser.id }] };
        }
    }

    // 3. UPDATE query
    if (textLower.includes('update users')) {
        if (textLower.includes('credits = credits + $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = (user.credits || 0) + amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('credits = credits - $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = (user.credits || 0) - amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('credits = $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('password_hash = $1') && textLower.includes('email = $2')) {
            const [passwordHash, email] = params;
            const user = mockUsers.find(u => u.email === email);
            if (user) {
                user.password_hash = passwordHash;
                user.hashed_password = passwordHash;
                user.passwordHash = passwordHash;
                return { rows: [user] };
            }
        }
    }

    // Default mock behavior
    return { rows: [] };
};

export const mockQuery = async (text, params) => {
    if (queryDelegate) {
        return queryDelegate(text, params);
    }
    return originalMockQuery(text, params);
};

export const getMockUsers = () => {
    return mockUsers;
};

export const addMockUser = (user) => {
    mockUsers.push(user);
};

export const clearMockUsers = () => {
    mockUsers.length = 0;
    nextId = 1;
};

// Mock the bcrypt hash function since it's used in signup.js
export const mockBcrypt = {
    hash: (password, saltRounds) => Promise.resolve(`mock-hashed-${password}`),
    compare: (password, hashedPassword) => Promise.resolve(hashedPassword === `mock-hashed-${password}`),
};

export const query = mockQuery;

export const pool = {
    connect: async () => ({
        query: mockQuery,
        release: () => {},
    }),
};
