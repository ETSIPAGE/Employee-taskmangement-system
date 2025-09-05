import { Project, Task, TaskStatus, ChatConversation, ChatMessage, Department, Note, DependencyLog, MilestoneStatus, OnboardingSubmission, OnboardingStatus, OnboardingStep, OnboardingStepStatus, Company } from '../types';

let COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Innovate Inc.', ownerId: '1', createdAt: '2023-01-01T00:00:00.000Z' },
    { id: 'comp-2', name: 'TechCore Systems', ownerId: '1', createdAt: '2023-02-15T00:00:00.000Z' },
    { id: 'comp-3', name: 'Alpha Solutions', ownerId: '1', createdAt: '2023-03-20T00:00:00.000Z' },
    { id: 'comp-4', name: 'Beta Labs', ownerId: '1', createdAt: '2023-04-05T00:00:00.000Z' }
];

let DEPARTMENTS: Department[] = [
    { id: 'dept-1', name: 'Administration', companyIds: ['comp-1'] },
    { id: 'dept-2', name: 'Finance & Accounting', companyIds: ['comp-1'] },
    { id: 'dept-3', name: 'Human Resources (HR)', companyIds: ['comp-1'] },
    { id: 'dept-4', name: 'Operations', companyIds: ['comp-1'] },
    { id: 'dept-5', name: 'Marketing', companyIds: ['comp-1'] },
    { id: 'dept-6', name: 'Sales', companyIds: ['comp-1'] },
    { id: 'dept-7', name: 'Information Technology (IT)', companyIds: ['comp-1'] },
    { id: 'dept-8', name: 'Customer Service', companyIds: ['comp-1'] },
];

let PROJECTS: Project[] = [
    { id: 'proj-1', name: 'Q3 Marketing Campaign', description: 'A comprehensive marketing campaign for the third quarter.', managerId: '2', departmentIds: ['dept-5'], deadline: '2025-09-30', priority: 'high', estimatedTime: 120, companyId: 'comp-1' },
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
        ]
    },
    { id: 'proj-3', name: 'HR Portal Update', description: 'Update the internal HR portal with new features for employees.', managerId: '2', departmentIds: ['dept-3', 'dept-7'], deadline: '2024-09-15', priority: 'medium', estimatedTime: 80, companyId: 'comp-1' },
    { id: 'proj-4', name: 'Mobile App V2', description: 'Version 2 of the customer-facing mobile application.', managerId: '2', departmentIds: ['dept-7'], deadline: '2024-10-31', priority: 'medium', estimatedTime: 250, companyId: 'comp-1' },
];

let TASKS: Task[] = [
    // Project 1 Tasks (Manager '2')
    { id: 'task-1', name: 'Draft campaign brief', description: 'Create the initial brief document for the Q3 campaign.', dueDate: '2025-08-10', projectId: 'proj-1', assigneeId: '3', status: TaskStatus.COMPLETED, category: 'Planning', priority: 'high', tags: ['brief', 'marketing', 'q3'], estimatedTime: 8 },
    { id: 'task-2', name: 'Design social media assets', description: 'Create graphics for Facebook, Twitter, and Instagram.', dueDate: '2025-08-15', projectId: 'proj-1', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'medium', tags: ['graphics', 'social media'], estimatedTime: 16 },
    { id: 'task-3', name: 'Develop ad copy', description: 'Write compelling copy for all digital ads.', dueDate: '2025-08-20', projectId: 'proj-1', assigneeId: '3', status: TaskStatus.IN_PROGRESS, category: 'Content', priority: 'medium', tags: ['copywriting', 'ads'], 
        notes: [
            { id: 'note-1', authorId: '3', content: 'Initial drafts are done. Waiting for feedback from Sarah.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
            { id: 'note-2', authorId: '2', content: 'Good start. Let\'s refine the headline for ad set A.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }
        ], 
        estimatedTime: 12 
    },
    { 
        id: 'task-4', 
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
    // Project 2 Tasks (Manager '2')
    { id: 'task-5', name: 'Finalize homepage design', description: 'Get final approval on the new homepage mockups.', dueDate: '2025-08-05', projectId: 'proj-2', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'high', tags: ['ui', 'ux', 'website'], estimatedTime: 24 },
    { id: 'task-6', name: 'Develop backend API', description: 'Build out all necessary endpoints for the website.', dueDate: '2025-09-01', projectId: 'proj-2', assigneeId: '5', status: TaskStatus.IN_PROGRESS, category: 'Development', priority: 'high', tags: ['api', 'backend'], estimatedTime: 80 },
    { 
        id: 'task-7', 
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
    { id: 'task-8', name: 'Deploy to production', description: 'Push the final code to the live servers.', dueDate: '2025-09-15', projectId: 'proj-2', assigneeId: '5', status: TaskStatus.TODO, category: 'DevOps', priority: 'high', tags: ['deployment', 'production'], estimatedTime: 8 },
    { id: 'task-9', name: 'Create User Documentation', description: 'Develop comprehensive user guides for all dashboards and features.', dueDate: '2025-08-24', projectId: 'proj-2', assigneeId: undefined, status: TaskStatus.TODO, category: 'Documentation', priority: 'medium', tags: ['documentation', 'user', 'guides'], estimatedTime: 16 },
    // Project 3 Tasks (Manager '2')
    { id: 'task-10', name: 'Gather requirements', description: 'Meet with stakeholders to define project scope.', dueDate: '2024-07-25', projectId: 'proj-3', assigneeId: '3', status: TaskStatus.COMPLETED, category: 'Planning', priority: 'high', tags: ['requirements', 'stakeholders'], estimatedTime: 10 },
    { id: 'task-11', name: 'Create wireframes', description: 'Design the low-fidelity wireframes for the new portal.', dueDate: '2024-08-05', projectId: 'proj-3', assigneeId: '4', status: TaskStatus.COMPLETED, category: 'Design', priority: 'medium', tags: ['wireframes', 'ux'], estimatedTime: 15 },
    { id: 'task-12', name: 'Implement new features', description: 'Code the new features as per the requirements.', dueDate: '2024-09-01', projectId: 'proj-3', assigneeId: undefined, status: TaskStatus.TODO, category: 'Development', priority: 'high', tags: ['coding', 'features'], estimatedTime: 40 },
    { id: 'task-13', name: 'Review and deploy', description: 'Code review and deployment of the HR portal updates.', dueDate: '2024-09-15', projectId: 'proj-3', assigneeId: '6', status: TaskStatus.TODO, category: 'DevOps', priority: 'medium', tags: ['review', 'deploy'], estimatedTime: 8 },
     // Project 4 Tasks (Manager '2')
    { id: 'task-14', name: 'Plan new features', description: 'Roadmap planning for V2 of the mobile app.', dueDate: '2024-08-30', projectId: 'proj-4', assigneeId: '7', status: TaskStatus.IN_PROGRESS, category: 'Planning', priority: 'high', tags: ['roadmap', 'mobile'], estimatedTime: 30 },
];

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

// Update lastMessage for conversations
CONVERSATIONS.forEach(c => {
    const conversationMessages = MESSAGES.filter(m => m.conversationId === c.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    c.lastMessage = conversationMessages[0];
});

// Mock online status
const ONLINE_USERS = new Set(['1', '3', '4', '6']);
export const isUserOnline = (userId: string) => ONLINE_USERS.has(userId);


// --- COMPANY FUNCTIONS ---
export const getCompanies = (): Company[] => {
    return [...COMPANIES];
};

export const getCompanyById = (id: string): Company | undefined => {
    return COMPANIES.find(c => c.id === id);
};

export const createCompany = (name: string, ownerId: string): Company => {
    const newCompany: Company = {
        id: `comp-${Date.now()}`,
        name,
        ownerId,
        createdAt: new Date().toISOString(),
    };
    COMPANIES.unshift(newCompany);
    return newCompany;
};

// --- DEPARTMENTS ---
export const getDepartments = (): Department[] => {
    console.log('💾 Getting departments from local storage:', DEPARTMENTS.length, 'departments');
    return [...DEPARTMENTS]; // Return a copy to prevent mutations
};

export const setDepartments = (departments: Department[]): void => {
    console.log('💾 Setting departments in local storage:', departments.length, 'departments');
    DEPARTMENTS.length = 0; // Clear existing
    DEPARTMENTS.push(...departments); // Add new ones
    console.log('✅ Departments updated in local storage');
};

export const getDepartmentById = (id: string): Department | undefined => {
    return DEPARTMENTS.find(d => d.id === id);
};

export const createDepartment = (name: string, companyIds: string[]): Department => {
    const newDepartment: Department = {
        id: `dept-${Date.now()}`,
        name,
        companyIds,
    };
    DEPARTMENTS.unshift(newDepartment);
    return newDepartment;
};

export const updateDepartment = (departmentId: string, updates: Partial<Department>): Department | undefined => {
    console.log('🔄 Attempting to update department:', { id: departmentId, updates });
    
    // First try to find by exact ID match
    let index = DEPARTMENTS.findIndex(d => d.id === departmentId);
    
    // If not found by ID, try to find by name (for API-generated departments)
    if (index === -1 && updates.name) {
        index = DEPARTMENTS.findIndex(d => d.name === updates.name);
        console.log('🔍 Department not found by ID, searching by name:', updates.name, 'Found index:', index);
    }
    
    if (index > -1) {
        const originalDept = DEPARTMENTS[index];
        DEPARTMENTS[index] = { ...originalDept, ...updates } as Department;
        console.log('✅ Successfully updated department:', DEPARTMENTS[index]);
        return DEPARTMENTS[index];
    } else {
        // If department doesn't exist locally, add it
        console.log('⚠️ Department not found in local storage, creating new entry');
        const newDepartment: Department = {
            id: departmentId,
            name: updates.name || 'Unknown Department',
            companyIds: updates.companyIds || [],
            timestamp: updates.timestamp || new Date().toISOString()
        };
        DEPARTMENTS.push(newDepartment);
        console.log('✅ Created new department in local storage:', newDepartment);
        return newDepartment;
    }
};

export const deleteDepartment = (departmentId: string): void => {
    DEPARTMENTS = DEPARTMENTS.filter(d => d.id !== departmentId);
    // Also remove department from any projects' departmentIds
    PROJECTS = PROJECTS.map(p => ({ ...p, departmentIds: p.departmentIds.filter(id => id !== departmentId) }));
};

// --- PROJECT & TASK FUNCTIONS ---
export const getProjectsByManager = (managerId: string): Project[] => {
    return PROJECTS.filter(p => p.managerId === managerId);
};

export const getProjectsByCompany = (companyId: string): Project[] => {
    return PROJECTS.filter(p => p.companyId === companyId);
};

export const getProjectsByDepartment = (departmentId: string): Project[] => {
    return PROJECTS.filter(p => p.departmentIds.includes(departmentId));
};

export const getAllProjects = (): Project[] => {
    return [...PROJECTS];
};

export const getProjectById = (id: string): Project | undefined => {
    return PROJECTS.find(p => p.id === id);
};

export const getTasksByProject = (projectId: string): Task[] => {
    return TASKS.filter(t => t.projectId === projectId);
};

export const getTasksByTeam = (teamMemberIds: string[]): Task[] => {
    const teamSet = new Set(teamMemberIds);
    return TASKS.filter(t => (t.assigneeId && teamSet.has(t.assigneeId)) || !t.assigneeId);
};

export const getTasksByAssignee = (assigneeId: string): Task[] => {
    return TASKS.filter(t => t.assigneeId === assigneeId);
};

export const getTaskById = (taskId: string): Task | undefined => {
    return TASKS.find(t => t.id === taskId);
};

export const createProject = (projectData: { name: string; description: string; managerId: string, departmentIds: string[], deadline?: string, priority?: 'low' | 'medium' | 'high', estimatedTime?: number, companyId: string }): Project => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: projectData.name,
        description: projectData.description,
        managerId: projectData.managerId,
        departmentIds: projectData.departmentIds,
        deadline: projectData.deadline,
        priority: projectData.priority,
        estimatedTime: projectData.estimatedTime,
        companyId: projectData.companyId,
    };
    PROJECTS.unshift(newProject);
    return newProject;
};

export const updateProject = (projectId: string, updates: Partial<Project>): Project | undefined => {
    const projectIndex = PROJECTS.findIndex(p => p.id === projectId);
    if (projectIndex > -1) {
        PROJECTS[projectIndex] = { ...PROJECTS[projectIndex], ...updates };
        return PROJECTS[projectIndex];
    }
    return undefined;
};

export const createTask = (taskData: Omit<Task, 'id' | 'status'> & { status: TaskStatus }): Task => {
    const newTask: Task = {
        id: `task-${Date.now()}`,
        ...taskData,
    };
    TASKS.unshift(newTask);
    return newTask;
};

export const updateTask = (taskId: string, updates: Partial<Task>): Task | undefined => {
    const taskIndex = TASKS.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
        TASKS[taskIndex] = { ...TASKS[taskIndex], ...updates };
        return TASKS[taskIndex];
    }
    return undefined;
};

export const deleteTask = (taskId: string): void => {
    TASKS = TASKS.filter(t => t.id !== taskId);
};

// --- ATTENDANCE FUNCTIONS ---
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


// --- CHAT FUNCTIONS ---
export const getConversationsForUser = (userId: string): ChatConversation[] => {
    return CONVERSATIONS.filter(c => c.participantIds.includes(userId))
        .sort((a,b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
        });
};

export const getMessagesForConversation = (conversationId: string): ChatMessage[] => {
    return MESSAGES.filter(m => m.conversationId === conversationId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const sendMessage = (conversationId: string, senderId: string, text: string): ChatMessage => {
    const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId,
        text,
        timestamp: new Date().toISOString(),
    };
    MESSAGES.push(newMessage);
    // Update last message in conversation
    const convIndex = CONVERSATIONS.findIndex(c => c.id === conversationId);
    if (convIndex > -1) {
        CONVERSATIONS[convIndex].lastMessage = newMessage;
    }
    return newMessage;
};

export const createGroup = (groupName: string, memberIds: string[], creatorId: string): ChatConversation => {
    const newGroup: ChatConversation = {
        id: `conv-${Date.now()}`,
        type: 'group',
        name: groupName,
        participantIds: [...new Set([creatorId, ...memberIds])], // Ensure creator is included and unique
        adminIds: [creatorId],
    };
    CONVERSATIONS.unshift(newGroup);
    return newGroup;
};

export const getOrCreateDirectConversation = (userId1: string, userId2: string): ChatConversation => {
    const existing = CONVERSATIONS.find(c => 
        c.type === 'direct' &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(userId1) &&
        c.participantIds.includes(userId2)
    );

    if (existing) {
        return existing;
    }

    const newDM: ChatConversation = {
        id: `conv-${Date.now()}`,
        type: 'direct',
        participantIds: [userId1, userId2],
    };
    CONVERSATIONS.unshift(newDM);
    return newDM;
};

// --- ONBOARDING FUNCTIONS ---
export const getOnboardingSubmissions = (): OnboardingSubmission[] => {
    return [...ONBOARDING_SUBMISSIONS].sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
};

export const getOnboardingSubmissionById = (id: string): OnboardingSubmission | undefined => {
    return ONBOARDING_SUBMISSIONS.find(s => s.id === id);
};

export const createOnboardingSubmission = (data: Omit<OnboardingSubmission, 'id' | 'submissionDate' | 'status' | 'steps'>): OnboardingSubmission => {
    const newSubmission: OnboardingSubmission = {
        id: `sub-${Date.now()}`,
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