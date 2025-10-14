import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Project, User, UserRole, TaskStatus, Department, Company } from '../../types';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Modal from '../shared/Modal';
import ViewSwitcher from '../shared/ViewSwitcher';
import ProjectCard from './ProjectCard';
import ProjectRoadmap from './ProjectRoadmap';

interface ProjectDisplayData extends Project {
    managerName: string;
    progress: number;
    departmentNames: string;
    companyName: string;
}

const Projects: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ProjectDisplayData[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [view, setView] = useState<'table' | 'card'>('table');
    const [viewingRoadmapFor, setViewingRoadmapFor] = useState<Project | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    // Form state
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectCompanyId, setNewProjectCompanyId] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');
    const [assignedManagerId, setAssignedManagerId] = useState('');
    const [newProjectDeadline, setNewProjectDeadline] = useState('');
    const [assignedDeptIds, setAssignedDeptIds] = useState<string[]>([]);
    const [newProjectPriority, setNewProjectPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newProjectEstTime, setNewProjectEstTime] = useState('');


    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allProjects, allUsers, depts, allCompanies] = await Promise.all([
                DataService.getAllProjects(),
                AuthService.getUsers(),
                DataService.getDepartments(),
                DataService.getCompanies() // This is still mock data
            ]);

            const managerList = allUsers.filter(u => u.role === UserRole.MANAGER);
            
            setDepartments(depts);
            setCompanies(allCompanies);
            setManagers(managerList);

            if (managerList.length > 0) {
                setAssignedManagerId(user?.id || managerList[0].id);
            }
            if (allCompanies.length > 0) {
                setNewProjectCompanyId(allCompanies[0].id);
            }

            const projectsWithDetails = await Promise.all(allProjects.map(async p => {
                const manager = allUsers.find(u => u.id === p.managerId);
                const projectTasks = await DataService.getTasksByProject(p.id);
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                const departmentNames = p.departmentIds.map(id => depts.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                const company = allCompanies.find(c => c.id === p.companyId);

                return {
                    ...p,
                    managerName: manager?.name || 'Unassigned',
                    progress,
                    departmentNames,
                    companyName: company?.name || 'N/A',
                };
            }));

            setProjects(projectsWithDetails);
        } catch (error) {
            console.error("Failed to load project data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const companyMatch = companyFilter === 'all' || project.companyId === companyFilter;
            const departmentMatch = departmentFilter === 'all' || project.departmentIds.includes(departmentFilter);
            const managerMatch = managerFilter === 'all' || project.managerId === managerFilter;
            const searchMatch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            return companyMatch && departmentMatch && managerMatch && searchMatch;
        });
    }, [projects, searchTerm, companyFilter, departmentFilter, managerFilter]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
        if (managers.length > 0) {
            setAssignedManagerId(user?.id || managers[0].id);
        }
         if (companies.length > 0) {
            setNewProjectCompanyId(companies[0].id);
        }
        setNewProjectDeadline('');
        setAssignedDeptIds([]);
        setNewProjectPriority('medium');
        setNewProjectEstTime('');
    };

    const handleDeptToggle = (deptId: string) => {
        setAssignedDeptIds(prev => {
            const newIds = new Set(prev);
            if (newIds.has(deptId)) newIds.delete(deptId);
            else newIds.add(deptId);
            return Array.from(newIds);
        });
    };

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim() || !assignedManagerId || !newProjectCompanyId) {
            alert('Project name, assigned manager, and company are required.');
            return;
        }

        DataService.createProject({
            name: newProjectName,
            description: newProjectDesc,
            managerId: assignedManagerId,
            departmentIds: assignedDeptIds,
            deadline: newProjectDeadline,
            priority: newProjectPriority,
            estimatedTime: newProjectEstTime ? parseInt(newProjectEstTime, 10) : undefined,
            companyId: newProjectCompanyId,
        });

        loadData(); // Refresh the list
        handleCloseModal();
    };

    if (!user || ![UserRole.ADMIN, UserRole.MANAGER, UserRole.HR].includes(user.role)) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div>Loading projects...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Projects</h1>
                {[UserRole.ADMIN, UserRole.MANAGER, UserRole.HR].includes(user.role) && (
                    <Button onClick={handleOpenModal}>Create New Project</Button>
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
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingRoadmapFor(project);
                                            }}
                                            className="px-3 py-1 text-xs font-medium rounded-md bg-white text-slate-700 hover:bg-slate-100 transition-colors border border-slate-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!project.roadmap || project.roadmap.length === 0}
                                        >
                                            View Roadmap
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(project => (
                        <ProjectCard key={project.id} project={project} progress={project.progress} departmentNames={project.departmentNames} companyName={project.companyName} />
                    ))}
                </div>
            )}


            <Modal title="Create New Project" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateProject} className="space-y-6">
                    <Input
                        id="newProjectName"
                        label="Project Name"
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                    />
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
                    <div>
                        <label htmlFor="newProjectDesc" className="block text-sm font-medium text-slate-700">
                            Description
                        </label>
                        <textarea
                            id="newProjectDesc"
                            value={newProjectDesc}
                            onChange={(e) => setNewProjectDesc(e.target.value)}
                            rows={3}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    {user?.role !== UserRole.MANAGER && (
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
                        label="Estimated Time (hours)"
                        type="number"
                        value={newProjectEstTime}
                        onChange={(e) => setNewProjectEstTime(e.target.value)}
                        min="0"
                    />
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
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">Create Project</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal
                title={`Roadmap for "${viewingRoadmapFor?.name}"`}
                isOpen={!!viewingRoadmapFor}
                onClose={() => setViewingRoadmapFor(null)}
            >
                {viewingRoadmapFor?.roadmap && viewingRoadmapFor.roadmap.length > 0 ? (
                    <ProjectRoadmap roadmap={viewingRoadmapFor.roadmap} />
                ) : (
                    <p className="text-center text-slate-500 py-8">No roadmap has been defined for this project.</p>
                )}
            </Modal>
        </div>
    );
};

export default Projects;

// project from pz
// types.ts from pz 
