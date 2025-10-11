// components/companies/Companies.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import * as AuthService from '../../services/authService';
import { Company, UserRole, TaskStatus, User, Department, Project, MilestoneStatus } from '../../types';
import { Navigate, useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { UsersIcon, BuildingOfficeIcon } from '../../constants';

interface CompanyWithStats extends Company {
    employeeCount: number;
    managerCount: number;
    departmentCount: number;
    projectCount: number;
    projectsCompleted: number;
    projectsInProgress: number;
    projectsPending: number;
}

const CompanyCard: React.FC<{ company: CompanyWithStats }> = ({ company }) => {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate(`/companies/${company.id}`)}
            className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
        >
            <div>
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">{company.name}</h3>
                
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Organization</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-slate-700">
                        <div className="flex items-center space-x-2">
                             <UsersIcon className="h-5 w-5" />
                             <span className="font-medium">{company.employeeCount} Employees</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <UsersIcon className="h-5 w-5" />
                            <span className="font-medium">{company.managerCount} Managers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <BuildingOfficeIcon className="h-5 w-5" />
                            <span className="font-medium">{company.departmentCount} Departments</span>
                        </div>
                    </div>
                </div>

                 <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Projects ({company.projectCount} Total)</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Completed</span>
                            <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{company.projectsCompleted}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">In Progress</span>
                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{company.projectsInProgress}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Pending</span>
                            <span className="font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{company.projectsPending}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

<<<<<<< HEAD
=======
// Define the ToastMessage type locally
type ToastMessage = {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
};
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

const Companies: React.FC = () => {
    const { user } = useAuth();
    const [companiesWithStats, setCompaniesWithStats] = useState<CompanyWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
<<<<<<< HEAD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
=======
    const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null);

    const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
    const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<CompanyWithStats | null>(null);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setCurrentToast({ message, type });
        toastTimeoutRef.current = setTimeout(() => {
            setCurrentToast(null);
            toastTimeoutRef.current = null;
        }, 5000);
    }, []);

    // API endpoints for company operations
    const GET_COMPANIES_API_URL = "https://3dgtvtdri1.execute-api.ap-south-1.amazonaws.com/get/get-com";
    const CREATE_COMPANY_API_URL = "https://j5dfp9hh9k.execute-api.ap-south-1.amazonaws.com/del/Ets-Create-Com-pz";
    const EDIT_COMPANY_BASE_URL = "https://f25828ro5f.execute-api.ap-south-1.amazonaws.com/edt/Ets-edit-com";
    const DELETE_COMPANY_BASE_URL = "https://o46q7fnoel.execute-api.ap-south-1.amazonaws.com/prod/Ets-del-pz";

>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (!user) return;
        try {
<<<<<<< HEAD
            const companies = DataService.getCompanies();
            const users = AuthService.getUsers();
            
            const [projects, departments] = await Promise.all([
                DataService.getAllProjects(),
                DataService.getDepartments()
            ]);

            const statsPromises = companies.map(async comp => {
                const companyUsers = users.filter(u => u.companyId === comp.id);
                const companyProjects = projects.filter(p => p.companyId === comp.id);
                const companyDepartments = departments.filter(d => d.companyId === comp.id);

                let projectsCompleted = 0;
                let projectsInProgress = 0;
                let projectsPending = 0;

                await Promise.all(companyProjects.map(async project => {
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
                    ...comp,
                    employeeCount: companyUsers.filter(u => u.role === UserRole.EMPLOYEE).length,
                    managerCount: companyUsers.filter(u => u.role === UserRole.MANAGER).length,
                    departmentCount: companyDepartments.length,
                    projectCount: companyProjects.length,
=======
            const token = AuthService.getToken();

            const [companiesRes, allUsers, allDepartments, allProjects] = await Promise.all([
                fetch(GET_COMPANIES_API_URL, { method: "GET", headers: token ? { 'Authorization': `Bearer ${token}` } : {} }),
                DataService.getUsers(),
                DataService.getDepartments(),
                DataService.getAllProjects(),
            ]);

            if (!companiesRes.ok) {
                const errorText = await companiesRes.text();
                throw new Error(`Failed to fetch companies: ${companiesRes.status} ${companiesRes.statusText}. Response: ${errorText}`);
            }

            const apiResponse: unknown = await companiesRes.json();
            let rawCompanies: any[] = [];

            if (typeof apiResponse === 'object' && apiResponse !== null && 'items' in apiResponse && Array.isArray((apiResponse as any).items)) {
                rawCompanies = (apiResponse as any).items;
            } else if (Array.isArray(apiResponse)) {
                rawCompanies = apiResponse;
            } else {
                throw new Error('API response for companies was not a direct array or an object with an "items" array.');
            }

            // --- DEBUGGING LOGS START HERE ---
            console.log("--- DEBUGGING COMPANIES LOAD DATA ---");
            console.log("Raw Companies from API:", rawCompanies);
            console.log("All Users fetched:", allUsers);
            console.log("All Departments fetched:", allDepartments);
            console.log("All Projects fetched:", allProjects);
            console.log("-----------------------------------");
            // --- DEBUGGING LOGS END HERE ---

            const companiesWithCalculatedStats: CompanyWithStats[] = rawCompanies.map((comp: any) => {
                // Normalize the company ID from the raw company object
                const companyId = String(comp.id || comp._id || `comp-${Math.random().toString(36).substring(2, 9)}`).toLowerCase().trim();

                // --- COMPANY-SPECIFIC DEBUGGING LOGS ---
                console.log(`\n--- Processing Company: ${comp.name} (Normalized ID: ${companyId}) ---`);
                
                // Filter users for this company with consistent normalization
                const usersInCompany = allUsers.filter(u => {
                    const normalizedUserCompanyId = String(u.companyId || '').toLowerCase().trim();
                    const matches = normalizedUserCompanyId === companyId; // Compare normalized values
                    // console.log(`  User: ${u.name} (ID: ${u.id}, User CompanyID: "${u.companyId}" -> Normalized: "${normalizedUserCompanyId}") vs Target CompanyID: "${companyId}" -> Match: ${matches}`); // Uncomment for very detailed user match log
                    return matches;
                });
                const employeeCount = usersInCompany.filter(u => u.role === UserRole.EMPLOYEE).length;
                const managerCount = usersInCompany.filter(u => u.role === UserRole.MANAGER).length;
                console.log(`  -> Employees: ${employeeCount}, Managers: ${managerCount} (Total users in company: ${usersInCompany.length})`);


                // Filter departments for this company with consistent normalization
                const departmentsInCompany = allDepartments.filter(d => {
                    const normalizedDeptCompanyId = String(d.companyId || '').toLowerCase().trim();
                    const matches = normalizedDeptCompanyId === companyId; // Compare normalized values
                    // console.log(`  Dept: ${d.name} (ID: ${d.id}, Dept CompanyID: "${d.companyId}" -> Normalized: "${normalizedDeptCompanyId}") vs Target CompanyID: "${companyId}" -> Match: ${matches}`); // Uncomment for very detailed dept match log
                    return matches;
                });
                const departmentCount = departmentsInCompany.length;
                console.log(`  -> Departments: ${departmentCount}`);


                // Filter projects for this company with consistent normalization
                const projectsInCompany = allProjects.filter(p => {
                    const normalizedProjectCompanyId = String(p.companyId || '').toLowerCase().trim();
                    const matches = normalizedProjectCompanyId === companyId; // Compare normalized values
                    // console.log(`  Project: ${p.name} (ID: ${p.id}, Project CompanyID: "${p.companyId}" -> Normalized: "${normalizedProjectCompanyId}") vs Target CompanyID: "${companyId}" -> Match: ${matches}`); // Uncomment for very detailed project match log
                    return matches;
                });
                const projectCount = projectsInCompany.length;
                
                let projectsCompleted = 0;
                let projectsInProgress = 0;
                let projectsPending = 0;

                projectsInCompany.forEach(project => {
                    let projectStatus: string = 'Pending';
                    
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
                        // Simplified project status if no roadmap, based on deadline
                        if (project.deadline && new Date(project.deadline) < new Date()) {
                            projectStatus = 'Overdue'; 
                        }
                    }

                    // Final check for overdue status
                    if (projectStatus !== 'Completed' && project.deadline && new Date(project.deadline) < new Date()) {
                        projectStatus = 'Overdue'; 
                    }

                    if (projectStatus === 'Completed') {
                        projectsCompleted++;
                    } else if (projectStatus === 'In Progress' || projectStatus === 'Overdue' || projectStatus === 'On Hold') {
                        projectsInProgress++;
                    } else {
                        projectsPending++;
                    }
                });
                console.log(`  -> Projects: Total: ${projectCount}, Completed: ${projectsCompleted}, InProgress: ${projectsInProgress}, Pending: ${projectsPending}`);

                return {
                    id: companyId, // Use the normalized companyId here
                    name: comp.name || 'Unnamed Company',
                    ownerId: comp.ownerId || '1',
                    createdAt: comp.createdAt || new Date().toISOString(),
                    employeeCount,
                    managerCount,
                    departmentCount,
                    projectCount,
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
                    projectsCompleted,
                    projectsInProgress,
                    projectsPending,
                };
            });
<<<<<<< HEAD
            const stats = await Promise.all(statsPromises);
            setCompaniesWithStats(stats);
        } catch (error) {
            console.error("Failed to load company data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);
=======

            setCompaniesWithStats(companiesWithCalculatedStats);
            if (rawCompanies.length > 0) {
                 addToast('Companies loaded successfully!', 'success');
            }
        } catch (error: any) {
            console.error("Failed to load company data:", error.message || error);
            setCompaniesWithStats([]);
            addToast(`Failed to load companies: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, addToast]); 
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredCompanies = useMemo(() => {
        if (!searchTerm) return companiesWithStats;
        return companiesWithStats.filter(company =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, companiesWithStats]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewCompanyName('');
    };

    const handleCreateCompany = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !user) {
            alert('Company name is required.');
            return;
        }
        DataService.createCompany(newCompanyName, user.id);
        loadData();
        handleCloseModal();
    };

    if (user?.role !== UserRole.ADMIN) {
<<<<<<< HEAD
=======
        if (!currentToast || currentToast.message !== "You do not have permission to view this page.") {
             addToast("You do not have permission to view this page.", "error");
        }
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div>Loading companies...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Companies</h1>
                <Button onClick={handleOpenModal}>Create New Company</Button>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <input
                    type="text"
                    placeholder="Search by company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCompanies.map(comp => (
<<<<<<< HEAD
                    <CompanyCard key={comp.id} company={comp} />
=======
                    <CompanyCard
                        key={comp.id}
                        company={comp}
                        onEdit={() => {
                            setEditingCompany(comp);
                            setNewCompanyName(comp.name);
                            setIsCreateEditModalOpen(true);
                        }}
                        onDelete={() => handleOpenDeleteConfirmModal(comp)}
                    />
>>>>>>> 153472fe1ab0438d7b62f0272c6183965a6c6e33
                ))}
            </div>

            {filteredCompanies.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Companies Found</h3>
                    <p className="text-slate-500 mt-2">No companies match your search criteria.</p>
                </div>
            )}

            <Modal title="Create New Company" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateCompany} className="space-y-6">
                    <Input
                        id="newCompanyName"
                        label="Company Name"
                        type="text"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        required
                    />
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">Create Company</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Companies;
