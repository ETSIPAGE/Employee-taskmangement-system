import { User, UserRole } from '../types'; // Ensure User and UserRole are imported

// CORRECTED: RegisterCredentials interface to match what UserManagement.tsx passes
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole; // Added for UserManagement.tsx
  managerId?: string; // Added for UserManagement.tsx
  departmentIds?: string[]; // Added for UserManagement.tsx
  companyId?: string; // Added for UserManagement.tsx
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
    return [
        {
            id: '1', name: 'Admin User', email: 'admin@test.com', role: UserRole.ADMIN, companyId: 'comp-1', departmentIds: ['dept-1'],
            jobTitle: 'Administrator', status: 'Active', joinedDate: '2022-01-10T00:00:00.000Z',
            skills: ['System Admin', 'Database Mgmt', 'Security'],
            stats: { completedTasks: 5, inProgressTasks: 1, efficiency: 95, totalHours: 45, workload: 'Light' },
            rating: 9.5,
            createdAt: '2022-01-10T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '2', name: 'Manager User', email: 'manager@test.com', role: UserRole.MANAGER, companyId: 'comp-1', departmentIds: ['dept-7', 'dept-5'],
            jobTitle: 'Project Manager', status: 'Active', joinedDate: '2022-05-20T00:00:00.000Z',
            skills: ['Agile', 'Scrum', 'JIRA', 'Leadership'],
            stats: { completedTasks: 25, inProgressTasks: 5, efficiency: 91, totalHours: 350, workload: 'Normal' },
            rating: 9.1,
            personalDetails: {
                dateOfBirth: '1985-08-15T00:00:00.000Z',
                nationality: 'American',
                maritalStatus: 'Married',
                gender: 'Female',
            },
            contactNumber: '+1 123-456-7890',
            address: {
                street: '456 Oak Avenue',
                city: 'Metropolis',
                state: 'CA',
                zipCode: '90210',
                country: 'USA'
            },
            familyMembers: [
                { id: 'fm-1', name: 'John Doe', relationship: 'Spouse', dateOfBirth: '1984-07-20T00:00:00.000Z' }
            ],
            education: [
                { id: 'edu-1', degree: 'MBA', institution: 'State University', yearOfCompletion: 2010 }
            ],
            compensation: {
                salary: 120000,
                payFrequency: 'Monthly',
                bankDetails: {
                    bankName: 'Metropolis Bank',
                    accountNumber: '**** **** **** 1234',
                    ifscCode: 'METB00001'
                }
            },
            documents: [
                { id: 'doc-1', name: 'Passport', status: 'Verified' },
                { id: 'doc-2', name: 'Degree Certificate', status: 'Submitted' },
                { id: 'doc-3', name: 'Address Proof', status: 'Pending' }
            ],
            createdAt: '2022-05-20T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '3', name: 'Drone TV', email: 'drone@example.com', role: UserRole.EMPLOYEE, managerId: '2', companyId: 'comp-1', departmentIds: ['dept-7'],
            jobTitle: 'Developer', status: 'Active', joinedDate: '2024-01-15T00:00:00.000Z',
            skills: ['React', 'TypeScript', 'Node.js', 'Python'],
            stats: { completedTasks: 12, inProgressTasks: 3, efficiency: 92, totalHours: 156, workload: 'Normal' },
            rating: 9.2,
            personalDetails: {
                dateOfBirth: '1992-03-22T00:00:00.000Z',
                nationality: 'Canadian',
                maritalStatus: 'Single',
                gender: 'Male',
            },
            contactNumber: '+1 987-654-3210',
            address: {
                street: '123 Maple Street',
                city: 'Toronto',
                state: 'ON',
                zipCode: 'M5V 2E9',
                country: 'Canada'
            },
            education: [
                { id: 'edu-2', degree: 'B.Sc. Computer Science', institution: 'University of Toronto', yearOfCompletion: 2014 }
            ],
            compensation: {
                salary: 95000,
                payFrequency: 'Bi-Weekly',
                bankDetails: {
                    bankName: 'CIBC',
                    accountNumber: '**** **** **** 5678',
                    ifscCode: 'CIBCCATT'
                }
            },
            documents: [
                { id: 'doc-4', name: 'Work Permit', status: 'Verified' },
                { id: 'doc-5', name: 'Address Proof', status: 'Submitted' },
            ],
            createdAt: '2024-01-15T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '4', name: 'Sarah Chen', email: 'sarah.chen@example.com', role: UserRole.EMPLOYEE, managerId: '2', companyId: 'comp-1', departmentIds: ['dept-5'],
            jobTitle: 'Designer', status: 'Active', joinedDate: '2024-02-01T00:00:00.000Z',
            skills: ['UI/UX', 'Figma', 'Adobe Creative Suite', 'Prototyping'],
            stats: { completedTasks: 8, inProgressTasks: 2, efficiency: 88, totalHours: 98, workload: 'Light' },
            rating: 8.8,
            createdAt: '2024-02-01T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '5', name: 'Mike Rodriguez', email: 'mike.rodriguez@example.com', role: UserRole.EMPLOYEE, managerId: '2', companyId: 'comp-1', departmentIds: ['dept-7'],
            jobTitle: 'Developer', status: 'Busy', joinedDate: '2023-11-10T00:00:00.000Z',
            skills: ['Vue.js', 'Python', 'Docker', 'AWS'],
            stats: { completedTasks: 18, inProgressTasks: 4, efficiency: 85, totalHours: 234, workload: 'Heavy' },
            rating: 8.5,
            createdAt: '2023-11-10T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '6', name: 'Jessica Brown', email: 'jessica.b@test.com', role: UserRole.EMPLOYEE, managerId: '2', companyId: 'comp-1', departmentIds: ['dept-7'],
            jobTitle: 'QA Engineer', status: 'Offline', joinedDate: '2023-03-12T00:00:00.000Z',
            skills: ['Jest', 'Cypress', 'Automation', 'CI/CD'],
            stats: { completedTasks: 35, inProgressTasks: 1, efficiency: 98, totalHours: 180, workload: 'Light' },
            rating: 9.8,
            createdAt: '2023-03-12T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '7', name: 'David Miller', email: 'david.m@test.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', departmentIds: ['dept-7'], // Belongs to no manager
            jobTitle: 'DevOps Engineer', status: 'Active', joinedDate: '2022-08-01T00:00:00.000Z',
            skills: ['Kubernetes', 'Terraform', 'Jenkins', 'GCP'],
            stats: { completedTasks: 22, inProgressTasks: 2, efficiency: 93, totalHours: 210, workload: 'Normal' },
            rating: 9.3,
            createdAt: '2022-08-01T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
        {
            id: '8', name: 'HR User', email: 'hr@test.com', role: UserRole.HR, companyId: 'comp-1', departmentIds: ['dept-3'],
            jobTitle: 'HR Specialist', status: 'Active', joinedDate: '2023-01-10T00:00:00.000Z',
            skills: ['Recruiting', 'Onboarding', 'Employee Relations'],
            stats: { completedTasks: 10, inProgressTasks: 2, efficiency: 96, totalHours: 40, workload: 'Normal' },
            rating: 9.6,
            createdAt: '2023-01-10T00:00:00.000Z',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
        },
    ];
};

export const getUsers = (): User[] => {
  const usersJson = localStorage.getItem(USERS_KEY);
  if (usersJson) {
    return JSON.parse(usersJson);
  }
  const initialUsers = getInitialUsers();
  localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  return initialUsers;
};

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const nameFromEmail = (email: string): string => {
    const [namePart] = email.split('@');
    return namePart.split(/[\._-]/)
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                   .join(' ');
};

export const register = async (credentials: RegisterCredentials): Promise<User> => {
    // Step 1: Call the backend API to register the user.
    // The backend API might not handle all fields like role, managerId, etc., directly on signup
    // It's common for signup to create a basic user, and then a separate update call is made.
    const apiResponse = await fetch('https://y6rtqrl50i.execute-api.ap-south-1.amazonaws.com/ETS-auth-dev/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: credentials.name,
            email: credentials.email,
            password: credentials.password,
            // Assuming your backend API *can* also accept these fields.
            // If not, you'd register basic user, then update locally/via another API.
            role: credentials.role,
            companyId: credentials.companyId,
            managerId: credentials.managerId,
            departmentIds: credentials.departmentIds,
        }),
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        throw new Error(responseData.message || 'Registration failed.');
    }

    // Step 2: Store the received token.
    localStorage.setItem(TOKEN_KEY, responseData.token);

    // Step 3: Create a parallel user record in the frontend's local storage.
    const users = getUsers();
    const existingUser = users.find(u => u.email === credentials.email);

    if (existingUser) {
        console.warn('User already exists locally. Logging them in instead.');
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(existingUser));
        return existingUser;
    }

    const newUser: User = {
        id: responseData.userId || `user-${Date.now()}`, // Use ID from API if provided, else generate
        name: credentials.name,
        email: credentials.email,
        role: credentials.role, // Use the role from credentials
        status: 'Active',
        joinedDate: new Date().toISOString(),
        jobTitle: 'New Employee', // Default
        skills: [], // Default
        stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' }, // Default
        createdAt: new Date().toISOString(), // ADDED: createdAt
        avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Default
        companyId: credentials.companyId, // Set from credentials
        managerId: credentials.managerId, // Set from credentials
        departmentIds: credentials.departmentIds, // Set from credentials
    };
    
    users.push(newUser);
    saveUsers(users);

    // Step 4: Set the new user as the current user for the session.
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>): User | undefined => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        const updatedUser = { ...users[userIndex], ...updates };
        users[userIndex] = updatedUser;
        saveUsers(users);

        const currentUserJson = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUserJson) {
            const currentUser = JSON.parse(currentUserJson) as User;
            if (currentUser.id === userId) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
            }
        }

        return updatedUser;
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

    const responseData = await response.json();

    if (!response.ok) {
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
        
        const name = nameFromEmail(email);
        
        sessionUser = {
            id: apiUserId, // Use ID from API
            name: name,
            email: email,
            role: apiRole, // Use role from API
            status: 'Active',
            joinedDate: new Date().toISOString(),
            createdAt: new Date().toISOString(), // ADDED: createdAt
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Default
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

// --- ADDED: getToken function ---
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};
// --- END ADDED ---

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
  return users.filter(user => user.role === UserRole.EMPLOYEE && user.managerId === managerId);
};

export const getManagers = (): User[] => {
    const users = getUsers();
    return users.filter(user => user.role === UserRole.MANAGER);
};