import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company } from '../types';

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

// Helper to parse AWS API Gateway responses
const parseApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (typeof data.body === 'string') {
        try {
            return JSON.parse(data.body);
        } catch (e) {
            console.error("Failed to parse API response body:", e);
            throw new Error("Invalid JSON in API response body.");
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
        const possibleKeys = [primaryKey, 'Items', 'items', 'data', 'body'];
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

// --- TASKS ---
export const getAllTasks = async (): Promise<Task[]> => {
    if (cachedTasks) return cachedTasks;
    const response = await fetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');
    const data = await parseApiResponse(response);
    const tasksFromApi = extractArrayFromApiResponse(data, 'Tasks');

    cachedTasks = tasksFromApi.map((task: any): Task => ({
        id: task.id,
        name: task.title,
        description: task.description,
        dueDate: task.due_date,
        projectId: task.project,
        assigneeId: task.assign_to,
        status: task.status || TaskStatus.TODO,
        priority: task.priority,
        estimatedTime: task.est_time ? parseInt(task.est_time, 10) : undefined,
    }));
    return cachedTasks;
};

export const createTask = async (taskData: any): Promise<any> => {
    const response = await fetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task.');
    }
    // Invalidate cache
    cachedTasks = null;
    return await response.json();
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

export const updateTask = (taskId: string, updates: Partial<Task>): Task | undefined => {
    // This is optimistic update on cache as no API endpoint was provided for updates.
    if (cachedTasks) {
        const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {
            cachedTasks[taskIndex] = { ...cachedTasks[taskIndex], ...updates };
            return cachedTasks[taskIndex];
        }
    }
    return undefined;
};

export const deleteTask = (taskId: string): void => {
    // Optimistic update
    if (cachedTasks) {
        cachedTasks = cachedTasks.filter(t => t.id !== taskId);
    }
};


// --- PROJECTS ---
export const getAllProjects = async (): Promise<Project[]> => {
    if (cachedProjects) return cachedProjects;
    const response = await fetch('https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects');
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


// --- DEPARTMENTS ---
export const getDepartments = async (): Promise<Department[]> => {
    if (cachedDepartments) return cachedDepartments;
    const response = await fetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
    const data = await parseApiResponse(response);
    const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');
    cachedDepartments = departmentsFromApi.map((dept: any): Department => ({
        id: dept.id,
        name: dept.name,
        companyId: dept.company_id || 'comp-1',
    }));
    return cachedDepartments;
};

export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
    const depts = await getDepartments();
    return depts.find(d => d.id === id);
};

export const createDepartment = (name: string, companyId: string): Department => {
    // Optimistic update
    const newDepartment: Department = { id: `dept-${Date.now()}`, name, companyId };
    if (cachedDepartments) {
        cachedDepartments.unshift(newDepartment);
    } else {
        cachedDepartments = [newDepartment];
    }
    return newDepartment;
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