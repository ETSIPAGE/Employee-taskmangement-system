import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';

// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
// Companies, Chat, and Onboarding data remains mocked as no APIs were specified for them.
let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' }
];

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
];
CONVERSATIONS.forEach(c => {
    const conversationMessages = MESSAGES.filter(m => m.conversationId === c.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    c.lastMessage = conversationMessages[0];
});

const ONLINE_USERS = new Set(['1', '3', '4', '6']);

let ONBOARDING_SUBMISSIONS: OnboardingSubmission[] = [
    {
        id: 'sub-1', submissionDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), email: 'new.intern@university.edu', fullName: 'Alex Ray', guardianName: 'John Ray', dateOfBirth: '2003-05-12T00:00:00.000Z', gender: 'Male', phone: '123-456-7890', altPhone: '098-765-4321', address: '456 University Ave, College Town, USA 12345', addressProof: 'address_proof.pdf', govtId: '1234 5678 9012', collegeName: 'State University of Technology', gradYear: 2026, cgpa: '8.8 / 10', collegeCertificates: 'transcript.pdf', collegeId: 'college_id.jpg', photo: 'profile_pic.png', signature: 'Alex Ray', workTime: '10:00', meetingTime: '14:00', declaration: true, languagesKnown: ['English', 'Hindi'], status: OnboardingStatus.PENDING_REVIEW,
    }
];
export const DEFAULT_ONBOARDING_STEPS: string[] = [ 'Review Application', 'Verify Documents', 'Background Check', 'Send Offer Letter', 'Prepare Welcome Kit', 'Assign Manager & Team', 'Setup IT Accounts', ];

const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const ATTENDANCE_DATA: Record<string, string[]> = {
    [`${year}-${month}-01`]: ['3', '4', '5', '6'], [`${year}-${month}-02`]: ['3', '4', '7'], [`${year}-${month}-03`]: ['3', '4', '5', '6', '7'],
};

// --- API BASED DATA SERVICE ---

type ExtendedRequestInit = RequestInit & { skipAuth?: boolean; noContentType?: boolean; authRaw?: boolean };

// Helper to add auth token to requests
const authenticatedFetch = async (url: string, options: ExtendedRequestInit = {}) => {
    const token = localStorage.getItem('ets_token');
    const headers = new Headers(options.headers || {});

    // Support custom flags on options (not part of RequestInit)
    const flags = options as any;
    const skipAuth = !!flags.skipAuth;
    const noContentType = !!flags.noContentType;
    const authRaw = !!flags.authRaw;

    // Only set Content-Type if there is a body to send and caller didn't override
    const hasBody = typeof options.body !== 'undefined' && options.body !== null;
    if (!noContentType && hasBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (!skipAuth && token) {
        // Allow raw token when requested; otherwise default to Bearer format
        const authValue = authRaw ? token : (token.startsWith('Bearer ') ? token : `Bearer ${token}`);
        headers.set('Authorization', authValue);
    }

    // Clone options without custom flags before sending
    const { skipAuth: _sa, noContentType: _nct, ...fetchOptions } = flags;

    return fetch(url, { ...fetchOptions, headers, mode: 'cors' });
};

// Helper to parse AWS API Gateway responses
const parseApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    // Handle empty body (e.g., 204, or DELETE returning no content)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
        const text = await response.text();
        if (!text) return {};
        try {
            return JSON.parse(text);
        } catch {
            return { body: text };
        }
    }
    const data = await response.json();
    if (typeof data?.body === 'string') {
        try {
            return JSON.parse(data.body);
        } catch (e) {
            console.error('Failed to parse API response body:', e);
            return data.body; // return raw string body rather than crashing
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
        const possibleKeys = [primaryKey, primaryKey.toLowerCase(), 'Items', 'items', 'data', 'body'];
        for (const key of possibleKeys) {
            if (Array.isArray(data[key])) {
                return data[key];
            }
        }
        // Fallback: find first array property in the object
        const arrayValue = Object.values(data).find(value => Array.isArray(value));
        if (arrayValue && Array.isArray(arrayValue)) {
            return arrayValue;
        }
    }
    console.warn(`Could not extract array from API response for key "${primaryKey}". Response was:`, data);
    return []; // Return empty array to prevent crashes
}


// Caching mechanism
let cachedTasks: Task[] | null = null;
let cachedProjects: Project[] | null = null;
let cachedDepartments: Department[] | null = null;
let cachedAllUsers: User[] | null = null;

// Helper to map API user to frontend User
const mapApiUserToUser = (apiUser: any): User => {
    const roleString = apiUser.role || 'employee';
    let role: UserRole;
    if (roleString.toUpperCase() === 'HR') {
        role = UserRole.HR;
    } else {
        role = (roleString.charAt(0).toUpperCase() + roleString.slice(1).toLowerCase()) as UserRole;
    }

    if (!Object.values(UserRole).includes(role)) {
        console.warn(`Invalid role "${apiUser.role}" for user ${apiUser.name}. Defaulting to Employee.`);
        role = UserRole.EMPLOYEE;
    }
    
    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        role: role,
        companyId: apiUser.companyId,
        managerId: apiUser.managerId,
        departmentIds: apiUser.departmentIds || [],
        jobTitle: apiUser.jobTitle,
        status: apiUser.status || 'Offline',
        joinedDate: apiUser.joinedDate || new Date().toISOString(),
        skills: apiUser.skills || [],
        stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' }, // Default stats
        rating: apiUser.rating,
        personalDetails: apiUser.personalDetails,
        contactNumber: apiUser.contactNumber,
        address: apiUser.address,
        familyMembers: apiUser.familyMembers,
        education: apiUser.education,
        compensation: apiUser.compensation,
        documents: apiUser.documents,
    };
};

export const getAllUsersFromApi = async (): Promise<User[]> => {
    if (cachedAllUsers) return cachedAllUsers;

    const response = await authenticatedFetch('https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev/users');
    const data = await parseApiResponse(response);
    const usersFromApi = extractArrayFromApiResponse(data, 'users');
    
    cachedAllUsers = usersFromApi.map(mapApiUserToUser);
    return cachedAllUsers;
};

export const getUserByIdFromApi = async (userId: string): Promise<User | undefined> => {
    const allUsers = await getAllUsersFromApi();
    return allUsers.find(u => u.id === userId);
};

// --- EMPLOYEES from API ---
export const getEmployeesFromApi = async (): Promise<User[]> => {
    const allUsers = await getAllUsersFromApi();
    return allUsers.filter(user => user.role === UserRole.EMPLOYEE);
};


// --- TASKS ---
/**
 * Maps an API status string to the application's TaskStatus enum.
 * This is designed to be flexible and handle variations in the API response.
 * @param apiStatus The status string from the API (e.g., "In Progress", "in-progress", "todo").
 * @returns The corresponding TaskStatus enum value.
 */
const mapApiStatusToTaskStatus = (apiStatus?: string): TaskStatus => {
    if (!apiStatus) return TaskStatus.TODO;
    
    // Normalize by removing spaces and hyphens, and converting to lowercase.
    const normalized = apiStatus.toLowerCase().replace(/[\s-]+/g, '');

    if (normalized.includes('inprogress')) return TaskStatus.IN_PROGRESS;
    if (normalized.includes('onhold')) return TaskStatus.ON_HOLD;
    if (normalized.includes('completed')) return TaskStatus.COMPLETED;
    if (normalized.includes('todo')) return TaskStatus.TODO;
    
    console.warn(`Unknown task status from API: "${apiStatus}". Defaulting to To-Do.`);
    return TaskStatus.TODO;
};

/**
 * Fetches all tasks from the API.
 * This implementation is robustly designed to handle various AWS API Gateway response formats.
 */
export const getAllTasks = async (): Promise<Task[]> => {
    // Return cached tasks if available to improve performance and avoid redundant API calls.
    if (cachedTasks) return cachedTasks;

    try {
        // Use a standard fetch for this public endpoint to avoid potential header issues.
        const response = await fetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Task API Error Response:", errorText);
            throw new Error(`API request for tasks failed: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        let tasksFromApi: any[];

        // Handle different possible response structures from AWS API Gateway.
        if (responseData.body && typeof responseData.body === 'string') {
            // Case 1: Body is a stringified JSON array.
            tasksFromApi = JSON.parse(responseData.body);
        } else if (Array.isArray(responseData.body)) {
            // Case 2: Body is already a JSON array.
            tasksFromApi = responseData.body;
        } else if (Array.isArray(responseData)) {
            // Case 3: The entire response is the JSON array.
            tasksFromApi = responseData;
        } else if (responseData.Tasks && Array.isArray(responseData.Tasks)) {
             // Case 4: The response is an object with a "Tasks" key
            tasksFromApi = responseData.Tasks;
        } else {
            // Fallback: Try to find any array within the response object.
            tasksFromApi = extractArrayFromApiResponse(responseData, 'Tasks');
        }

        if (!Array.isArray(tasksFromApi)) {
            console.error("Final processed task data is not an array:", tasksFromApi);
            return []; // Return an empty array to prevent crashes.
        }
        
        // Map the raw API task objects to the application's Task type.
        cachedTasks = tasksFromApi.map((task: any): Task => ({
            id: task.id,
            name: task.title,
            description: task.description,
            dueDate: task.due_date,
            projectId: task.project,
            assigneeId: task.assign_to,
            assign_by: task.assign_by,
            status: mapApiStatusToTaskStatus(task.status),
            priority: task.priority,
            estimatedTime: task.est_time ? parseInt(task.est_time, 10) : undefined,
        }));
        
        return cachedTasks;

    } catch (error) {
        console.error("A critical error occurred while fetching tasks:", error);
        return []; // Return an empty array on failure to prevent the app from crashing.
    }
};


export const createTask = async (taskData: any): Promise<Task> => {
    const response = await authenticatedFetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/add-task', {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task.');
    }
    
    // Invalidate cache
    cachedTasks = null;
    const responseData = await response.json();
    const createdTaskData = responseData.Task.Item;

    const newTask: Task = {
        id: createdTaskData.id,
        name: createdTaskData.title,
        description: createdTaskData.description,
        dueDate: createdTaskData.due_date,
        projectId: createdTaskData.project,
        assigneeId: createdTaskData.assign_to,
        assign_by: createdTaskData.assign_by,
        status: createdTaskData.status,
        priority: createdTaskData.priority,
        estimatedTime: createdTaskData.est_time ? parseInt(createdTaskData.est_time, 10) : undefined,
    };
    
    return newTask;
};

export const getTaskById = async (id: string): Promise<Task | undefined> => {
    const tasks = await getAllTasks();
    return tasks.find(t => t.id === id);
};

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
    const tasks = await getAllTasks();
    return tasks.filter(t => t.projectId === projectId);
};

export const getTasksByTeam = async (teamMemberIds: string[]): Promise<Task[]> => {
    const tasks = await getAllTasks();
    const teamSet = new Set(teamMemberIds);
    return tasks.filter(t => (t.assigneeId && teamSet.has(t.assigneeId)));
};

export const getTasksByAssignee = async (assigneeId: string): Promise<Task[]> => {
    const tasks = await getAllTasks();
    return tasks.filter(t => t.assigneeId === assigneeId);
};

export const updateTask = async (taskId: string, updates: { status?: TaskStatus; assigneeId?: string | undefined }, currentUserId: string): Promise<Task> => {
    const payload: { currentUserId: string; status?: TaskStatus; assign_to?: string } = {
        currentUserId: currentUserId,
    };
    if (updates.status) {
        payload.status = updates.status;
    }
    if (updates.hasOwnProperty('assigneeId')) {
        payload.assign_to = updates.assigneeId || '';
    }

    const endpointUrl = `https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/edit-task/${taskId}`;

    const response = await authenticatedFetch(endpointUrl, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMessage = 'Failed to update task.';
        try {
            const errorBody = await response.text();
            const errorJson = JSON.parse(errorBody);
            errorMessage = errorJson.message || errorBody;
        } catch (e) {
            // The response was not JSON, which is fine. The text itself might be the error.
        }
        throw new Error(errorMessage);
    }
    
    cachedTasks = null; // Invalidate cache to force a refresh on next load
    
    const responseData = await response.json();
    const updatedTaskData = responseData.Task;

    const mappedTask: Task = {
        id: updatedTaskData.id,
        name: updatedTaskData.title,
        description: updatedTaskData.description,
        dueDate: updatedTaskData.due_date,
        projectId: updatedTaskData.project,
        assigneeId: updatedTaskData.assign_to,
        assign_by: updatedTaskData.assign_by,
        status: updatedTaskData.status,
        priority: updatedTaskData.priority,
        estimatedTime: updatedTaskData.est_time ? parseInt(updatedTaskData.est_time, 10) : undefined,
        notes: updatedTaskData.notes,
        dependency: updatedTaskData.dependency,
        dependencyLogs: updatedTaskData.dependencyLogs,
        tags: updatedTaskData.tags,
        category: updatedTaskData.category
    };

    return mappedTask;
};

// Optimistic local update for data not handled by the API, e.g., notes.
export const updateTaskLocally = (taskId: string, updates: Partial<Task>): Task | undefined => {
    if (cachedTasks) {
        const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            cachedTasks[taskIndex] = { ...cachedTasks[taskIndex], ...updates };
            return cachedTasks[taskIndex];
        }
    }
    return undefined;
};


export const deleteTask = async (taskId: string, currentUserId: string): Promise<void> => {
    const response = await authenticatedFetch(`https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/delete-task/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({ currentUserId: currentUserId })
    });

    if (!response.ok) {
        let errorMessage = 'Failed to delete task.';
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || JSON.stringify(errorBody);
        } catch (e) {
             const errorText = await response.text();
             errorMessage = errorText || `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    
    // Invalidate cache
    cachedTasks = null;
};


// --- PROJECTS ---
export const getAllProjects = async (): Promise<Project[]> => {
    if (cachedProjects) return cachedProjects;
    const response = await authenticatedFetch('https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects');
    const data = await parseApiResponse(response);
    const projectsFromApi = extractArrayFromApiResponse(data, 'projects');
    cachedProjects = projectsFromApi.map((proj: any): Project => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        managerId: proj.manager_id,
        departmentIds: Array.isArray(proj.department_ids) ? proj.department_ids : [],
        deadline: proj.deadline,
        priority: proj.priority,
        estimatedTime: proj.estimated_time ? parseInt(proj.estimated_time, 10) : undefined,
        companyId: proj.company_id || 'comp-1',
        roadmap: proj.roadmap || [],
    }));
    return cachedProjects;
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    const projects = await getAllProjects();
    return projects.find(p => p.id === id);
};

export const getProjectsByManager = async (managerId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.managerId === managerId);
};

export const getProjectsByCompany = async (companyId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.companyId === companyId);
};

export const getProjectsByDepartment = async (departmentId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.departmentIds.includes(departmentId));
};

export const createProject = (projectData: Omit<Project, 'id'>): Project => {
    // Optimistic update as no API provided
    const newProject: Project = { ...projectData, id: `proj-${Date.now()}`};
    if (cachedProjects) {
        cachedProjects.unshift(newProject);
    } else {
        cachedProjects = [newProject];
    }
    return newProject;
};

export const updateProject = (projectId: string, updates: Partial<Project>): Project | undefined => {
    // Optimistic update
    if (cachedProjects) {
        const projectIndex = cachedProjects.findIndex(p => p.id === projectId);
        if (projectIndex > -1) {
            cachedProjects[projectIndex] = { ...cachedProjects[projectIndex], ...updates };
            return cachedProjects[projectIndex];
        }
    }
    return undefined;
};

export const getDepartments = async (): Promise<Department[]> => {
    if (cachedDepartments) return cachedDepartments;

    // Use the single known working GET endpoint to avoid failures and noise
    const res = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
    const data = await parseApiResponse(res);
    const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');

    // Normalize and filter: drop soft-deleted records and keep only the latest version per logical department
    const candidates = departmentsFromApi
        .filter((dept: any) => {
            if (!dept || !dept.name) return false;
            // Common soft-delete markers
            if (dept.deleted === true) return false;
            if (dept.isDeleted === true) return false;
            if (typeof dept.status === 'string' && dept.status.toLowerCase() === 'deleted') return false;
            if (dept.active === false) return false;
            return true;
        });

    // Helper to parse a comparable time from record
    const getTime = (dept: any): number => {
        const t = dept.timestamp || dept.updatedAt || dept.updated_at || dept.createdAt || dept.created_at;
        const n = typeof t === 'number' ? t : (t ? Date.parse(t) : 0);
        return isNaN(n) ? 0 : n;
    };

    // Normalize name for loose grouping
    const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
    const baseName = (s: any) => {
        const n = norm(s);
        // strip trailing numeric suffixes like " 1", "-1", "(1)"
        return n
            .replace(/\(\d+\)$/, '')
            .replace(/[-_\s]+\d+$/, '')
            .trim();
    };

    // Collapse by baseName(name) only to avoid mismatches when some rows miss companyId
    const groups = new Map<string, any[]>();
    for (const rec of candidates) {
        const key = `${baseName(rec.name)}`;
        const list = groups.get(key) || [];
        list.push(rec);
        groups.set(key, list);
    }

    // Collapse strictly by baseName selecting the latest by timestamp
    const finalMap = new Map<string, any>();
    for (const [key, list] of groups.entries()) {
        let chosen = list[0];
        for (const rec of list) {
            if (getTime(rec) >= getTime(chosen)) chosen = rec;
        }
        finalMap.set(key, chosen);
    }
    const latest = Array.from(finalMap.values());
    const mapped = latest.map((dept: any): Department => ({
        id: dept.id,
        name: dept.name,
        companyId: dept.companyId || (Array.isArray(dept.companyIds) ? dept.companyIds[0] : undefined) || 'comp-1',
    }));

    // Final dedupe by id for safety
    cachedDepartments = Array.from(new Map(mapped.map(d => [d.id, d])).values());
    return cachedDepartments;
};

export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
    const depts = await getDepartments();
    return depts.find(d => d.id === id);
};

export const createDepartment = async (name: string, companyId: string): Promise<Department> => {
    // FIXED: Updated to use the PRODUCTION endpoint
    try {
        // Minimal payload expected by the API
        const payload = {
            name: name,
            companyId: companyId
        };

        // Use the known-good endpoint first with minimal retries
        const url = 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment';
        console.log('[Departments] create POST', url);

        // Known working payload/headers: no Authorization and companyIds array
        let data: any | undefined;
        try {
            const res = await authenticatedFetch(url, {
                method: 'POST',
                body: JSON.stringify({ name, companyIds: [companyId] }),
                skipAuth: true
            });
            data = await parseApiResponse(res);
        } catch (e) {
            throw e;
        }

        // Parse response without array extraction to avoid warnings
        let createdDepartmentRaw =
            (data && (data.department || data.Department || data.item || data.Item)) ||
            (Array.isArray(data) ? data[0] : data);

        // Fallback: some APIs just return a message; use the submitted values
        if (!createdDepartmentRaw || !createdDepartmentRaw.id) {
            createdDepartmentRaw = { id: `dpt-${Date.now()}`, name, companyId };
        }

        const newDepartment: Department = {
            id: createdDepartmentRaw.id,
            name: createdDepartmentRaw.name || name,
            companyId: createdDepartmentRaw.companyId || (Array.isArray(createdDepartmentRaw.companyIds) ? createdDepartmentRaw.companyIds[0] : undefined) || companyId,
        };
        
        // Update cache
        if (cachedDepartments) {
            const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
            const baseName = (s: any) => {
                const n = norm(s);
                return n.replace(/\(\d+\)$/, '').replace(/[-_\s]+\d+$/, '').trim();
            };
            const bname = baseName(newDepartment.name);
            cachedDepartments = cachedDepartments.filter(d => {
                const sameCompany = (d.companyId || 'comp-1') === (newDepartment.companyId || 'comp-1');
                const sameBase = baseName(d.name) === bname;
                return !(sameCompany && sameBase);
            });
            cachedDepartments.unshift(newDepartment);
        } else {
            cachedDepartments = [newDepartment];
        }
        
        return newDepartment;
    } catch (error) {
        console.error('Failed to create department:', error);
        throw error;
    }
};

// Add update and delete functions for departments
export const updateDepartment = async (id: string, name: string, companyId: string): Promise<Department> => {
    // Prefer CORS-safe POST without auth; fallback to PUT if necessary
    try {
        const attempts = [
            {
                url: 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment',
                method: 'POST',
                body: { id, name, companyIds: [companyId] },
                skipAuth: true as const,
                noContentType: true as const
            },
            {
                url: `https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/${encodeURIComponent(id)}`,
                method: 'POST',
                body: { name, companyIds: [companyId] },
                skipAuth: true as const,
                noContentType: true as const
            },
            {
                url: `https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/${encodeURIComponent(id)}`,
                method: 'PUT',
                body: { name, companyIds: [companyId] },
                skipAuth: true as const
            },
            {
                url: `https://lz5qfmvbk8.execute-api.ap-south-1.amazonaws.com/Editdepartment/department/${encodeURIComponent(id)}`,
                method: 'PUT',
                body: { id, name, companyIds: [companyId], companyId },
                authRaw: true as const
            }
        ];

        let lastErr: any = null;
        let dept: Department | null = null;
        for (const a of attempts) {
            try {
                console.log('[Departments] update attempt:', a.method, a.url);
                const res = await authenticatedFetch(a.url, {
                    method: a.method,
                    body: JSON.stringify(a.body),
                    skipAuth: (a as any).skipAuth,
                    authRaw: (a as any).authRaw,
                    noContentType: (a as any).noContentType,
                });
                const data = await parseApiResponse(res);
                const updatedRaw = (data && (data.department || data.Department || data.item || data.Item)) || data;
                dept = {
                    id: updatedRaw?.id || id,
                    name: updatedRaw?.name || name,
                    companyId: updatedRaw?.companyId || (Array.isArray(updatedRaw?.companyIds) ? updatedRaw.companyIds[0] : undefined) || companyId,
                };
                lastErr = null;
                break;
            } catch (e) {
                lastErr = e;
                continue;
            }
        }
        if (lastErr || !dept) throw lastErr || new Error('Department update failed');

        // Update cache and invalidate for fresh reads
        if (cachedDepartments) {
            const idx = cachedDepartments.findIndex(d => d.id === id);
            if (idx > -1) {
                cachedDepartments[idx] = dept;
            } else {
                const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
                const baseName = (s: any) => {
                    const n = norm(s);
                    return n.replace(/\(\d+\)$/, '').replace(/[-_\s]+\d+$/, '').trim();
                };
                const bname = baseName(dept.name);
                cachedDepartments = cachedDepartments.filter(d => baseName(d.name) !== bname);
                cachedDepartments.unshift(dept);
            }
        } else {
            cachedDepartments = [dept];
        }
        cachedDepartments = null;
        return dept;
    } catch (error) {
        console.error('Failed to update department:', error);
        throw error;
    }
};

export const deleteDepartment = async (id: string): Promise<void> => {
    console.log('Deleting department with ID:', id);
    try {
        const base = 'https://n844w7gm0d.execute-api.ap-south-1.amazonaws.com/prod';
        const ts = Date.now();

        // 1) Discover all IDs that represent the same logical department (same name or near-duplicate in same company)
        let idsToDelete: string[] = [id];
        try {
            const listRes = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
            const listData = await parseApiResponse(listRes);
            const items = extractArrayFromApiResponse(listData, 'departments');
            const target = items.find((x: any) => x?.id === id);
            const targetName = target?.name;
            const targetCompany = target?.companyId || (Array.isArray(target?.companyIds) ? target.companyIds[0] : undefined);
            const targetTime = (() => { const t = target?.timestamp || target?.updatedAt || target?.updated_at || target?.createdAt || target?.created_at; const n = typeof t === 'number' ? t : (t ? Date.parse(t) : 0); return isNaN(n) ? 0 : n; })();
            const nrm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '');
            const baseName = (s: any) => { const n = nrm(s); return n.replace(/\(\d+\)$/,'').replace(/[-_\s]+\d+$/,'').trim(); };
            const siblings = items.filter((x: any) => {
                if (!x?.id || x.id === id) return false;
                // Do NOT restrict by company; treat all with same base name as same logical department
                const timeX = (() => { const t = x.timestamp || x.updatedAt || x.updated_at || x.createdAt || x.created_at; const n = typeof t === 'number' ? t : (t ? Date.parse(t) : 0); return isNaN(n) ? 0 : n; })();
                // Same name or within 2 minutes window (likely previous/next version)
                if (targetName && baseName(x.name) === baseName(targetName)) return true;
                if (targetTime && timeX && Math.abs(targetTime - timeX) <= 120000) return true;
                return false;
            });
            const siblingIds = siblings.map((x: any) => String(x.id));
            idsToDelete = Array.from(new Set([id, ...siblingIds]));
        } catch (e) {
            // If discovery fails, proceed with the provided id only
        }

        // 2) For each id discovered, attempt deletion across known endpoints
        for (const delId of idsToDelete) {
            const attempts: { url: string; method: 'DELETE' | 'POST'; authRaw?: boolean; skipAuth?: boolean; noContentType?: boolean; body?: any }[] = [
                // EXACT URL provided by user (no query params)
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}`, method: 'DELETE', skipAuth: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}`, method: 'DELETE', authRaw: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}`, method: 'DELETE' },
                // With latest=1
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', skipAuth: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', authRaw: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE' },
                // Timestamp variants
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?timestamp=${ts}`, method: 'DELETE', skipAuth: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?timestamp=${ts}`, method: 'DELETE', authRaw: true },
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?timestamp=${ts}`, method: 'DELETE' },
                // Alternative path name
                { url: `${base}/department/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', skipAuth: true },
                { url: `${base}/department/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', authRaw: true },
                { url: `${base}/department/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE' },
                // POST fallbacks (no Content-Type to reduce preflight)
                { url: `${base}/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'POST', noContentType: true },
                { url: `${base}/deletedepartment`, method: 'POST', body: { id: delId, latest: 1 }, noContentType: true },
                // Previous known fallbacks
                { url: `https://hqcfapxuu4.execute-api.ap-south-1.amazonaws.com/production/departments/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', skipAuth: true },
                { url: `https://hqcfapxuu4.execute-api.ap-south-1.amazonaws.com/production/departments/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', authRaw: true },
                { url: `https://hqcfapxuu4.execute-api.ap-south-1.amazonaws.com/production/departments/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE' },
                { url: `https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/${encodeURIComponent(delId)}`, method: 'DELETE', skipAuth: true },
                { url: `https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/${encodeURIComponent(delId)}`, method: 'DELETE', authRaw: true },
                { url: `https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment/${encodeURIComponent(delId)}`, method: 'DELETE' },
            ];

            let lastErr: any = null;
            for (const a of attempts) {
                try {
                    console.log('[Departments] delete attempt:', a.method, a.url, a.authRaw ? '(raw auth)' : '');
                    const res = await authenticatedFetch(a.url, {
                        method: a.method,
                        body: a.body ? JSON.stringify(a.body) : undefined,
                        authRaw: !!a.authRaw,
                        skipAuth: a.skipAuth,
                        noContentType: a.noContentType
                    });
                    await parseApiResponse(res);
                    lastErr = null;
                    break;
                } catch (e) {
                    lastErr = e;
                    continue;
                }
            }
            if (lastErr) {
                // If one of the sibling IDs fails to delete, continue to try others
                console.warn('[Departments] delete failed for id', delId, lastErr);
            }
        }

        // Second sweep: fetch again and delete any remaining entries with the same base name
        try {
            const listRes2 = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
            const listData2 = await parseApiResponse(listRes2);
            const items2 = extractArrayFromApiResponse(listData2, 'departments');
            // Derive base name from any already-deleted target's name if available
            const baseFromDeleted = (name?: any) => {
                const n = typeof name === 'string' ? name.trim().toLowerCase().replace(/\s+/g, ' ') : '';
                return n.replace(/\(\d+\)$/,'').replace(/[-_\s]+\d+$/,'').trim();
            };
            const targetBase = (() => {
                // Try to get from previous discovery (targetName)
                // If not available, infer from the first id we deleted if still present in items2
                const t1 = items2.find((x: any) => idsToDelete.includes(String(x?.id)));
                return baseFromDeleted(t1?.name || undefined);
            })();
            if (targetBase) {
                const remaining = items2.filter((x: any) => x?.id && !idsToDelete.includes(String(x.id)) && baseFromDeleted(x.name) === targetBase);
                for (const rem of remaining) {
                    const delId = String(rem.id);
                    const attempts2: { url: string; method: 'DELETE' | 'POST'; skipAuth?: boolean; noContentType?: boolean }[] = [
                        { url: `https://n844w7gm0d.execute-api.ap-south-1.amazonaws.com/prod/deletedepartment/${encodeURIComponent(delId)}`, method: 'DELETE', skipAuth: true },
                        { url: `https://n844w7gm0d.execute-api.ap-south-1.amazonaws.com/prod/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'DELETE', skipAuth: true },
                        { url: `https://n844w7gm0d.execute-api.ap-south-1.amazonaws.com/prod/deletedepartment/${encodeURIComponent(delId)}?latest=1`, method: 'POST', noContentType: true }
                    ];
                    for (const a2 of attempts2) {
                        try {
                            const res2 = await authenticatedFetch(a2.url, { method: a2.method, skipAuth: a2.skipAuth, noContentType: a2.noContentType });
                            await parseApiResponse(res2);
                            break;
                        } catch {}
                    }
                }
            }
        } catch {}

        // Update and invalidate cache so UI reloads fresh data
        if (cachedDepartments) {
            cachedDepartments = cachedDepartments.filter(d => !idsToDelete.includes(d.id));
        }
        cachedDepartments = null;
    } catch (error) {
        console.error('DELETE error:', error);
        throw error;
    }
};

// --- MOCKED FUNCTIONS ---
export const getCompanies = (): Company[] => [...COMPANIES];
export const getCompanyById = (id: string): Company | undefined => COMPANIES.find(c => c.id === id);
export const createCompany = (name: string, ownerId: string): Company => {
    const newCompany: Company = { id: `comp-${Date.now()}`, name, ownerId, createdAt: new Date().toISOString() };
    COMPANIES.unshift(newCompany);
    return newCompany;
};
export const getAttendanceByDate = (date: string): string[] => ATTENDANCE_DATA[date] || [];
export const getAttendanceForUserByMonth = (userId: string, year: number, month: number): string[] => {
    const monthString = (month + 1).toString().padStart(2, '0');
    const presentDates: string[] = [];
    for (const date in ATTENDANCE_DATA) {
        if (date.startsWith(`${year}-${monthString}`) && ATTENDANCE_DATA[date].includes(userId)) {
            presentDates.push(date);
        }
    }
    return presentDates;
};
export const isUserOnline = (userId: string) => ONLINE_USERS.has(userId);
export const getConversationsForUser = (userId: string): ChatConversation[] => CONVERSATIONS.filter(c => c.participantIds.includes(userId)).sort((a,b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
});
export const getMessagesForConversation = (conversationId: string): ChatMessage[] => MESSAGES.filter(m => m.conversationId === conversationId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
export const sendMessage = (conversationId: string, senderId: string, text: string): ChatMessage => {
    const newMessage: ChatMessage = { id: `msg-${Date.now()}`, conversationId, senderId, text, timestamp: new Date().toISOString() };
    MESSAGES.push(newMessage);
    const convIndex = CONVERSATIONS.findIndex(c => c.id === conversationId);
    if (convIndex > -1) CONVERSATIONS[convIndex].lastMessage = newMessage;
    return newMessage;
};
export const createGroup = (groupName: string, memberIds: string[], creatorId: string): ChatConversation => {
    const newGroup: ChatConversation = { id: `conv-${Date.now()}`, type: 'group', name: groupName, participantIds: [...new Set([creatorId, ...memberIds])], adminIds: [creatorId] };
    CONVERSATIONS.unshift(newGroup);
    return newGroup;
};
export const getOrCreateDirectConversation = (userId1: string, userId2: string): ChatConversation => {
    const existing = CONVERSATIONS.find(c => c.type === 'direct' && c.participantIds.length === 2 && c.participantIds.includes(userId1) && c.participantIds.includes(userId2));
    if (existing) return existing;
    const newDM: ChatConversation = { id: `conv-${Date.now()}`, type: 'direct', participantIds: [userId1, userId2] };
    CONVERSATIONS.unshift(newDM);
    return newDM;
};
export const getOnboardingSubmissions = (): OnboardingSubmission[] => [...ONBOARDING_SUBMISSIONS].sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
export const getOnboardingSubmissionById = (id: string): OnboardingSubmission | undefined => ONBOARDING_SUBMISSIONS.find(s => s.id === id);
export const createOnboardingSubmission = (data: Omit<OnboardingSubmission, 'id' | 'submissionDate' | 'status' | 'steps'>): OnboardingSubmission => {
    const newSubmission: OnboardingSubmission = { id: `sub-${Date.now()}`, submissionDate: new Date().toISOString(), status: OnboardingStatus.PENDING_REVIEW, ...data };
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
// Add placeholder for other functions if they exist in the original file
export const getNoteById = (id: string): Note | undefined => {
    return undefined;
}
export const getDependencyLogById = (id: string): DependencyLog | undefined => {
    return undefined;
}
export const getMilestoneById = (id: string): MilestoneStatus | undefined => {
    return undefined;
}