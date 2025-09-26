export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  EMPLOYEE = 'Employee',
  HR = 'HR',
  PARENT = 'Parent',
}

export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  companyIds: string[];
  timestamp?: string; // Make timestamp optional for better compatibility
  createdAt?: string; // Add createdAt property for sorting
}

export interface UserStats {
  completedTasks: number;
  inProgressTasks: number;
  efficiency: number; // percentage
  totalHours: number;
  workload: 'Light' | 'Normal' | 'Heavy';
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PersonalDetails {
  dateOfBirth: string; // ISO string
  nationality: string;
  maritalStatus: 'Single' | 'Married' | 'Other';
  gender: 'Male' | 'Female' | 'Other';
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string; // ISO string
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  yearOfCompletion: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface Compensation {
  salary: number; // Annually
  payFrequency: 'Monthly' | 'Bi-Weekly';
  bankDetails: BankDetails;
}

export interface Document {
  id: string;
  name: string;
  status: 'Pending' | 'Submitted' | 'Verified';
  url?: string; // a mock url
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  managerId?: string;
  departmentIds?: string[];
  jobTitle?: string;
  status?: 'Active' | 'Busy' | 'Offline';
  joinedDate?: string; // ISO string
  skills?: string[];
  stats?: UserStats;

  // New Profile Fields
  personalDetails?: PersonalDetails;
  contactNumber?: string;
  address?: Address;
  familyMembers?: FamilyMember[];
  education?: Education[];
  compensation?: Compensation;
  documents?: Document[];
  rating?: number;
}

export enum TaskStatus {
  TODO = 'To-Do',
  IN_PROGRESS = 'In Progress',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
}

export enum MilestoneStatus {
    PENDING = 'Pending',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
}

export interface ProjectMilestone {
    id: string;
    name: string;
    description: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    status: MilestoneStatus;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  departmentIds: string[];
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedTime?: number; // in hours
  companyId: string;
  roadmap?: ProjectMilestone[];
}

export interface TaskDependency {
    userId: string; // The user we are waiting for.
    reason: string; // e.g., "Awaiting approval for design mockups"
}

export interface Note {
  id: string;
  authorId: string;
  content: string;
  timestamp: string; // ISO string
}

export interface DependencyLog {
  authorId: string; // The user who made the change
  action: 'set' | 'cleared';
  reason?: string; // Only for 'set' action
  dependencyOnUserId?: string; // Only for 'set' action
  timestamp: string; // ISO string
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  dueDate?: string;
  projectId: string;
  assigneeId?: string;
  status: TaskStatus;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  notes?: Note[];
  estimatedTime?: number; // in hours
  dependency?: TaskDependency;
  dependencyLogs?: DependencyLog[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
}

export interface ChatConversation {
  id: string;
  type: 'direct' | 'group';
  participantIds: string[];
  name?: string; // For groups
  adminIds?: string[]; // For groups
  lastMessage?: ChatMessage;
}

export enum OnboardingStatus {
    PENDING_REVIEW = 'Pending Review',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
}

export enum OnboardingStepStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
}

export interface OnboardingStep {
    id: string;
    name: string;
    status: OnboardingStepStatus;
    completedBy?: string; // User ID
    completedAt?: string; // ISO string
}

export interface OnboardingSubmission {
    id: string;
    submissionDate: string; // ISO string
    email: string;
    fullName: string;
    guardianName: string;
    dateOfBirth: string; // ISO string
    gender: 'Male' | 'Female' | 'Other';
    phone: string;
    altPhone: string;
    address: string;
    addressProof: string; // mock file name
    govtId: string;
    collegeName: string;
    gradYear: number;
    cgpa: string;
    collegeCertificates: string; // mock file name
    collegeId: string; // mock file name
    photo: string; // mock file name
    signature: string;
    workTime: string;
    meetingTime: string;
    declaration: boolean;
    languagesKnown: string[];
    // New fields for onboarding view
    status: OnboardingStatus;
    steps?: OnboardingStep[];
}