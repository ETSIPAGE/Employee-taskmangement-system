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

const ATTENDANCE_GET_BY_USER_URL = 'https://1gtr3hd3e4.execute-api.ap-south-1.amazonaws.com/dev/attendance/user';
const ATTENDANCE_GET_BY_DATE_URL = 'https://rhb8m6a8mg.execute-api.ap-south-1.amazonaws.com/dev/attendance/date';
const ATTENDANCE_RECORD_ACTION_URL = 'https://q1rltbjzl4.execute-api.ap-south-1.amazonaws.com/dev/attendance/record'; // POST

const CONVERSATIONS_GET_API_URL = 'https://dwzvagakdh.execute-api.ap-south-1.amazonaws.com/dev/conversations';
const CONVERSATION_CREATE_API_URL = 'https://cgdham1ksb.execute-api.ap-south-1.amazonaws.com/dev/conversation';
const MESSAGES_GET_API_BASE_URL = 'https://h5jj6yq686.execute-api.ap-south-1.amazonaws.com/dev/conversation/msg';

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

export const getMessagesForConversationApi = async (
    conversationId: string,
    options?: { limit?: number; nextToken?: string; order?: 'asc' | 'desc' }
): Promise<{ items: ChatMessage[]; nextToken: string | null }> => {
    const qs: string[] = [];
    if (options?.limit) qs.push(`limit=${encodeURIComponent(String(options.limit))}`);
    if (options?.nextToken) qs.push(`nextToken=${encodeURIComponent(options.nextToken)}`);
    if (options?.order) qs.push(`order=${encodeURIComponent(options.order)}`);
    const url = `${MESSAGES_GET_API_BASE_URL}/${encodeURIComponent(conversationId)}${qs.length ? `?${qs.join('&')}` : ''}`;

    const tryOnce = async (): Promise<{ items: ChatMessage[]; nextToken: string | null }> => {
        console.log('[DataService] GET messages ->', url);
        const response = await authenticatedFetch(url);
        const data = await parseApiResponse(response);

    let rawItems: any[] = [];
    let nextToken: string | null = null;
    if (Array.isArray(data)) {
        rawItems = data as any[];
    } else if (data && typeof data === 'object') {
        if (Array.isArray((data as any).items)) {
            rawItems = (data as any).items as any[];
            nextToken = (data as any).nextToken || (data as any).next_token || null;
        } else {
            rawItems = extractArrayFromApiResponse(data, 'items');
        }
    }

    const mapMsg = (m: any): ChatMessage => ({
        id: String(m?.id || m?.messageId || m?.msgId || `${conversationId}-${m?.timestamp || Date.now()}`),
        conversationId: String(m?.conversationId || m?.conversation_id || m?.convId || conversationId),
        senderId: String(m?.senderId || m?.sender_id || m?.from || m?.userId || ''),
        text: String(m?.text || m?.message || m?.body || ''),
        timestamp: String(m?.timestamp || m?.createdAt || m?.created_at || new Date().toISOString()),
    });

    const items = (rawItems || []).map(mapMsg).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`[DataService] GET messages success: ${items.length} items for conversation ${conversationId}`);
    return { items, nextToken };
    };

    try {
        let attempt = 0;
        let result = await tryOnce();
        while (attempt < 2 && (!result.items || result.items.length === 0)) {
            attempt += 1;
            await new Promise(r => setTimeout(r, 400));
            result = await tryOnce();
        }
        return result;
    } catch (err) {
        console.error('[DataService] GET messages failed:', err);
        throw err;
    }
};

export const createConversationApi = async (name: string, participantIds: string[]): Promise<ChatConversation> => {
    const normalizedName = (name && name.trim().length > 0) ? name.trim() : `Direct-${Date.now()}`;
    const payload: any = {
        // Common
        name: normalizedName,
        // Provide multiple variants for backend compatibility
        participantIds,
        participants: participantIds,
        participant_ids: participantIds,
        members: participantIds,
        // Hint conversation type for servers that expect it
        // If caller provided a real name (not our Direct-* default), treat as group
        type: (normalizedName.startsWith('Direct-') && participantIds.length === 2) ? 'direct' : 'group',
    };
    const response = await authenticatedFetch(CONVERSATION_CREATE_API_URL.replace(/\/$/, ''), {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    const data = await parseApiResponse(response);
    const conv = (data && (data.conversation || data.item || data.Item || data)) as any;
    const toStringArray = (val: any): string[] => Array.isArray(val) ? val.map((x: any) => String(x)) : (typeof val === 'string' ? [val] : []);
    const mapMsg = (m: any): ChatMessage => ({
        id: String(m?.id || m?.messageId || m?.msgId || `msg-${Date.now()}`),
        conversationId: String(m?.conversationId || m?.conversation_id || m?.convId || ''),
        senderId: String(m?.senderId || m?.sender_id || m?.from || m?.userId || ''),
        text: String(m?.text || m?.message || m?.body || ''),
        timestamp: String(m?.timestamp || m?.createdAt || m?.created_at || new Date().toISOString()),
    });
    const participantsRaw = toStringArray(conv?.participantIds || conv?.participants || conv?.participant_ids || conv?.members).map((s: string) => s.trim());
    const participants = Array.from(new Set(participantsRaw.filter((s: string) => !!s)));
    const admins = toStringArray(conv?.adminIds || conv?.admin_ids || conv?.admins).map((s: string) => s.trim());
    let lastMessage: ChatMessage | undefined;
    const lm = conv?.lastMessage || conv?.last_message || conv?.latestMessage;
    if (lm) lastMessage = mapMsg(lm);
    else if (Array.isArray(conv?.messages) && conv.messages.length > 0) {
        const sorted = [...conv.messages].sort((a: any, b: any) => {
            const ta = new Date(a?.timestamp || a?.createdAt || a?.created_at || 0).getTime();
            const tb = new Date(b?.timestamp || b?.createdAt || b?.created_at || 0).getTime();
            return tb - ta;
        });
        lastMessage = mapMsg(sorted[0]);
    }
    const typeRaw = String(conv?.type || conv?.conversationType || conv?.kind || '').toLowerCase();
    const isNamedGroup = !!(conv?.name) && !String(conv?.name).startsWith('Direct-');
    const defaultDirect = participants.length === 2 && (!conv?.name || String(conv?.name).startsWith('Direct-'));
    const type: 'direct' | 'group' = defaultDirect
        ? 'direct'
        : ((typeRaw === 'group' || participants.length > 2 || isNamedGroup) ? 'group' : 'direct');
    const mapped: ChatConversation = {
        id: String(conv?.id || conv?.conversationId || conv?.convId),
        type,
        participantIds: participants,
        name: conv?.name,
        adminIds: admins.length ? admins : undefined,
        lastMessage,
    };
    return mapped;
};

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
    return fetch(url, { ...options, headers });
};

const parseApiResponse = async (response: Response) => {
    const responseText = await response.text();
    if (!response.ok) {
        let errorMessage = responseText;
        try {
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
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
        id: String(apiUser.id),
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

export const getUsers = async (): Promise<User[]> => {
    if (cachedAllUsers) return cachedAllUsers;

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
            estimatedTime: task.est_time ? parseInt(task.est_time, 10) : undefined,
            // Include other fields if your API returns them
            notes: task.notes,
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

export const updateTask = async (taskId: string, updates: { status?: TaskStatus; assigneeIds?: string[] }, currentUserId: string): Promise<Task> => {
    const payload: { currentUserId: string; status?: string; assign_to?: string[] } = {
        currentUserId: currentUserId,
    };
    if (updates.status) {
        payload.status = updates.status;
    }
    // Ensure assigneeIds is sent as an array, or empty array if undefined/null
    if (updates.hasOwnProperty('assigneeIds')) {
        payload.assign_to = updates.assigneeIds || [];
    }

    const endpointUrl = `${TASKS_UPDATE_API_BASE_URL}/${taskId}`;

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
    const payload = {
        name,
        company_id: companyId, 
        id: `dept-${Date.now()}` // Client-side ID generation
    };
    const response = await authenticatedFetch(DEPARTMENTS_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create department.');
    }

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
        console.error("Failed to fetch all companies:", error);
        return []; 
    }
};

export const getCompanyById = async (id: string): Promise<Company | undefined> => {
    const allCompanies = await getCompanies();
    return allCompanies.find(c => c.id === id);
};

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
export const getAttendanceByDate = async (date: string): Promise<Array<{ userId: string; date?: string }>> => {
    try {
        // --- THIS IS THE CORRECTED LINE ---
        const endpoint = `${ATTENDANCE_GET_BY_DATE_URL}?date=${encodeURIComponent(date)}`;
        // ----------------------------------

        const response = await authenticatedFetch(endpoint, { method: 'GET' });
        const data = await parseApiResponse(response);
        const raw = extractArrayFromApiResponse(data, 'attendance');
        const normalized = raw
            .map((r: any) => {
                if (typeof r === 'string') {
                    return { userId: r, date };
                }
                const userId = r.userId || r.user_id || r.user || r.id;
                const d = r.date || r.timestamp || r.attendanceDate || date;
                return userId ? { userId: String(userId), date: d } : null;
            })
            .filter((x: any) => x);
        return normalized;
    } catch (error) {
        console.error(`Failed to fetch attendance for date ${date}:`, error);
        const fallback = (ATTENDANCE_DATA[date] || []).map(uid => ({ userId: uid, date }));
        return fallback;
    }
};

export const getAttendanceForUserByMonth = async (
    userId: string,
    year: number,
    month: number
): Promise<Array<{ userId: string; date: string; punchInTime?: string; punchOutTime?: string }>> => {
    try {
        // Always use query parameter as backend requires ?userId even if path includes {userId}
        const baseUserUrl = ATTENDANCE_GET_BY_USER_URL
            .replace('{userId}', '')
            .replace(/\/{userId}/g, '')
            .replace(/\/$/, '');
        const endpoint = `${baseUserUrl}?userId=${encodeURIComponent(userId)}&year=${encodeURIComponent(String(year))}&month=${encodeURIComponent(String(month))}`;
        const response = await authenticatedFetch(endpoint, { method: 'GET' });
        const data = await parseApiResponse(response);
        const raw = extractArrayFromApiResponse(data, 'attendance');

        const normalizedAll = raw
            .map((r: any) => {
                const uid = (r?.userId || r?.user_id || r?.user || r?.id || userId);
                const d = r?.date || r?.timestamp || r?.attendanceDate;
                if (!d) return null;
                const rec: { userId: string; date: string; punchInTime?: string; punchOutTime?: string } = {
                    userId: String(uid),
                    date: String(d),
                };
                if (r?.punchInTime) rec.punchInTime = String(r.punchInTime);
                if (r?.punchOutTime) rec.punchOutTime = String(r.punchOutTime);
                return rec;
            })
            .filter((x: any) => x);

        // Helper to parse year and month from various date formats
        const parseYearMonth = (dateStr: string): { y: number; m: number } | null => {
            const s = String(dateStr);
            // Try ISO
            const asDate = new Date(s);
            if (!isNaN(asDate.getTime())) {
                return { y: asDate.getFullYear(), m: asDate.getMonth() + 1 };
            }
            const core = s.split('T')[0];
            const parts = core.split(/[-\/]/);
            if (parts.length >= 3) {
                // Detect if first part is year (yyyy-mm-dd) or day (dd-mm-yyyy)
                if (parts[0].length === 4) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    if (!isNaN(y) && !isNaN(m)) return { y, m };
                } else {
                    const d = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    const y = parseInt(parts[2], 10);
                    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { y, m };
                }
            }
            return null;
        };

        const presentThisMonth = normalizedAll.filter((rec: { userId: string; date: string }) => {
            const parsed = parseYearMonth(rec.date);
            return parsed ? (parsed.y === year && parsed.m === month) : false;
        });

        return presentThisMonth;
    } catch (error) {
        console.error(`Failed to fetch attendance for user ${userId} in month ${month + 1}/${year}:`, error);
        const monthString = (month + 1).toString().padStart(2, '0');
        const presentDates: Array<{ userId: string; date: string; punchInTime?: string; punchOutTime?: string }> = [];
        for (const dateKey in ATTENDANCE_DATA) {
            if (dateKey.startsWith(`${year}-${monthString}`) && ATTENDANCE_DATA[dateKey].includes(userId)) {
                presentDates.push({ userId, date: dateKey });
            }
        }
        return presentDates; // Fallback to mock data
    }
};

const normalizeAttendanceAction = (action: string): string => {
    const k = action.toUpperCase();
    if (k === 'PUNCH_IN') return 'punchIn';
    if (k === 'PUNCH_OUT') return 'punchOut';
    if (k === 'START_BREAK') return 'startBreak';
    if (k === 'END_BREAK') return 'endBreak';
    return action;
};

export const recordAttendance = async (userId: string, action: 'PUNCH_IN' | 'PUNCH_OUT' | 'START_BREAK' | 'END_BREAK'): Promise<any> => {
    try {
        const response = await authenticatedFetch(ATTENDANCE_RECORD_ACTION_URL, {
            method: 'POST',
            body: JSON.stringify({ userId, action: normalizeAttendanceAction(action) }),
        });
        return parseApiResponse(response);
    } catch (error) {
        console.error(`Error recording attendance for user ${userId} with action ${action}:`, error);
        throw error; // Re-throw to propagate the error
    }
};

export const getConversationsForUserApi = async (userId: string): Promise<ChatConversation[]> => {
    const fetchOnce = async (): Promise<ChatConversation[]> => {
        const url = CONVERSATIONS_GET_API_URL.replace(/\/$/, '');
        const response = await authenticatedFetch(url, { method: 'GET' });
        const data = await parseApiResponse(response);
        const raw = extractArrayFromApiResponse(data, 'conversations');

        const toStringArray = (val: any): string[] => {
            if (Array.isArray(val)) return val.map((x: any) => String(x));
            if (typeof val === 'string') return [val];
            return [];
        };

        const mapMsg = (m: any): ChatMessage => ({
            id: String(m?.id || m?.messageId || m?.msgId || `msg-${Date.now()}`),
            conversationId: String(m?.conversationId || m?.conversation_id || m?.convId || ''),
            senderId: String(m?.senderId || m?.sender_id || m?.from || m?.userId || ''),
            text: String(m?.text || m?.message || m?.body || ''),
            timestamp: String(m?.timestamp || m?.createdAt || m?.created_at || new Date().toISOString()),
        });

        const parsed: ChatConversation[] = raw.map((c: any) => {
            const participantsRaw = toStringArray(
                c?.participantIds || c?.participants || c?.participant_ids || c?.members
            ).map((s: string) => s.trim());
            const participants = Array.from(new Set(participantsRaw.filter((s: string) => !!s)));

            const admins = toStringArray(c?.adminIds || c?.admin_ids || c?.admins).map((s: string) => s.trim());

            const typeRaw = String(c?.type || c?.conversationType || c?.kind || '').toLowerCase();
            const isNamedGroup = !!(c?.name) && !String(c?.name).startsWith('Direct-');
            const defaultDirect = participants.length === 2 && (!c?.name || String(c?.name).startsWith('Direct-'));
            let type: 'direct' | 'group' = defaultDirect
                ? 'direct'
                : ((typeRaw === 'group' || participants.length > 2 || isNamedGroup) ? 'group' : 'direct');

            let lastMessage: ChatMessage | undefined;
            const lm = c?.lastMessage || c?.last_message || c?.latestMessage;
            if (lm) {
                lastMessage = mapMsg(lm);
            } else if (Array.isArray(c?.messages) && c.messages.length > 0) {
                const sorted = [...c.messages].sort((a: any, b: any) => {
                    const ta = new Date(a?.timestamp || a?.createdAt || a?.created_at || 0).getTime();
                    const tb = new Date(b?.timestamp || b?.createdAt || b?.created_at || 0).getTime();
                    return tb - ta;
                });
                lastMessage = mapMsg(sorted[0]);
            } else {
                // Fallback: use conversation-level activity timestamps so the chat orders correctly on login
                const lastTsRaw = c?.updatedAt || c?.updated_at || c?.lastActivity || c?.last_activity || c?.lastMessageAt || c?.last_message_at;
                const ts = lastTsRaw ? String(lastTsRaw) : undefined;
                if (ts) {
                    lastMessage = {
                        id: `synthetic-${String(c?.id || c?.conversationId || c?.convId || Date.now())}`,
                        conversationId: String(c?.id || c?.conversationId || c?.convId || ''),
                        senderId: '',
                        text: '',
                        timestamp: String(ts),
                    };
                }
            }

            return {
                id: String(c?.id || c?.conversationId || c?.convId),
                type,
                participantIds: participants,
                name: c?.name,
                adminIds: admins.length ? admins : undefined,
                lastMessage,
            } as ChatConversation;
        })
        .filter((c: ChatConversation) => c?.id && c?.participantIds?.includes(String(userId)));

        const sorted = parsed.sort((a, b) => {
            const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return tb - ta;
        });

        return sorted;
    };

    try {
        let attempt = 0;
        let convs = await fetchOnce();
        // Retry if no conversations have any timestamp yet (eventual consistency)
        const noActivity = !convs || convs.length === 0 || convs.every(c => !c.lastMessage || !c.lastMessage.timestamp);
        while (attempt < 2 && noActivity) {
            attempt += 1;
            await new Promise(r => setTimeout(r, 400));
            convs = await fetchOnce();
            if (convs.some(c => c.lastMessage && c.lastMessage.timestamp)) break;
        }
        return convs;
    } catch (error) {
        console.error('Failed to fetch conversations from API, falling back to mock:', error);
        return getConversationsForUser(userId);
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