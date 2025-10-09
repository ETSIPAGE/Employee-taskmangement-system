import { ApiResponse, ErrorResponse, User, UserRole } from '../types';
const API_URL = "https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev";
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managerId?: string;
  departmentIds?: string[];
  companyIds?: string[];
  managerIds?: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

const USERS_KEY = 'ets_users';
const CURRENT_USER_KEY = 'ets_current_user';
const PASSWORDS_KEY = 'ets_passwords';

const getInitialPasswords = (): Record<string, string> => {
    return {
        'admin@test.com': 'password123',
        'manager@test.com': 'password123',
        'drone@example.com': 'password123',
        'sarah.chen@example.com': 'password123',
        'mike.rodriguez@example.com': 'password123',
        'jessica.b@test.com': 'password123',
        'david.m@test.com': 'password123',
        'employee@test.com': 'password123',
        'hr@test.com': 'password123',
    };
};

const getPasswords = (): Record<string, string> => {
    const passwordsJson = localStorage.getItem(PASSWORDS_KEY);
    if(passwordsJson) {
        return JSON.parse(passwordsJson);
    }
    const initialPasswords = getInitialPasswords();
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(initialPasswords));
    return initialPasswords;
}

const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const savePasswords = (passwords: Record<string, string>) => {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
}

export const updatePassword = (email: string, oldPass: string, newPass: string): void => {
    const passwords = getPasswords();
    if (passwords[email] !== oldPass) {
        throw new Error("Incorrect current password.");
    }
    if (newPass.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
    }
    passwords[email] = newPass;
    savePasswords(passwords);
};

export const login = async (email: LoginCredentials['email'], password: LoginCredentials['password']): Promise<User> => {
  const users = await getUsers();
  const passwords = getPasswords();
  const user = users.find(u => u.email === email);
  
  const storedPassword = passwords[email];

  if (!user || storedPassword !== password) {
    throw new Error('Invalid email or password.');
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
};

export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = async(): Promise<User> => {
  // Prime the user and password stores if they don't exist
  await getUsers();
  getPasswords();
  
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
};

// export const getUserById = (userId: string): User | undefined => {
//     const users = getUsers();
//     return users.find(u => u.id === userId);
// };

// export const getTeamMembers = (managerId: string): User[] => {
//   const users = getUsers();
//   return users.filter(user => user.role === UserRole.EMPLOYEE && user.managerId === managerId);
// };

// export const getManagers = (): User[] => {
//     const users = getUsers();
//     return users.filter(user => user.role === UserRole.MANAGER);
// };
// src/services/authService.api.ts
// import { User, UserRole } from "../types";

    export const getUsers = async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`);
    // console.log(res);
    if (!res.ok) throw new Error("Failed to fetch users");
    const usersJson = localStorage.getItem(USERS_KEY);
    // console.log("usersJson",usersJson);
  if (usersJson) {
    return JSON.parse(usersJson);
  }
//   const initialUsers = getInitialUsers();
  const initialUsers= await res.json();
  console.log("data",initialUsers);
  localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
    };

    export const  getCompanies = async() => {
        const res = await fetch("https://j5dfp9hh9k.execute-api.ap-south-1.amazonaws.com/del/Ets-Create-Com-pz"); // 👈 replace with your API endpoint
        if (!res.ok) throw new Error("Failed to fetch companies");
        const data = await res.json();
        console.log("data",data)
        return data;
    }

   export const  getDepartments = async()=> {
        const res = await fetch("https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/"); // 👈 replace with your endpoint
        if (!res.ok) throw new Error("Failed to fetch departments");
        const data = await res.json();    
        return data;
    }

export const register = async (credentials: RegisterCredentials): Promise<User> => {
      const users = await getUsers();
  const passwords = getPasswords();
  if (users.find(u => u.email === credentials.email)) {
    throw new Error('An account with this email already exists.');
  }
  const res = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw new Error("Failed to register user");
  let newUser = await res.json();
  users.push(newUser);
  passwords[credentials.email] = credentials.password;
  saveUsers(users);
  savePasswords(passwords);
//   localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
  return newUser;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<User> => {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
};

export const deleteUser = async (userId: string): Promise<ApiResponse> => {
    const res = await fetch(`${API_URL}/users`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: userId }),
    });
    const responseData: ApiResponse = await res.json();
    if (!res.ok) {
      throw new Error((responseData as ErrorResponse).message || (responseData as ErrorResponse).error || "Failed to delete user");
    }
    return responseData;
  };



export const getUserById = async (userId: string): Promise<User> => {
//   const res = await fetch(`${API_URL}/users/${userId}`);
//   if (!res.ok) throw new Error("Failed to fetch user");
  const users = await getUsers();
  return users.find(u => u.id === userId);
//   return res.json();
};

export const getManagers = async (): Promise<User[]> => {
  const users = await getUsers();
  return users.filter((u) => u.role === UserRole.MANAGER);
};

export const getTeamMembers = async (managerId: string): Promise<User[]> => {
  const users = await getUsers();
  return users.filter((u) => u.role === UserRole.EMPLOYEE && u.managerId === managerId);
};
