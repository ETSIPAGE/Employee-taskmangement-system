import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, OnboardingStepStatus, Company, User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as AuthService from './authService'; // Assuming AuthService is available for token

// Helper to parse API Gateway responses
const parseApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (typeof data.body === 'string') {
        try {
            return JSON.parse(data.body);
        } catch (e) {
            console.error("Failed to parse API response body (string):", e);
            throw new Error("Invalid JSON in API response body (string parsing failed).");
        }
    }
    return data;
};

// Helper to robustly extract an array from a potentially nested API response.
const extractArrayFromApiResponse = (data: any, primaryKey: string): any[] => {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object') {
        const possibleKeys = [primaryKey, 'items', 'Items', 'data', 'body'];
        for (const key of possibleKeys) {
            if (Array.isArray(data[key])) {
                return data[key];
            }
            if (data[key] && typeof data[key] === 'object' && Array.isArray(data[key][primaryKey])) {
                return data[key][primaryKey];
            }
            if (data[key] && typeof data[key] === 'object' && Array.isArray(data[key]['items'])) {
                return data[key]['items'];
            }
        }
        const arrayValue = Object.values(data).find(value => Array.isArray(value));
        if (arrayValue && Array.isArray(arrayValue)) {
            return arrayValue;
        }
    }
    console.warn(`[DataService-Extract-${primaryKey}] Could not extract array from API response for key "${primaryKey}". Response was:`, JSON.stringify(data, null, 2));
    return [];
};


// --- COMPANIES ---
let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' }
];

const COMPANIES_API_URL = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com';
let companiesLoadPromise: Promise<void> | null = null;

const initializeCompanies = async (): Promise<void> => {
    if (companiesLoadPromise) {
        return companiesLoadPromise;
    }

    companiesLoadPromise = (async () => {
        try {
            console.log(`[DataService] Attempting to fetch companies...`);
            const response = await fetch(COMPANIES_API_URL);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DataService] Failed to fetch companies: ${response.status} ${response.statusText}. Response: ${errorText}`);
                console.warn('[DataService] Using initial mock company data as fallback due to API error.');
                return;
            }

            const apiResponse: unknown = await parseApiResponse(response);
            const companiesToProcess = extractArrayFromApiResponse(apiResponse, 'companies');

            const fetchedCompanies: Company[] = companiesToProcess
                .map(item => ({
                    id: item.id || item._id || uuidv4(),
                    name: item.name,
                    ownerId: item.ownerId || '1',
                    createdAt: item.createdAt || new Date().toISOString(),
                }))
                .filter(company => company.name && company.id);

            if (fetchedCompanies.length > 0) {
                console.log(`[DataService] Companies successfully fetched. Total: ${fetchedCompanies.length}`);
                COMPANIES = fetchedCompanies;
            } else {
                console.warn('[DataService] Fetched companies array is empty. Retaining initial mock company data.');
            }
        } catch (error) {
            console.error('[DataService] Error during company fetch (network or parsing):', error);
            console.warn('[DataService] Using initial mock company data as fallback due to network or parsing error.');
        }
    })();

    return companiesLoadPromise;
};

initializeCompanies();


// --- DEPARTMENTS ---
let DEPARTMENTS: Department[] = [
    { id: 'dept-1', name: 'Administration', companyId: 'comp-1' },
    { id: 'dept-2', name: 'Finance & Accounting', companyId: 'comp-1' },
    { id: 'dept-3', name: 'Human Resources (HR)', companyId: 'comp-1' },
    { id: 'dept-4', name: 'Operations', companyId: 'comp-1' },
    { id: 'dept-5', name: 'Marketing', companyId: 'comp-1' },
    { id: 'dept-6', name: 'Sales', companyId: 'comp-1' },
    { id: 'dept-7', name: 'Information Technology (IT)', companyId: 'comp-1' },
    { id: 'dept-8', name: 'Customer Service', companyId: 'comp-1' },
];

const DEPARTMENTS_API_URL = 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod';
let departmentsLoadPromise: Promise<void> | null = null;

const initializeDepartments = async (): Promise<void> => {
    if (departmentsLoadPromise) {
        return departmentsLoadPromise;
    }

    departmentsLoadPromise = (async () => {
        try {
            console.log(`[DataService] Attempting to fetch departments...`);
            const response = await fetch(DEPARTMENTS_API_URL);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DataService] Failed to fetch departments: ${response.status} ${response.statusText}. Response: ${errorText}`);
                console.warn('[DataService] Using initial mock department data as fallback due to API error.');
                return;
            }

            const apiResponse: unknown = await parseApiResponse(response);
            const departmentsToProcess = extractArrayFromApiResponse(apiResponse, 'departments');

            const fetchedDepartments: Department[] = departmentsToProcess
                .map(item => ({
                    id: item.id || item._id || uuidv4(),
                    name: item.name,
                    companyId: item.companyId || item.company_id || 'comp-1',
                }))
                .filter(dept => dept.name && dept.id && dept.companyId);

            if (fetchedDepartments.length > 0) {
                console.log(`[DataService] Departments successfully fetched. Total: ${fetchedDepartments.length}`);
                DEPARTMENTS = fetchedDepartments;
            } else {
                console.warn('[DataService] Fetched departments array is empty. Retaining initial mock department data.');
            }
        } catch (error) {
            console.error('[DataService] Error during department fetch (network or parsing):', error);
            console.warn('[DataService] Using initial mock department data as fallback due to network or parsing error.');
        }
    })();

    return departmentsLoadPromise;
};

initializeDepartments();


// --- USERS ---
let USERS: User[] = [
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: UserRole.ADMIN, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '2', name: 'Manager John Doe', email: 'john.doe@example.com', role: UserRole.MANAGER, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '3', name: 'Employee Alice', email: 'alice@example.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '4', name: 'Employee Bob', email: 'bob@example.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '5', name: 'Employee Charlie', email: 'charlie@example.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '6', name: 'HR Sarah', email: 'sarah@example.com', role: UserRole.HR, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '7', name: 'Manager David', email: 'david@example.com', role: UserRole.MANAGER, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '8', name: 'Engineer Emily', email: 'emily@example.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
    { id: '9', name: 'Sales Mark', email: 'mark@example.com', role: UserRole.EMPLOYEE, companyId: 'comp-1', joinedDate: '2023-01-01T00:00:00.000Z' },
];

const USERS_API_URL = 'https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev/users';
let usersLoadPromise: Promise<void> | null = null;

const initializeUsers = async (): Promise<void> => {
    if (usersLoadPromise) {
        return usersLoadPromise;
    }

    usersLoadPromise = (async () => {
        try {
            console.log(`[DataService] Attempting to fetch users...`);
            const response = await fetch(USERS_API_URL);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DataService] Failed to fetch users: ${response.status} ${response.statusText}. Response: ${errorText}`);
                console.warn('[DataService] Using initial mock user data as fallback due to API error.');
                return;
            }

            const apiResponse: unknown = await parseApiResponse(response);
            const usersToProcess = extractArrayFromApiResponse(apiResponse, 'users');

            const fetchedUsers: User[] = usersToProcess
                .map(item => ({
                    id: item.id || item._id || uuidv4(),
                    name: item.name || 'Unknown User',
                    email: item.email || 'unknown@example.com',
                    role: item.role || UserRole.EMPLOYEE,
                    companyId: item.companyId || item.company_id || 'comp-1',
                    status: item.status || 'Active',
                    joinedDate: item.joinedDate || new Date().toISOString(),
                    jobTitle: item.jobTitle || 'Employee',
                    skills: item.skills || [],
                    managerId: item.managerId || undefined,
                    departmentIds: item.departmentIds || [],
                    stats: item.stats || { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' },
                    rating: item.rating || 0,
                    personalDetails: item.personalDetails,
                    contactNumber: item.contactNumber,
                    address: item.address,
                    familyMembers: item.familyMembers || [],
                    education: item.education || [],
                    compensation: item.compensation,
                    documents: item.documents || [],
                }))
                .filter(user => user.name && user.email && user.id && user.role);

            if (fetchedUsers.length > 0) {
                console.log(`[DataService] Users successfully fetched. Total: ${fetchedUsers.length}`);
                USERS = fetchedUsers;
            } else {
                console.warn('[DataService] Fetched users array is empty. Retaining initial mock user data.');
            }
        } catch (error) {
            console.error('[DataService] Error during user fetch (network or parsing):', error);
            console.warn('[DataService] Using initial mock user data as fallback due to network or parsing error.');
        }
    })();

    return usersLoadPromise;
};

initializeUsers();


// --- PROJECTS ---
let PROJECTS: Project[] = [
    {
        id: 'proj-1',
        name: 'Q3 Marketing Campaign',
        description: 'A comprehensive marketing campaign for the third quarter.',
        managerId: '2',
        departmentIds: ['dept-5'],
        deadline: '2025-09-30',
        priority: 'high',
        estimatedTime: 120,
        companyId: 'comp-1',
        roadmap: [],
        createdAt: '2024-07-01T08:00:00.000Z'
    },
    {
        id: 'proj-2',
        name: 'New Website Launch',
        description: 'Launch of the new corporate website with e-commerce functionality.',
        managerId: '2',
        departmentIds: ['dept-7', 'dept-5'],
        deadline: '2025-09-15',
        priority: 'high',
        estimatedTime: 300,
        companyId: 'comp-1',
        roadmap: [
            { id: 'm1', name: 'Phase 1: Discovery & Planning', description: 'Gather requirements and plan project structure.', startDate: '2025-07-01', endDate: '2025-07-15', status: MilestoneStatus.COMPLETED },
            { id: 'm2', name: 'Phase 2: Design', description: 'UI/UX design and mockups.', startDate: '2025-07-16', endDate: '2025-08-05', status: MilestoneStatus.COMPLETED },
            { id: 'm3', name: 'Phase 3: Development', description: 'Frontend and backend development.', startDate: '2025-08-06', endDate: '2025-09-01', status: MilestoneStatus.IN_PROGRESS },
            { id: 'm4', name: 'Phase 4: Testing & Deployment', description: 'QA, UAT, and final launch.', startDate: '2025-09-02', endDate: '2025-09-15', status: MilestoneStatus.PENDING },
        ],
        createdAt: '2024-06-25T10:00:00.000Z'
    },
    {
        id: 'proj-3',
        name: 'HR Portal Update',
        description: 'Update the internal HR portal with new features for employees.',
        managerId: '2',
        departmentIds: ['dept-3', 'dept-7'],
        deadline: '2024-09-15',
        priority: 'medium',
        estimatedTime: 80,
        companyId: 'comp-1',
        roadmap: [],
        createdAt: '2024-05-20T09:00:00.000Z'
    },
    {
        id: 'proj-4',
        name: 'Mobile App V2',
        description: 'Version 2 of the customer-facing mobile application.',
        managerId: '2',
        departmentIds: ['dept-7'],
        deadline: '2024-10-31',
        priority: 'medium',
        estimatedTime: 250,
        companyId: 'comp-1',
        roadmap: [],
        createdAt: '2024-04-10T13:00:00.000Z'
    },
];

// This constant was missing from dataService.ts but used in Projects.tsx
const PROJECTS_GET_ALL_API_URL = 'https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects';

// The UPDATE_PROJECT_API_BASE_URL is assumed to *not* require the ID in the path, but in the body.
const UPDATE_PROJECT_API_BASE_URL = 'https://ikwfgdgtzk.execute-api.ap-south-1.amazonaws.com/udt/updt-project';
const CREATE_PROJECT_API_URL = 'https://your-create-project-api-url.execute-api.ap-south-1.amazonaws.com/create/create-project'; // Placeholder
const DELETE_PROJECT_API_URL = 'https://your-delete-project-api-url.execute-api.ap-south-1.amazonaws.com/del/del-project'; // Placeholder

let projectsLoadPromise: Promise<void> | null = null;

// Modified initializeProjects to accept forceRefresh
const initializeProjects = async (forceRefresh: boolean = false): Promise<void> => {
    // If there's an ongoing fetch and we're not forcing a refresh, return the existing promise
    if (projectsLoadPromise && !forceRefresh) {
        return projectsLoadPromise;
    }

    // Otherwise, start a new fetch
    projectsLoadPromise = (async () => {
        try {
            console.log(`[DataService] Attempting to fetch all projects from API. Force Refresh: ${forceRefresh}`);
            const response = await fetch(PROJECTS_GET_ALL_API_URL); // Use the correct GET_ALL URL

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DataService] Failed to fetch projects: ${response.status} ${response.statusText}. Response: ${errorText}`);
                console.warn('[DataService] Using initial mock project data as fallback due to API error.');
                return;
            }

            const apiResponse: unknown = await parseApiResponse(response);
            const projectsToProcess = extractArrayFromApiResponse(apiResponse, 'projects');

            const fetchedProjects: Project[] = projectsToProcess
                .map(item => ({
                    id: item.id || item._id || uuidv4(),
                    name: item.name,
                    description: item.description || '',
                    managerId: item.managerId ? String(item.managerId).trim() : '',
                    departmentIds: item.departmentIds || [],
                    deadline: item.deadline || '',
                    priority: item.priority || 'medium',
                    estimatedTime: item.estimatedTime ? Number(item.estimatedTime) : undefined,
                    companyId: item.companyId || 'comp-1',
                    roadmap: item.roadmap || [],
                    createdAt: item.createdAt || new Date().toISOString(),
                    createdBy: item.createdBy || undefined,
                }))
                .filter(project => project.name && project.id && project.managerId && project.companyId);

            if (fetchedProjects.length > 0) {
                console.log(`[DataService] Projects successfully fetched. Total: ${fetchedProjects.length}`);
                PROJECTS = fetchedProjects; // Update the cache
            } else {
                console.warn('[DataService] Fetched projects array is empty. Retaining initial mock project data.');
            }
        } catch (error) {
            console.error('[DataService] Error during project fetch (network or parsing):', error);
            console.warn('[DataService] Using initial mock project data as fallback due to network or parsing error.');
        } finally {
            // The promise itself (`projectsLoadPromise`) will only resolve/reject once.
            // A new promise is created on subsequent calls if `!forceRefresh` condition is met.
        }
    })();
    return projectsLoadPromise;
};

// Initial call without forceRefresh
initializeProjects();

// **NEW FUNCTION:** Explicitly refresh the projects cache from the API
export const refreshAllProjectsCache = async (): Promise<void> => {
    // Force initializeProjects to re-fetch from the API
    await initializeProjects(true);
};


// --- PROJECT FUNCTIONS ---
// Modified getAllProjects to use initializeProjects with forceRefresh
export const getAllProjects = async (forceRefresh: boolean = false): Promise<Project[]> => {
    await initializeProjects(forceRefresh); // Use initializeProjects here
    return [...PROJECTS];
};

export const getProjectsByManager = async (managerId: string): Promise<Project[]> => {
    await initializeProjects(true); // Force refresh to ensure latest data
    return PROJECTS.filter(p => p.managerId === managerId);
};

export const getProjectsByCompany = async (companyId: string): Promise<Project[]> => {
    await initializeProjects(true); // Force refresh to ensure latest data
    return PROJECTS.filter(p => p.companyId === companyId);
};

export const getProjectsByDepartment = async (departmentId: string): Promise<Project[]> => {
    await initializeProjects(true); // Force refresh to ensure latest data
    return PROJECTS.filter(p => p.departmentIds.includes(departmentId));
};

// --- MODIFIED getProjectById ---
export const getProjectById = async (id: string): Promise<Project | undefined> => {
    // CRITICAL: Force a refresh of the PROJECTS cache from the API
    // This ensures that when ProjectDetail calls this, it gets the latest data
    await initializeProjects(true);
    console.log(`[DataService] getProjectById(${id}) called. Searching in ${PROJECTS.length} projects after refresh.`);
    const foundProject = PROJECTS.find(p => p.id === id);
    console.log(`[DataService] getProjectById(${id}) found:`, !!foundProject ? foundProject.name : 'No project');
    return foundProject;
};

export const createProject = async (projectData: Omit<Project, 'id' | 'roadmap' | 'createdAt'>): Promise<Project> => {
    const now = new Date().toISOString();
    const newProject: Project = {
        id: uuidv4(),
        ...projectData,
        roadmap: [],
        createdAt: now,
    };

    // --- API Call for creating a project ---
    try {
        console.log(`[DataService] Attempting to create project via API at ${CREATE_PROJECT_API_URL}`);
        const token = AuthService.getToken(); // Get token
        const response = await fetch(CREATE_PROJECT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(newProject),
        });
        const apiResponseData = await parseApiResponse(response);

        if (apiResponseData && apiResponseData.id) {
            newProject.id = apiResponseData.id;
            if (apiResponseData.createdAt) newProject.createdAt = apiResponseData.createdAt;
        }
        await initializeProjects(true); // *** CRITICAL: Refresh cache after successful API write ***
    } catch (error) {
        console.error(`[DataService] Failed to create project via API:`, error);
        // If API fails, consider reverting local state or not adding newProject to PROJECTS
        // For now, it will use the newProject locally even if API failed
    }

    // New projects are now added via initializeProjects(true)
    console.log("[DataService] createProject: New project added (via initializeProjects(true) or mock fallback):", newProject);
    return newProject;
};

export const deleteProject = async (projectId: string): Promise<void> => {
    // --- API Call for deleting a project ---
    try {
        console.log(`[DataService] Attempting to delete project ${projectId} via API at ${DELETE_PROJECT_API_URL}`); // URL without ID placeholder
        const token = AuthService.getToken(); // Get token
        const deletePayload = { id: projectId }; // Assuming backend expects ID in body for DELETE

        const response = await fetch(DELETE_PROJECT_API_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(deletePayload),
        });
        await parseApiResponse(response);
        await initializeProjects(true); // *** CRITICAL: Refresh cache after successful API write ***
    } catch (error) {
        console.error(`[DataService] Failed to delete project ${projectId} via API:`, error);
        throw error;
    }
};


// --- TASKS ---
let TASKS: Task[] = [
    { id: 'task-1', creatorId: '2', name: 'Draft campaign brief', description: 'Create the initial brief document for the Q3 campaign.', dueDate: '2025-08-10', projectId: 'proj-1', assigneeId: '3', status: TaskStatus.COMPLETED, category: 'Planning', priority: 'high', tags: ['brief', 'marketing', 'q3'], estimatedTime: 8 },
    { id: 'task-2', creatorId: '2', name: 'Design social media assets', description: 'Create graphics for Facebook, Twitter, and Instagram.', dueDate: '2025-08-15', projectId: 'proj-1', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'medium', tags: ['graphics', 'social media'], estimatedTime: 16 },
    { id: 'task-3', creatorId: '2', name: 'Develop ad copy', description: 'Write compelling copy for all digital ads.', dueDate: '2025-08-20', projectId: 'proj-1', assigneeId: '3', status: TaskStatus.IN_PROGRESS, category: 'Content', priority: 'medium', tags: ['copywriting', 'ads'],
        notes: [
            { id: 'note-1', authorId: '3', content: 'Initial drafts are done. Waiting for feedback from Sarah.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
            { id: 'note-2', authorId: '2', content: 'Good start. Let\'s refine the headline for ad set A.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }
        ],
        estimatedTime: 12
    },
    {
        id: 'task-4', creatorId: '2',
        name: 'Schedule posts',
        description: 'Use the scheduling tool to plan all posts for the month.',
        dueDate: '2025-08-25',
        projectId: 'proj-1',
        assigneeId: '5',
        status: TaskStatus.ON_HOLD,
        category: 'Execution',
        priority: 'low',
        tags: ['scheduling', 'social media'],
        estimatedTime: 4,
        dependency: { userId: '4', reason: 'Awaiting approval on ad copy from Sarah Chen.' },
        dependencyLogs: [
            {
                authorId: '2',
                action: 'set',
                reason: 'Awaiting approval on ad copy from Sarah Chen.',
                dependencyOnUserId: '4',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
            }
        ]
    },
    { id: 'task-5', creatorId: '2', name: 'Finalize homepage design', description: 'Get final approval on the new homepage mockups.', dueDate: '2025-08-05', projectId: 'proj-2', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'high', tags: ['ui', 'ux', 'website'], estimatedTime: 24 },
    { id: 'task-6', creatorId: '2', name: 'Develop backend API', description: 'Build out all necessary endpoints for the website.', dueDate: '2025-09-01', projectId: 'proj-2', assigneeId: '5', status: TaskStatus.IN_PROGRESS, category: 'Development', priority: 'high', tags: ['api', 'backend'], estimatedTime: 80 },
    {
        id: 'task-7', creatorId: '2',
        name: 'User acceptance testing',
        description: 'Conduct UAT with a focus group.',
        dueDate: '2025-09-10',
        projectId: 'proj-2',
        assigneeId: '6',
        status: TaskStatus.ON_HOLD,
        category: 'QA',
        priority: 'medium',
        tags: ['testing', 'uat'],
        estimatedTime: 20,
        dependency: { userId: '2', reason: 'Waiting for manager to provide the list of UAT participants.' },
        dependencyLogs: [
            {
                authorId: '2',
                action: 'set',
                reason: 'Waiting for manager to provide the list of UAT participants.',
                dependencyOnUserId: '2',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
            }
        ]
    },
    { id: 'task-8', creatorId: '2', name: 'Deploy to production', description: 'Push the final code to the live servers.', dueDate: '2025-09-15', projectId: 'proj-2', assigneeId: '5', status: TaskStatus.TODO, category: 'DevOps', priority: 'high', tags: ['deployment', 'production'], estimatedTime: 8 },
    { id: 'task-9', creatorId: '2', name: 'Create User Documentation', description: 'Develop comprehensive user guides for all dashboards and features.', dueDate: '2025-08-24', projectId: 'proj-2', assigneeId: undefined, status: TaskStatus.TODO, category: 'Documentation', priority: 'medium', tags: ['documentation', 'user', 'guides'], estimatedTime: 16 },
    { id: 'task-10', creatorId: '2', name: 'Gather requirements', description: 'Meet with stakeholders to define project scope.', dueDate: '2024-07-25', projectId: 'proj-3', assigneeId: '3', status: TaskStatus.COMPLETED, category: 'Planning', priority: 'high', tags: ['requirements', 'stakeholders'], estimatedTime: 10 },
    { id: 'task-11', creatorId: '2', name: 'Create wireframes', description: 'Design the low-fidelity wireframes for the new portal.', dueDate: '2024-08-05', projectId: 'proj-3', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'medium', tags: ['wireframes', 'ux'], estimatedTime: 15 },
    { id: 'task-12', creatorId: '2', name: 'Implement new features', description: 'Code the new features as per the requirements.', dueDate: '2024-09-01', projectId: 'proj-3', assigneeId: undefined, status: TaskStatus.TODO, category: 'Development', priority: 'high', tags: ['coding', 'features'], estimatedTime: 40 },
    { id: 'task-13', creatorId: '2', name: 'Review and deploy', description: 'Code review and deployment of the HR portal updates.', dueDate: '2024-09-15', projectId: 'proj-3', assigneeId: '6', status: TaskStatus.TODO, category: 'DevOps', priority: 'medium', tags: ['review', 'deploy'], estimatedTime: 8 },
    { id: 'task-14', creatorId: '2', name: 'Plan new features', description: 'Roadmap planning for V2 of the mobile app.', dueDate: '2024-08-30', projectId: 'proj-4', assigneeId: '7', status: TaskStatus.IN_PROGRESS, category: 'Planning', priority: 'high', tags: ['roadmap', 'mobile'], estimatedTime: 30 },
];

const TASKS_API_URL = 'https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks';
const CREATE_TASK_API_URL = 'https://your-create-task-api-url.execute-api.ap-south-1.amazonaws.com/create/create-task'; // Placeholder
const UPDATE_TASK_API_URL = 'https://your-update-task-api-url.execute-api.ap-south-1.amazonaws.com/udt/updt-task'; // Placeholder
const DELETE_TASK_API_URL = 'https://your-delete-task-api-url.execute-api.ap-south-1.amazonaws.com/del/del-task'; // Placeholder


let tasksLoadPromise: Promise<void> | null = null;

const initializeTasks = async (): Promise<void> => {
    if (tasksLoadPromise) {
        return tasksLoadPromise;
    }

    tasksLoadPromise = (async () => {
        try {
            console.log(`[DataService-Tasks] Attempting to fetch tasks from URL: ${TASKS_API_URL}`);
            const response = await fetch(TASKS_API_URL);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[DataService-Tasks] Failed to fetch tasks: ${response.status} ${response.statusText}. Response: ${errorText}`);
                console.warn('[DataService-Tasks] Using initial mock task data as fallback due to API error.');
                return;
            }

            const rawApiResponseText = await response.text();
            console.log("[DataService-Tasks] Raw API response text:", rawApiResponseText);

            const apiResponse: unknown = await parseApiResponse(new Response(rawApiResponseText, { status: response.status, statusText: response.statusText }));
            console.log("[DataService-Tasks] API response after parseApiResponse:", JSON.stringify(apiResponse, null, 2));

            let tasksToProcess: any[] = [];

            if (Array.isArray(apiResponse)) {
                tasksToProcess = apiResponse;
                console.log("[DataService-Tasks] Parsed API response is a direct array.");
            } else if (typeof apiResponse === 'object' && apiResponse !== null) {
                if ('Tasks' in apiResponse && Array.isArray((apiResponse as any).Tasks)) {
                    tasksToProcess = (apiResponse as any).Tasks;
                    console.log("[DataService-Tasks] Found 'Tasks' key in parsed API response object. Count:", tasksToProcess.length);
                } else {
                    tasksToProcess = extractArrayFromApiResponse(apiResponse, 'tasks');
                    console.log("[DataService-Tasks] Using extractArrayFromApiResponse (general) for tasks. Count:", tasksToProcess.length);
                }
            } else {
                console.error('[DataService-Tasks] API response for tasks was not a valid object or array after parsing. Response:', apiResponse);
                console.warn('[DataService-Tasks] Using initial mock task data as fallback due to unexpected API response format.');
                return;
            }

            console.log(`[DataService-Tasks] Tasks to process before mapping (${tasksToProcess.length} items):`, JSON.stringify(tasksToProcess.slice(0, 5), null, 2));

            const fetchedTasks: Task[] = tasksToProcess
                .map(item => {
                    const taskId = item.id || item._id;
                    const mappedTask: Task = {
                        id: String(taskId) || uuidv4(),
                        name: item.title, // Map API 'title' to Task 'name'
                        description: item.description || '',
                        dueDate: item.due_date || item.deadline || '', // Map API 'due_date' or 'deadline' to Task 'dueDate'
                        projectId: String(item.project || item.project_id || ''), // Map API 'project' or 'project_id' to Task 'projectId'
                        assigneeId: String(item.assign_to || item.assignee_id || '') || undefined, // Map API 'assign_to' or 'assignee_id' to Task 'assigneeId'
                        creatorId: String(item.creatorId || item.creator_id || '1'),
                        status: item.status || TaskStatus.TODO, // Default to TODO
                        category: item.department || 'General', // Map API 'department' to Task 'category'
                        priority: item.priority || 'medium',
                        tags: item.tags || [],
                        notes: item.notes || [],
                        estimatedTime: item.est_time ? Number(item.est_time) : undefined,
                        dependency: item.dependency,
                        dependencyLogs: item.dependencyLogs || [],
                    };
                    console.log(`[DataService-Tasks] Mapped item to task (ID: ${mappedTask.id}, Name: ${mappedTask.name}, Status: ${mappedTask.status}, ProjectID: ${mappedTask.projectId})`);
                    return mappedTask;
                })
                .filter(task => {
                    const isValid = task.name && task.id && task.projectId && task.creatorId;
                    if (!isValid) {
                        console.warn(`[DataService-Tasks] Filtered out task due to missing required field. Task data: ID: ${task.id || 'N/A'}, Name: ${task.name || 'N/A'}, Project ID: ${task.projectId || 'N/A'}, Creator ID: ${task.creatorId || 'N/A'}`);
                    }
                    return isValid;
                });

            if (fetchedTasks.length > 0) {
                console.log(`[DataService-Tasks] Tasks successfully fetched and mapped. Total: ${fetchedTasks.length}. Sample (first 3):`, fetchedTasks.slice(0,3).map(t => ({id: t.id, name: t.name, status: t.status, projectId: t.projectId})));
                TASKS = fetchedTasks; // Update the global TASKS array
            } else {
                console.warn('[DataService-Tasks] Fetched tasks array is empty or all tasks were filtered out. Retaining initial mock task data.');
            }
        } catch (error) {
            console.error('[DataService-Tasks] Critical Error during task fetch (network or parsing):', error);
            console.warn('[DataService-Tasks] Using initial mock task data as fallback due to critical error.');
        }
    })();

    return tasksLoadPromise;
};

initializeTasks();


// --- ATTENDANCE DATA ---
const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');

const ATTENDANCE_DATA: Record<string, string[]> = {
    [`${year}-${month}-01`]: ['3', '4', '5', '6'],
    [`${year}-${month}-02`]: ['3', '4', '7'],
    [`${year}-${month}-03`]: ['3', '4', '5', '6', '7'],
    [`${year}-${month}-04`]: ['4', '5', '6'],
    [`${year}-${month}-05`]: ['3', '5', '6', '7'],
    [`${year}-${month}-08`]: ['3', '4', '5', '6'],
    [`${year}-${month}-09`]: ['3', '4', '7'],
    [`${year}-${month}-10`]: ['3', '4', '5', '6', '7'],
    [`${year}-${month}-11`]: ['4', '5', '6'],
    [`${year}-${month}-12`]: ['3', '5', '6', '7'],
    [`${year}-${month}-15`]: ['3', '4', '5', '6'],
    [`${year}-${month}-16`]: ['3', '4', '7'],
    [`${year}-${month}-17`]: ['3', '4', '5', '6', '7'],
    [`${year}-${month}-18`]: ['4', '5', '6'],
    [`${year}-${month}-19`]: ['3', '5', '6', '7'],
};

export const getAttendanceByDate = (date: string): string[] => {
    return ATTENDANCE_DATA[date] || [];
};

export const getAttendanceForUserByMonth = (userId: string, year: number, month: number): string[] => {
    const monthString = (month + 1).toString().padStart(2, '0');
    const presentDates: string[] = [];
    for (const date in ATTENDANCE_DATA) {
        if (date.startsWith(`${year}-${monthString}`)) {
            if (ATTENDANCE_DATA[date].includes(userId)) {
                presentDates.push(date);
            }
        }
    }
    return presentDates;
};


// --- CHAT DATA ---
let CONVERSATIONS: ChatConversation[] = [
    { id: 'conv-1', type: 'group', name: 'Project Marketing', participantIds: ['2', '3', '4', '5'], adminIds: ['2'] },
    { id: 'conv-2', type: 'group', name: 'Website Dev Team', participantIds: ['2', '4', '5', '6'], adminIds: ['2'] },
    { id: 'conv-3', type: 'direct', participantIds: ['1', '2'] },
    { id: 'conv-4', type: 'direct', participantIds: ['2', '3'] },
];

let MESSAGES: ChatMessage[] = [
    { id: 'msg-1', conversationId: 'conv-1', senderId: '2', text: 'Hey team, let\'s sync up on the Q3 campaign status.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'msg-2', conversationId: 'conv-1', senderId: '3', text: 'Sounds good. My ad copy drafts are ready for review.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString() },
    { id: 'msg-3', conversationId: 'conv-1', senderId: '4', text: 'I\'ve uploaded the first batch of social media assets to the drive.', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    { id: 'msg-4', conversationId: 'conv-3', senderId: '1', text: 'Can I get a high-level overview of the Mobile App V2 progress?', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'msg-5', conversationId: 'conv-4', senderId: '2', text: 'How are you doing with the campaign brief task?', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: 'msg-6', conversationId: 'conv-4', senderId: '3', text: 'It\'s completed! I marked it in the system.', timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
];

CONVERSATIONS.forEach(c => {
    const conversationMessages = MESSAGES.filter(m => m.conversationId === c.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    c.lastMessage = conversationMessages[0];
});

const ONLINE_USERS = new Set(['1', '3', '4', '6']);
export const isUserOnline = (userId: string) => ONLINE_USERS.has(userId);


// --- COMPANY FUNCTIONS ---
export const getCompanies = async (): Promise<Company[]> => {
    await companiesLoadPromise;
    return [...COMPANIES];
};

export const getCompanyById = async (id: string): Promise<Company | undefined> => {
    await companiesLoadPromise;
    return COMPANIES.find(c => c.id === id);
};

export const createCompany = async (name: string, ownerId: string): Promise<Company> => {
    await companiesLoadPromise;
    const newCompany: Company = {
        id: uuidv4(),
        name,
        ownerId,
        createdAt: new Date().toISOString(),
    };
    COMPANIES.unshift(newCompany);
    return newCompany;
};

// --- DEPARTMENT FUNCTIONS ---
export const getDepartments = async (): Promise<Department[]> => {
    await departmentsLoadPromise;
    return [...DEPARTMENTS];
};

export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
    await departmentsLoadPromise;
    return DEPARTMENTS.find(d => d.id === id);
};

export const createDepartment = async (name: string, companyId: string): Promise<Department> => {
    await departmentsLoadPromise;
    const newDepartment: Department = {
        id: uuidv4(),
        name,
        companyId,
    };
    DEPARTMENTS.unshift(newDepartment);
    return newDepartment;
};

// --- USER FUNCTIONS ---
export const getUsers = async (): Promise<User[]> => {
    await usersLoadPromise;
    return [...USERS];
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    await usersLoadPromise;
    return USERS.find(u => u.id === id);
};

export const getManagers = async (): Promise<User[]> => {
    await usersLoadPromise;
    return USERS.filter(u => u.role === UserRole.MANAGER);
};


// --- ONBOARDING DATA ---
let ONBOARDING_SUBMISSIONS: OnboardingSubmission[] = [
    {
        id: 'sub-1',
        submissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        email: 'new.intern@university.edu',
        fullName: 'Alex Ray',
        guardianName: 'John Ray',
        dateOfBirth: '2003-05-12T00:00:00.000Z',
        gender: 'Male',
        phone: '123-456-7890',
        altPhone: '098-765-4321',
        address: '456 University Ave, College Town, USA 12345',
        addressProof: 'address_proof.pdf',
        govtId: '1234 5678 9012',
        collegeName: 'State University of Technology',
        gradYear: 2026,
        cgpa: '8.8 / 10',
        collegeCertificates: 'transcript.pdf',
        collegeId: 'college_id.jpg',
        photo: 'profile_pic.png',
        signature: 'Alex Ray',
        workTime: '10:00',
        meetingTime: '14:00',
        declaration: true,
        languagesKnown: ['English', 'Hindi'],
        status: OnboardingStatus.PENDING_REVIEW,
    }
];

export const DEFAULT_ONBOARDING_STEPS: string[] = [
    'Review Application',
    'Verify Documents',
    'Background Check',
    'Send Offer Letter',
    'Prepare Welcome Kit',
    'Assign Manager & Team',
    'Setup IT Accounts',
];


// --- TASK FUNCTIONS ---
export const getTasks = async (): Promise<Task[]> => {
    await tasksLoadPromise;
    return [...TASKS];
};

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
    await tasksLoadPromise;
    return TASKS.filter(t => t.projectId === projectId);
};

export const getTasksByTeam = async (teamMemberIds: string[]): Promise<Task[]> => {
    await tasksLoadPromise;
    const teamSet = new Set(teamMemberIds);
    return TASKS.filter(t => (t.assigneeId && teamSet.has(t.assigneeId)) || !t.assigneeId);
};

export const getTasksByAssignee = async (assigneeId: string): Promise<Task[]> => {
    await tasksLoadPromise;
    return TASKS.filter(t => t.assigneeId === assigneeId);
};

export const getTaskById = async (taskId: string): Promise<Task | undefined> => {
    await tasksLoadPromise;
    return TASKS.find(t => t.id === taskId);
};

export const createTask = async (taskData: Omit<Task, 'id'>): Promise<Task> => {
    await tasksLoadPromise;
    const newTask: Task = {
        id: uuidv4(),
        ...taskData,
    };

    try {
        console.log(`[DataService] Attempting to create task via API at ${CREATE_TASK_API_URL}`);
        const token = AuthService.getToken(); // Get token
        const apiPayload = {
            ...newTask,
            title: newTask.name,
            due_date: newTask.dueDate,
            project: newTask.projectId,
            assign_to: newTask.assigneeId,
            department: newTask.category,
            est_time: newTask.estimatedTime,
            creatorId: newTask.creatorId,
            status: newTask.status
        };

        const response = await fetch(CREATE_TASK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(apiPayload),
        });
        const apiResponseData = await parseApiResponse(response);
        if (apiResponseData && (apiResponseData.id || apiResponseData._id)) {
            newTask.id = apiResponseData.id || apiResponseData._id;
        }
    } catch (error) {
        console.error(`[DataService] Failed to create task via API:`, error);
    }

    TASKS.unshift(newTask);
    return newTask;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task | undefined> => {
    await tasksLoadPromise;
    const taskIndex = TASKS.findIndex(t => t.id === taskId);
    const existingTask = taskIndex > -1 ? TASKS[taskIndex] : undefined;

    if (!existingTask) {
        console.warn(`[DataService] updateTask(${taskId}): Task not found in local cache. Attempting API update directly.`);
    }

    const apiPayload: any = {
        ...updates,
        id: taskId,
        title: updates.name,
        due_date: updates.dueDate,
        project: updates.projectId,
        assign_to: updates.assigneeId,
        department: updates.category,
        est_time: updates.estimatedTime,
    };

    Object.keys(apiPayload).forEach(key => {
        if (apiPayload[key] === undefined) {
            delete apiPayload[key];
        }
    });

    try {
        console.log(`[DataService] Attempting to update task ${taskId} via API at ${UPDATE_TASK_API_URL}/${taskId}`);
        const token = AuthService.getToken(); // Get token
        const response = await fetch(`${UPDATE_TASK_API_URL}/${taskId}`, { // Assuming API expects ID in path
            method: 'PUT', // Or 'PATCH'
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(apiPayload),
        });
        const apiResponseData = await parseApiResponse(response);

        if (taskIndex > -1) {
            TASKS[taskIndex] = { ...TASKS[taskIndex], ...updates };
            return TASKS[taskIndex];
        } else {
             console.warn(`[DataService] Task ${taskId} updated on API, but not found in local cache. Adding/Updating from API response.`);
             if (apiResponseData && (apiResponseData.id || apiResponseData._id)) {
                const updatedTaskFromApi: Task = {
                    id: String(apiResponseData.id || apiResponseData._id),
                    name: apiResponseData.title,
                    description: apiResponseData.description || '',
                    dueDate: apiResponseData.due_date || apiResponseData.deadline || '',
                    projectId: String(apiResponseData.project || apiResponseData.project_id || ''),
                    assigneeId: String(apiResponseData.assign_to || apiResponseData.assignee_id || '') || undefined,
                    creatorId: String(apiResponseData.creatorId || apiResponseData.creator_id || '1'),
                    status: apiResponseData.status || TaskStatus.TODO,
                    category: apiResponseData.department || 'General',
                    priority: apiResponseData.priority || 'medium',
                    tags: apiResponseData.tags || [],
                    notes: apiResponseData.notes || [],
                    estimatedTime: apiResponseData.est_time ? Number(apiResponseData.est_time) : undefined,
                    dependency: apiResponseData.dependency,
                    dependencyLogs: apiResponseData.dependencyLogs || [],
                };
                const existingTaskIndexInTasks = TASKS.findIndex(t => t.id === updatedTaskFromApi.id);
                if (existingTaskIndexInTasks === -1) {
                    TASKS.push(updatedTaskFromApi);
                } else {
                    TASKS[existingTaskIndexInTasks] = updatedTaskFromApi;
                }
                return updatedTaskFromApi;
            }
            return undefined;
        }
    } catch (error) {
        console.error(`[DataService] Failed to update task ${taskId} via API:`, error);
        throw error;
    }
};

export const deleteTask = async (taskId: string): Promise<void> => {
    try {
        console.log(`[DataService] Attempting to delete task ${taskId} via API at ${DELETE_TASK_API_URL}/${taskId}`);
        const token = AuthService.getToken(); // Get token
        const response = await fetch(`${DELETE_TASK_API_URL}/${taskId}`, {
            method: 'DELETE',
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        await parseApiResponse(response);
    } catch (error) {
        console.error(`[DataService] Failed to delete task ${taskId} via API:`, error);
        throw error;
    }
    await tasksLoadPromise;
    TASKS = TASKS.filter(t => t.id !== taskId);
};


// --- ONBOARDING FUNCTIONS ---
export const getOnboardingSubmissions = (): OnboardingSubmission[] => {
    // Assuming ONBOARDING_SUBMISSIONS is initialized elsewhere or is always available
    // If it relies on an async fetch like projects, you'd need an initializeOnboarding function and a promise.
    return [...ONBOARDING_SUBMISSIONS].sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
};

export const getOnboardingSubmissionById = (id: string): OnboardingSubmission | undefined => {
    return ONBOARDING_SUBMISSIONS.find(s => s.id === id);
};

export const createOnboardingSubmission = (data: Omit<OnboardingSubmission, 'id' | 'submissionDate' | 'status' | 'steps'>): OnboardingSubmission => {
    const newSubmission: OnboardingSubmission = {
        id: uuidv4(),
        submissionDate: new Date().toISOString(),
        status: OnboardingStatus.PENDING_REVIEW,
        ...data,
    };
    ONBOARDING_SUBMISSIONS.unshift(newSubmission);
    return newSubmission;
};

export const updateOnboardingSubmission = (submissionId: string, updates: Partial<OnboardingSubmission>): OnboardingSubmission | undefined => {
    const subIndex = ONBOARDING_SUBMISSIONS.findIndex(s => s.id === submissionId);
    if (subIndex > -1) {
        ONBOARDING_SUBMISSIONS[subIndex] = { ...ONBOARDING_SUBMISSIONS[subIndex], ...updates };
        return ONBOARDING_SUBMISSIONS[subIndex];
    }
    return undefined;
};