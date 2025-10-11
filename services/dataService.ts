<<<<<<< HEAD


import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';

// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
// Companies, Chat, and Onboarding data remains mocked as no APIs were specified for them.
let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' }
];

=======
// services/dataService.ts (CONFIRMED CORRECT AND ROBUST MAPPING)
import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, Company, User, UserRole } from '../types';
import { getToken } from './authService'; // Import getToken from authService

// --- API URLs ---
const COMPANIES_API_URL = 'https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com';

// --- ATTENDANCE API URLs ---
const ATTENDANCE_GET_BY_DATE_URL = 'https://w5ahewobh3.execute-api.ap-south-1.amazonaws.com/dev/get-attendence-date';
// Renamed the following variables for consistency with ATTENDANCE_GET_BY_DATE_URL
const ATTENDANCE_GET_BY_USER_URL = 'https://w5ahewobh3.execute-api.ap-south-1.amazonaws.com/dev/get-attendence-user';
const ATTENDANCE_RECORD_ACTION_URL = 'https://w5ahewobh3.execute-api.ap-south-1.amazonaws.com/dev/ETS-record-attendance-action';


// --- MOCK DATA FOR MODULES WITHOUT PROVIDED APIs ---
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
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

const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
<<<<<<< HEAD
    const token = localStorage.getItem('ets_token');
=======
    const token = getToken();
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
<<<<<<< HEAD
        // AWS API Gateway custom authorizers often look for a token in the 'Authorization' header.
        headers.set('Authorization', token);
=======
        headers.set('Authorization', `Bearer ${token}`);
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
    }
    return fetch(url, { ...options, headers });
};

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
        const arrayValue = Object.values(data).find(value => Array.isArray(value));
        if (arrayValue && Array.isArray(arrayValue)) {
            return arrayValue;
        }
    }
    console.warn(`Could not extract array from API response for key "${primaryKey}". Response was:`, data);
    return [];
}


// Caching mechanism
let cachedTasks: Task[] | null = null;
let cachedProjects: Project[] | null = null;
let cachedDepartments: Department[] | null = null;
let cachedAllUsers: User[] | null = null;
<<<<<<< HEAD
=======
let cachedManagers: User[] | null = null;
let cachedCompanies: Company[] | null = null;
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

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
        companyId: (Array.isArray(apiUser.companyIds) && apiUser.companyIds.length > 0
                    ? String(apiUser.companyIds[0])
                    : String(apiUser.companyId || apiUser.company_id || apiUser.company || apiUser.organizationId || 'default-company-id')
                   ).toLowerCase().trim(),
        managerId: apiUser.managerId, // This `managerId` is for the User's direct manager, not the Project's
        departmentIds: Array.isArray(apiUser.departmentIds) ? apiUser.departmentIds : (typeof apiUser.departmentIds === 'string' ? [apiUser.departmentIds] : []),
        jobTitle: apiUser.jobTitle,
        status: apiUser.status || 'Offline',
        joinedDate: apiUser.joinedDate || new Date().toISOString(),
        skills: apiUser.skills || [],
        stats: { completedTasks: 0, inProgressTasks: 0, efficiency: 0, totalHours: 0, workload: 'Light' },
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

<<<<<<< HEAD
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

=======
    try {
        const response = await authenticatedFetch('https://uvg7wq8e5a.execute-api.ap-south-1.amazonaws.com/dev/users');
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
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

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


// --- TASKS ---
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
    if (cachedTasks) return cachedTasks;

    try {
<<<<<<< HEAD
        // Use a standard fetch for this public endpoint to avoid potential header issues.
        const response = await fetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');
=======
        const response = await authenticatedFetch('https://3f4ycega6h.execute-api.ap-south-1.amazonaws.com/dev/get-tasks');
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Task API Error Response:", errorText);
            throw new Error(`API request for tasks failed: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        
        let tasksFromApi: any[];
        if (responseData.body && typeof responseData.body === 'string') {
            tasksFromApi = JSON.parse(responseData.body);
        } else if (Array.isArray(responseData.body)) {
            tasksFromApi = responseData.body;
        } else if (Array.isArray(responseData)) {
            tasksFromApi = responseData;
        } else if (responseData.Tasks && Array.isArray(responseData.Tasks)) {
            tasksFromApi = responseData.Tasks;
        } else {
            tasksFromApi = extractArrayFromApiResponse(responseData, 'Tasks');
        }

        if (!Array.isArray(tasksFromApi)) {
            console.error("Final processed task data is not an array:", tasksFromApi);
            return [];
        }
        
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
        return [];
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
        }
        throw new Error(errorMessage);
    }
    
    cachedTasks = null;
    
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
        let errorMessage = 'Failed to update task.'; // Changed from delete to update, as per similar functions' error messages
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || JSON.stringify(errorBody);
        } catch (e) {
             const errorText = await response.text();
             errorMessage = errorText || `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    
    cachedTasks = null;
};


// --- PROJECTS ---
export const getAllProjects = async (): Promise<Project[]> => {
    if (cachedProjects) return cachedProjects;
<<<<<<< HEAD
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
=======
    try {
        const response = await authenticatedFetch('https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects');
        const data = await parseApiResponse(response);
        const projectsFromApi = extractArrayFromApiResponse(data, 'projects');
        cachedProjects = projectsFromApi.map((proj: any): Project => ({
            id: proj.id,
            name: proj.name,
            description: proj.description,
            // *** CHANGE 1: Map from manager_id (API) to managerIds (Type) ***
            // Assuming API might return a single string or an array for managers.
            // Adjust based on your actual API response. Here, we try to convert anything to an array.
            managerIds: Array.isArray(proj.manager_ids)
                        ? proj.manager_ids.map((id: string) => String(id).trim())
                        : (typeof proj.manager_id === 'string' && proj.manager_id)
                            ? [String(proj.manager_id).trim()]
                            : [],
            // --- IMPROVED DEPARTMENT ID EXTRACTION FOR PROJECT ---
            departmentIds: (Array.isArray(proj.departmentIds) && proj.departmentIds.length > 0
                            ? proj.departmentIds.map((id: string) => String(id).toLowerCase().trim())
                            : Array.isArray(proj.department_ids) && proj.department_ids.length > 0
                                ? proj.department_ids.map((id: string) => String(id).toLowerCase().trim())
                                : (typeof proj.departmentId === 'string' && proj.departmentId)
                                    ? [String(proj.departmentId).toLowerCase().trim()]
                                    : []
                           ),
            // --- END IMPROVED ---
            deadline: proj.deadline,
            priority: proj.priority,
            estimatedTime: proj.estimated_time ? parseInt(proj.estimated_time, 10) : undefined,
            companyId: String(proj.companyId || proj.company_id || proj.company || 'default-company-id').toLowerCase().trim(),
            roadmap: proj.roadmap || [],
            // *** CHANGE 2: Map from timestamp (API) to createdAt (Type) ***
            createdAt: proj.timestamp || new Date().toISOString(),
        }));
        return cachedProjects;
    } catch (error) {
        console.error("Failed to fetch all projects:", error);
        return [];
    }
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    const projects = await getAllProjects();
    return projects.find(p => p.id === id);
};

// *** CHANGE 3: Filter by managerIds (plural) ***
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

<<<<<<< HEAD
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
=======
// *** CHANGE 4: Update Omit and payload for createProject ***
export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    // Generate the createdAt (which maps to backend 'timestamp') directly
    // since 'projectData' is explicitly defined NOT to have it.
    const newProjectCreatedAt = new Date().toISOString(); 

    const payload = {
        ...projectData,
        // *** CHANGE 5: Pass managerIds as manager_ids to the API ***
        manager_ids: projectData.managerIds, // Use managerIds
        department_ids: projectData.departmentIds,
        company_id: projectData.companyId, 
        id: `proj-${Date.now()}`, 
        // *** CHANGE 6: Pass createdAt as timestamp to the API ***
        timestamp: newProjectCreatedAt, // Use the generated createdAt for the backend 'timestamp'
    };
    
    const response = await authenticatedFetch('https://s1mbbsd685.execute-api.ap-south-1.amazonaws.com/pz/Create-projects', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create project.');
    }

    cachedProjects = null;
    const responseData = await response.json();
    const createdProjectData = responseData.Project.Item;

    const newProject: Project = {
        id: createdProjectData.id,
        name: createdProjectData.name,
        description: createdProjectData.description,
        // *** CHANGE 7: Map manager_id/manager_ids from API response to managerIds ***
        managerIds: Array.isArray(createdProjectData.manager_ids)
                    ? createdProjectData.manager_ids.map((id: string) => String(id).trim())
                    : (typeof createdProjectData.manager_id === 'string' && createdProjectData.manager_id)
                        ? [String(createdProjectData.manager_id).trim()]
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
        companyId: String(createdProjectData.companyId || createdProjectData.company_id || createdProjectData.company || 'default-company-id').toLowerCase().trim(),
        roadmap: createdProjectData.roadmap || [],
        // *** CHANGE 8: Map timestamp from API response to createdAt ***
        createdAt: createdProjectData.timestamp,
    };
    
    return newProject;
};


// *** CHANGE 9: Update updateProject signature for createdAt and ensure payload uses createdAt/managerIds ***
// NOTE: Your `updateProject` here is a client-side cache update, not an API call.
// The `Projects.tsx` component directly calls the API for updates using fetch.
// This function needs to be adapted or removed if not used for actual API calls.
// If it *is* meant for API calls, its signature and body must be adjusted similar to createProject.
// For now, I'm assuming it's for local cache updates and `Projects.tsx` handles API.
// If you want this `dataService.ts` function to handle the API update, you need to change its body.
export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | undefined> => {
    // This currently only updates the local cache.
    // If you need an API call here, you'll need projectId, createdAt from the original project,
    // and the updates for the API body.
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
    if (cachedProjects) {
        const projectIndex = cachedProjects.findIndex(p => p.id === projectId);
        if (projectIndex > -1) {
            // Assuming 'updates' correctly contains managerIds if they are updated
            cachedProjects[projectIndex] = { ...cachedProjects[projectIndex], ...updates };
            return cachedProjects[projectIndex];
        }
    }
    return undefined;
};


// --- DEPARTMENTS ---
export const getDepartments = async (): Promise<Department[]> => {
    if (cachedDepartments) return cachedDepartments;
<<<<<<< HEAD
    const response = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
    const data = await parseApiResponse(response);
    const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');
    cachedDepartments = departmentsFromApi.map((dept: any): Department => ({
        id: dept.id,
        name: dept.name,
        companyId: dept.company_id || 'comp-1',
    }));
    return cachedDepartments;
=======
    try {
        const response = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/');
        const data = await parseApiResponse(response);
        const departmentsFromApi = extractArrayFromApiResponse(data, 'departments');
        cachedDepartments = departmentsFromApi.map((dept: any): Department => ({
            id: dept.id,
            name: dept.name,
            companyId: (Array.isArray(dept.companyIds) && dept.companyIds.length > 0
                        ? String(dept.companyIds[0])
                        : String(dept.companyId || dept.company_id || dept.company || 'default-company-id')
                       ).toLowerCase().trim(),
        }));
        return cachedDepartments;
    } catch (error) {
        console.error("Failed to fetch all departments:", error);
        return [];
    }
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
};

export const getDepartmentsByCompany = async (companyId: string): Promise<Department[]> => {
    const allDepartments = await getDepartments();
    return allDepartments.filter(dept => dept.companyId === companyId);
};


export const getDepartmentById = async (id: string): Promise<Department | undefined> => {
    const depts = await getDepartments();
    return depts.find(d => d.id === id);
};

<<<<<<< HEAD
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
=======
export const createDepartment = async (name: string, companyId: string): Promise<Department> => {
    const payload = {
        name,
        company_id: companyId, 
        id: `dept-${Date.now()}`
    };
    const response = await authenticatedFetch('https://pp02swd0a8.execute-api.ap-south-1.amazonaws.com/prod/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create department.');
    }

    cachedDepartments = null; 
    const responseData = await response.json();
    const createdDepartmentData = responseData.Department.Item;

    const newDepartment: Department = { 
        id: createdDepartmentData.id, 
        name: createdDepartmentData.name, 
        companyId: (Array.isArray(createdDepartmentData.companyIds) && createdDepartmentData.companyIds.length > 0
                    ? String(createdDepartmentData.companyIds[0])
                    : String(createdDepartmentData.companyId || createdDepartmentData.company_id || createdDepartmentData.company || 'default-company-id')
                   ).toLowerCase().trim(),
    };
    return newDepartment;
};

// --- API-BACKED FUNCTIONS (previously in MOCKED FUNCTIONS) ---
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

// --- MOCKED FUNCTIONS (only truly mocked ones remain) ---
export const createCompany = (name: string, ownerId: string): Company => {
    const newCompany: Company = { id: `comp-${Date.now()}`, name, ownerId, createdAt: new Date().toISOString() };
    if (cachedCompanies) {
        cachedCompanies.unshift(newCompany);
    } else {
        cachedCompanies = [newCompany];
    }
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
    return newCompany;
};

// --- NEW ATTENDANCE API FUNCTIONS ---
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
        return ATTENDANCE_DATA[date] || [];
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
        return presentDates;
    }
};

export const recordAttendance = async (userId: string, date: string): Promise<boolean> => {
    try {
        const response = await authenticatedFetch(ATTENDANCE_RECORD_ACTION_URL, {
            method: 'POST',
            body: JSON.stringify({ userId, date }),
        });
        
        if (response.ok) {
            return true;
        } else {
            const errorText = await response.text();
            console.error(`Failed to record attendance for user ${userId} on ${date}: ${response.status} ${response.statusText} - ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`Error recording attendance for user ${userId} on ${date}:`, error);
        return false;
    }
};

// --- REST OF THE MOCKED FUNCTIONS (UNCHANGED) ---
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
export const getNoteById = (id: string): Note | undefined => {
    return undefined;
}
export const getDependencyLogById = (id: string): DependencyLog | undefined => {
    return undefined;
}
export const getMilestoneById = (id: string): MilestoneStatus | undefined => {
    return undefined;
}