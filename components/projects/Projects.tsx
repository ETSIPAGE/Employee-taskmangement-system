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
// These are now for reference, DataService handles the actual calls.
const PROJECTS_GET_ALL_API_URL = 'https://zmpxbvjnrf.execute-api.ap-south-1.amazonaws.com/get/get-projects';
// const PROJECTS_CREATE_API_URL = 'https://s1mbbsd685.execute-api.ap-south-1.amazonaws.com/pz/Create-projects'; // Handled by DataService
// const PROJECTS_DELETE_API_URL = 'https://xiwwdxpjx4.execute-api.ap-south-1.amazonaws.com/det/del-project'; // Handled by DataService
// const PROJECTS_UPDATE_BASE_URL = 'https://ikwfgdgtzk.execute-api.ap-south-1.amazonaws.com/udt/updt-project'; // Handled by DataService


// ProjectDisplayData now extends Project, which already has 'timestamp'.
export interface ProjectDisplayData extends Project {
    managerNames: string;
    progress: number;
    departmentNames: string;
    companyName: string;
    overallStatus: string;
}

// Function to parse API responses (no longer used directly in this component for project CRUD)
// Keeping it here for consistency if other direct fetches still use it.
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
    const [allManagers, setAllManagers] = useState<User[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);

    const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
    const [filteredManagers, setFilteredManagers] = useState<User[]>([]);


    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [view, setView] = useState<'table' | 'card'>('table');
    const [roadmapProjectId, setRoadmapProjectId] = useState<string | null>(null);

    const [confirmDeleteProject, setConfirmDeleteProject] = useState<ProjectDisplayData | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    const [editingProject, setEditingProject] = useState<ProjectDisplayData | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectCompanyId, setNewProjectCompanyId] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [assignedManagerIds, setAssignedManagerIds] = useState<string[]>([]);
    const [newProjectDeadline, setNewProjectDeadline] = useState('');
    const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
    const [newProjectPriority, setNewProjectPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newProjectEstTime, setNewProjectEstTime] = useState('');

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);


    // --- Helper function to calculate project display data ---
    // This helper now receives all necessary 'lookup' data as arguments.
    // It's also memoized using useCallback to prevent unnecessary re-creations.
    const getProjectDisplayData = useCallback(async (project: Project, usersList: User[], deptsList: Department[], companiesList: Company[]): Promise<ProjectDisplayData> => {
        const managerNames = (project.managerIds || [])
            .map((id) => usersList.find((u) => u.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        let progress = 0;
        let overallStatus: string = 'Pending';

        if (project.roadmap && project.roadmap.length > 0) {
            const totalMilestones = project.roadmap.length;
            const completedMilestones = project.roadmap.filter(
                (m) => m.status === MilestoneStatus.COMPLETED
            ).length;
            const inProgressMilestones = project.roadmap.filter(
                (m) => m.status === MilestoneStatus.IN_PROGRESS
            ).length;
            const onHoldMilestones = project.roadmap.filter(
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
            // Fallback to tasks if no roadmap
            // IMPORTANT: Fetch tasks here to ensure fresh data for this specific project
            const projectTasks = await DataService.getTasksByProject(project.id);
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

        if (overallStatus !== 'Completed' && project.deadline && new Date(project.deadline) < new Date()) {
            overallStatus = 'Overdue';
        }

        const departmentNames = (project.departmentIds || [])
            .map((id) => deptsList.find((d) => d.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        const company = companiesList.find((c) => c.id === project.companyId);

        return {
            ...project,
            managerNames: managerNames || 'Unassigned',
            progress,
            overallStatus,
            departmentNames,
            companyName: company?.name || 'N/A',
        };
    }, []); // Dependencies are just here to satisfy useCallback, logic uses arguments


    const loadData = useCallback(async () => {
        setIsLoading(true);
        console.log("[Projects] Starting loadData...");
        try {
            // Fetch all core lookup data first, fresh from the backend (cache will be invalidated by DataService functions)
            // Use DataService functions for all data fetches for consistency and cache management
            const [usersData, departmentsData, companiesData, allProjectsRaw] = await Promise.all([
                DataService.getUsers(), 
                DataService.getDepartments(),
                DataService.getCompanies(),
                DataService.getAllProjects(), // Use DataService to get all projects
            ]);
            
            // Update state for filter options
            setAllManagers(usersData.filter(u => u.role === UserRole.MANAGER));
            setAllDepartments(departmentsData);
            setCompanies(companiesData);

            if (!newProjectCompanyId && companiesData.length > 0) {
                setNewProjectCompanyId(companiesData[0].id);
            }

            console.log(`[Projects] Fetched ${allProjectsRaw.length} raw projects from API.`);

            // Map raw projects to display data, using the freshly fetched lookup data
            const projectsWithDetails: ProjectDisplayData[] = await Promise.all(
                allProjectsRaw.map(async (p) => getProjectDisplayData(p, usersData, departmentsData, companiesData))
            );

            projectsWithDetails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            console.log("[Projects] Setting projects state. First project's status:", projectsWithDetails[0]?.overallStatus);
            setProjects(projectsWithDetails);

        } catch (error) {
            console.error('[Projects] Failed to load project data:', error instanceof Error ? error.message : error);
            showToast(`Failed to load projects: ${error instanceof Error ? error.message : 'An unknown error occurred'}.`, 'error');
        } finally {
            setIsLoading(false);
            console.log("[Projects] Finished loadData.");
        }
    }, [showToast, newProjectCompanyId, getProjectDisplayData]);


    useEffect(() => {
        loadData();
    }, [loadData]);


    // Effect to fetch departments when company changes in the modal
    useEffect(() => {
        const fetchDepartments = async () => {
            if (newProjectCompanyId) {
                try {
                    const depts = await DataService.getDepartmentsByCompany(newProjectCompanyId);
                    setFilteredDepartments(depts);
                    if (editingProject && editingProject.companyId === newProjectCompanyId) {
                        const validAssignedDepts = (editingProject.departmentIds || []).filter(
                            deptId => depts.some(d => d.id === deptId)
                        );
                        setAssignedDeptIds(validAssignedDepts);
                    } else {
                        setAssignedDeptIds([]);
                    }
                } catch (error) {
                    console.error('Error fetching departments for company:', error);
                    setFilteredDepartments([]);
                    setAssignedDeptIds([]);
                }
            } else {
                setFilteredDepartments([]);
                setAssignedDeptIds([]);
            }
        };
        if (isModalOpen) {
            fetchDepartments();
        }
    }, [newProjectCompanyId, isModalOpen, editingProject]);


    // Effect to filter managers when assigned departments change in the modal
    useEffect(() => {
        if (isModalOpen) {
            if (assignedDeptIds.length > 0) {
                const managersInSelectedDepts = allManagers.filter(manager =>
                    manager.departmentIds && manager.departmentIds.some(deptId => assignedDeptIds.includes(deptId))
                );
                setFilteredManagers(managersInSelectedDepts);

                // Filter out assigned managers who are no longer valid
                setAssignedManagerIds(prevAssigned =>
                    prevAssigned.filter(managerId => managersInSelectedDepts.some(m => m.id === managerId))
                );
            } else {
                setFilteredManagers([]);
                setAssignedManagerIds([]); // Clear all assigned managers if no departments selected
            }
        }
    }, [assignedDeptIds, isModalOpen, allManagers]);


    const filteredProjects = useMemo(() => {
        return projects.filter((project) => {
            const companyMatch = companyFilter === 'all' || project.companyId === companyFilter;
            const departmentMatch = departmentFilter === 'all' || (project.departmentIds && project.departmentIds.includes(departmentFilter));
            const managerMatch = managerFilter === 'all' || (project.managerIds && project.managerIds.includes(managerFilter));
            const searchMatch =
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());

            return companyMatch && departmentMatch && managerMatch && searchMatch;
        });
    }, [projects, searchTerm, companyFilter, departmentFilter, managerFilter]);


    const projectForRoadmap = useMemo(() => {
        return roadmapProjectId ? projects.find(p => p.id === roadmapProjectId) : null;
    }, [roadmapProjectId, projects]);


    const handleOpenCreateModal = () => {
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectCompanyId(companies.length > 0 ? companies[0].id : '');
        setAssignedDeptIds([]);
        setAssignedManagerIds([]);
        setNewProjectDeadline('');
        setNewProjectPriority('medium');
        setNewProjectEstTime('');
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (projectToEdit: ProjectDisplayData) => {
        setEditingProject(projectToEdit);
        setNewProjectName(projectToEdit.name);
        setNewProjectDesc(projectToEdit.description || '');
        setNewProjectCompanyId(projectToEdit.companyId);
        setAssignedDeptIds(projectToEdit.departmentIds || []);
        setAssignedManagerIds(projectToEdit.managerIds || []);
        setNewProjectDeadline(projectToEdit.deadline || '');
        setNewProjectPriority(projectToEdit.priority || 'medium');
        setNewProjectEstTime(projectToEdit.estimatedTime?.toString() || '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProject(null);
        setNewProjectName('');
        setNewProjectDesc('');
        setNewProjectCompanyId('');
        setAssignedManagerIds([]);
        setNewProjectDeadline('');
        setAssignedDeptIds([]);
        setNewProjectPriority('medium');
        setNewProjectEstTime('');
        setFilteredDepartments([]);
        setFilteredManagers([]);
    };

    const handleCloseRoadmapModal = useCallback(() => {
        setRoadmapProjectId(null);
        console.log("[Projects] Roadmap modal closed, forcing loadData to refresh list status.");
        loadData();
    }, [loadData]);


    const handleDeptToggle = (deptId: string) => {
        setAssignedDeptIds((prev) => {
            const newIds = new Set(prev);
            if (newIds.has(deptId)) newIds.delete(deptId);
            else newIds.add(deptId);
            return Array.from(newIds);
        });
    };

    const handleManagerToggle = (managerId: string) => {
        setAssignedManagerIds((prev) => {
            const newIds = new Set(prev);
            if (newIds.has(managerId)) newIds.delete(managerId);
            else newIds.add(managerId);
            return Array.from(newIds);
        });
    };

    const handleSaveProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim() || assignedManagerIds.length === 0 || !newProjectCompanyId || assignedDeptIds.length === 0) {
            showToast('Project name, at least one assigned manager, company, and at least one department are required.', 'error');
            return;
        }
        if (!user) {
            showToast('Authentication error: User not logged in.', 'error');
            return;
        }

        const projectPayload = {
            name: newProjectName,
            description: newProjectDesc,
            managerIds: assignedManagerIds,
            departmentIds: assignedDeptIds,
            deadline: newProjectDeadline,
            priority: newProjectPriority,
            estimatedTime: newProjectEstTime ? parseInt(newProjectEstTime, 10) : undefined,
            companyId: newProjectCompanyId,
            createdBy: user.id,
        };

        try {
            if (editingProject) {
                if (!editingProject.id || !editingProject.timestamp) {
                    showToast("Cannot edit project: Missing project ID or timestamp.", "error");
                    return;
                }
                console.log("[Projects] Calling DataService.updateProject for editing...");
                await DataService.updateProject(editingProject.id, editingProject.timestamp, {
                    ...projectPayload,
                    roadmap: editingProject.roadmap || []
                });
                showToast('Project updated successfully!', 'success');
            } else {
                console.log("[Projects] Calling DataService.createProject for new project...");
                await DataService.createProject(projectPayload);
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
        if (!projectToDelete.id || !projectToDelete.timestamp) {
            showToast('Cannot delete project: Missing ID or timestamp.', 'error');
            console.error('Deletion attempt failed due to missing ID or timestamp:', projectToDelete);
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
            // Corrected: Use DataService.deleteProject
            await DataService.deleteProject(projectToDelete.id, projectToDelete.timestamp, token); 
            showToast('Project deleted successfully!', 'success');
            await loadData(); 
        } catch (error) {
            console.error('[Projects] Failed to delete project:', error instanceof Error ? error.message : error);
            showToast(`Failed to delete project: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Please try again.`, 'error');
        }
    };

    // This is for ProjectCard directly updating overall status (e.g., mark complete)
    const handleUpdateProjectStatus = useCallback(async (projectId: string, newStatus: string) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate || !projectToUpdate.timestamp) {
            showToast('Failed to update project status: Project not found or timestamp missing.', 'error');
            return;
        }

        // --- FIX for error: `overallStatus` does not exist in type `Partial<Project>` ---
        // `overallStatus` is a derived frontend property. It cannot be directly sent to the backend.
        // If the intention is to mark a project as "Completed", you should update its roadmap.
        // If your backend *does* have a 'status' field, you'd send that, not 'overallStatus'.
        // Assuming 'overallStatus' means to imply completion of all milestones:
        let updatesToSend: Partial<Project> = {};
        if (newStatus === 'Completed') {
            const updatedRoadmap = (projectToUpdate.roadmap || []).map(milestone => ({
                ...milestone,
                status: MilestoneStatus.COMPLETED
            }));
            updatesToSend.roadmap = updatedRoadmap;
        } 
        // If newStatus is not 'Completed' but some other direct status,
        // you would need a dedicated `status` field in your `Project` interface
        // and backend API to support it. For now, we'll only handle 'Completed' via roadmap.
        // If the UI is just showing a custom status, without backend update:
        // You could just optimistically update the UI and not call the API.
        // But assuming you want a backend effect:

        // Optimistic update of the main projects list for all derived properties
        setProjects(prevProjects => {
            return prevProjects.map(p => {
                if (p.id === projectId) {
                    const tempProjectForCalc: Project = { 
                        ...p, 
                        // Apply optimistic changes to roadmap if it was part of the update
                        roadmap: newStatus === 'Completed' ? updatesToSend.roadmap : p.roadmap 
                    }; 
                    // Recalculate full display data locally for optimistic update
                    const { overallStatus: recalculatedStatus, progress: recalculatedProgress } = 
                        // Must be synchronous for optimistic, or simplified.
                        // For a full refresh, loadData() is better.
                        // For this direct update, only update the status field if it's not derived, 
                        // or trigger full loadData.
                        // The safest approach for `onUpdateStatus` that *doesn't* directly map to roadmap is to force a loadData.
                        // If it *does* map to roadmap, then construct the roadmap update here.
                        { overallStatus: newStatus, progress: (newStatus === 'Completed' ? 100 : p.progress) }; // Simplified optimistic

                    return { 
                        ...p, 
                        overallStatus: recalculatedStatus, 
                        progress: recalculatedProgress 
                    };
                }
                return p;
            });
        });
        console.log(`[Projects] Optimistically updated project ${projectId} overall status to ${newStatus}.`);

        try {
            if (Object.keys(updatesToSend).length > 0) { // Only call API if there are actual Project field updates
                await DataService.updateProject(
                    projectId,
                    projectToUpdate.timestamp,
                    updatesToSend // Send the actual Project fields to update
                );
                showToast(`Project status updated to ${newStatus} successfully!`, 'success');
                await loadData(); // Full reload to ensure all derived properties are refreshed
            } else {
                // If newStatus couldn't be mapped to a backend update,
                // perhaps it's a display-only status change or an invalid one.
                showToast(`Project status changed to ${newStatus} (display only).`, 'info');
                // Even for display-only, a full reload might be needed to re-evaluate all state.
                await loadData(); 
            }
        } catch (error) {
            console.error('[Projects] Failed to update project status:', error instanceof Error ? error.message : error);
            showToast(`Failed to update project status: ${error instanceof Error ? error.message : 'An unknown error occurred'}.`, 'error');
            await loadData(); // Revert optimistic update by reloading
        }
    }, [projects, loadData, showToast]);


    const handleUpdateMilestoneStatus = useCallback(async (projectId: string, milestoneId: string, newStatus: TaskStatus) => {
        const projectToUpdate = projects.find(p => p.id === projectId);
        if (!projectToUpdate || !projectToUpdate.roadmap || !projectToUpdate.timestamp) {
            showToast('Failed to update roadmap: Project, roadmap, or timestamp not found.', 'error');
            return;
        }

        const mappedNewStatus: MilestoneStatus =
            newStatus === TaskStatus.COMPLETED ? MilestoneStatus.COMPLETED :
            newStatus === TaskStatus.IN_PROGRESS ? MilestoneStatus.IN_PROGRESS :
            newStatus === TaskStatus.ON_HOLD ? MilestoneStatus.ON_HOLD :
            MilestoneStatus.PENDING;

        const updatedRoadmap = projectToUpdate.roadmap.map(ms =>
            ms.id === milestoneId ? { ...ms, status: mappedNewStatus } : ms
        );

        // Optimistically update the roadmap status in the UI (within the modal and list)
        setProjects(prevProjects => {
            return prevProjects.map(p => {
                if (p.id === projectId) {
                    // Only update the roadmap portion for optimistic update
                    // Derived properties will be fully re-calculated after loadData()
                    return { ...p, roadmap: updatedRoadmap }; 
                }
                return p;
            });
        });
        console.log(`[Projects] Optimistically updated milestone ${milestoneId} in project ${projectId} to ${mappedNewStatus}.`);

        try {
            await DataService.updateProject(
                projectId,
                projectToUpdate.timestamp,
                { roadmap: updatedRoadmap }
            );
            
            showToast('Roadmap updated successfully!', 'success');
            // CRITICAL: After a successful update, perform a FULL reload via loadData()
            // This ensures all derived properties for ALL projects are re-evaluated from the latest backend data.
            await loadData(); 

        } catch (error) {
            console.error('[Projects] Failed to update roadmap milestone:', error instanceof Error ? error.message : error);
            showToast(`Failed to update roadmap: ${error instanceof Error ? error.message : 'An unknown error occurred'}. Please try again.`, 'error');

            // On error, revert by performing a full reload to get the true state from the backend.
            await loadData(); 
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
                        {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Managers</option>
                        {allManagers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assigned Managers</th>
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
                                        <p className="text-slate-900 whitespace-no-wrap">{project.managerNames}</p>
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
                                                    setRoadmapProjectId(project.id);
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


            {/* MODAL FOR CREATE/EDIT PROJECT */}
            <Modal title={editingProject ? "Edit Project" : "Create New Project"} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSaveProject} className="space-y-3 text-sm">
                    {/* 1. Project Name */}
                    <Input
                        id="newProjectName"
                        label="Project Name"
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                        className="py-1"
                        labelClassName="text-sm"
                    />

                    {/* 2. Company */}
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                        <select
                            id="company"
                            value={newProjectCompanyId}
                            onChange={(e) => setNewProjectCompanyId(e.target.value)}
                            className="mt-1 block w-full pl-2 pr-8 py-1.5 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
                            required
                        >
                            <option value="">Select Company</option>
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Departments (Filtered by Company) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Departments</label>
                        {filteredDepartments.length === 0 && newProjectCompanyId ? (
                            <p className="text-xs text-slate-500">No departments found for the selected company.</p>
                        ) : filteredDepartments.length === 0 && !newProjectCompanyId ? (
                            <p className="text-xs text-slate-500">Select a company to see departments.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 border border-slate-300 rounded-md p-2 text-sm max-h-40 overflow-y-auto">
                                {filteredDepartments.map(dept => (
                                    <div key={dept.id} className="flex items-center">
                                        <input
                                            id={`dept-${dept.id}`}
                                            type="checkbox"
                                            checked={assignedDeptIds.includes(dept.id)}
                                            onChange={() => handleDeptToggle(dept.id)}
                                            className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`dept-${dept.id}`} className="ml-1.5 block text-xs text-slate-800">
                                            {dept.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Manager (Filtered by Selected Departments) - NOW MULTI-SELECT */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign Managers</label>
                        {filteredManagers.length === 0 && assignedDeptIds.length > 0 ? (
                            <p className="text-xs text-red-600 mt-1">No managers found for the selected departments.</p>
                        ) : filteredManagers.length === 0 && !newProjectCompanyId ? (
                            <p className="text-xs text-slate-500 mt-1">Select company and departments to see managers.</p>
                        ) : filteredManagers.length === 0 && newProjectCompanyId && assignedDeptIds.length === 0 ? (
                            <p className="text-xs text-slate-500 mt-1">Select at least one department to see managers.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 border border-slate-300 rounded-md p-2 text-sm max-h-40 overflow-y-auto">
                                {filteredManagers.map(manager => (
                                    <div key={manager.id} className="flex items-center">
                                        <input
                                            id={`manager-${manager.id}`}
                                            type="checkbox"
                                            checked={assignedManagerIds.includes(manager.id)}
                                            onChange={() => handleManagerToggle(manager.id)} // Use the new toggle handler
                                            className="h-3.5 w-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`manager-${manager.id}`} className="ml-1.5 block text-xs text-slate-800">
                                            {manager.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                        {assignedManagerIds.length === 0 && assignedDeptIds.length > 0 && (
                            <p className="text-xs text-red-600 mt-1">At least one manager must be assigned.</p>
                        )}
                    </div>

                    {/* 5. Deadline, Priority, Estimated Time - Grouped in a grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            id="newProjectDeadline"
                            label="Deadline"
                            type="date"
                            value={newProjectDeadline}
                            onChange={(e) => setNewProjectDeadline(e.target.value)}
                            className="py-1"
                            labelClassName="text-sm"
                        />
                        <div>
                            <label htmlFor="newProjectPriority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select
                                id="newProjectPriority"
                                value={newProjectPriority}
                                onChange={(e) => setNewProjectPriority(e.target.value as 'low' | 'medium' | 'high')}
                                className="mt-1 block w-full pl-2 pr-8 py-1.5 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm"
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
                            className="py-1"
                            labelClassName="text-sm"
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
                            className="mt-1 appearance-none block w-full px-2 py-1.5 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>

                    <div className="pt-2 flex justify-end space-x-2">
                        <button type="button" onClick={handleCloseModal} className="px-3 py-1.5 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit" className="px-3 py-1.5 text-sm">
                            {editingProject ? "Save Changes" : "Create Project"}
                        </Button>
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
                    onClose={handleCloseRoadmapModal}
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