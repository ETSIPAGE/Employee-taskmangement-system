import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { apiService } from '../../services/apiService';
import * as AuthService from '../../services/authService';
import { Department, User, UserRole, Project, TaskStatus, Company } from '../../types';
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
    companyNames: string;
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
                        <span>{department.companyNames}</span>
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
    const [newDepartmentCompanyIds, setNewDepartmentCompanyIds] = useState<string[]>([]);
    const [companySearch, setCompanySearch] = useState('');
    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [companyFilter, setCompanyFilter] = useState('all');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Prefer external departments if available
            let departments = DataService.getDepartments();
            const depApi = await apiService.getDepartments();
            if (depApi.success && depApi.data && depApi.data.length > 0) {
                departments = depApi.data;
            }
            const users = AuthService.getUsers();
            const projects = DataService.getAllProjects();
            // Get companies from external API, fallback to local
            let companiesList: Company[] = [];
            const apiRes = await apiService.getCompanies();
            if (apiRes.success && apiRes.data && apiRes.data.length > 0) {
                companiesList = apiRes.data;
            } else {
                companiesList = DataService.getCompanies();
            }
            setCompanies(companiesList);
            if (companiesList.length > 0) {
                setNewDepartmentCompanyIds([companiesList[0].id]);
            }

            const stats = departments.map(dept => {
                const deptUsers = users.filter(u => u.departmentIds?.includes(dept.id));
                const deptProjects = projects.filter(p => p.departmentIds.includes(dept.id));
                const companyNames = (dept.companyIds || [])
                    .map(id => companiesList.find(c => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');

                let projectsCompleted = 0;
                let projectsInProgress = 0;
                let projectsPending = 0;

                deptProjects.forEach(project => {
                    const tasks = DataService.getTasksByProject(project.id);
                    if (tasks.length === 0) {
                        projectsPending++;
                        return;
                    }
                    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                    const progress = Math.round((completedTasks / tasks.length) * 100);

                    if (progress === 100) {
                        projectsCompleted++;
                    } else {
                        projectsInProgress++;
                    }
                });

                return {
                    ...dept,
                    employeeCount: deptUsers.filter(u => u.role === UserRole.EMPLOYEE).length,
                    managerCount: deptUsers.filter(u => u.role === UserRole.MANAGER).length,
                    projectsCompleted,
                    projectsInProgress,
                    projectsPending,
                    companyNames: companyNames || 'N/A',
                };
            });

            setDepartmentsWithStats(stats);
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
            const companyMatch = companyFilter === 'all' || (dept.companyIds && dept.companyIds.includes(companyFilter));
            const searchMatch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
            return companyMatch && searchMatch;
        });
    }, [searchTerm, companyFilter, departmentsWithStats]);

    const visibleCompanies = useMemo(() => {
        if (!companySearch.trim()) return companies;
        return companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()));
    }, [companies, companySearch]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleOpenEditModal = (dept: DepartmentWithStats) => {
        setEditingDepartmentId(dept.id);
        setNewDepartmentName(dept.name);
        setNewDepartmentCompanyIds(dept.companyIds || []);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewDepartmentName('');
        if (companies.length > 0) {
            setNewDepartmentCompanyIds([companies[0].id]);
        }
        setEditingDepartmentId(null);
    };

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim() || newDepartmentCompanyIds.length === 0) {
            alert('Department name and company are required.');
            return;
        }
        if (editingDepartmentId) {
            try {
              await apiService.updateDepartment({
                id: editingDepartmentId,
                name: newDepartmentName,
                companyIds: newDepartmentCompanyIds,
                latest: true // ✅ IMPORTANT: tells backend to update the latest version
              });
            } catch (err) {
              console.error("API update failed:", err);
            }
          
            // Optional fallback/local update
            DataService.updateDepartment(editingDepartmentId, {
              name: newDepartmentName,
              companyIds: newDepartmentCompanyIds
            });
          }
           else {
            try { await apiService.createDepartment({ name: newDepartmentName, companyIds: newDepartmentCompanyIds }); } catch {}
            DataService.createDepartment(newDepartmentName, newDepartmentCompanyIds);
        }
        loadData();
        handleCloseModal();
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
                    <div key={dept.id} className="relative group">
                        <DepartmentCard department={dept} />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleOpenEditModal(dept)}
                                className="text-xs px-2 py-1 rounded bg-indigo-600 text-white shadow"
                            >Edit</button>
                            <button
                                onClick={() => {
                                    if (confirm('Delete this department? This will also unlink it from projects.')) {
                                        DataService.deleteDepartment(dept.id);
                                        loadData();
                                    }
                                }}
                                className="text-xs px-2 py-1 rounded bg-rose-600 text-white shadow"
                            >Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredDepartments.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Departments Found</h3>
                    <p className="text-slate-500 mt-2">No departments match your search or filter criteria.</p>
                </div>
            )}

            <Modal title={editingDepartmentId ? 'Edit Department' : 'Create New Department'} isOpen={isModalOpen} onClose={handleCloseModal}>
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
                        <label className="block text-sm font-medium text-slate-700">Companies</label>
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search companies..."
                                value={companySearch}
                                onChange={(e) => setCompanySearch(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setNewDepartmentCompanyIds(companies.map(c => c.id))}
                                className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                            >Select all</button>
                            <button
                                type="button"
                                onClick={() => setNewDepartmentCompanyIds([])}
                                className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                            >Clear</button>
                        </div>
                        {newDepartmentCompanyIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {newDepartmentCompanyIds.map(id => {
                                    const comp = companies.find(c => c.id === id);
                                    if (!comp) return null;
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-1">
                                            {comp.name}
                                            <button type="button" className="hover:text-indigo-900" onClick={() => setNewDepartmentCompanyIds(prev => prev.filter(cid => cid !== id))}>×</button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200 rounded-md bg-white divide-y divide-slate-100">
                            {visibleCompanies.map(c => {
                                const checked = newDepartmentCompanyIds.includes(c.id);
                                return (
                                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            checked={checked}
                                            onChange={(e) => {
                                                setNewDepartmentCompanyIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id));
                                            }}
                                        />
                                        <span className="text-sm text-slate-700">{c.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {newDepartmentCompanyIds.length === 0 && (
                            <p className="mt-2 text-xs text-rose-600">Select at least one company.</p>
                        )}
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">{editingDepartmentId ? 'Save Changes' : 'Create Department'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Departments;