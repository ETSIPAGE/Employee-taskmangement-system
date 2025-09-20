import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as AuthService from '../../services/authService';
import { Company, UserRole, TaskStatus } from '../../types';
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

const CompanyCard: React.FC<{ company: CompanyWithStats; onEdit?: () => void; onDelete?: () => void }> = ({ company, onEdit, onDelete }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
            <div onClick={() => navigate(`/companies/${company.id}`)}>
                <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-3">{company.name}</h3>

                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-500 mb-2">Organization</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                        <div className="flex items-center space-x-2 text-slate-700">
                            <UsersIcon className="h-5 w-5" />
                            <span className="font-medium">{company.employeeCount} Employees</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-700">
                            <UsersIcon className="h-5 w-5" />
                            <span className="font-medium">{company.managerCount} Managers</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-700">
                            <BuildingOfficeIcon className="w-4 h-4" />
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

            <div className="mt-4 flex justify-end space-x-2">
                <button
                    type="button"
                    onClick={onEdit}
                    className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                    Edit
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

// Define the ToastMessage type locally
type ToastMessage = {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
};

const Companies: React.FC = () => {
    const { user } = useAuth();
    const [companiesWithStats, setCompaniesWithStats] = useState<CompanyWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false); // Renamed for clarity
    const [newCompanyName, setNewCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null);

    // State for the local toast notification
    const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
    const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // State for deletion confirmation modal
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [companyToDelete, setCompanyToDelete] = useState<CompanyWithStats | null>(null);

    // Function to show a toast message
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


    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (!user) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(GET_COMPANIES_API_URL, { method: "GET" });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to fetch companies: ${res.status} ${res.statusText}. Response: ${errorText}`);
            }

            const apiResponse: unknown = await res.json();
            let companiesToProcess: any[] = [];

            if (typeof apiResponse === 'object' && apiResponse !== null && 'items' in apiResponse && Array.isArray((apiResponse as any).items)) {
                companiesToProcess = (apiResponse as any).items;
            } else if (Array.isArray(apiResponse)) {
                companiesToProcess = apiResponse;
            } else {
                throw new Error('API response for companies was not a direct array or an object with an "items" array.');
            }

            const stats = companiesToProcess.map((comp: any) => ({
                id: comp.id || comp._id || `comp-${Math.random().toString(36).substring(2, 9)}`,
                name: comp.name || 'Unnamed Company',
                ownerId: comp.ownerId || '1',
                createdAt: comp.createdAt || new Date().toISOString(),

                employeeCount: comp.employeeCount ?? 0,
                managerCount: comp.managerCount ?? 0,
                departmentCount: comp.departmentCount ?? 0,
                projectCount: comp.projectCount ?? 0,
                projectsCompleted: comp.projectsCompleted ?? 0,
                projectsInProgress: comp.projectsInProgress ?? 0,
                projectsPending: comp.projectsPending ?? 0,
            }));

            setCompaniesWithStats(stats);
            // Only show success toast if there are companies or it's a fresh load with no error
            if (companiesToProcess.length > 0) {
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
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, [loadData]);

    const filteredCompanies = useMemo(() => {
        if (!searchTerm) return companiesWithStats;
        return companiesWithStats.filter(company =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, companiesWithStats]);

    // Handlers for Create/Edit Modal
    const handleOpenCreateEditModal = () => setIsCreateEditModalOpen(true);
    const handleCloseCreateEditModal = () => {
        setIsCreateEditModalOpen(false);
        setNewCompanyName('');
        setEditingCompany(null);
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !user) {
            addToast('Company name is required.', 'warning');
            return;
        }

        try {
            if (editingCompany) {
                if (!editingCompany.id) {
                    addToast("Cannot edit company: Company ID is missing.", 'error');
                    return;
                }
                const res = await fetch(`${EDIT_COMPANY_BASE_URL}/${editingCompany.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newCompanyName.trim() })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to edit company");

                addToast(`Company "${newCompanyName.trim()}" updated successfully!`, 'success');
                setEditingCompany(null);
            } else {
                const res = await fetch(CREATE_COMPANY_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newCompanyName, createdBy: user.id })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to create company");
                addToast(`Company "${newCompanyName}" created successfully!`, 'success');
            }

            await loadData();
            handleCloseCreateEditModal();
        } catch (err: any) {
            console.error("Error during company operation:", err);
            addToast(`Operation failed: ${err.message || 'Unknown error'}`, 'error');
        }
    };

    // Handlers for Delete Confirmation Modal
    const handleOpenDeleteConfirmModal = (company: CompanyWithStats) => {
        setCompanyToDelete(company);
        setIsDeleteConfirmModalOpen(true);
    };

    const handleCloseDeleteConfirmModal = () => {
        setIsDeleteConfirmModalOpen(false);
        setCompanyToDelete(null);
    };

    const handleDeleteCompany = async () => {
        if (!companyToDelete || !companyToDelete.id) {
            addToast("Cannot delete company: Company ID is missing.", 'error');
            handleCloseDeleteConfirmModal();
            return;
        }

        try {
            const res = await fetch(`${DELETE_COMPANY_BASE_URL}/${companyToDelete.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Failed to delete company");
            }

            addToast(`Company "${companyToDelete.name}" deleted successfully!`, 'success');
            await loadData();
            handleCloseDeleteConfirmModal();
        } catch (err: any) {
            console.error("Delete error:", err);
            addToast(`Failed to delete company: ${err.message || 'Unknown error'}`, 'error');
            handleCloseDeleteConfirmModal();
        }
    };


    if (user?.role !== UserRole.ADMIN) {
        addToast("You do not have permission to view this page.", "error");
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center py-8 text-lg text-slate-600">Loading companies...</div>;
    }

    // Determine toast classes based on type
    const getToastClasses = (type: ToastMessage['type']) => {
        const base = "p-4 rounded-md shadow-lg flex items-center justify-between space-x-4";
        switch (type) {
            case 'success': return `${base} bg-green-50 text-green-800 border border-green-200`;
            case 'error': return `${base} bg-red-50 text-red-800 border border-red-200`;
            case 'info': return `${base} bg-blue-50 text-blue-800 border border-blue-200`;
            case 'warning': return `${base} bg-yellow-50 text-yellow-800 border border-yellow-200`;
            default: return base;
        }
    };

    return (
        <div className="relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Companies</h1>
                <Button onClick={handleOpenCreateEditModal}>Create New Company</Button>
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
                    <CompanyCard
                        key={comp.id}
                        company={comp}
                        onEdit={() => {
                            setEditingCompany(comp);
                            setNewCompanyName(comp.name);
                            setIsCreateEditModalOpen(true);
                        }}
                        onDelete={() => handleOpenDeleteConfirmModal(comp)} // Changed to open confirmation modal
                    />
                ))}
            </div>

            {filteredCompanies.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Companies Found</h3>
                    <p className="text-slate-500 mt-2">No companies match your search criteria.</p>
                </div>
            )}

            {/* Create/Edit Company Modal */}
            <Modal title={editingCompany ? "Edit Company" : "Create New Company"} isOpen={isCreateEditModalOpen} onClose={handleCloseCreateEditModal}>
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
                        <button type="button" onClick={handleCloseCreateEditModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit">{editingCompany ? "Save Changes" : "Create Company"}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal title="Confirm Deletion" isOpen={isDeleteConfirmModalOpen} onClose={handleCloseDeleteConfirmModal}>
                <div className="p-4">
                    <p className="text-slate-700 mb-6">
                        Are you sure you want to delete company <span className="font-bold">"{companyToDelete?.name}"</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseDeleteConfirmModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button
                            type="button"
                            onClick={handleDeleteCompany}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* In-component Toast Notification */}
            {currentToast && (
                <div className="fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100">
                    <div className={getToastClasses(currentToast.type)}>
                        <span>{currentToast.message}</span>
                        <button
                            onClick={() => {
                                setCurrentToast(null);
                                if (toastTimeoutRef.current) {
                                    clearTimeout(toastTimeoutRef.current);
                                    toastTimeoutRef.current = null;
                                }
                            }}
                            className={`ml-4 p-1 rounded-full text-sm font-medium focus:outline-none 
                                ${currentToast.type === 'success' ? 'hover:bg-green-100 text-green-700' : ''}
                                ${currentToast.type === 'error' ? 'hover:bg-red-100 text-red-700' : ''}
                                ${currentToast.type === 'info' ? 'hover:bg-blue-100 text-blue-700' : ''}
                                ${currentToast.type === 'warning' ? 'hover:bg-yellow-100 text-yellow-700' : ''}
                            `}
                            aria-label="Close"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Companies;