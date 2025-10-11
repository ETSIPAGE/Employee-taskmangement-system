// components/departments/Departments.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
// REMOVED: AuthService.getUsers() because DataService.getUsers() should be used consistently
import { Department, User, UserRole, Project, TaskStatus, Company, MilestoneStatus } from '../../types'; // Added MilestoneStatus
import { Navigate, useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { UsersIcon, BuildingOfficeIcon } from '../../constants';

interface DepartmentStats {
    employeeCount: number;
    managerCount: number;
    projectsCompleted: number;
    projectsInProgress: number;
    projectsPending: number;
    companyName: string;
}

interface DepartmentWithStats extends Department, DepartmentStats {}

const DepartmentCard: React.FC<{ department: DepartmentWithStats }> = ({ department }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            onClick={() => navigate(`/departments/${department.id}`)}
            className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
        >
            <div>
                <div className="mb-4 border-b pb-3">
                    <h3 className="text-xl font-bold text-slate-800">{department.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                        <BuildingOfficeIcon className="w-4 h-4" />
                        <span>{department.companyName}</span>
                    </div>
                </div>
                
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Team</h4>
                    <div className="flex items-center space-x-4 text-slate-700">
                        <div className="flex items-center space-x-2">
                             <UsersIcon className="h-5 w-5" />
                             <span className="font-medium">{department.employeeCount} Employees</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <UsersIcon className="h-5 w-5" />
                            <span className="font-medium">{department.managerCount} Managers</span>
                        </div>
                    </div>
                </div>

                 <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Projects</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Completed</span>
                            <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{department.projectsCompleted}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">In Progress</span>
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{department.projectsInProgress}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Pending</span>
                            <span className="font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{department.projectsPending}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Departments: React.FC = () => {
    const { user } = useAuth();
    const [departmentsWithStats, setDepartmentsWithStats] = useState<DepartmentWithStats[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentCompanyId, setNewDepartmentCompanyId] = useState('');

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch ALL necessary data in parallel
            const [allDepartments, allUsers, allProjects, allCompanies, allTasks] = await Promise.all([
                DataService.getDepartments(),
                DataService.getUsers(),      // Use DataService for consistency
                DataService.getAllProjects(),
                DataService.getCompanies(),
                DataService.getAllTasks(), // Fetch all tasks once
            ]);

            setCompanies(allCompanies);
            if (allCompanies.length > 0 && !newDepartmentCompanyId) { // Set default only if not already set
                setNewDepartmentCompanyId(allCompanies[0].id);
            }

            const statsPromises = allDepartments.map(async dept => {
                const departmentId = dept.id; // Use dept.id consistently

                // Filter users who belong to THIS department
                // Ensure u.departmentIds is an array before using .includes
                const deptUsers = allUsers.filter(u => u.departmentIds && u.departmentIds.includes(departmentId));
                
                // Filter projects associated with THIS department
                const deptProjects = allProjects.filter(p => p.departmentIds && p.departmentIds.includes(departmentId));
                
                const company = allCompanies.find(c => c.id === dept.companyId);

                let projectsCompleted = 0;
                let projectsInProgress = 0;
                let projectsPending = 0;
                
                deptProjects.forEach(project => {
                    let projectStatus: string = 'Pending'; // Default
                    
                    if (project.roadmap && project.roadmap.length > 0) {
                        const totalMilestones = project.roadmap.length;
                        const completedMilestones = project.roadmap.filter(m => m.status === MilestoneStatus.COMPLETED).length;
                        const inProgressMilestones = project.roadmap.filter(m => m.status === MilestoneStatus.IN_PROGRESS).length;
                        const onHoldMilestones = project.roadmap.filter(m => m.status === MilestoneStatus.ON_HOLD).length;

                        if (totalMilestones > 0) {
                            if (completedMilestones === totalMilestones) {
                                projectStatus = 'Completed';
                            } else if (onHoldMilestones > 0) {
                                projectStatus = 'On Hold';
                            } else if (inProgressMilestones > 0 || completedMilestones > 0) {
                                projectStatus = 'In Progress';
                            } else {
                                projectStatus = 'Pending';
                            }
                        }
                    } else {
                        // If no roadmap, derive status from tasks for this project
                        const projectTasks = allTasks.filter(task => task.projectId === project.id);
                        if (projectTasks.length === 0) {
                            // If no tasks and no roadmap, check deadline
                            if (project.deadline && new Date(project.deadline) < new Date()) {
                                projectStatus = 'Overdue';
                            } else {
                                projectStatus = 'Pending';
                            }
                        } else {
                            const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                            const totalTasks = projectTasks.length;
                            if (completedTasks === totalTasks) {
                                projectStatus = 'Completed';
                            } else if (completedTasks > 0) {
                                projectStatus = 'In Progress';
                            } else {
                                projectStatus = 'Pending';
                            }
                        }
                    }

                    // Final check for overdue, overriding other non-completed statuses
                    if (projectStatus !== 'Completed' && project.deadline && new Date(project.deadline) < new Date()) {
                        projectStatus = 'Overdue';
                    }

                    if (projectStatus === 'Completed') {
                        projectsCompleted++;
                    } else if (projectStatus === 'In Progress' || projectStatus === 'Overdue' || projectStatus === 'On Hold') {
                        projectsInProgress++; // Group Overdue and On Hold with In Progress for display
                    } else {
                        projectsPending++;
                    }
                });


                return {
                    ...dept,
                    employeeCount: deptUsers.filter(u => u.role === UserRole.EMPLOYEE).length,
                    managerCount: deptUsers.filter(u => u.role === UserRole.MANAGER).length,
                    projectsCompleted,
                    projectsInProgress,
                    projectsPending,
                    companyName: company?.name || 'N/A',
                };
            });

            const stats = await Promise.all(statsPromises);
            setDepartmentsWithStats(stats);
        } catch (error) {
            console.error("Failed to load department data:", error);
            // Optionally set an error toast
        } finally {
            setIsLoading(false);
        }
    }, [newDepartmentCompanyId]); // newDepartmentCompanyId is a dependency if it affects the initial selection logic

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredDepartments = useMemo(() => {
        return departmentsWithStats.filter(dept => {
            const companyMatch = companyFilter === 'all' || dept.companyId === companyFilter;
            const searchMatch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
            return companyMatch && searchMatch;
        });
    }, [searchTerm, companyFilter, departmentsWithStats]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewDepartmentName('');
        // Ensure the selected company is reset to default for new creation
        if (companies.length > 0) {
            setNewDepartmentCompanyId(companies[0].id);
        }
    };

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim() || !newDepartmentCompanyId) {
            alert('Department name and company are required.'); // Consider using the toast notification here
            return;
        }
        try {
            await DataService.createDepartment(newDepartmentName, newDepartmentCompanyId);
            await loadData(); // Reload data after creation
            handleCloseModal();
        } catch (error) {
            console.error("Error creating department:", error);
            alert(`Failed to create department: ${error instanceof Error ? error.message : String(error)}`); // Use toast
        }
    };

    if (user?.role !== UserRole.ADMIN) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div>Loading departments...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Departments</h1>
                <Button onClick={handleOpenModal}>Create New Department</Button>
            </div>
            
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Search by department name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <select
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="all">All Companies</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDepartments.map(dept => (
                    <DepartmentCard key={dept.id} department={dept} />
                ))}
            </div>
            
            {filteredDepartments.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Departments Found</h3>
                    <p className="text-slate-500 mt-2">No departments match your search or filter criteria.</p>
                </div>
            )}

            <Modal title="Create New Department" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateDepartment} className="space-y-6">
                    <Input
                        id="newDepartmentName"
                        label="Department Name"
                        type="text"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        required
                    />
                    <div>
                        <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                        <select
                            id="company"
                            value={newDepartmentCompanyId}
                            onChange={(e) => setNewDepartmentCompanyId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                            required
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">Create Department</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Departments;