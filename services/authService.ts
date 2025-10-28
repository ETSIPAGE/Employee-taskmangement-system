import { User, UserRole } from '../types';

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

const USERS_KEY = 'ets_users';
const CURRENT_USER_KEY = 'ets_current_user';
const TOKEN_KEY = 'ets_token';
const ORIGINAL_USER_KEY = 'ets_original_user_id';

const getInitialUsers = (): User[] => {
    // Do not seed any static users; initialize as empty.
    return [];
};

export const getUsers = (): User[] => {
  const usersJson = localStorage.getItem(USERS_KEY);
  if (usersJson) {
    return JSON.parse(usersJson);
  }
  const emptyUsers: User[] = getInitialUsers();
  localStorage.setItem(USERS_KEY, JSON.stringify(emptyUsers));
  return emptyUsers;
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = async (credentials: RegisterCredentials): Promise<User> => {
    // Step 1: Call the backend API to register the user.
    const response = await fetch('https://y6rtqrl50i.execute-api.ap-south-1.amazonaws.com/ETS-auth-dev/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: credentials.name,
            email: credentials.email,
            password: credentials.password,
        }),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try { responseData = responseText ? JSON.parse(responseText) : {}; } catch { responseData = { message: responseText }; }

    if (!response.ok) {
        const msg = String(responseData?.message || '').toLowerCase();
        // Graceful handling for common 400s (e.g., user already exists or validation differences)
        if (response.status === 400) {
            const users = getUsers();
            const existingLocal = users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
            if (existingLocal) {
                // Do not switch session when admin/HR is creating another user
                const existingSessionJson2 = localStorage.getItem(CURRENT_USER_KEY);
                const existingSessionUser2: User | null = existingSessionJson2 ? JSON.parse(existingSessionJson2) : null;
                const adminCreating2 = existingSessionUser2 && (existingSessionUser2.role === UserRole.ADMIN || existingSessionUser2.role === UserRole.HR);
                if (!adminCreating2) {
                    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingLocal));
                    localStorage.setItem(TOKEN_KEY, responseData?.token || localStorage.getItem(TOKEN_KEY) || '');
                }
                return existingLocal;
            }

            // If backend refuses to create but the user isn't in local store yet, create a shadow user locally
            const shadowUser: User = {
                id: `user-${Date.now()}`,
                name: credentials.name,
                email: credentials.email,
                role: UserRole.EMPLOYEE,
                status: 'Active',
                joinedDate: new Date().toISOString(),
                jobTitle: 'New Employee',
                skills: [],
                stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' },
            };
            users.push(shadowUser);
            saveUsers(users);

            // Preserve admin/HR session
            const existingSessionJson3 = localStorage.getItem(CURRENT_USER_KEY);
            const existingSessionUser3: User | null = existingSessionJson3 ? JSON.parse(existingSessionJson3) : null;
            const adminCreating3 = existingSessionUser3 && (existingSessionUser3.role === UserRole.ADMIN || existingSessionUser3.role === UserRole.HR);
            if (!adminCreating3) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(shadowUser));
            }
            return shadowUser;
        }

        throw new Error(responseData.message || 'Registration failed.');
    }

    // Step 2: Determine if an admin/HR is creating another user. If so, DO NOT replace session/token.
    const existingSessionJson = localStorage.getItem(CURRENT_USER_KEY);
    const existingSessionUser: User | null = existingSessionJson ? JSON.parse(existingSessionJson) : null;
    const adminCreating = existingSessionUser && (existingSessionUser.role === UserRole.ADMIN || existingSessionUser.role === UserRole.HR);

    // If this is a self-signup (no current session), store the received token for the new user session.
    if (!adminCreating) {
        localStorage.setItem(TOKEN_KEY, responseData.token);
    }

    // Step 3: Create a parallel user record in the frontend's local storage.
    const users = getUsers();
    const existingUser = users.find(u => u.email === credentials.email);

    if (existingUser) {
        console.warn('User already exists locally.');
        // Do not switch session when an admin/HR is creating another user
        const existingSessionJson2 = localStorage.getItem(CURRENT_USER_KEY);
        const existingSessionUser2: User | null = existingSessionJson2 ? JSON.parse(existingSessionJson2) : null;
        const adminCreating2 = existingSessionUser2 && (existingSessionUser2.role === UserRole.ADMIN || existingSessionUser2.role === UserRole.HR);
        if (!adminCreating2) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
        }
        return existingUser;
    }

    const newUser: User = {
        id: `user-${Date.now()}`,
        name: credentials.name,
        email: credentials.email,
        role: UserRole.EMPLOYEE, // Default role for new signups
        status: 'Active',
        joinedDate: new Date().toISOString(),
        jobTitle: 'New Employee',
        skills: [],
        stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' },
    };
    
    users.push(newUser);
    saveUsers(users);

    // Step 4: Only switch session for self-signup. For admin/HR, keep current session.
    if (!adminCreating) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    }
    return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | undefined => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        saveUsers(users);

        const currentUserJson = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUserJson) {
            const currentUser = JSON.parse(currentUserJson) as User;
            if (currentUser.id === userId) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
            }
        }

        return users[userIndex];
    }
    return undefined;
};

export const deleteUser = (userId: string): void => {
    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
};

export const login = async (email: LoginCredentials['email'], password: LoginCredentials['password']): Promise<User> => {
    // Step 1: Authenticate against the backend.
    const response = await fetch('https://y6rtqrl50i.execute-api.ap-south-1.amazonaws.com/ETS-auth-dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const raw = await response.text();
    let responseData: any = {};
    try { responseData = raw ? JSON.parse(raw) : {}; } catch { responseData = { message: raw }; }

    if (!response.ok) {
        // Fallback: If API says user does not exist but we have a local profile (admin-created), allow local login
        const msg = String(responseData?.message || '').toLowerCase();
        if (response.status === 400 && (msg.includes('does not exist') || msg.includes('not exist') || msg.includes('invalid'))) {
            const local = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
            if (local) {
                // Set a local-only token to indicate offline/local auth
                localStorage.setItem(TOKEN_KEY, localStorage.getItem(TOKEN_KEY) || 'local-shadow-token');
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(local));
                return local;
            }
        }
        throw new Error(responseData.message || 'Invalid email or password.');
    }
    
    // Step 2: Extract authoritative data from API response.
    const { token, role: apiRole, id: apiUserId } = responseData;

    if (!apiRole || !Object.values(UserRole).includes(apiRole)) {
        throw new Error(`Invalid or missing role received from server. Role was: ${apiRole}`);
    }
    if (!apiUserId) {
        throw new Error('User ID was not returned from the server.');
    }

    // Step 3: Store the received token.
    localStorage.setItem(TOKEN_KEY, token);

    // Step 4: Find or create a user in local storage and sync with API data.
    let users = getUsers();
    const localUser = users.find(u => u.email === email);
    
    let sessionUser: User;

    if (localUser) {
        const oldId = localUser.id;

        // Deconstruct the existing local user to safely merge with API data.
        // This ensures the role and ID from the server always override local values.
        const { id: _, role: __, ...restOfLocalUser } = localUser;
        
        sessionUser = {
            ...restOfLocalUser, // All other details from the local profile
            id: apiUserId,      // Authoritative ID from the API
            role: apiRole,      // Authoritative Role from the API
        };
        
        // Find the user in our full list by their OLD ID and update them.
        const userIndex = users.findIndex(u => u.id === oldId);
        if (userIndex > -1) {
            users[userIndex] = sessionUser;
        }

        // CRITICAL: If the user's ID changed and they are a manager, update employee references.
        if (oldId !== apiUserId && apiRole === UserRole.MANAGER) {
            users = users.map(u => {
                if (u.managerId === oldId) {
                    return { ...u, managerId: apiUserId };
                }
                return u;
            });
        }
        
        saveUsers(users);

    } else {
        // User does not exist locally. Create a new profile with data from the API.
        console.warn(`User ${email} authenticated but not in local data. Creating a local profile.`);
        
        const name = email.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        sessionUser = {
            id: apiUserId, // Use ID from API
            name: name,
            email: email,
            role: apiRole, // Use role from API
            status: 'Active',
            joinedDate: new Date().toISOString(),
        };
        users.push(sessionUser);
        saveUsers(users);
    }

    // Step 5: Set the corrected user object as the current user for the session.
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    return sessionUser;
};


export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  // Prime the user store if it doesn't exist
  getUsers();
  
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

export const getUserById = (userId: string): User | undefined => {
    const users = getUsers();
    return users.find(u => u.id === userId);
};

export const getOriginalUser = (): User | null => {
    const originalUserId = localStorage.getItem(ORIGINAL_USER_KEY);
    if (!originalUserId) return null;
    return getUserById(originalUserId);
};

export const impersonate = (userId: string): User | null => {
    const originalUser = getCurrentUser();
    if (!originalUser) {
        throw new Error("Cannot impersonate without being logged in.");
    }
    if (originalUser.id === userId || originalUser.role !== UserRole.ADMIN) {
        console.error("Impersonation attempt failed due to invalid permissions or target.");
        return null;
    }

    const userToImpersonate = getUserById(userId);
    if (userToImpersonate) {
        localStorage.setItem(ORIGINAL_USER_KEY, originalUser.id);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToImpersonate));
        return userToImpersonate;
    }
    return null;
};

export const stopImpersonating = (): User | null => {
    const originalUserId = localStorage.getItem(ORIGINAL_USER_KEY);
    if (!originalUserId) {
        return null;
    }
    const originalUser = getUserById(originalUserId);
    if (originalUser) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(originalUser));
        localStorage.removeItem(ORIGINAL_USER_KEY);
        return originalUser;
    }
    return null;
};

export const getTeamMembers = (managerId: string): User[] => {
  const users = getUsers();
  return users.filter(user =>
    user.role === UserRole.EMPLOYEE && (
      user.managerId === managerId || (Array.isArray(user.managerIds) && user.managerIds.includes(managerId))
    )
  );
};

export const getManagers = (): User[] => {
    const users = getUsers();
    return users.filter(user => user.role === UserRole.MANAGER);
};

export const getToken = (): string | null => { 
    return localStorage.getItem(TOKEN_KEY);
};