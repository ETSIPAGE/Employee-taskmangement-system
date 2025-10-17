import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';

// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
// Companies, Chat, and Onboarding data remains mocked as no APIs were specified for them.
let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' }
];
// services/dataService.ts
import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, Company, User, UserRole } from '../types';
import { getToken } from './authService'; // Assuming getToken is in authService

// --- API ENDPOINTS ---
const USERS_API_URL = 'https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev/users';
const TASKS_GET_ALL_API_URL = 'https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks';
const TASKS_CREATE_API_URL = 'https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/add-task';
const TASKS_UPDATE_API_BASE_URL = 'https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/edit-task'; // Requires /taskId
const TASKS_DELETE_API_BASE_URL = 'https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/delete-task'; // Requires /taskId

const PROJECTS_GET_ALL_API_URL = 'https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects';
const PROJECTS_CREATE_API_URL = 'https://s1mbbsd685.execute-api.ap-south-1.amazonaws.com/pz/Create-projects';
const PROJECTS_DELETE_API_URL = 'https://xiwwdxpjx4.execute-api.ap-south-1.amazonaws.com/det/del-project';
const PROJECTS_UPDATE_API_BASE_URL = 'https://ikwfgdgtzk.execute-api.ap-south-1.amazonaws.com/udt/updt-project';

const DEPARTMENTS_API_URL = 'https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/'; // Used for GET and POST

const COMPANIES_API_URL = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com';

const ATTENDANCE_GET_BY_DATE_URL = 'https://onp8l5se9i.execute-api.ap-south-1.amazonaws.com/dev/get-attendence-by-date';
const ATTENDANCE_GET_BY_USER_URL = 'https://w5ahewobh3.execute-api.ap-south-1.amazonaws.com/dev/get-attendence-user';
const ATTENDANCE_RECORD_ACTION_URL = 'https://w5ahewobh3.execute-api.ap-south-1.amazonaws.com/dev/ETS-record-attendance-action';


// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIS / FALLBACKS ---
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
// Update lastMessage for conversations
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
// --- COMMON HELPERS ---
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    // Only set Content-Type if not explicitly set by the caller and not a GET/HEAD request
    if (!headers.has('Content-Type') && options.method !== 'GET' && options.method !== 'HEAD') {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Clone options without custom flags before sending
    const { skipAuth: _sa, noContentType: _nct, ...fetchOptions } = flags;

    return fetch(url, { ...fetchOptions, headers, mode: 'cors' });
};

// Helper to parse AWS API Gateway responses
const parseApiResponse = async (response: Response) => {
    const responseText = await response.text();
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
        let errorMessage = responseText;
        try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
            console.error('Failed to parse API response body:', e);
            return data.body; // return raw string body rather than crashing
            // Not a JSON error response, use the text.
        }
        console.error(`API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorMessage}`);
    }
    
    // Handle empty successful responses
    if (!responseText) {
        return null;
    }

    try {
        const data = JSON.parse(responseText);
        
        // This logic is to handle AWS Lambda Proxy integration responses where the actual content is in a stringified `body`.
        if (data && typeof data.body === 'string') {
            try {
                // If body is a string, it's likely JSON that needs to be parsed again.
                return JSON.parse(data.body);
            } catch (e) {
                // If parsing the body fails, it might just be a simple string message.
                return data.body;
            }
        }
        
        // This handles cases where the API returns a direct JSON object (not wrapped in a proxy response).
        return data;
    } catch (e) {
        // This handles cases where the API returns a non-JSON string response on success (e.g., just "OK").
        console.warn("API response was not valid JSON, returning as text:", responseText);
        return responseText;
    }
};

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
let cachedManagers: User[] | null = null;
let cachedCompanies: Company[] | null = null;

// Retry constants for eventual consistency
const MAX_RETRIES = 3; 
const RETRY_DELAY_MS = 500; // milliseconds


// --- USER SERVICE ---
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
    
    // Handle companyId and departmentIds variations
    const companyId = (Array.isArray(apiUser.companyIds) && apiUser.companyIds.length > 0
                        ? String(apiUser.companyIds[0])
                        : String(apiUser.companyId || apiUser.company_id || apiUser.company || apiUser.organizationId || 'comp-1')
                       ).toLowerCase().trim();

    const departmentIds = Array.isArray(apiUser.departmentIds) 
        ? apiUser.departmentIds.map((id: string) => String(id).toLowerCase().trim())
        : (typeof apiUser.departmentIds === 'string' && apiUser.departmentIds)
            ? [String(apiUser.departmentIds).toLowerCase().trim()]
            : [];

    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        role: role,
        companyId: companyId,
        managerId: apiUser.managerId || (Array.isArray(apiUser.managerIds) && apiUser.managerIds.length > 0 ? apiUser.managerIds[0] : undefined),
        departmentIds: departmentIds,
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

    try {
        const response = await authenticatedFetch(USERS_API_URL);
        const data = await parseApiResponse(response);
        const usersFromApi = extractArrayFromApiResponse(data, 'users');
        
        cachedAllUsers = usersFromApi.map(mapApiUserToUser);
        return cachedAllUsers;
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        return [];
    }
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
    const allUsers = await getUsers();
    return allUsers.find(u => u.id === userId);
};

export const getEmployees = async (): Promise<User[]> => {
    const allUsers = await getUsers();
    return allUsers.filter(user => user.role === UserRole.EMPLOYEE);
};

export const getManagers = async (): Promise<User[]> => {
    if (cachedManagers) return cachedManagers;

    const allUsers = await getUsers();
    cachedManagers = allUsers.filter(user => user.role === UserRole.MANAGER);
    return cachedManagers;
};

export const getTeamMembers = async (managerId: string): Promise<User[]> => {
    const users = await getUsers();
    return users.filter(user => user.role === UserRole.EMPLOYEE && user.managerId === managerId);
};

export const getManagersByDepartments = async (departmentIds: string[]): Promise<User[]> => {
    if (departmentIds.length === 0) return [];
    
    try {
        const allUsers = await getUsers();

        const managersInDepts = allUsers.filter(user => 
            user.role === UserRole.MANAGER && 
            user.departmentIds &&
            user.departmentIds.some(deptId => departmentIds.includes(deptId))
        );
        return managersInDepts;
    } catch (error) {
        console.error("Failed to fetch managers by departments:", error);
        return [];
    }
};

// --- TASKS SERVICE ---
const mapApiStatusToTaskStatus = (apiStatus?: string): TaskStatus => {
    if (!apiStatus) return TaskStatus.TODO;
    
    const normalized = apiStatus.toLowerCase().replace(/[\s-]+/g, '');

    if (normalized.includes('inprogress')) return TaskStatus.IN_PROGRESS;
    if (normalized.includes('onhold')) return TaskStatus.ON_HOLD;
    if (normalized.includes('completed')) return TaskStatus.COMPLETED;
    if (normalized.includes('todo')) return TaskStatus.TODO;
    
    console.warn(`Unknown task status from API: "${apiStatus}". Defaulting to To-Do.`);
    return TaskStatus.TODO;
};

export const getAllTasks = async (): Promise<Task[]> => {
    if (cachedTasks) return cachedTasks; // Return cached tasks if available

    try {
        // Use a standard fetch for this public endpoint to avoid potential header issues.
        const response = await fetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');
        const response = await authenticatedFetch(TASKS_GET_ALL_API_URL);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Task API Error Response:", errorText);
            throw new Error(`API request for tasks failed: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        let tasksFromApi: any[];
        if (responseData.body && typeof responseData.body === 'string') {
            try {
                tasksFromApi = JSON.parse(responseData.body);
            } catch (e) {
                tasksFromApi = []; // Fallback if string body is not JSON
            }
        } else if (Array.isArray(responseData.body)) {
            tasksFromApi = responseData.body;
        } else if (Array.isArray(responseData)) {
            tasksFromApi = responseData;
        } else if (responseData.Tasks && Array.isArray(responseData.Tasks)) {
            tasksFromApi = responseData.Tasks;
        } else {
            tasksFromApi = extractArrayFromApiResponse(responseData, 'Tasks');
        }

        if (!Array.isArray(tasksFromApi) || tasksFromApi.length === 0) {
            return [];
        }
        
        cachedTasks = tasksFromApi.map((task: any): Task => ({
            id: task.id,
            name: task.title,
            description: task.description,
            dueDate: task.due_date,
            projectId: task.project,
            assigneeIds: Array.isArray(task.assign_to) ? task.assign_to : (task.assign_to ? [task.assign_to] : []),
            assign_by: task.assign_by,
            status: mapApiStatusToTaskStatus(task.status),
            priority: task.priority,
            estimatedTime: (task.est_time ? parseInt(task.est_time, 10) : (task.estimated_time ? parseInt(task.estimated_time, 10) : undefined)),
            // Prefer backend 'messages' array, map to internal notes structure; fallback to 'notes' if present
            notes: Array.isArray(task.messages)
                    ? task.messages.map((m: any) => ({ id: m.messageId || m.id, authorId: m.senderId || m.authorId, content: m.text || m.content, timestamp: m.timestamp }))
                    : task.notes,
            dependency: task.dependency,
            dependencyLogs: task.dependencyLogs,
            tags: task.tags,
            category: task.category
        }));
        
        return cachedTasks;

    } catch (error) {
        console.error("A critical error occurred while fetching tasks:", error);
        return [];
    }
};

export const createTask = async (taskData: any): Promise<Task> => {
    const response = await authenticatedFetch(TASKS_CREATE_API_URL, {
        method: 'POST',
        body: JSON.stringify(taskData)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task.');
    }
    
    // Invalidate cache
    cachedTasks = null;
    const responseData = await parseApiResponse(response);
    const createdTaskData = responseData.Task?.Item || responseData.Item || responseData; // Adjust based on actual API response structure

    const newTask: Task = {
        id: createdTaskData.id,
        name: createdTaskData.title,
        description: createdTaskData.description,
        dueDate: createdTaskData.due_date,
        projectId: createdTaskData.project,
        assigneeIds: Array.isArray(createdTaskData.assign_to) ? createdTaskData.assign_to : (createdTaskData.assign_to ? [createdTaskData.assign_to] : []),
        assign_by: createdTaskData.assign_by,
        status: mapApiStatusToTaskStatus(createdTaskData.status),
        priority: createdTaskData.priority,
        estimatedTime: createdTaskData.est_time ? parseInt(createdTaskData.est_time, 10) : undefined,
        notes: createdTaskData.notes,
        dependency: createdTaskData.dependency,
        dependencyLogs: createdTaskData.dependencyLogs,
        tags: createdTaskData.tags,
        category: createdTaskData.category
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
    return tasks.filter(t => t.assigneeIds?.some(id => teamSet.has(id)));
};

export const getTasksByAssignee = async (assigneeId: string): Promise<Task[]> => {
    const tasks = await getAllTasks();
    return tasks.filter(t => t.assigneeIds?.includes(assigneeId));
};

export const updateTask = async (
    taskId: string,
    updates: { status?: TaskStatus; assigneeIds?: string[]; dueDate?: string; estimatedTime?: number; message?: string },
    currentUserId: string
): Promise<Task> => {
    const payload: { currentUserId: string; status?: string; assign_to?: string[]; due_date?: string; est_time?: number; message?: string } = {
        currentUserId: currentUserId,
    };
    if (updates.status) {
        payload.status = updates.status;
    }
    // Ensure assigneeIds is sent as an array, or empty array if undefined/null
    if (updates.hasOwnProperty('assigneeIds')) {
        payload.assign_to = updates.assigneeIds || [];
    }
    if (updates.dueDate) {
        payload.due_date = updates.dueDate;
    }
    if (typeof updates.estimatedTime === 'number') {
        payload.est_time = updates.estimatedTime;
    }
    if (updates.message && updates.message.trim() !== '') {
        payload.message = updates.message.trim();
    }

    const endpointUrl = `${TASKS_UPDATE_API_BASE_URL}/${taskId}`;

    let response: Response;
    try {
        response = await authenticatedFetch(endpointUrl, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (networkErr) {
        console.warn('[DataService.updateTask] POST failed, retrying with PUT...', networkErr);
        response = await authenticatedFetch(endpointUrl, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

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
    
    const responseData = await parseApiResponse(response);
    const updatedTaskData = responseData.Task || responseData; // Adjust based on actual API response structure

    const mappedTask: Task = {
        id: updatedTaskData.id,
        name: updatedTaskData.title,
        description: updatedTaskData.description,
        dueDate: updatedTaskData.due_date,
        projectId: updatedTaskData.project,
        assigneeIds: Array.isArray(updatedTaskData.assign_to) ? updatedTaskData.assign_to : (updatedTaskData.assign_to ? [updatedTaskData.assign_to] : []),
        assign_by: updatedTaskData.assign_by,
        status: mapApiStatusToTaskStatus(updatedTaskData.status),
        priority: updatedTaskData.priority,
        estimatedTime: (updatedTaskData.est_time ? parseInt(updatedTaskData.est_time, 10) : (updatedTaskData.estimated_time ? parseInt(updatedTaskData.estimated_time, 10) : undefined)),
        notes: Array.isArray(updatedTaskData.messages)
                ? updatedTaskData.messages.map((m: any) => ({ id: m.messageId || m.id, authorId: m.senderId || m.authorId, content: m.text || m.content, timestamp: m.timestamp }))
                : updatedTaskData.notes,
        dependency: updatedTaskData.dependency,
        dependencyLogs: updatedTaskData.dependencyLogs,
        tags: updatedTaskData.tags,
        category: updatedTaskData.category
    };

    return mappedTask;
};

// Optimistic local update for data not handled by the API, e.g., notes.
// This function should only be used for UI-only updates if the API doesn't support them.
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
    const response = await authenticatedFetch(`${TASKS_DELETE_API_BASE_URL}/${taskId}`, {
        method: 'POST', // Or DELETE, depending on your API
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


// --- PROJECTS SERVICE ---
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
    try {
        const response = await authenticatedFetch(PROJECTS_GET_ALL_API_URL);
        const data = await parseApiResponse(response);
        const projectsFromApi = extractArrayFromApiResponse(data, 'projects');
        cachedProjects = projectsFromApi.map((proj: any): Project => ({
            id: proj.id,
            name: proj.name,
            description: proj.description,
            managerIds: Array.isArray(proj.manager_ids)
                        ? proj.manager_ids.map((id: string) => String(id).trim())
                        : Array.isArray(proj.managerIds)
                            ? proj.managerIds.map((id: string) => String(id).trim())
                            : Array.isArray(proj.managers)
                                ? proj.managers.map((id: string) => String(id).trim())
                                : (typeof proj.manager_id === 'string' && proj.manager_id)
                                    ? [String(proj.manager_id).trim()]
                                    : (typeof proj.manager === 'string' && proj.manager)
                                        ? [String(proj.manager).trim()]
                                        : [],
            departmentIds: (Array.isArray(proj.departmentIds) && proj.departmentIds.length > 0
                            ? proj.departmentIds.map((id: string) => String(id).toLowerCase().trim())
                            : Array.isArray(proj.department_ids) && proj.department_ids.length > 0
                                ? proj.department_ids.map((id: string) => String(id).toLowerCase().trim())
                                : (typeof proj.departmentId === 'string' && proj.departmentId)
                                    ? [String(proj.departmentId).toLowerCase().trim()]
                                    : []
                           ),
            deadline: proj.deadline,
            priority: proj.priority,
            estimatedTime: proj.estimated_time ? parseInt(proj.estimated_time, 10) : undefined,
            companyId: String(proj.companyId || proj.company_id || proj.company || 'comp-1').toLowerCase().trim(),
            roadmap: proj.roadmap || [],
            timestamp: proj.timestamp || new Date().toISOString(), // Ensure timestamp is present
        }));
        return cachedProjects;
    } catch (error) {
        console.error("Failed to fetch all projects:", error);
        return [];
    }
};

export const getProjectById = async (id: string, attempt = 0): Promise<Project | undefined> => {
    const projects = await getAllProjects();
    const foundProject = projects.find(p => p.id === id);

    if (foundProject) {
        return foundProject;
    }

    if (attempt < MAX_RETRIES) {
        console.warn(`[DataService] Project ${id} not found on attempt ${attempt + 1}. Retrying in ${RETRY_DELAY_MS}ms...`);
        cachedProjects = null;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return getProjectById(id, attempt + 1);
    }

    console.error(`[DataService] Project ${id} not found after ${MAX_RETRIES} attempts.`);
    return undefined;
};

export const getProjectsByManager = async (managerId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.managerIds && p.managerIds.includes(managerId));
};

export const getProjectsByCompany = async (companyId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.companyId === companyId);
};

export const getProjectsByDepartment = async (departmentId: string): Promise<Project[]> => {
    const projects = await getAllProjects();
    return projects.filter(p => p.departmentIds && p.departmentIds.includes(departmentId));
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
// ... (rest of the code remains the same)

export const createProject = async (projectData: Omit<Project, 'id' | 'timestamp'>): Promise<Project> => {
    const newProjectTimestamp = new Date().toISOString(); 

    const payload = {
        ...projectData,
        manager_ids: projectData.managerIds, // Use backend's expected field name
        department_ids: projectData.departmentIds, // Use backend's expected field name
        company_id: projectData.companyId, // Use backend's expected field name
        id: `proj-${Date.now()}`, 
        timestamp: newProjectTimestamp, 
    };
    
    const response = await authenticatedFetch(PROJECTS_CREATE_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project.');
    }

    cachedProjects = null; // Invalidate cache after creation
    const responseData = await parseApiResponse(response);
    const createdProjectData = responseData.Project?.Item || responseData.Item || responseData; // More robust parsing

    const newProject: Project = {
        id: createdProjectData.id,
        name: createdProjectData.name,
        description: createdProjectData.description,
        managerIds: Array.isArray(createdProjectData.manager_ids)
                    ? createdProjectData.manager_ids.map((id: string) => String(id).trim())
                    : Array.isArray(createdProjectData.managerIds)
                        ? createdProjectData.managerIds.map((id: string) => String(id).trim())
                        : Array.isArray(createdProjectData.managers)
                            ? createdProjectData.managers.map((id: string) => String(id).trim())
                            : (typeof createdProjectData.manager_id === 'string' && createdProjectData.manager_id)
                                ? [String(createdProjectData.manager_id).trim()]
                                : (typeof createdProjectData.manager === 'string' && createdProjectData.manager)
                                    ? [String(createdProjectData.manager).trim()]
                                    : [],
        departmentIds: (Array.isArray(createdProjectData.departmentIds) && createdProjectData.departmentIds.length > 0
                            ? createdProjectData.departmentIds.map((id: string) => String(id).toLowerCase().trim())
                            : Array.isArray(createdProjectData.department_ids) && createdProjectData.department_ids.length > 0
                                ? createdProjectData.department_ids.map((id: string) => String(id).toLowerCase().trim())
                                : (typeof createdProjectData.departmentId === 'string' && createdProjectData.departmentId)
                                    ? [String(createdProjectData.departmentId).toLowerCase().trim()]
                                    : []
                           ),
        deadline: createdProjectData.deadline,
        priority: createdProjectData.priority,
        estimatedTime: createdProjectData.estimated_time ? parseInt(createdProjectData.estimated_time, 10) : undefined,
        companyId: String(createdProjectData.companyId || createdProjectData.company_id || createdProjectData.company || 'comp-1').toLowerCase().trim(),
        roadmap: createdProjectData.roadmap || [],
        timestamp: createdProjectData.timestamp,
    };
    
    return newProject;
};

// ... (rest of the code remains the same)

export const updateProject = async (projectId: string, projectTimestamp: string, updates: Partial<Project>): Promise<Project> => {
    const updateFields: any = {};
    if (updates.name !== undefined) updateFields.name = updates.name;
    if (updates.description !== undefined) updateFields.description = updates.description;
    if (updates.managerIds !== undefined) updateFields.manager_ids = updates.managerIds; // Backend expects manager_ids
    if (updates.departmentIds !== undefined) updateFields.department_ids = updates.departmentIds; // Backend expects department_ids
    if (updates.deadline !== undefined) updateFields.deadline = updates.deadline;
    if (updates.priority !== undefined) updateFields.priority = updates.priority;
    if (updates.estimatedTime !== undefined) updateFields.estimated_time = updates.estimatedTime; // Backend expects estimated_time
    if (updates.companyId !== undefined) updateFields.company_id = updates.companyId; // Backend expects company_id
    if (updates.roadmap !== undefined) updateFields.roadmap = updates.roadmap;

    const requestBodyForLambda = {
        id: projectId,
        timestamp: projectTimestamp, // Crucial for DynamoDB conditional update
        updateFields: updateFields,
    };

    console.log(`[DataService] Calling updateProject API for ${projectId}. Payload:`, JSON.stringify(requestBodyForLambda));

    const response = await authenticatedFetch(`${PROJECTS_UPDATE_API_BASE_URL}/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(requestBodyForLambda),
    });

    if (!response.ok) {
        let errorMessage = `Failed to update project ${projectId}. Status: ${response.status} ${response.statusText}.`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
            errorMessage = await response.text();
        }
        throw new Error(errorMessage);
    }

    cachedProjects = null; // Invalidate cache after server update

    const responseData = await parseApiResponse(response);
    const updatedProjectData = responseData.updatedItem || responseData; // Assuming it returns `updatedItem` or the item directly

    const updatedProject: Project = {
        id: updatedProjectData.id,
        name: updatedProjectData.name,
        description: updatedProjectData.description,
        managerIds: Array.isArray(updatedProjectData.manager_ids)
                    ? updatedProjectData.manager_ids.map((id: string) => String(id).trim())
                    : Array.isArray(updatedProjectData.managerIds)
                        ? updatedProjectData.managerIds.map((id: string) => String(id).trim())
                        : Array.isArray(updatedProjectData.managers)
                            ? updatedProjectData.managers.map((id: string) => String(id).trim())
                            : (typeof updatedProjectData.manager_id === 'string' && updatedProjectData.manager_id)
                                ? [String(updatedProjectData.manager_id).trim()]
                                : (typeof updatedProjectData.manager === 'string' && updatedProjectData.manager)
                                    ? [String(updatedProjectData.manager).trim()]
                                    : [],
        departmentIds: (Array.isArray(updatedProjectData.departmentIds) && updatedProjectData.departmentIds.length > 0
                            ? updatedProjectData.departmentIds.map((id: string) => String(id).toLowerCase().trim())
                            : Array.isArray(updatedProjectData.department_ids) && updatedProjectData.department_ids.length > 0
                                ? updatedProjectData.department_ids.map((id: string) => String(id).toLowerCase().trim())
                                : (typeof updatedProjectData.departmentId === 'string' && updatedProjectData.departmentId)
                                    ? [String(updatedProjectData.departmentId).toLowerCase().trim()]
                                    : []
                           ),
        deadline: updatedProjectData.deadline,
        priority: updatedProjectData.priority,
        estimatedTime: updatedProjectData.estimated_time ? parseInt(updatedProjectData.estimated_time, 10) : undefined,
        companyId: String(updatedProjectData.companyId || updatedProjectData.company_id || updatedProjectData.company || 'comp-1').toLowerCase().trim(),
        roadmap: updatedProjectData.roadmap || [],
        timestamp: updatedProjectData.timestamp,
    };
    
    return updatedProject;
};

export const deleteProject = async (projectId: string, projectTimestamp: string): Promise<void> => {
    const deletePayload = {
        id: projectId,
        timestamp: projectTimestamp,
    };

    const response = await authenticatedFetch(PROJECTS_DELETE_API_URL, {
        method: 'DELETE',
        body: JSON.stringify(deletePayload),
    });

    if (!response.ok) {
        let errorMessage = `Failed to delete project ${projectId}. Status: ${response.status} ${response.statusText}.`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || JSON.stringify(errorData);
        } catch (jsonError) {
            errorMessage = await response.text();
        }
        throw new Error(errorMessage);
    }
    cachedProjects = null; // Invalidate cache after deletion
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

// --- DEPARTMENT SERVICE ---
export const getDepartments = async (): Promise<Department[]> => {
    if (cachedDepartments) return cachedDepartments;
    try {
        const response = await authenticatedFetch(DEPARTMENTS_API_URL);
        const data = await parseApiResponse(response);
        const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');
        cachedDepartments = departmentsFromApi.map((dept: any): Department => ({
            id: dept.id,
            name: dept.name,
            companyId: (Array.isArray(dept.companyIds) && dept.companyIds.length > 0
                        ? String(dept.companyIds[0])
                        : String(dept.companyId || dept.company_id || dept.company || 'comp-1')
                       ).toLowerCase().trim(),
        }));
        return cachedDepartments;
    } catch (error) {
        console.error("Failed to fetch all departments:", error);
        return [];
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

export const getDepartmentsByCompany = async (companyId: string): Promise<Department[]> => {
    const allDepartments = await getDepartments();
    return allDepartments.filter(dept => dept.companyId === companyId);
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
    const payload = {
        name,
        company_id: companyId, 
        id: `dept-${Date.now()}` // Client-side ID generation
    };
    const response = await authenticatedFetch(DEPARTMENTS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

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
    cachedDepartments = null; // Invalidate cache
    const responseData = await parseApiResponse(response);
    const createdDepartmentData = responseData.Department?.Item || responseData.Item || responseData; // Adjust based on actual API response structure

    const newDepartment: Department = { 
        id: createdDepartmentData.id, 
        name: createdDepartmentData.name, 
        companyId: (Array.isArray(createdDepartmentData.companyIds) && createdDepartmentData.companyIds.length > 0
                    ? String(createdDepartmentData.companyIds[0])
                    : String(createdDepartmentData.companyId || createdDepartmentData.company_id || createdDepartmentData.company || 'comp-1')
                   ).toLowerCase().trim(),
    };
    return newDepartment;
};

// --- COMPANY SERVICE ---
export const getCompanies = async (): Promise<Company[]> => {
    if (cachedCompanies) return cachedCompanies;

    try {
        const response = await authenticatedFetch(COMPANIES_API_URL);
        const data = await parseApiResponse(response);
        const companiesFromApi = extractArrayFromApiResponse(data, 'companies');

        cachedCompanies = companiesFromApi.map((company: any): Company => ({
            id: company.id,
            name: company.name,
            ownerId: company.ownerId, 
            createdAt: company.createdAt || new Date().toISOString(), 
        }));
        return cachedCompanies;
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
// This remains mocked as no API was provided for creating companies.
export const createCompany = (name: string, ownerId: string): Company => {
    const newCompany: Company = { id: `comp-${Date.now()}`, name, ownerId, createdAt: new Date().toISOString() };
    if (cachedCompanies) {
        cachedCompanies.unshift(newCompany);
    } else {
        cachedCompanies = [newCompany];
    }
    return newCompany;
};


// --- ATTENDANCE SERVICE ---
export const getAttendanceByDate = async (date: string): Promise<string[]> => {
    try {
        const response = await authenticatedFetch(ATTENDANCE_GET_BY_DATE_URL, {
            method: 'POST',
            body: JSON.stringify({ date }),
        });
        const data = await parseApiResponse(response);
        const attendanceRecords = extractArrayFromApiResponse(data, 'attendance');
        return attendanceRecords.map((record: any) => record.userId);
    } catch (error) {
        console.error(`Failed to fetch attendance for date ${date}:`, error);
        return ATTENDANCE_DATA[date] || []; // Fallback to mock data
    }
};

export const getAttendanceForUserByMonth = async (userId: string, year: number, month: number): Promise<string[]> => {
    try {
        const response = await authenticatedFetch(ATTENDANCE_GET_BY_USER_URL, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        const data = await parseApiResponse(response);
        const allUserAttendanceRecords = extractArrayFromApiResponse(data, 'attendance');

        const presentDatesInMonth = allUserAttendanceRecords
            .filter((record: any) => {
                const recordDate = new Date(record.date);
                // Note: month from API might be 1-indexed, JS Date getMonth() is 0-indexed.
                // Assuming month parameter here is 0-indexed for consistency with JS Date object.
                return recordDate.getFullYear() === year && recordDate.getMonth() === month;
            })
            .map((record: any) => record.date);

        return presentDatesInMonth;

    } catch (error) {
        console.error(`Failed to fetch attendance for user ${userId} in month ${month + 1}/${year}:`, error);
        const monthString = (month + 1).toString().padStart(2, '0');
        const presentDates: string[] = [];
        for (const dateKey in ATTENDANCE_DATA) {
            if (dateKey.startsWith(`${year}-${monthString}`) && ATTENDANCE_DATA[dateKey].includes(userId)) {
                presentDates.push(dateKey);
            }
        }
        return presentDates; // Fallback to mock data
    }
};

export const recordAttendance = async (userId: string, action: 'PUNCH_IN' | 'PUNCH_OUT'): Promise<any> => {
    try {
        const response = await authenticatedFetch(ATTENDANCE_RECORD_ACTION_URL, {
            method: 'POST',
            body: JSON.stringify({ userId, action }),
        });
        return parseApiResponse(response);
    } catch (error) {
        console.error(`Error recording attendance for user ${userId} with action ${action}:`, error);
        throw error; // Re-throw to propagate the error
    }
};

// --- CHAT SERVICE (MOCKED) ---
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

// --- ONBOARDING SERVICE (MOCKED) ---
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

// --- PLACEHOLDER FUNCTIONS (MOCKED) ---
// These functions were present in your original local file but had no implementation or API provided.
// They are included here as simple placeholders to avoid breaking other parts of your application that might call them.
export const getNoteById = (id: string): Note | undefined => {
    console.warn(`getNoteById(${id}) is mocked and returns undefined.`);
    return undefined;
}
export const getDependencyLogById = (id: string): DependencyLog | undefined => {
    console.warn(`getDependencyLogById(${id}) is mocked and returns undefined.`);
    return undefined;
}
export const getMilestoneById = (id: string): MilestoneStatus | undefined => {
    console.warn(`getMilestoneById(${id}) is mocked and returns undefined.`);
    return undefined;
}