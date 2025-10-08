import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';
import { getToken } from './authService'; // Import getToken from authService

// --- API URLs ---
const COMPANIES_API_URL = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com'; // <--- ADDED THIS LINE

// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
// Companies is now handled by API, so this 'let COMPANIES' mock is removed.
// Chat, and Onboarding data remains mocked as no APIs were specified for them.

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

// Helper to add auth token to requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = getToken(); // Use the imported getToken
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        // AWS API Gateway custom authorizers often look for a token in the 'Authorization' header.
        headers.set('Authorization', `Bearer ${token}`); // Add "Bearer" prefix
    }
    return fetch(url, { ...options, headers });
};


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
let cachedManagers: User[] | null = null; // New cache for managers
let cachedCompanies: Company[] | null = null; // Added cache for companies

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

export const getUsers = async (): Promise<User[]> => {
    if (cachedAllUsers) return cachedAllUsers;

    try {
        const response = await authenticatedFetch('https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev/users');
        const data = await parseApiResponse(response);
        const usersFromApi = extractArrayFromApiResponse(data, 'users');
        
        cachedAllUsers = usersFromApi.map(mapApiUserToUser);
        return cachedAllUsers;
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        return []; // Return empty array on error
    }
};

export const getUserById = async (userId: string): Promise<User | undefined> => {
    const allUsers = await getUsers(); // Use getUsers for caching
    return allUsers.find(u => u.id === userId);
};

export const getEmployees = async (): Promise<User[]> => {
    const allUsers = await getUsers(); // Use getUsers for caching
    return allUsers.filter(user => user.role === UserRole.EMPLOYEE);
};

export const getManagers = async (): Promise<User[]> => { // Renamed from getManagersFromApi to just getManagers for consistency
    if (cachedManagers) return cachedManagers;

    const allUsers = await getUsers(); // Get all users first
    cachedManagers = allUsers.filter(user => user.role === UserRole.MANAGER);
    return cachedManagers;
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
        const response = await authenticatedFetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');

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
        method: 'POST', // or 'DELETE' if the backend expects DELETE for deletion
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
    try {
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
            timestamp: proj.timestamp || new Date().toISOString(), // Use 'timestamp' to match the Project type
        }));
        return cachedProjects;
    } catch (error) {
        console.error("Failed to fetch all projects:", error);
        return [];
    }
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

export const createProject = async (projectData: Omit<Project, 'id' | 'timestamp'>): Promise<Project> => {
    const payload = {
        ...projectData,
        manager_id: projectData.managerId,
        department_ids: projectData.departmentIds,
        company_id: projectData.companyId,
        // The backend should ideally generate ID and timestamp, but if not, include them
        id: `proj-${Date.now()}`, 
        timestamp: new Date().toISOString(), // Use 'timestamp' to match the Project type
    };
    
    const response = await authenticatedFetch('https://s1mbbsd685.execute-api.ap-south-1.amazonaws.com/pz/Create-projects', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project.');
    }

    cachedProjects = null; // Invalidate cache
    const responseData = await response.json();
    const createdProjectData = responseData.Project.Item; // Assuming this structure

    const newProject: Project = {
        id: createdProjectData.id,
        name: createdProjectData.name,
        description: createdProjectData.description,
        managerId: createdProjectData.manager_id,
        departmentIds: createdProjectData.department_ids || [],
        deadline: createdProjectData.deadline,
        priority: createdProjectData.priority,
        estimatedTime: createdProjectData.estimated_time ? parseInt(createdProjectData.estimated_time, 10) : undefined,
        companyId: createdProjectData.company_id,
        roadmap: createdProjectData.roadmap || [],
        timestamp: createdProjectData.timestamp, // Use 'timestamp' to match the Project type
    };
    
    return newProject;
};


export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | undefined> => {
    // This function assumes the ProjectDetail component handles the actual API call for updates,
    // which seems to be the case based on your ProjectDetail code.
    // This local mock update is kept for consistency but might not be used directly.
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
    try {
        const response = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        const data = await parseApiResponse(response);
        const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');
        cachedDepartments = departmentsFromApi.map((dept: any): Department => ({
            id: dept.id,
            name: dept.name,
            companyId: dept.company_id || 'comp-1',
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

export const createDepartment = async (name: string, companyId: string): Promise<Department> => {
    const payload = {
        name,
        company_id: companyId,
        id: `dept-${Date.now()}` // Backend might generate, but safe to include for mock/consistency
    };
    const response = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/', { // Assuming this is the create endpoint
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create department.');
    }

    cachedDepartments = null; // Invalidate cache
    const responseData = await response.json();
    const createdDepartmentData = responseData.Department.Item; // Adjust based on actual API response

    const newDepartment: Department = { 
        id: createdDepartmentData.id, 
        name: createdDepartmentData.name, 
        companyId: createdDepartmentData.company_id 
    };
    return newDepartment;
};

// --- API-BACKED FUNCTIONS (previously in MOCKED FUNCTIONS) ---
export const getCompanies = async (): Promise<Company[]> => {
    if (cachedCompanies) return cachedCompanies;

    try {
        const response = await authenticatedFetch(COMPANIES_API_URL);
        const data = await parseApiResponse(response);
        const companiesFromApi = extractArrayFromApiResponse(data, 'companies'); // Adjust 'companies' if your API uses a different key

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

// --- MOCKED FUNCTIONS (only truly mocked ones remain) ---
export const createCompany = (name: string, ownerId: string): Company => {
    const newCompany: Company = { id: `comp-${Date.now()}`, name, ownerId, createdAt: new Date().toISOString() };
    // COMPANIES is no longer a 'let' variable at the top, so we can't directly push to it.
    // If you need to simulate adding a company locally, you'd need to update `cachedCompanies`.
    // For now, it will just return the new company without affecting the cached list.
    // If you want it to affect the cached list:
    if (cachedCompanies) {
        cachedCompanies.unshift(newCompany);
    } else {
        cachedCompanies = [newCompany];
    }
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