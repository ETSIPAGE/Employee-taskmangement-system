import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, Task, TaskStatus, User, UserRole, Department, ProjectMilestone, MilestoneStatus, Company } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import TaskCard from '../tasks/TaskCard';
import { BuildingOfficeIcon, UsersIcon } from '../../constants';
import RoadmapBuilderModal from './RoadmapBuilderModal';
import ProjectRoadmap from './ProjectRoadmap';

interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const Toast: React.FC<{ message: ToastMessage; onClose: (id: string) => void }> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(message.id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [message.id, onClose]);

    const bgColor = message.type === 'success' ? 'bg-green-500' : message.type === 'error' ? 'bg-red-500' : 'bg-blue-500';

    return (
        <div className={`fixed bottom-4 right-4 p-3 rounded-md shadow-lg text-white ${bgColor} flex items-center space-x-2 z-50`}>
            <span>{message.message}</span>
            <button onClick={() => onClose(message.id)} className="ml-2 font-bold">
                &times;
            </button>
        </div>
    );
};

export interface ProjectDisplayData extends Project {
    overallStatus: string;
    progress: number;
    managerNames?: string; // Not currently used, but kept for future if needed
    departmentNames?: string; // Not currently used, but kept for future if needed
    companyName?: string; // Not currently used, but kept for future if needed
}

const ProjectDetail: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { user } = useAuth();

    const [project, setProject] = useState<ProjectDisplayData | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [assignableEmployees, setAssignableEmployees] = useState<User[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
    const [isSavingRoadmap, setIsSavingRoadmap] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const [newTaskData, setNewTaskData] = useState({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium' as 'low' | 'medium' | 'high',
        est_time: '',
        assign_to: '' // This will temporarily hold a single assignee ID
    });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ id: Date.now().toString(), message, type });
    }, []);

    const hideToast = useCallback((id: string) => {
        setToast(prevToast => (prevToast && prevToast.id === id ? null : prevToast));
    }, []);

    const calculateProjectStatus = useCallback((currentProject: Project, currentTasks: Task[]): { overallStatus: string; progress: number } => {
        let progress = 0;
        let overallStatus: string = 'Pending';

        if (currentProject.roadmap && currentProject.roadmap.length > 0) {
            const totalMilestones = currentProject.roadmap.length;
            const completedMilestones = currentProject.roadmap.filter(
                (m) => m.status === MilestoneStatus.COMPLETED
            ).length;
            const inProgressMilestones = currentProject.roadmap.filter(
                (m) => m.status === MilestoneStatus.IN_PROGRESS
            ).length;
            const onHoldMilestones = currentProject.roadmap.filter(
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
            // Fallback to tasks if no roadmap or empty roadmap
            const completedTasks = currentTasks.filter(
                (t) => t.status === TaskStatus.COMPLETED
            ).length;
            const totalTasks = currentTasks.length;

            progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            if (progress === 100) {
                overallStatus = 'Completed';
            } else if (progress > 0) {
                overallStatus = 'In Progress';
            } else {
                overallStatus = 'Pending';
            }
        }

        if (overallStatus !== 'Completed' && currentProject.deadline && new Date(currentProject.deadline) < new Date()) {
            overallStatus = 'Overdue';
        }
        return { overallStatus, progress };
    }, []); 


    const loadData = useCallback(async () => {
        if (!projectId || !user) return;
        setIsLoading(true);
        try {
            // Fetch project details
            const currentProject = await DataService.getProjectById(projectId);
            if (!currentProject) {
                setProject(null);
                showToast("Project not found.", "error");
                return;
            }

            // Fetch tasks for the project
            const projectTasks = await DataService.getAllTasks(); // Fetch all tasks
            const filteredProjectTasks = projectTasks.filter(task => task.projectId === projectId); // Filter them
            setTasks(filteredProjectTasks); // Update tasks state with fresh data

            // Calculate status and progress using the freshly fetched project and tasks
            const { overallStatus, progress } = calculateProjectStatus(currentProject, filteredProjectTasks);

            // Set the project state with all necessary display data
            const projectWithDisplayData: ProjectDisplayData = {
                ...currentProject,
                timestamp: currentProject.timestamp || new Date().toISOString(), // Ensure timestamp is always present
                roadmap: currentProject.roadmap ? [...currentProject.roadmap] : [],
                overallStatus,
                progress,
            };
            setProject(projectWithDisplayData);

            // Fetch other related data
            const [
                projectCompany,
                allUsers, 
                allDepts
            ] = await Promise.all([
                DataService.getCompanyById(projectWithDisplayData.companyId),
                DataService.getUsers(), 
                DataService.getDepartments()
            ]);

            setCompany(projectCompany || null);
            
            const employeesInProjectCompany = allUsers.filter(u => 
                u.role === UserRole.EMPLOYEE && 
                u.companyId === projectWithDisplayData.companyId
            );
            setAssignableEmployees(employeesInProjectCompany);

            // Set default assignee for new task if not already set
            if (employeesInProjectCompany.length > 0 && !newTaskData.assign_to) {
                 setNewTaskData(prev => ({...prev, assign_to: employeesInProjectCompany[0].id}));
            }
            setDepartments(allDepts);

        } catch (error) {
            console.error("Failed to load project details:", error);
            showToast("Failed to load project details.", "error");
            setProject(null);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user, showToast, calculateProjectStatus, newTaskData.assign_to]); 


    useEffect(() => {
        loadData();
    }, [loadData]); // This effect triggers loadData on mount and when loadData itself changes

    const tasksByStatus = useMemo(() => {
        const categorized = tasks.reduce((acc, task) => {
            if (!acc[task.status]) {
                acc[task.status] = [];
            }
            acc[task.status].push(task);
            return acc;
        }, {} as Record<TaskStatus, Task[]>);
        return categorized;
    }, [tasks]);

    const handleOpenModal = () => setIsTaskModalOpen(true);
    const handleCloseModal = () => {
        setIsTaskModalOpen(false);
        setNewTaskData({
            title: '',
            description: '',
            due_date: '',
            priority: 'medium',
            est_time: '',
            assign_to: assignableEmployees.length > 0 ? assignableEmployees[0].id : ''
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskData.title.trim() || !projectId || !user) {
            showToast("Task title and project ID are required.", "error");
            return;
        }

        try {
            await DataService.createTask({
                name: newTaskData.title,
                description: newTaskData.description,
                dueDate: newTaskData.due_date || undefined,
                projectId,
                assigneeIds: newTaskData.assign_to ? [newTaskData.assign_to] : [], // Wrap in array
                status: TaskStatus.TODO,
                priority: newTaskData.priority,
                estimatedTime: newTaskData.est_time ? parseInt(newTaskData.est_time, 10) : undefined,
                assign_by: user.id
            });

            showToast("Task created successfully!", "success");
            await loadData(); // Full reload to get fresh tasks and recalculate project status
            handleCloseModal();
        } catch (error) {
            console.error("Failed to create task:", error);
            showToast("Could not create task. Please try again.", "error");
        }
    };


    const handleSaveRoadmap = async (newRoadmap: ProjectMilestone[]) => {
        if (!project || !project.id || !project.timestamp) {
            console.error("Cannot save roadmap: Project object, ID, or timestamp is missing.");
            showToast("Error: Cannot save roadmap. Project data is incomplete.", "error");
            return;
        }

        setIsSavingRoadmap(true);
        try {
            await DataService.updateProject(
                project.id,
                project.timestamp, 
                { roadmap: newRoadmap }
            );

            showToast("Roadmap updated successfully!", "success");
            setIsRoadmapModalOpen(false);
            await loadData(); // FULL RELOAD after successful update

        } catch (error: any) {
            console.error("Failed to save roadmap:", error);
            showToast(`Could not save roadmap. Error: ${error.message || 'Unknown error'}`, "error");
            if (error.message.includes("Project data out of sync")) {
                await loadData(); 
            }
        } finally {
            setIsSavingRoadmap(false);
        }
    };

    const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: MilestoneStatus) => {
        if (!project || !project.roadmap || !project.id || !project.timestamp) {
            console.error("Cannot update milestone status: Project object, roadmap, ID, or timestamp is missing.");
            showToast("Error: Cannot update milestone status. Project data is incomplete.", "error");
            return;
        }

        // Store for potential revert (though full reload handles this implicitly on error)
        // const originalRoadmap = project.roadmap; 

        const updatedRoadmap = project.roadmap.map(ms =>
            ms.id === milestoneId ? { ...ms, status: newStatus } : ms
        );

        // Optimistic update for UI: apply changes immediately
        setProject(prevProject => {
            if (!prevProject) return null;
            // Create a temporary Project object with the updated roadmap for calculation
            const tempProjectForCalc: Project = { ...prevProject, roadmap: updatedRoadmap };
            const { overallStatus, progress } = calculateProjectStatus(tempProjectForCalc, tasks); // Use current tasks state
            return {
                ...prevProject,
                roadmap: updatedRoadmap, // Update the roadmap in state
                overallStatus,          // Update calculated overall status
                progress,               // Update calculated progress
            };
        });
        showToast("Updating milestone status...", "info");

        setIsSavingRoadmap(true);
        try {
            await DataService.updateProject(
                project.id,
                project.timestamp, 
                { roadmap: updatedRoadmap }
            );
            
            showToast("Milestone status updated!", "success");
            await loadData(); // FULL RELOAD after successful update

        } catch (error: any) {
            console.error("Failed to update milestone status:", error);
            showToast(`Could not update milestone status: ${error.message || 'Unknown error'}`, "error");
            
            // On error, revert optimistic UI by reloading old data from backend
            await loadData(); 
        } finally {
            setIsSavingRoadmap(false);
        }
    };

    const handleAssigneeChange = async (taskId: string, newAssigneeId?: string) => {
        if (!projectId || !user) return;

        try {
            // DataService.updateTask expects assigneeIds: string[]
            const assigneeIds = newAssigneeId ? [newAssigneeId] : []; 
            await DataService.updateTask(taskId, { assigneeIds: assigneeIds }, user.id); // FIXED: Changed to assigneeIds
            showToast("Task assignee updated!", "success");
            await loadData(); // Full reload to get fresh tasks and recalculate project status
        } catch (error) {
            console.error("Failed to update task assignee:", error);
            showToast("Could not update task assignee. Please try again.", "error");
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
        if (!projectId || !user) return;

        try {
            await DataService.updateTask(taskId, { status: newStatus }, user.id); 
            showToast("Task status updated!", "success");
            await loadData(); // Full reload to get fresh tasks and recalculate project status
        } catch (error) {
            console.error("Failed to update task status:", error);
            showToast("Could not update task status. Please try again.", "error");
        }
    };
    
    const handleRequestDelete = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            setTaskToDelete(task);
        }
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete || !user) return;
        try {
            await DataService.deleteTask(taskToDelete.id, user.id); 
            showToast("Task deleted successfully!", "success");
            await loadData(); // Full reload to get fresh tasks and recalculate project status
        } catch (error) {
            console.error("Failed to delete task:", error);
            showToast(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        } finally {
            setTaskToDelete(null);
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
                {toast && <Toast message={toast} onClose={hideToast} />}
            </div>
        );
    }

    let isAuthorized = false;
    if (user) {
        if (user.role === UserRole.ADMIN) {
            isAuthorized = true;
        } else if (user.role === UserRole.MANAGER) {
            // A manager is authorized if they are one of the project's managers
            isAuthorized = project.managerIds?.includes(user.id) || false;
        } else if (user.role === UserRole.EMPLOYEE) {
            // An employee is authorized if they are assigned to any task in the project
            // OR if they are in a department associated with the project
            const isAssignedToTask = tasks.some(task => task.assigneeIds?.includes(user.id)); // FIXED: Check assigneeIds array
            const isInProjectDepartment = project.departmentIds && user.departmentIds && 
                                         project.departmentIds.some(projDeptId => user.departmentIds?.includes(projDeptId));
            isAuthorized = isAssignedToTask || isInProjectDepartment;
        } else if (user.role === UserRole.HR) {
            isAuthorized = true; // HR can view all projects
        }
    }


    if (!isAuthorized) {
         return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-slate-500 mt-2">You are not authorized to view the details of this project.</p>
                <Link to="/projects" className="mt-4 inline-block">
                    <Button>Back to Projects</Button>
                </Link>
                {toast && <Toast message={toast} onClose={hideToast} />}
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
                        {departments.length > 0 && project.departmentIds && (
                             <div className="flex items-center space-x-2">
                                <UsersIcon className="w-5 h-5" />
                                <span>{project.departmentIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ')}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-600 mt-2 max-w-2xl">{project.description}</p>
                    <div className="mt-4 flex items-center space-x-4">
                        <span className="text-slate-700 font-semibold">Status:</span>
                        <span className={`capitalize px-3 py-1 text-sm font-semibold rounded-full ${
                            project.overallStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                            project.overallStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            project.overallStatus === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                            project.overallStatus === 'Overdue' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                        }`}>
                            {project.overallStatus}
                        </span>
                        <span className="text-slate-700 font-semibold">Progress:</span>
                        <div className="flex items-center">
                            <div className="w-24 bg-slate-200 rounded-full h-2.5">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                            </div>
                            <span className="ml-2 text-sm text-slate-600 font-semibold">{project.progress}%</span>
                        </div>
                    </div>
                </div>
                {user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                    <div className="flex items-center space-x-3 flex-shrink-0">
                        <Button onClick={() => setIsRoadmapModalOpen(true)} disabled={isSavingRoadmap}>
                            {isSavingRoadmap ? 'Saving...' : 'Build Roadmap'}
                        </Button>
                        <Button onClick={handleOpenModal}>Create New Task</Button>
                    </div>
                )}
            </div>

            {project.roadmap && project.roadmap.length > 0 ? (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Project Roadmap</h2>
                    <ProjectRoadmap 
                        roadmap={project.roadmap} 
                        onUpdate={user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? handleUpdateMilestoneStatus : undefined} 
                    />
                </div>
            ) : (
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
                                    onAssigneeChange={user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? handleAssigneeChange : undefined}
                                    onStatusChange={handleUpdateTaskStatus}
                                    onDelete={user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? handleRequestDelete : undefined}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                <Modal title="Create New Task" isOpen={isTaskModalOpen} onClose={handleCloseModal}>
                    <form onSubmit={handleCreateTask} className="space-y-4">
                        <Input id="title" name="title" type="text" label="Task Title" value={newTaskData.title} onChange={handleInputChange} required />
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea id="description" name="description" rows={3} value={newTaskData.description} onChange={handleInputChange}
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                        <Input id="due_date" name="due_date" type="date" label="Due Date" value={newTaskData.due_date} onChange={handleInputChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                                <select id="priority" name="priority" value={newTaskData.priority} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <Input id="est_time" name="est_time" type="number" label="Est. Time (hours)" value={newTaskData.est_time} onChange={handleInputChange} min="0" />
                        </div>
                        <div>
                            <label htmlFor="assign_to" className="block text-sm font-medium text-slate-700">Assign To</label>
                            <select id="assign_to" name="assign_to" value={newTaskData.assign_to || ''} onChange={handleInputChange}
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
            )}

            {project && user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                <RoadmapBuilderModal
                    isOpen={isRoadmapModalOpen}
                    onClose={() => {
                        setIsRoadmapModalOpen(false);
                        // IMPORTANT: Always refresh after closing roadmap builder,
                        // even if no explicit save button clicked in case there were internal changes.
                        loadData(); 
                    }}
                    project={project}
                    onSave={handleSaveRoadmap}
                    isSaving={isSavingRoadmap}
                />
            )}
            
            {user && (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && (
                <Modal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    title="Confirm Task Deletion"
                >
                    <p className="text-slate-600">
                        Are you sure you want to delete the task "{taskToDelete?.name}"? This action cannot be undone.
                    </p>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={() => setTaskToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button onClick={handleConfirmDelete}>Delete Task</Button>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast} onClose={hideToast} />}
        </div>
    );
};

export default ProjectDetail;