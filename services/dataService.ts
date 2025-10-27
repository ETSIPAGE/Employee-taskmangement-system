import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';

// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
// Companies, Chat, and Onboarding data remains mocked as no APIs were specified for them.
let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' }
];
import { getToken, getCurrentUser } from './authService'; // Assuming getToken is in authService

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
const CHAT_CONVERSATIONS_API_URL = 'https://dwzvagakdh.execute-api.ap-south-1.amazonaws.com/dev/conversations';
const CHAT_CONVERSATION_CREATE_API_URL = 'https://cgdham1ksb.execute-api.ap-south-1.amazonaws.com/dev/conversation';
const CHAT_CONVERSATION_DELETE_API_URL = 'https://9jaqdh2n8i.execute-api.ap-south-1.amazonaws.com/del/delete';
const CHAT_CONVERSATION_CLEAR_API_BASE_URL = 'https://2h9az81n7d.execute-api.ap-south-1.amazonaws.com/clr/clear';
const CHAT_CONVERSATION_RENAME_API_URL = 'https://zixceriuaf.execute-api.ap-south-1.amazonaws.com/edt/edit-name';
const CHAT_CONVERSATION_MEMBER_ADD_API_URL = 'https://5kgwazn18e.execute-api.ap-south-1.amazonaws.com/add/add';
const CHAT_CONVERSATION_MEMBER_REMOVE_API_URL = 'https://ikkxv0mnv6.execute-api.ap-south-1.amazonaws.com/rem/remove';
const CHAT_MESSAGES_API_BASE_URL = 'https://h5jj6yq686.execute-api.ap-south-1.amazonaws.com/dev/conversation/msg';

const ATTENDANCE_GET_BY_USER_URL = 'https://1gtr3hd3e4.execute-api.ap-south-1.amazonaws.com/dev/attendance/user';
const ATTENDANCE_GET_BY_DATE_URL = 'https://rhb8m6a8mg.execute-api.ap-south-1.amazonaws.com/dev/attendance/date';
const ATTENDANCE_RECORD_ACTION_URL = 'https://q1rltbjzl4.execute-api.ap-south-1.amazonaws.com/dev/attendance/record'; // POST

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

export const addGroupMember = async (conversationId: string, memberId: string, requesterRole?: UserRole) => {
    const payload: Record<string, any> = {
        conversationId,
        memberId,
    };
    if (requesterRole) {
        payload.requesterRole = requesterRole.toUpperCase();
    }

    try {
        const response = await authenticatedFetch(CHAT_CONVERSATION_MEMBER_ADD_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await parseApiResponse(response);

        CONVERSATIONS = CONVERSATIONS.map(conversation => {
            if (conversation.id !== conversationId) {
                return conversation;
            }
            const existingParticipants = new Set<string>(conversation.participantIds || []);
            existingParticipants.add(memberId);
            return {
                ...conversation,
                participantIds: Array.from(existingParticipants),
            };
        });

        return data;
    } catch (error) {
        console.error(`Failed to add member ${memberId} to group ${conversationId}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to add group member.');
    }
};

export const removeGroupMember = async (conversationId: string, memberId: string, requesterRole?: UserRole) => {
    const payload: Record<string, any> = {
        conversationId,
        memberId,
    };
    if (requesterRole) {
        payload.requesterRole = requesterRole.toUpperCase();
    }

    try {
        const response = await authenticatedFetch(CHAT_CONVERSATION_MEMBER_REMOVE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await parseApiResponse(response);

        CONVERSATIONS = CONVERSATIONS.map(conversation => {
            if (conversation.id !== conversationId) {
                return conversation;
            }
            const updatedParticipants = (conversation.participantIds || []).filter(id => id !== memberId);
            const updatedAdmins = (conversation.adminIds || []).filter(id => id !== memberId);
            return {
                ...conversation,
                participantIds: updatedParticipants,
                adminIds: updatedAdmins,
            };
        });

        return data;
    } catch (error) {
        console.error(`Failed to remove member ${memberId} from group ${conversationId}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to remove group member.');
    }
};

export const renameGroupConversation = async (conversationId: string, newName: string, requesterRole?: UserRole) => {
    const payload: Record<string, any> = {
        conversationId,
        newName,
    };
    if (requesterRole) {
        payload.requesterRole = requesterRole.toUpperCase();
    }

    try {
        const response = await authenticatedFetch(CHAT_CONVERSATION_RENAME_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await parseApiResponse(response);

        CONVERSATIONS = CONVERSATIONS.map(conversation => {
            if (conversation.id !== conversationId) {
                return conversation;
            }
            return {
                ...conversation,
                name: newName,
            };
        });

        return data;
    } catch (error) {
        console.error(`Failed to rename group ${conversationId}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to rename group.');
    }
};

// --- COMMON HELPERS ---
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
// --- ATTENDANCE TIME NORMALIZATION HELPERS ---
const coerceDateFromEpochAny = (input: string | number): Date | null => {
    const numeric = typeof input === 'number' ? input : Number(String(input).trim());
    if (!Number.isFinite(numeric)) return null;
    const millis = numeric > 1e12 ? numeric : numeric > 1e9 ? numeric * 1000 : null;
    if (!millis) return null;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
};

const parseClock = (value: string): { h: number; m: number } | null => {
    const s = value.trim();
    const m12 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (m12) {
        let h = parseInt(m12[1], 10);
        const m = parseInt(m12[2], 10);
        const mer = m12[4].toUpperCase();
        if (Number.isNaN(h) || Number.isNaN(m) || m < 0 || m > 59) return null;
        if (mer === 'AM') { if (h === 12) h = 0; }
        else { if (h !== 12) h += 12; }
        if (h < 0 || h > 23) return null;
        return { h, m };
    }
    const m24 = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m24) {
        const h = parseInt(m24[1], 10);
        const m = parseInt(m24[2], 10);
        if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
        return { h, m };
    }
    return null;
};

const toHHmm = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const normalizeTimeForDisplay = (input: any): string => {
    if (input === undefined || input === null) return '';
    // Numeric epoch seconds/millis
    if (typeof input === 'number') {
        const d = coerceDateFromEpochAny(input);
        if (d) return toHHmm(d);
    }
    const s = String(input).trim();
    // Numeric string epoch
    if (/^\d{9,}$/.test(s)) {
        const d = coerceDateFromEpochAny(s);
        if (d) return toHHmm(d);
    }
    // ISO or date-like string
    const asDate = new Date(s);
    if (!isNaN(asDate.getTime())) {
        return toHHmm(asDate);
    }
    // Plain clock strings
    const comps = parseClock(s);
    if (comps) {
        const d = new Date();
        d.setHours(comps.h, comps.m, 0, 0);
        return toHHmm(d);
    }
    return s;
};

// Helper to add auth token to requests
const authenticatedFetch = async (url: string, options: ExtendedRequestInit = {}) => {
    const token = localStorage.getItem('ets_token') || (typeof getToken === 'function' ? getToken() : undefined);
    const apiKey = localStorage.getItem('ets_api_key');
    const headers = new Headers(options.headers || {});

    const { skipAuth, noContentType, authRaw, ...fetchOptions } = (options as any) || {};

    const hasBody = typeof fetchOptions.body !== 'undefined' && fetchOptions.body !== null;
    if (!noContentType && hasBody && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Attach Authorization when available and not explicitly skipped
    if (!skipAuth && token) {
        const tokenStr = String(token);
        const authValue = authRaw ? tokenStr : (tokenStr.startsWith('Bearer ') ? tokenStr : `Bearer ${tokenStr}`);
        headers.set('Authorization', authValue);
    }

    // Attach API Gateway key if configured (some endpoints require x-api-key regardless of auth)
    if (apiKey && !headers.has('x-api-key')) {
        headers.set('x-api-key', apiKey);
    }

    return fetch(url, { ...fetchOptions, headers, mode: 'cors' });
};

// Helper to parse AWS API Gateway responses
const parseApiResponse = async (response: Response) => {
    const rawText = await response.text();
    if (!response.ok) {
        // Include raw body for better diagnostics
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${rawText}`);
    }

    if (!rawText) return null;

    // Try JSON parse of the outer response
    try {
        const outer = JSON.parse(rawText);
        // Lambda proxy: body is a JSON string
        if (outer && typeof outer.body === 'string') {
            try {
                return JSON.parse(outer.body);
            } catch {
                return outer.body; // plain string body
            }
        }
        return outer;
    } catch {
        // Not JSON, return as text payload wrapper
        return { body: rawText } as any;
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

const userPresenceMap = new Map<string, User['status']>();

const normalizeUserStatus = (status?: string | null): User['status'] => {
    if (!status) {
        return 'Offline';
    }
    const normalized = status.toString().trim().toLowerCase();
    if (!normalized) {
        return 'Offline';
    }
    if (['active', 'online', 'available'].includes(normalized)) {
        return 'Active';
    }
    if (['busy', 'away', 'do-not-disturb', 'dnd', 'occupied'].includes(normalized)) {
        return 'Busy';
    }
    return 'Offline';
};

const updateUserPresenceCache = (users: User[]) => {
    users.forEach(user => {
        const normalizedStatus = normalizeUserStatus(user.status);
        userPresenceMap.set(user.id, normalizedStatus);
    });
};

export const getUserPresenceStatus = (userId: string): User['status'] => {
    const cachedStatus = userPresenceMap.get(userId);
    if (cachedStatus) {
        return cachedStatus;
    }
    const fromCache = cachedAllUsers?.find(u => u.id === userId);
    if (fromCache) {
        const normalized = normalizeUserStatus(fromCache.status);
        userPresenceMap.set(userId, normalized);
        return normalized;
    }
    return 'Offline';
};

export const setUserPresenceStatus = (userId: string, status?: string | null) => {
    const normalized = normalizeUserStatus(status);
    userPresenceMap.set(userId, normalized);
    if (cachedAllUsers) {
        const index = cachedAllUsers.findIndex(u => u.id === userId);
        if (index !== -1) {
            cachedAllUsers[index] = { ...cachedAllUsers[index], status: normalized };
        }
    }
};

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

    const normalizedStatus = normalizeUserStatus(apiUser.status);

    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        role: role,
        companyId: companyId,
        managerId: apiUser.managerId || (Array.isArray(apiUser.managerIds) && apiUser.managerIds.length > 0 ? apiUser.managerIds[0] : undefined),
        departmentIds: departmentIds,
        jobTitle: apiUser.jobTitle,
        status: normalizedStatus,
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

export const getUsers = async (forceRefresh = false): Promise<User[]> => {
    if (!forceRefresh && cachedAllUsers) {
        updateUserPresenceCache(cachedAllUsers);
        return cachedAllUsers;
    }

    try {
        const response = await authenticatedFetch(USERS_API_URL);
        const data = await parseApiResponse(response);
        const usersFromApi = extractArrayFromApiResponse(data, 'users');

        cachedAllUsers = usersFromApi.map(mapApiUserToUser);
        updateUserPresenceCache(cachedAllUsers);
        return cachedAllUsers;
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        return [];
    }
};

export const clearUsersCache = () => {
    cachedAllUsers = null;
    cachedManagers = null;
    userPresenceMap.clear();
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
        
        cachedTasks = tasksFromApi.map((task: any, idx: number): Task => ({
            id: String(task.id ?? task.taskId ?? `task-${idx}-${Date.now()}`),
            name: String(task.title ?? task.name ?? 'Untitled Task'),
            description: typeof task.description === 'string' ? task.description : '',
            dueDate: task.due_date ?? task.dueDate ?? '',
            projectId: String(task.project ?? task.projectId ?? ''),
            assigneeIds: Array.isArray(task.assign_to)
                ? task.assign_to
                : (task.assign_to ? [task.assign_to] : []),
            assign_by: task.assign_by ?? task.created_by ?? task.creatorId,
            status: mapApiStatusToTaskStatus(String(task.status || 'To-Do')),
            priority: task.priority ?? 'medium',
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
    // Normalize incoming object to backend-friendly payload
    const normalizeDate = (d?: string) => {
        if (!d) return undefined;
        const ddmmyyyy = /^\d{2}-\d{2}-\d{4}$/;
        if (ddmmyyyy.test(d)) {
            const [dd, mm, yyyy] = d.split('-');
            return `${yyyy}-${mm}-${dd}`;
        }
        return d;
    };

    const estNum = ((): number | undefined => {
        const v = (taskData.est_time ?? taskData.estimated_time);
        if (v === '' || v === undefined || v === null) return undefined;
        const n = Number(v);
        return Number.isNaN(n) ? undefined : n;
    })();

    // Determine current session user and role
    const sessionUser = getCurrentUser();
    const sessionUserId = sessionUser?.id;
    const sessionUserRole = sessionUser?.role ? String(sessionUser.role).toUpperCase() : undefined;

    // Resolve department if missing but project is provided
    let resolvedDepartment: string | undefined = (taskData.department ?? taskData.departmentId);
    if ((!resolvedDepartment || resolvedDepartment === '') && (taskData.project || taskData.projectId)) {
        try {
            const proj = await getProjectById(String(taskData.project ?? taskData.projectId));
            if (proj && Array.isArray(proj.departmentIds) && proj.departmentIds.length > 0) {
                resolvedDepartment = proj.departmentIds[0];
            }
        } catch {}
    }

    const currentUserId = taskData.currentUserId || sessionUserId;
    if (!currentUserId) {
        throw new Error('You must be logged in to create a task.');
    }

    const payload: any = {
        title: taskData.title ?? taskData.name,
        description: taskData.description ?? '',
        project: taskData.project ?? taskData.projectId,
        department: resolvedDepartment,
        due_date: normalizeDate(taskData.due_date ?? taskData.dueDate),
        priority: (taskData.priority ?? 'medium'),
        est_time: estNum,
        assign_to: Array.isArray(taskData.assign_to)
            ? taskData.assign_to
            : (Array.isArray(taskData.assigneeIds) ? taskData.assigneeIds : []),
        assign_by: taskData.assign_by ?? currentUserId,
        status: taskData.status ?? 'To-Do',
        // Extra metadata to help backend identify caller if needed
        currentUserId,
        role: sessionUserRole,
        currentUserRole: sessionUserRole,
    };

    // If creator is EMPLOYEE, allow missing department and set to empty string
    const isEmployee = sessionUserRole === 'EMPLOYEE';
    if ((!payload.department || payload.department === undefined) && isEmployee) {
        payload.department = '';
    }

    // For employees, provide safe defaults to satisfy strict backend validation
    if (isEmployee) {
        if (!payload.description || (typeof payload.description === 'string' && payload.description.trim() === '')) {
            payload.description = ' ';
        }
        if (!payload.due_date) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            payload.due_date = `${yyyy}-${mm}-${dd}`;
        }
        if (!payload.priority) {
            payload.priority = 'medium';
        }
        if (payload.est_time === undefined || payload.est_time === null || Number.isNaN(Number(payload.est_time)) || Number(payload.est_time) === 0) {
            payload.est_time = 1;
        }
    }

    // Final fallbacks
    if ((!payload.assign_to || payload.assign_to.length === 0) && currentUserId) {
        payload.assign_to = [currentUserId];
    }

    // Defensive: ensure minimal required fields are present before hitting API
    if (!payload.title || !payload.project) {
        throw new Error('Please fill Title and Project.');
    }
    if (!isEmployee) {
        if (!payload.department || !payload.due_date || !payload.priority) {
            throw new Error('Please fill Title, Project, Department, Due Date and Priority.');
        }
    }

    // Single call to the configured create endpoint
    const response = await authenticatedFetch(TASKS_CREATE_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true
    });

    if (!response.ok) {
        let errorMessage = 'Failed to create task.';
        try {
            const txt = await response.text();
            try {
                const json = JSON.parse(txt);
                errorMessage = json.message || JSON.stringify(json);
            } catch {
                errorMessage = txt || errorMessage;
            }
        } catch {}
        throw new Error(errorMessage);
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
    const response = await authenticatedFetch(`${TASKS_DELETE_API_BASE_URL}/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({ currentUserId })
    });

    if (!response.ok) {
        let errorMessage = 'Failed to delete task.';
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || 'Failed to delete task.';
        } catch (e) {
            // The response was not JSON, which is fine. The text itself might be the error.
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
            timestamp: proj.timestamp || new Date().toISOString(),
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
    // Known working POST endpoint requires no auth and companyIds array
    const url = 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment';
    const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ name, companyIds: [companyId] }),
        skipAuth: true
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create department.');
    }

    cachedDepartments = null; // Invalidate cache after creation
    const data = await parseApiResponse(response);
    const created = (data && (data.department || data.Department || data.item || data.Item)) || data;
    const id = created?.id || `dept-${Date.now()}`;

    const newDepartment: Department = {
        id,
        name: created?.name || name,
        companyId: created?.companyId || (Array.isArray(created?.companyIds) ? created.companyIds[0] : companyId)
    };
    return newDepartment;
};

export const updateDepartment = async (id: string, name: string, companyId: string): Promise<Department> => {
    // Use same working endpoint with id in payload; no auth
    const url = 'https://evnlmv27o2.execute-api.ap-south-1.amazonaws.com/prod/postdepartment';
    const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ id, name, companyIds: [companyId] }),
        skipAuth: true
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update department.');
    }

    cachedDepartments = null; // Invalidate cache
    const data = await parseApiResponse(response);
    const updated = (data && (data.department || data.Department || data.item || data.Item)) || data;
    const dept: Department = {
        id: updated?.id || id,
        name: updated?.name || name,
        companyId: updated?.companyId || (Array.isArray(updated?.companyIds) ? updated.companyIds[0] : companyId)
    };
    return dept;
};

export const deleteDepartment = async (id: string): Promise<void> => {
    // Delete only the exact requested department id
    const base = 'https://n844w7gm0d.execute-api.ap-south-1.amazonaws.com/prod';
    const attempts: { url: string; method: 'DELETE' | 'POST'; skipAuth?: boolean; noContentType?: boolean; body?: any }[] = [
        { url: `${base}/deletedepartment/${encodeURIComponent(id)}`, method: 'DELETE', skipAuth: true },
        { url: `${base}/deletedepartment/${encodeURIComponent(id)}?latest=1`, method: 'DELETE', skipAuth: true },
        { url: `${base}/deletedepartment`, method: 'POST', body: { id, latest: 1 }, noContentType: true },
    ];
    let lastErr: any = null;
    for (const a of attempts) {
        try {
            const res = await authenticatedFetch(a.url, {
                method: a.method,
                body: a.body ? JSON.stringify(a.body) : undefined,
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
    if (lastErr) throw lastErr;

    if (cachedDepartments) {
        cachedDepartments = cachedDepartments.filter(d => d.id !== id);
    }
    cachedDepartments = null; // Invalidate cache for fresh reload
};

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

export const getCompanyById = (id: string): Company | undefined => COMPANIES.find(c => c.id === id);
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
export const getAttendanceByDate = async (date: string): Promise<Array<{ userId: string; date?: string; punchInTime?: string; punchOutTime?: string }>> => {
    try {
        // --- THIS IS THE CORRECTED LINE ---
        const endpoint = `${ATTENDANCE_GET_BY_DATE_URL}?date=${encodeURIComponent(date)}`;
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
                if (!userId) return null;
                const punchIn = r.punchInTime || r.punch_in_time || r.punch_in || r.punchIn;
                const punchOut = r.punchOutTime || r.punch_out_time || r.punch_out || r.punchOut;
                const record: { userId: string; date?: string; punchInTime?: string; punchOutTime?: string } = {
                    userId: String(userId),
                    date: d,
                };
                if (punchIn !== undefined && punchIn !== null) record.punchInTime = String(punchIn);
                if (punchOut !== undefined && punchOut !== null) record.punchOutTime = String(punchOut);
                return record;
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
                const punchIn = r?.punchInTime || r?.punch_in_time || r?.punch_in || r?.punchIn;
                const punchOut = r?.punchOutTime || r?.punch_out_time || r?.punch_out || r?.punchOut;
                if (punchIn !== undefined && punchIn !== null) rec.punchInTime = String(punchIn);
                if (punchOut !== undefined && punchOut !== null) rec.punchOutTime = String(punchOut);
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

// --- CHAT SERVICE (MOCKED) ---
export const isUserOnline = (userId: string) => getUserPresenceStatus(userId) === 'Active';
const sortConversationsByLastMessage = (conversations: ChatConversation[]) => conversations.slice().sort((a,b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
});

const extractConversationArray = (data: any): ChatConversation[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data as ChatConversation[];
    if (Array.isArray(data.conversations)) return data.conversations as ChatConversation[];
    if (Array.isArray(data.items)) return data.items as ChatConversation[];
    if (Array.isArray(data.data)) return data.data as ChatConversation[];
    return [];
};

export const getConversationsForUser = async (userId: string): Promise<ChatConversation[]> => {
    try {
        const conversations: ChatConversation[] = [];
        let nextKey: any = undefined;

        do {
            const url = new URL(CHAT_CONVERSATIONS_API_URL);
            url.searchParams.set('userId', userId);
            if (nextKey) {
                url.searchParams.set('nextKey', encodeURIComponent(JSON.stringify(nextKey)));
            }

            const response = await authenticatedFetch(url.toString());
            const parsed = await parseApiResponse(response);
            const fetched = extractConversationArray(parsed);
            conversations.push(...fetched);

            const lastEvaluatedKey = (parsed && typeof parsed === 'object') ? (parsed as any).lastEvaluatedKey : null;
            nextKey = lastEvaluatedKey || undefined;
        } while (nextKey);

        if (!conversations.length) {
            return sortConversationsByLastMessage(CONVERSATIONS.filter(c => c.participantIds.includes(userId)));
        }
        return sortConversationsByLastMessage(conversations.map(conv => ({ ...conv, participantIds: conv.participantIds?.map(String) || [] })));
    } catch (error) {
        console.error('Failed to fetch conversations from API:', error);
        return sortConversationsByLastMessage(CONVERSATIONS.filter(c => c.participantIds.includes(userId)));
    }
};
export interface ChatMessagesResponse {
    items: ChatMessage[];
    nextToken: string | null;
}

export const getMessagesForConversation = async (conversationId: string, nextToken?: string, limit: number = 50): Promise<ChatMessagesResponse> => {
    try {
        const url = new URL(`${CHAT_MESSAGES_API_BASE_URL}/${encodeURIComponent(conversationId)}`);
        url.searchParams.set('limit', String(limit));
        if (nextToken) {
            url.searchParams.set('nextToken', nextToken);
        }
        const response = await authenticatedFetch(url.toString());
        const parsed = await parseApiResponse(response);
        const items = Array.isArray(parsed?.items) ? parsed.items as ChatMessage[] : [];
        return {
            items: items.map(msg => ({
                ...msg,
                conversationId: String(msg.conversationId),
                senderId: String(msg.senderId),
            })),
            nextToken: parsed?.nextToken || null,
        };
    } catch (error) {
        console.error(`Failed to fetch messages for conversation ${conversationId}:`, error);
        const fallback = MESSAGES.filter(m => m.conversationId === conversationId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return { items: fallback, nextToken: null };
    }
};
export const createGroup = async (groupName: string, memberIds: string[], creatorId: string): Promise<ChatConversation> => {
    const payload = {
        name: groupName,
        participantIds: memberIds.map(String),
    };

    try {
        const response = await authenticatedFetch(`${CHAT_CONVERSATION_CREATE_API_URL}?userId=${encodeURIComponent(creatorId)}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const parsed = await parseApiResponse(response);
        const created = (parsed && parsed.conversation) ? parsed.conversation : parsed;
        if (!created || !created.id) {
            throw new Error('Invalid response while creating conversation.');
        }
        return {
            ...created,
            participantIds: created.participantIds?.map(String) || [],
        } as ChatConversation;
    } catch (error) {
        console.error('Failed to create group conversation via API:', error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('Unable to create group conversation.');
        }
    }
};

export const deleteConversation = async (conversationId: string, type: 'chat' | 'group', requesterRole?: UserRole): Promise<void> => {
    try {
        const url = new URL(CHAT_CONVERSATION_DELETE_API_URL);
        url.searchParams.set('conversationId', conversationId);
        url.searchParams.set('type', type);
        const payload: Record<string, any> = {
            conversationId,
            type,
        };
        if (requesterRole) {
            url.searchParams.set('requesterRole', requesterRole.toUpperCase());
            payload.requesterRole = requesterRole.toUpperCase();
        }
        const response = await authenticatedFetch(url.toString(), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        await parseApiResponse(response);
        CONVERSATIONS = CONVERSATIONS.filter(conversation => conversation.id !== conversationId);
        MESSAGES = MESSAGES.filter(message => message.conversationId !== conversationId);
    } catch (error) {
        console.error(`Failed to delete conversation ${conversationId}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to delete conversation.');
    }
};

export const clearConversation = async (conversationId: string, type: 'chat' | 'group', requesterRole?: UserRole): Promise<void> => {
    try {
        const baseUrl = CHAT_CONVERSATION_CLEAR_API_BASE_URL.replace(/\/$/, '');
        const url = new URL(`${baseUrl}/${encodeURIComponent(conversationId)}`);
        url.searchParams.set('type', type);
        const payload: Record<string, any> = { conversationId, type };
        if (requesterRole) {
            const normalizedRole = requesterRole.toUpperCase();
            url.searchParams.set('requesterRole', normalizedRole);
            payload.requesterRole = normalizedRole;
        }

        const response = await authenticatedFetch(url.toString(), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        await parseApiResponse(response);

        MESSAGES = MESSAGES.filter(message => message.conversationId !== conversationId);
        CONVERSATIONS = CONVERSATIONS.map(conversation => conversation.id === conversationId
            ? { ...conversation, lastMessage: undefined }
            : conversation
        );
    } catch (error) {
        console.error(`Failed to clear conversation ${conversationId}:`, error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to clear conversation.');
    }
};

export const getOrCreateDirectConversation = async (userId1: string, userId2: string): Promise<ChatConversation> => {
    const participants = [String(userId1), String(userId2)].sort();

    const normalizeDirectConversation = (conversation: ChatConversation): ChatConversation => ({
        ...conversation,
        participantIds: (conversation.participantIds || []).map(id => String(id)).sort(),
        type: conversation.type?.toLowerCase() === 'group' ? 'group' : 'direct',
    });

    const matchesParticipants = (conversation: ChatConversation) => {
        const ids = (conversation.participantIds || []).map(id => String(id)).sort();
        return ids.length === 2 && ids[0] === participants[0] && ids[1] === participants[1];
    };

    const syncLocalConversation = (conversation: ChatConversation) => {
        const normalized = normalizeDirectConversation(conversation);
        const existingIndex = CONVERSATIONS.findIndex(c => matchesParticipants(c));
        if (existingIndex !== -1) {
            CONVERSATIONS[existingIndex] = normalized;
        } else {
            CONVERSATIONS.unshift(normalized);
        }
        return normalized;
    };

    const findExistingRemoteConversation = async (): Promise<ChatConversation | null> => {
        try {
            const remoteConversations = await getConversationsForUser(userId1);
            const existing = remoteConversations.find(matchesParticipants);
            return existing ? syncLocalConversation(existing) : null;
        } catch (lookupError) {
            console.error('Failed to lookup direct conversation via API:', lookupError);
            return null;
        }
    };

    const localExisting = CONVERSATIONS.find(matchesParticipants);
    if (localExisting) {
        return normalizeDirectConversation(localExisting);
    }

    const remoteExisting = await findExistingRemoteConversation();
    if (remoteExisting) {
        return remoteExisting;
    }

    try {
        const payload = {
            name: 'Direct Chat',
            participantIds: participants,
            type: 'direct',
        };
        const requestUrl = new URL(`${CHAT_CONVERSATION_CREATE_API_URL}`);
        requestUrl.searchParams.set('userId', userId1);
        requestUrl.searchParams.set('conversationType', 'direct');
        const response = await authenticatedFetch(requestUrl.toString(), {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const parsed = await parseApiResponse(response);
        const created = (parsed && parsed.conversation) ? parsed.conversation : parsed;
        if (created && created.id) {
            return syncLocalConversation(created as ChatConversation);
        }
        throw new Error('Invalid response while creating direct conversation.');
    } catch (creationError) {
        console.error('Failed to create direct conversation via API:', creationError);
        const fetchedAfterFailure = await findExistingRemoteConversation();
        if (fetchedAfterFailure) {
            return fetchedAfterFailure;
        }
        throw new Error('Unable to create direct conversation. Please try again.');
    }
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