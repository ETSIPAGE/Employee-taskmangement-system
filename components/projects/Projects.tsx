import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, User, UserRole, TaskStatus, Department, Company, ProjectMilestone, MilestoneStatus } from '../../types';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import ViewSwitcher from '../shared/ViewSwitcher';
import ProjectCard from './ProjectCard';
import ProjectRoadmap from './ProjectRoadmap';
import { EditIcon, TrashIcon } from '../../constants';

// API Endpoints for Project CRUD (managed directly in this component)
const PROJECTS_GET_ALL_API_URL = 'https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects';
const PROJECTS_CREATE_API_URL = 'https://s1mbbsd685.execute-api.ap-south-1.amazonaws.com/pz/Create-projects';
const PROJECTS_DELETE_API_URL = 'https://xiwwdxpjx4.execute-api.ap-south-1.amazonaws.com/det/del-project';
// The PROJECTS_UPDATE_BASE_URL is assumed to *not* require the ID in the path, but in the body,
// based on your existing usage in handleSaveProject and handleUpdateMilestoneStatus.
// If your backend *does* require the ID in the URL path (e.g., /updt-project/{id}),
// you would need to adjust the fetch URL like: PROJECTS_UPDATE_BASE_URL.replace('{id}', projectId)
const PROJECTS_UPDATE_BASE_URL = 'https://ikwfgdgtzk.execute-api.ap-south-1.amazonaws.com/udt/updt-project/{id}';


export interface ProjectDisplayData extends Project {
    managerName: string;
    progress: number;
    departmentNames: string;
    companyName: string;
    overallStatus: string; // Ensure this is present
}

const parseApiResponse = async (response: Response) => {
    if (!response.ok) {
        let errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            errorText = errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
            // Not JSON, use raw text
        }
        console.error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
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


const Projects: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState<ProjectDisplayData[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false); // For Create/Edit Project
    const [view, setView] = useState<'table' | 'card'>('table');
    const [roadmapProjectId, setRoadmapProjectId] = useState<string | null>(null); // Use an ID to identify the project for roadmap

    const [confirmDeleteProject, setConfirmDeleteProject] = useState<ProjectDisplayData | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    const [editingProject, setEditingProject] = useState<ProjectDisplayData | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectCompanyId, setNewProjectCompanyId] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [assignedManagerId, setAssignedManagerId] = useState('');
    const [newProjectDeadline, setNewProjectDeadline] = useState('');
    const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
    const [newProjectPriority, setNewProjectPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newProjectEstTime, setNewProjectEstTime] = useState('');

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = AuthService.getToken();

            const projectsResponse = await fetch(PROJECTS_GET_ALL_API_URL, {
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });
            if (!projectsResponse.ok) {
                const errorText = await projectsResponse.text();
                throw new Error(`Failed to fetch projects: ${projectsResponse.status} ${projectsResponse.statusText}. Response: ${errorText}`);
            }

            const apiResponse: unknown = await projectsResponse.json();
            let allProjects: Project[] = [];
            if (typeof apiResponse === 'object' && apiResponse !== null && 'Items' in apiResponse && Array.isArray((apiResponse as any).Items)) {
                allProjects = (apiResponse as any).Items;
                console.log('[Projects] Projects API response contains an "Items" array, processing it.');
            } else if (typeof apiResponse === 'object' && apiResponse !== null && 'items' in apiResponse && Array.isArray((apiResponse as any).items)) {
                allProjects = (apiResponse as any).items;
                console.log('[Projects] Projects API response contains an "items" array, processing it.');
            } else if (Array.isArray(apiResponse)) {
                allProjects = apiResponse;
                console.log('[Projects] Projects API response is directly an array, processing it.');
            } else {
                console.warn('Projects API response was not a direct array or an object with an "items" / "Items" array. Check API format.');
                allProjects = [];
            }
            console.log(`[Projects] Fetched ${allProjects.length} raw projects.`);

            const [allUsers, managerList, depts, allCompanies] = await Promise.all([
                AuthService.getUsers(),
                AuthService.getManagers(),
                DataService.getDepartments(),
                DataService.getCompanies()
            ]);

            setDepartments(depts);
            setCompanies(allCompanies);
            setManagers(managerList);

            // Set initial manager/company for new project if not already set
            if (!assignedManagerId && managerList.length > 0) {
                setAssignedManagerId(user?.id || managerList[0].id);
            }
            if (!newProjectCompanyId && allCompanies.length > 0) {
                setNewProjectCompanyId(allCompanies[0].id);
            }

            const projectsWithDetails: ProjectDisplayData[] = await Promise.all(
                allProjects.map(async (p) => {
                    const cleanedManagerId = p.managerId ? String(p.managerId).trim() : '';
                    const manager = allUsers.find((u) => u.id === cleanedManagerId);

                    const createdAt = p.createdAt || new Date().toISOString();

                    let progress = 0;
                    let overallStatus: string = 'Pending';

                    if (p.roadmap && p.roadmap.length > 0) {
                        const totalMilestones = p.roadmap.length;
                        const completedMilestones = p.roadmap.filter(
                            (m) => m.status === MilestoneStatus.COMPLETED
                        ).length;
                        const inProgressMilestones = p.roadmap.filter(
                            (m) => m.status === MilestoneStatus.IN_PROGRESS
                        ).length;
                        const onHoldMilestones = p.roadmap.filter(
                            (m) => m.status === MilestoneStatus.ON_HOLD
                        ).length;

                        if (totalMilestones > 0) {
                            progress = Math.round(
                                ((completedMilestones * 1.0 + inProgressMilestones * 0.5) / totalMilestones) * 100
                            );

                            if (progress === 100) {
                                overallStatus = 'Completed';
                            } else if (onHoldMilestones > 0) {
                                overallStatus = 'On Hold';
                            } else if (inProgressMilestones > 0 || completedMilestones > 0) {
                                overallStatus = 'In Progress';
                            } else {
                                overallStatus = 'Pending';
                            }
                        }
                    } else {
                        const projectTasks = await DataService.getTasksByProject(p.id);
                        const completedTasks = projectTasks.filter(
                            (t) => t.status === TaskStatus.COMPLETED
                        ).length;
                        const totalTasks = projectTasks.length;

                        progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                        if (progress === 100) {
                            overallStatus = 'Completed';
                        } else if (progress > 0) {
                            overallStatus = 'In Progress';
                        } else {
                            overallStatus = 'Pending';
                        }
                    }

                    if (overallStatus !== 'Completed' && p.deadline && new Date(p.deadline) < new Date()) {
                        overallStatus = 'Overdue';
                    }

                    const departmentNames = (p.departmentIds || [])
                        .map((id) => depts.find((d) => d.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');

                    const company = allCompanies.find((c) => c.id === p.companyId);

                    return {
                        ...p,
                        managerName: manager?.name || 'Unassigned',
                        progress,
                        overallStatus,
                        departmentNames,
                        companyName: company?.name || 'N/A',
                        createdAt: createdAt,
                    };
                })
            );

            projectsWithDetails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setProjects(projectsWithDetails);
        } catch (error) {
            console.error('[Projects] Failed to load project data:', error instanceof Error ? error.message : error);
            showToast(`Failed to load projects: ${error instanceof Error ? error.message : 'An unknown error occurred'}.`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, showToast, assignedManagerId, newProjectCompanyId]);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (isMounted) {
                await loadData();
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [loadData]);


    const filteredProjects = useMemo(() => {
        return projects.filter((project) => {
            const companyMatch = companyFilter === 'all' || project.companyId === companyFilter;
            const departmentMatch = departmentFilter === 'all' || (project.departmentIds && project.departmentIds.includes(departmentFilter));
            const managerMatch = managerFilter === 'all' || project.managerId === managerFilter;
            const searchMatch =
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());

            return companyMatch && departmentMatch && managerMatch && searchMatch;
        });
    }, [projects, searchTerm, companyFilter, departmentFilter, managerFilter]);


    // Derive the project for the roadmap modal from the 'projects' state
    const projectForRoadmap = useMemo(() => {
        return roadmapProjectId ? projects.find(p => p.id === roadmapProjectId) : null;
    }, [roadmapProjectId, projects]);


    const handleOpenCreateModal = () => {
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDesc('');
        setAssignedManagerId(managers.length > 0 ? (user?.id || managers[0].id) : '');
        setNewProjectCompanyId(companies.length > 0 ? companies[0].id : '');
        setNewProjectDeadline('');
        setAssignedDeptIds([]);
        setNewProjectPriority('medium');
        setNewProjectEstTime('');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (projectToEdit: ProjectDisplayData) => {
        setEditingProject(projectToEdit);
        setNewProjectName(projectToEdit.name);
        setNewProjectDesc(projectToEdit.description || '');
        setAssignedManagerId(projectToEdit.managerId);
        setNewProjectCompanyId(projectToEdit.companyId);
        setNewProjectDeadline(projectToEdit.deadline || '');
        setAssignedDeptIds(projectToEdit.departmentIds || []);
        setNewProjectPriority(projectToEdit.priority || 'medium');
        setNewProjectEstTime(projectToEdit.estimatedTime?.toString() || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProject(null);
        // Reset form fields to initial state or defaults
        setNewProjectName('');
        setNewProjectDesc('');
        setAssignedManagerId(managers.length > 0 ? (user?.id || managers[0].id) : '');
        setNewProjectCompanyId(companies.length > 0 ? companies[0].id : '');
        setNewProjectDeadline('');
        setAssignedDeptIds([]);
        setNewProjectPriority('medium');
        setNewProjectEstTime('');
    };

    // Close roadmap modal
    const handleCloseRoadmapModal = useCallback(() => {
        setRoadmapProjectId(null);
    }, []);

    const handleDeptToggle = (deptId: string) => {
        setAssignedDeptIds((prev) => {
            const newIds = new Set(prev);
            if (newIds.has(deptId)) newIds.delete(deptId);
            else newIds.add(deptId);
            return Array.from(newIds);
        });
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim() || !assignedManagerId || !newProjectCompanyId) {
            showToast('Project name, assigned manager, and company are required.', 'error');
            return;
        }
        if (!user) {
            showToast('Authentication error: User not logged in.', 'error');
            return;
        }

        const token = AuthService.getToken();

        const baseProjectPayload = {
            name: newProjectName,
            description: newProjectDesc,
            managerId: assignedManagerId,
            departmentIds: assignedDeptIds,
            deadline: newProjectDeadline,
            priority: newProjectPriority,
            estimatedTime: newProjectEstTime ? parseInt(newProjectEstTime, 10) : undefined,
            companyId: newProjectCompanyId,
            createdBy: user.id,
        };

        try {
            if (editingProject) {
                if (!editingProject.id || !editingProject.createdAt) {
                    showToast("Cannot edit project: Missing project ID or creation timestamp.", "error");
                    return;
                }

                const updateFields: Partial<Project> = {
                    ...baseProjectPayload,
                    // Keep existing roadmap if not explicitly updated in the form
                    roadmap: editingProject.roadmap || [],
                    // Ensure createdAt is not sent in updateFields as it's the sort key
                };
                delete updateFields.createdAt; // Remove createdAt from the update payload if it's there

                const requestBodyForLambda = {
                    id: editingProject.id,
                    timestamp: editingProject.createdAt,
                    updateFields: updateFields,
                };

                console.log('Attempting to update project. URL:', PROJECTS_UPDATE_BASE_URL);
                console.log('Update payload for Lambda:', JSON.stringify(requestBodyForLambda, null, 2));

                const response = await fetch(PROJECTS_UPDATE_BASE_URL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify(requestBodyForLambda),
                });

                if (!response.ok) {
                    let errorMessage = `Failed to update project ${editingProject.id}. Status: ${response.status} ${response.statusText}.`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorMessage = await response.text();
                    }
                    throw new Error(errorMessage);
                }
                showToast('Project updated successfully!', 'success');
            } else {
                const createPayload = {
                    ...baseProjectPayload,
                    createdAt: new Date().toISOString(), // This should be consistently generated or from backend
                    roadmap: [], // New projects start with an empty roadmap
                };

                console.log('Attempting to create project. URL:', PROJECTS_CREATE_API_URL);
                console.log('Create payload:', JSON.stringify(createPayload, null, 2));

                const response = await fetch(PROJECTS_CREATE_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify(createPayload),
                });

                if (!response.ok) {
                    let errorMessage = `Failed to create project. Status: ${response.status} ${response.statusText}.`;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorMessage = await response.text();
                    }
                    throw new Error(errorMessage);
                }
                showToast('Project created successfully!', 'success');
            }
        } catch (error) {
            console.error('[Projects] Failed to save project:', error instanceof Error ? error.message : error);
            showToast(`Failed to save project: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Please try again.`, 'error');
            return;
        }
        await loadData();
        handleCloseModal();
    };

    const handleDeleteProject = (projectToDelete: ProjectDisplayData) => {
        if (!projectToDelete.id || !projectToDelete.createdAt) {
            showToast('Cannot delete project: Missing ID or creation timestamp.', 'error');
            console.error('Deletion attempt failed due to missing ID or createdAt:', projectToDelete);
            return;
        }
        setConfirmDeleteProject(projectToDelete);
    };

    const confirmDeletion = async () => {
        if (!confirmDeleteProject) return;

        const projectToDelete = confirmDeleteProject;
        setConfirmDeleteProject(null);

        const token = AuthService.getToken();
        try {
            const deletePayload = {
                id: projectToDelete.id,
                timestamp: projectToDelete.createdAt,
            };

            const response = await fetch(PROJECTS_DELETE_API_URL, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(deletePayload),
            });

            if (!response.ok) {
                let errorMessage = `Failed to delete project ${projectToDelete.name}. Status: ${response.status} ${response.statusText}.`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || JSON.stringify(errorData);
                } catch (jsonError) {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }
            showToast('Project deleted successfully!', 'success');
            await loadData();
        } catch (error) {
            console.error('[Projects] Failed to delete project:', error instanceof Error ? error.message : error);
            showToast(`Failed to delete project: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Please try again.`, 'error');
        }
    };

    const handleUpdateProjectStatus = useCallback(async (projectId: string, newStatus: string) => {
        const projectToUpdateIndex = projects.findIndex(p => p.id === projectId);
        if (projectToUpdateIndex === -1) {
            showToast('Failed to update project status: Project not found.', 'error');
            return;
        }

        const projectToUpdate = projects[projectToUpdateIndex];
        if (!projectToUpdate.createdAt) {
            showToast('Failed to update project status: Creation timestamp not found.', 'error');
            return;
        }

        const originalStatus = projectToUpdate.overallStatus; // Store original status for potential rollback
        const token = AuthService.getToken();

        try {
            // --- OPTIMISTIC UI UPDATE START ---
            // Create a *new array* and update the specific project object within it.
            // This triggers a re-render of the Projects component and its children (ProjectCard).
            setProjects(prevProjects => {
                const updatedProjects = [...prevProjects]; // Shallow copy the array
                // Create a shallow copy of the project object itself before modifying
                updatedProjects[projectToUpdateIndex] = {
                    ...updatedProjects[projectToUpdateIndex],
                    overallStatus: newStatus,
                };
                return updatedProjects; // Return the new array to update state
            });
            console.log(`[Projects] Optimistically updated project ${projectId} overall status to ${newStatus}.`);
            // --- OPTIMISTIC UI UPDATE END ---

            // Prepare the payload for the backend API
            const requestBodyForLambda = {
                id: projectToUpdate.id,
                timestamp: projectToUpdate.createdAt,
                updateFields: {
                    overallStatus: newStatus,
                },
            };

            console.log(`[Projects] Attempting to update project ${projectId} overall status to ${newStatus} via API.`);
            const response = await fetch(
                // Using PROJECTS_UPDATE_BASE_URL as is, assuming backend expects ID in body.
                // If backend requires ID in URL path (e.g., /updt-project/some-id),
                // you would change this to: PROJECTS_UPDATE_BASE_URL.replace('{id}', projectId)
                PROJECTS_UPDATE_BASE_URL,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify(requestBodyForLambda),
                }
            );

            if (!response.ok) {
                // If the API call fails, throw an error to trigger the catch block
                let errorMessage = `Failed to update project status. Status: ${response.status} ${response.statusText}.`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || JSON.stringify(errorData);
                } catch (jsonError) {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }

            showToast(`Project status updated to ${newStatus} successfully!`, 'success');

            // After successful API update, reload all data to ensure full consistency.
            // This will also correct any discrepancies if the optimistic update was slightly off
            // (e.g., if the backend applies additional logic or returns a different computed status).
            await loadData();

        } catch (error) {
            console.error('[Projects] Failed to update project status:', error instanceof Error ? error.message : error);
            showToast(`Failed to update project status: ${error instanceof Error ? error.message : 'An unknown error occurred'}.`, 'error');

            // --- REVERT OPTIMISTIC UPDATE ON ERROR ---
            // Revert the local UI state back to the original status
            setProjects(prevProjects => {
                const revertedProjects = [...prevProjects];
                revertedProjects[projectToUpdateIndex] = {
                    ...revertedProjects[projectToUpdateIndex],
                    overallStatus: originalStatus, // Revert to the status before the attempted update
                };
                return revertedProjects;
            });
            console.log(`[Projects] Reverted project ${projectId} status to ${originalStatus} due to API error.`);
            // --- REVERT OPTIMISTIC UPDATE END ---
        }
    }, [projects, loadData, showToast]); // Added 'projects' to dependencies


    // Make sure this callback is stable
    const handleUpdateMilestoneStatus = useCallback(async (projectId: string, milestoneId: string, newStatus: TaskStatus) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate || !projectToUpdate.roadmap || !projectToUpdate.createdAt) {
            showToast('Failed to update roadmap: Project, roadmap, or creation timestamp not found.', 'error');
            return;
        }

        const token = AuthService.getToken();

        const mappedNewStatus: MilestoneStatus =
            newStatus === TaskStatus.COMPLETED ? MilestoneStatus.COMPLETED :
            newStatus === TaskStatus.IN_PROGRESS ? MilestoneStatus.IN_PROGRESS :
            newStatus === TaskStatus.ON_HOLD ? MilestoneStatus.ON_HOLD :
            MilestoneStatus.PENDING;

        const updatedRoadmap = projectToUpdate.roadmap.map(ms =>
            ms.id === milestoneId ? { ...ms, status: mappedNewStatus } : ms
        );

        try {
            const requestBodyForLambda = {
                id: projectToUpdate.id,
                timestamp: projectToUpdate.createdAt,
                updateFields: {
                    roadmap: updatedRoadmap,
                },
            };

            console.log('Attempting to update roadmap milestone. URL:', PROJECTS_UPDATE_BASE_URL);
            console.log('Update payload for Lambda:', JSON.stringify(requestBodyForLambda, null, 2));

            const response = await fetch(
                PROJECTS_UPDATE_BASE_URL,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify(requestBodyForLambda),
                }
            );

            if (!response.ok) {
                let errorMessage = `Failed to update roadmap. Status: ${response.status} ${response.statusText}.`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || JSON.stringify(errorData);
                } catch (jsonError) {
                    errorMessage = await response.text();
                }
                throw new Error(errorMessage);
            }
            showToast('Roadmap updated successfully!', 'success');
            await loadData();
        } catch (error) {
            console.error('[Projects] Failed to update roadmap milestone:', error instanceof Error ? error.message : error);
            showToast(`Failed to update roadmap: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Please try again.`, 'error');
        }
    }, [projects, loadData, showToast]);


    if (!user || ![UserRole.ADMIN, UserRole.MANAGER, UserRole.HR].includes(user.role)) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center py-8 text-lg text-slate-600">Loading projects...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Projects</h1>
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.HR].includes(user.role) && (
                    <Button onClick={handleOpenCreateModal}>Create New Project</Button>
                )}
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Companies</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Managers</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-end mb-4">
                <div className="w-64">
                    <ViewSwitcher view={view} setView={setView} />
                </div>
            </div>

            {filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Projects Found</h3>
                    <p className="text-slate-500 mt-2">No projects match your search or filter criteria.</p>
                </div>
            ) : view === 'table' ? (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Project Name</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Departments</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assigned Manager</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Deadline</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Priority</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map(project => (
                                <tr key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <Link to={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()} className="text-indigo-600 hover:text-indigo-900 font-semibold whitespace-no-wrap">
                                            {project.name}
                                        </Link>
                                        <p className="text-slate-600 whitespace-no-wrap text-xs line-clamp-1">{project.description}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{project.companyName || 'N/A'}</p>
                                    </td>
                                     <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-600 whitespace-no-wrap">{project.departmentNames}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{project.managerName}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <p className="text-slate-900 whitespace-no-wrap">{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            project.priority === 'high' ? 'bg-red-100 text-red-800' :
                                            project.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-slate-100 text-slate-800'
                                        }`}>
                                            {project.priority || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <div className="flex items-center">
                                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                                            </div>
                                            <span className="ml-3 text-slate-600 font-semibold">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                        <div className="flex items-center space-x-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRoadmapProjectId(project.id); // Set only the ID
                                                }}
                                                className="px-3 py-1 text-xs font-medium rounded-md bg-white text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={!project.roadmap || project.roadmap.length === 0}
                                            >
                                                View Roadmap
                                            </button>
                                            {[UserRole.ADMIN, UserRole.MANAGER].includes(user?.role as UserRole) && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(project); }}
                                                        className="text-slate-500 hover:text-indigo-600"
                                                        title="Edit Project"
                                                    >
                                                        <EditIcon className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                                                        className="text-slate-500 hover:text-red-600"
                                                        title="Delete Project"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onUpdateStatus={handleUpdateProjectStatus}
                        />
                    ))}
                </div>
            )}


            <Modal title={editingProject ? "Edit Project" : "Create New Project"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSaveProject} className="space-y-4">
                    {/* 1. Project Name */}
                    <Input
                        id="newProjectName"
                        label="Project Name"
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                    />

                    {/* 2. Company */}
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                        <select
                            id="company"
                            value={newProjectCompanyId}
                            onChange={(e) => setNewProjectCompanyId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                            required
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Departments - Keep as is, it's a multi-select */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Departments</label>
                        <div className="grid grid-cols-2 gap-2 border border-slate-300 rounded-md p-2">
                            {departments.map(dept => (
                                <div key={dept.id} className="flex items-center">
                                    <input
                                        id={`dept-${dept.id}`}
                                        type="checkbox"
                                        checked={assignedDeptIds.includes(dept.id)}
                                        onChange={() => handleDeptToggle(dept.id)}
                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`dept-${dept.id}`} className="ml-2 block text-sm text-slate-800">
                                        {dept.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Manager (Conditional) */}
                    {![UserRole.EMPLOYEE, UserRole.MANAGER].includes(user?.role as UserRole) && (
                        <div>
                            <label htmlFor="manager" className="block text-sm font-medium text-slate-700">Assign Manager</label>
                            <select
                                id="manager"
                                value={assignedManagerId}
                                onChange={(e) => setAssignedManagerId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                                required
                            >
                                {managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {user?.role === UserRole.MANAGER && (
                        <input type="hidden" value={assignedManagerId} />
                    )}

                    {/* 5. Deadline, Priority, Estimated Time - Grouped in a grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            id="newProjectDeadline"
                            label="Deadline"
                            type="date"
                            value={newProjectDeadline}
                            onChange={(e) => setNewProjectDeadline(e.target.value)}
                        />
                        <div>
                            <label htmlFor="newProjectPriority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select
                                id="newProjectPriority"
                                value={newProjectPriority}
                                onChange={(e) => setNewProjectPriority(e.target.value as 'low' | 'medium' | 'high')}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input
                            id="newProjectEstTime"
                            label="Est. Time (hours)"
                            type="number"
                            value={newProjectEstTime}
                            onChange={(e) => setNewProjectEstTime(e.target.value)}
                            min="0"
                        />
                    </div>

                    {/* 8. Description */}
                    <div>
                        <label htmlFor="newProjectDesc" className="block text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <textarea
                            id="newProjectDesc"
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                            rows={2}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">{editingProject ? "Save Changes" : "Create Project"}</Button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRMATION MODAL FOR DELETION */}
            {confirmDeleteProject && (
                <Modal
                    title="Confirm Deletion"
                    isOpen={true}
                    onClose={() => setConfirmDeleteProject(null)}
                >
                    <p className="text-slate-700 mb-4">
                        Are you sure you want to delete project "<span className="font-semibold">{confirmDeleteProject.name}</span>"?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteProject(null)}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm"
                        >
                            Cancel
                        </button>
                        <Button
                            type="button"
                            onClick={confirmDeletion}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Yes, Delete
                        </Button>
                    </div>
                </Modal>
            )}

            {/* ROADMAP MODAL - Conditional on projectForRoadmap */}
            {projectForRoadmap && (
                <Modal
                    title={`Project Roadmap: ${projectForRoadmap.name}`}
                    isOpen={true}
                    onClose={handleCloseRoadmapModal} // Use the specific close handler
                    size="lg"
                >
                    {projectForRoadmap.roadmap && projectForRoadmap.roadmap.length > 0 ? (
                        <ProjectRoadmap
                            roadmap={projectForRoadmap.roadmap}
                            onUpdate={(milestoneId, newStatus) =>
                                handleUpdateMilestoneStatus(projectForRoadmap.id, milestoneId, newStatus)
                            }
                        />
                    ) : (
                        <p className="text-center text-slate-500 py-8">No roadmap has been defined for this project.</p>
                    )}
                </Modal>
            )}

            {toast && (
                <div
                    className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white ${
                        toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default Projects;