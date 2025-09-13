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

    // Form state
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskEstTime, setNewTaskEstTime] = useState('');

    const loadData = useCallback(async () => {
        if (!projectId || !user) return;
        setIsLoading(true);
        try {
            const currentProject = await DataService.getProjectById(projectId);
            if (!currentProject) {
                setProject(null);
                return;
            }
            setProject(currentProject);

            const [
                projectTasks,
                allCompanyUsers,
                allDepts,
                currentCompany
            ] = await Promise.all([
                DataService.getTasksByProject(projectId),
                AuthService.getUsers(),
                DataService.getDepartments(),
                DataService.getCompanyById(currentProject.companyId)
            ]);
            
            setCompany(currentCompany || null);
            setTasks(projectTasks);
            
            const allEmployees = allCompanyUsers.filter(u => u.role === UserRole.EMPLOYEE);
            setAssignableEmployees(allEmployees);
            
            if (allEmployees.length > 0) {
                 setNewAssigneeId(allEmployees[0].id);
            }

            setDepartments(allDepts);

        } catch (error) {
            console.error("Failed to load project details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const tasksByStatus = useMemo(() => {
        return tasks.reduce((acc, task) => {
            if (!acc[task.status]) {
                acc[task.status] = [];
            }
            acc[task.status].push(task);
            return acc;
        }, {} as Record<TaskStatus, Task[]>);
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
        if (!newTaskName.trim() || !projectId) return;

        await DataService.createTask({
            title: newTaskName,
            description: newTaskDesc,
            due_date: newTaskDueDate,
            project: project?.name || projectId,
            assign_to: newAssigneeId,
            status: TaskStatus.TODO,
            priority: newTaskPriority,
            est_time: newTaskEstTime,
            department: project?.departmentIds[0] ? (await DataService.getDepartmentById(project.departmentIds[0]))?.name : ''
        });
        
        loadData(); // Refresh list
        handleCloseModal();
    };

    const handleSaveRoadmap = async (newRoadmap: ProjectMilestone[]) => {
        if (!project) return;
        await DataService.updateProject(project.id, { roadmap: newRoadmap });
        loadData(); // Refresh project data
        setIsRoadmapModalOpen(false);
    };

    const handleUpdateMilestoneStatus = async (milestoneId: string, newStatus: MilestoneStatus) => {
        if (!project || !project.roadmap) return;
        const newRoadmap = project.roadmap.map(ms =>
            ms.id === milestoneId ? { ...ms, status: newStatus } : ms
        );
        await DataService.updateProject(project.id, { roadmap: newRoadmap });
        loadData(); // Re-fetch to update state
    };
    
    const handleAssigneeChange = (taskId: string, newAssigneeId?: string) => {
        DataService.updateTask(taskId, { assigneeId: newAssigneeId });
        loadData();
    };

    const handleDeleteTask = (taskId: string) => {
        DataService.deleteTask(taskId);
        loadData();
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
                    <Button onClick={() => setIsRoadmapModalOpen(true)}>Build Roadmap</Button>
                    <Button onClick={handleOpenModal}>Create New Task</Button>
                </div>
            </div>

            {project.roadmap && project.roadmap.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Project Roadmap</h2>
                    <ProjectRoadmap roadmap={project.roadmap} onUpdate={handleUpdateMilestoneStatus} />
                </div>
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
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            
            {project && (
                <RoadmapBuilderModal
                    isOpen={isRoadmapModalOpen}
                    onClose={() => setIsRoadmapModalOpen(false)}
                    project={project}
                    onSave={handleSaveRoadmap}
                />
            )}
        </div>
    );
};

export default ProjectDetail;
