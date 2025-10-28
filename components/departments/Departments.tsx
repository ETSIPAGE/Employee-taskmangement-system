import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';

import { Department, User, UserRole, Project, TaskStatus, Company } from '../../types';
import { Navigate, useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import Toast from '../shared/Toast';
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

const DepartmentCard: React.FC<{ department: DepartmentWithStats; onEdit: (dept: Department) => void; onDelete: (deptId: string) => void }> = ({ department, onEdit, onDelete }) => {
    const navigate = useNavigate();
    
    return (
        <div 
            className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between transition-all hover:shadow-lg cursor-pointer"
        >
            <div>
                <div className="mb-4 border-b pb-3">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-slate-800">{department.name}</h3>
                        <div className="flex space-x-2">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(department);
                                }}
                                className="p-1 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-full"
                                title="Edit department"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Instead of using confirm, we'll let the parent handle the delete confirmation
                                    onDelete(department.id);
                                }}
                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-full"
                                title="Delete department"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentCompanyId, setNewDepartmentCompanyId] = useState('');
    const [editDepartmentName, setEditDepartmentName] = useState('');
    const [editDepartmentCompanyId, setEditDepartmentCompanyId] = useState('');

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    
    // Confirmation modal state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        confirmButtonVariant: 'primary' as 'primary' | 'danger'
    });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [departments, users, projects, allCompanies] = await Promise.all([
                DataService.getDepartments(),
                DataService.getUsers(),
                DataService.getAllProjects(),
                DataService.getCompanies()
            ]);

            setCompanies(allCompanies);
            if (allCompanies.length > 0) {
                setNewDepartmentCompanyId(allCompanies[0].id);
            }

            // Dedupe departments by base name (strip trailing numeric suffixes) to avoid logical duplicates
            const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
            const baseName = (s: string) => norm(s).replace(/\(\d+\)$/,'').replace(/[-_\s]+\d+$/,'').trim();
            const byBase = new Map<string, Department>();
            for (const d of departments) {
                const key = `${d.companyId || 'comp-1'}::${baseName(d.name)}`;
                // Prefer the latest by lexical id fallback; if ids are timestamps, this keeps the newest
                const prev = byBase.get(key);
                if (!prev) byBase.set(key, d); else byBase.set(key, d); // overwrite with last seen
            }
            const uniqueDepartments = Array.from(byBase.values());

            const statsPromises = uniqueDepartments.map(async dept => {
                const deptUsers = users.filter(u => u.departmentIds?.includes(dept.id));
                const deptProjects = projects.filter(p => p.departmentIds.includes(dept.id));
                const company = allCompanies.find(c => c.id === dept.companyId);

                let projectsCompleted = 0;
                let projectsInProgress = 0;
                let projectsPending = 0;
                
                await Promise.all(deptProjects.map(async project => {
                    const tasks = await DataService.getTasksByProject(project.id);
                    if (tasks.length === 0) {
                        projectsPending++;
                        return;
                    }
                    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                    if (completedTasks === tasks.length) {
                        projectsCompleted++;
                    } else {
                        projectsInProgress++;
                    }
                }));

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
            const uniqueStats = Array.from(new Map(stats.map(d => [d.id, d])).values());
            setDepartmentsWithStats(uniqueStats);
        } catch (error) {
            console.error("Failed to load department data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
        if (companies.length > 0) {
            setNewDepartmentCompanyId(companies[0].id);
        }
    };
    
    const handleOpenEditModal = (dept: Department) => {
        setDepartmentToEdit(dept);
        setEditDepartmentName(dept.name);
        setEditDepartmentCompanyId(dept.companyId);
        setIsEditModalOpen(true);
    };
    
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setDepartmentToEdit(null);
        setEditDepartmentName('');
        setEditDepartmentCompanyId('');
    };

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim() || !newDepartmentCompanyId) {
            setToast({ message: 'Department name and company are required.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
            return;
        }
        
        try {
            await DataService.createDepartment(newDepartmentName, newDepartmentCompanyId);
            await loadData();
            handleCloseModal();
            setToast({ message: 'Department created successfully!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
        } catch (error: any) {
            console.error('Error creating department:', error);
            const errorMessage = error.message || 'Failed to create department. Please try again.';
            setToast({ message: errorMessage, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        }
    };
    
    const handleUpdateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!departmentToEdit || !editDepartmentName.trim() || !editDepartmentCompanyId) {
            setToast({ message: 'Department name and company are required.', type: 'error' });
            setTimeout(() => setToast(null), 3000);
            return;
        }
        
        try {
            // Update the department using the API
            await DataService.updateDepartment(
                departmentToEdit.id,
                editDepartmentName,
                editDepartmentCompanyId
            );
            
            // Refresh the data
            await loadData();
            
            // Show success message
            setToast({ message: 'Department updated successfully!', type: 'success' });
            setTimeout(() => setToast(null), 3000);
            handleCloseEditModal();
        } catch (error: any) {
            console.error('Error updating department:', error);
            const errorMessage = error.message || 'Failed to update department. Please try again.';
            setToast({ message: errorMessage, type: 'error' });
            setTimeout(() => setToast(null), 5000);
        }
    };
    
    const handleDeleteDepartment = async (deptId: string) => {
        // Show confirmation dialog
        setConfirmModalConfig({
            title: 'Delete Department',
            message: 'Are you sure you want to delete this department? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmButtonVariant: 'danger'
        });
        
        // Create the confirmation action
        const confirmDelete = async () => {
            try {
                // Optimistic UI update
                setDepartmentsWithStats(prev => prev.filter(d => d.id !== deptId));

                // Call API
                await DataService.deleteDepartment(deptId);

                // Also refresh data in background to sync any server-side changes
                loadData();

                // Success toast
                setToast({ message: 'Department deleted successfully!', type: 'success' });
                setTimeout(() => setToast(null), 3000);
            } catch (error: any) {
                console.error('Error deleting department:', error);
                // Revert by reloading authoritative data
                await loadData();
                const errorMessage = error.message || 'Failed to delete department. Please try again.';
                setToast({ message: errorMessage, type: 'error' });
                setTimeout(() => setToast(null), 5000);
            }
        };
        
        setConfirmAction(() => confirmDelete);
        setIsConfirmModalOpen(true);
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
                    <DepartmentCard 
                        key={dept.id} 
                        department={dept} 
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteDepartment}
                    />
                ))}
            </div>
            
            {filteredDepartments.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Departments Found</h3>
                    <p className="text-slate-500 mt-2">No departments match your search or filter criteria.</p>
                </div>
            )}

            {/* Create Department Modal */}
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
            
            {/* Edit Department Modal */}
            <Modal title="Edit Department" isOpen={isEditModalOpen} onClose={handleCloseEditModal}>
                <form onSubmit={handleUpdateDepartment} className="space-y-6">
                    <Input
                        id="editDepartmentName"
                        label="Department Name"
                        type="text"
                        value={editDepartmentName}
                        onChange={(e) => setEditDepartmentName(e.target.value)}
                        required
                    />
                    <div>
                        <label htmlFor="editCompany" className="block text-sm font-medium text-slate-700">Company</label>
                        <select
                            id="editCompany"
                            value={editDepartmentCompanyId}
                            onChange={(e) => setEditDepartmentCompanyId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                            required
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseEditModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">Update Department</Button>
                    </div>
                </form>
            </Modal>
            
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={async () => {
                    if (confirmAction) {
                        await confirmAction();
                    }
                }}
                title={confirmModalConfig.title}
                message={confirmModalConfig.message}
                confirmText={confirmModalConfig.confirmText}
                cancelText={confirmModalConfig.cancelText}
                confirmButtonVariant={confirmModalConfig.confirmButtonVariant}
            />
            
            {/* Toast Notification */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </div>
    );
};

export default Departments;