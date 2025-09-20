import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService'; // DataService is where getProjectById is assumed to be
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole, Department, ProjectMilestone, MilestoneStatus, Company } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import TaskCard from '../tasks/TaskCard';
import { BuildingOfficeIcon, UsersIcon } from '../../constants';
import RoadmapBuilderModal from './RoadmapBuilderModal';
import ProjectRoadmap from './ProjectRoadmap';

// REVERTED: UPDATE_PROJECT_API_BASE_URL now includes {id} as a placeholder,
// because your testing indicates the backend *requires* it in the URL path.
const UPDATE_PROJECT_API_BASE_URL = 'https://ikwfgdgtzk.execute-api.ap-south-1.amazonaws.com/udt/updt-project/{id}';


const ProjectDetail: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assignableEmployees, setAssignableEmployees] = useState<User[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
    const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);

    // Form state for new tasks
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskEstTime, setNewTaskEstTime] = useState('');

    const parseApiResponse = async (response: Response) => {
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch (e) {
                // If it's not JSON, use the raw text
            }
            throw new Error(errorMessage);
        }
        const data = await response.json();
        if (typeof data.body === 'string') {
            try {
                return JSON.parse(data.body);
            } catch (e) {
                console.error("Failed to parse API response body:", e);
                return data.body;
            }
        }
        return data;
    };

    const loadData = useCallback(async () => {
        if (!projectId || !user) return;
        setIsLoading(true);
        try {
            // This relies on DataService.getProjectById(projectId) to return FRESH data
            // If it's returning stale data, the fix needs to be in DataService.ts
            const currentProject = await DataService.getProjectById(projectId);
            if (!currentProject) {
                setProject(null);
                return;
            }

            const projectWithEnsuredCreatedAt: Project = {
                ...currentProject,
                createdAt: currentProject.createdAt || new Date().toISOString(),
            };
            setProject(projectWithEnsuredCreatedAt); // Update the component's project state with the fresh data

            const [
                projectCompany,
                projectTasks,
                allCompanyUsers,
                allDepts
            ] = await Promise.all([
                DataService.getCompanyById(projectWithEnsuredCreatedAt.companyId),
                DataService.getTasksByProject(projectId),
                AuthService.getUsers(),
                DataService.getDepartments()
            ]);

            console.log("[ProjectDetail] Fetched tasks:", projectTasks);
            setCompany(projectCompany || null);
            setTasks(projectTasks);

            const allEmployees = allCompanyUsers.filter(u => u.role === UserRole.EMPLOYEE && u.companyId === projectWithEnsuredCreatedAt.companyId);
            setAssignableEmployees(allEmployees);

            if (allEmployees.length > 0 && newAssigneeId === undefined) {
                 setNewAssigneeId(allEmployees[0].id);
            }

            setDepartments(allDepts);

        } catch (error) {
            console.error("Failed to load project details:", error);
            // Consider showing a toast/alert for the user here as well
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user, newAssigneeId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const tasksByStatus = useMemo(() => {
        const categorized = tasks.reduce((acc, task) => {
            if (!acc[task.status]) {
                acc[task.status] = [];
            }
            acc[task.status].push(task);
            return acc;
        }, {} as Record<TaskStatus, Task[]>);
        console.log("[ProjectDetail] Tasks by Status:", categorized);
        return categorized;
    }, [tasks]);

    const handleOpenModal = () => setIsTaskModalOpen(true);
    const handleCloseModal = () => {
        setIsTaskModalOpen(false);
        setNewTaskName('');
        setNewTaskDesc('');
        setNewTaskDueDate('');
        if (assignableEmployees.length > 0) {
            setNewAssigneeId(assignableEmployees[0].id);
        } else {
            setNewAssigneeId(undefined);
        }
        setNewTaskPriority('medium');
        setNewTaskEstTime('');
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName.trim() || !projectId) {
            alert("Task title and project ID are required.");
            return;
        }
        if (!user || !user.id) {
            alert("User not logged in or ID missing.");
            return;
        }

        try {
            await DataService.createTask({
                name: newTaskName,
                description: newTaskDesc,
                dueDate: newTaskDueDate || undefined,
                projectId,
                assigneeId: newAssigneeId,
                status: TaskStatus.TODO,
                priority: newTaskPriority,
                estimatedTime: newTaskEstTime ? parseInt(newTaskEstTime, 10) : undefined,
                creatorId: user.id
            });

            loadData();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to create task:", error);
            alert("Could not create task. Please try again.");
        }
    };


    const handleSaveRoadmap = async (newRoadmap: ProjectMilestone[]) => {
        if (!project || !project.id || !project.createdAt) {
            console.error("Cannot save roadmap: Project object, ID, or creation timestamp (project.createdAt) is missing.");
            alert("Error: Cannot save roadmap. Project data is incomplete.");
            return;
        }

        setIsSavingRoadmap(true);
        try {
            const requestBodyForLambda = {
                id: project.id,
                timestamp: project.createdAt,
                updateFields: {
                    roadmap: newRoadmap
                }
            };

            console.log(`[ProjectDetail] Attempting to update project roadmap for ${project.id}.`);
            const token = AuthService.getToken();

            // Use .replace() to insert the actual projectId into the URL path.
            const response = await fetch(UPDATE_PROJECT_API_BASE_URL.replace('{id}', project.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(requestBodyForLambda),
            });

            const result = await parseApiResponse(response);
            console.log("Roadmap saved successfully:", result);

            await loadData(); // Await loadData to ensure project state is fully updated
            setIsRoadmapModalOpen(false);
        } catch (error: any) {
            console.error("Failed to save roadmap:", error);
            alert(`Could not save roadmap. Please try again. Error: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSavingRoadmap(false);
        }
    };

    const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: MilestoneStatus) => {
        if (!project || !project.roadmap || !project.id || !project.createdAt) {
            console.error("Cannot update milestone status: Project object, roadmap, ID, or creation timestamp (project.createdAt) is missing.");
            alert("Error: Cannot update milestone status. Project data is incomplete.");
            return;
        }

        const newRoadmap = project.roadmap.map(ms =>
            ms.id === milestoneId ? { ...ms, status: newStatus } : ms
        );

        setIsSavingRoadmap(true);
        try {
            const requestBodyForLambda = {
                id: project.id,
                timestamp: project.createdAt,
                updateFields: {
                    roadmap: newRoadmap
                }
            };

            console.log(`[ProjectDetail] Attempting to update milestone status for project ${project.id}.`);
            const token = AuthService.getToken();

            // Use .replace() to insert the actual projectId into the URL path.
            const response = await fetch(UPDATE_PROJECT_API_BASE_URL.replace('{id}', project.id), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(requestBodyForLambda),
            });

            const result = await parseApiResponse(response);
            console.log("Milestone status updated successfully:", result);

            await loadData(); // Await loadData for full state update
        } catch (error: any) {
            console.error("Failed to update milestone status:", error);
            alert(`Could not update milestone status. Please try again. Error: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSavingRoadmap(false);
        }
    };

    const handleAssigneeChange = async (taskId: string, newAssigneeId?: string) => {
        if (!projectId) return;

        try {
            await DataService.updateTask(taskId, { assigneeId: newAssigneeId });
            loadData();
        } catch (error) {
            console.error("Failed to update task assignee:", error);
            alert("Could not update task assignee. Please try again.");
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
        if (!projectId) return;

        try {
            await DataService.updateTask(taskId, { status: newStatus });
            loadData(); // Reload data to reflect the status change
        } catch (error) {
            console.error("Failed to update task status:", error);
            alert("Could not update task status. Please try again.");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            await DataService.deleteTask(taskId);
            loadData();
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert("Could not delete task. Please try again.");
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading project details...</div>;
    }

    if (!project) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-700">Project Not Found</h2>
                <p className="text-slate-500 mt-2">The project you are looking for does not exist.</p>
                <Link to="/projects" className="mt-4 inline-block">
                    <Button>Back to Projects</Button>
                </Link>
            </div>
        );
    }

    const isAuthorized = user?.role === UserRole.ADMIN || (user?.role === UserRole.MANAGER && user.id === project.managerId);
    if (!isAuthorized) {
         return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-slate-500 mt-2">You are not authorized to view the details of this project.</p>
                <Link to="/projects" className="mt-4 inline-block">
                    <Button>Back to Projects</Button>
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{project.name}</h1>
                    <div className="flex items-center space-x-6 mt-2 text-sm text-slate-600">
                        {company && (
                            <div className="flex items-center space-x-2">
                                <BuildingOfficeIcon className="w-5 h-5" />
                                <span>{company.name}</span>
                            </div>
                        )}
                        {departments.length > 0 && (
                             <div className="flex items-center space-x-2">
                                <UsersIcon className="w-5 h-5" />
                                <span>{project.departmentIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-600 mt-2 max-w-2xl">{project.description}</p>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                    <Button onClick={() => setIsRoadmapModalOpen(true)} disabled={isSavingRoadmap}>
                        {isSavingRoadmap ? 'Saving...' : 'Build Roadmap'}
                    </Button>
                    <Button onClick={handleOpenModal}>Create New Task</Button>
                </div>
            </div>

            {/* ProjectRoadmap component now receives the 'roadmap' prop directly */}
            {project.roadmap && project.roadmap.length > 0 ? (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Project Roadmap</h2>
                    <ProjectRoadmap roadmap={project.roadmap} onUpdate={handleUpdateMilestoneStatus} />
                </div>
            ) : ( // If roadmap is empty or undefined, show "No roadmap defined"
                <p className="text-center text-slate-500 py-8">No roadmap has been defined for this project.</p>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(TaskStatus).map(status => (
                    <div key={status} className="bg-slate-100 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-700 mb-4 border-b-2 pb-2">{status} ({tasksByStatus[status]?.length || 0})</h3>
                        <div className="space-y-4">
                            {(tasksByStatus[status] || []).map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    employees={assignableEmployees}
                                    onAssigneeChange={handleAssigneeChange}
                                    onStatusChange={handleUpdateTaskStatus}
                                    onDelete={handleDeleteTask}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <Modal title="Create New Task" isOpen={isTaskModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateTask} className="space-y-4">
                    <Input id="taskName" type="text" label="Task Title" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} required />
                    <div>
                        <label htmlFor="taskDescription" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="taskDescription" rows={3} value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}
                            className="mt-1 appearance-none block w-full w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <Input id="dueDate" type="date" label="Due Date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="estTime" type="number" label="Est. Time (hours)" value={newTaskEstTime} onChange={e => setNewTaskEstTime(e.target.value)} min="0" />
                    </div>
                    <div>
                        <label htmlFor="assignee" className="block text-sm font-medium text-slate-700">Assign To</label>
                        <select id="assignee" value={newAssigneeId || ''} onChange={e => setNewAssigneeId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                            <option value="">Unassigned</option>
                            {assignableEmployees.map(employee => (
                                <option key={employee.id} value={employee.id}>{employee.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                         <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">Create Task</Button>
                    </div>
                </form>
            </Modal>

            <RoadmapBuilderModal
                isOpen={isRoadmapModalOpen}
                onClose={() => setIsRoadmapModalOpen(false)}
                project={project}
                onSave={handleSaveRoadmap}
                isSaving={isSavingRoadmap}
            />
        </div>
    );
};

export default ProjectDetail;