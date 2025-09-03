import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Company, UserRole, TaskStatus } from '../../types';
import { Navigate, useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-slate-700">
                        <div className="flex items-center space-x-2">
                            <span className="font-medium">{company.employeeCount} Employees</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-medium">{company.managerCount} Managers</span>
                        </div>
                        <div className="flex items-center space-x-2">
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

const Companies: React.FC = () => {
    const { user } = useAuth();
    const [companiesWithStats, setCompaniesWithStats] = useState<CompanyWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null);

    const API_URL = "https://j5dfp9hh9k.execute-api.ap-south-1.amazonaws.com/del/Ets-Create-Com-pz";

    const loadData = useCallback(async () => {
        setIsLoading(true);
        if (!user) return;
        try {
            const res = await fetch(API_URL, { method: "GET" });
            const companies = await res.json();

            const stats = companies.map((comp: any) => ({
                ...comp,
                employeeCount: comp.employeeCount ?? 0,
                managerCount: comp.managerCount ?? 0,
                departmentCount: comp.departmentCount ?? 0,
                projectCount: comp.projectCount ?? 0,
                projectsCompleted: comp.projectsCompleted ?? 0,
                projectsInProgress: comp.projectsInProgress ?? 0,
                projectsPending: comp.projectsPending ?? 0,
            }));

            setCompaniesWithStats(stats);
        } catch (error) {
            console.error("Failed to load company data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

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
        setEditingCompany(null);
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !user) {
            alert('Company name is required.');
            return;
        }

        try {
            if (editingCompany) {
                // EDIT COMPANY
                const res = await fetch(`https://f25828ro5f.execute-api.ap-south-1.amazonaws.com/edt/Ets-edit-com/${editingCompany.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newCompanyName.trim() })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to edit company");

                alert(`Company updated successfully to ${newCompanyName.trim()}`);
                setEditingCompany(null);
            } else {
                // CREATE COMPANY
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: newCompanyName, createdBy: user.id })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to create company");
            }

            await loadData();
            handleCloseModal();
        } catch (err: any) {
            console.error("Error:", err);
            alert(err.message || "Operation failed");
        }
    };

    if (user?.role !== UserRole.ADMIN) {
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
                    <CompanyCard
                        key={comp.id}
                        company={comp}
                        onEdit={() => {
                            setEditingCompany(comp);
                            setNewCompanyName(comp.name);
                            setIsModalOpen(true);
                        }}
                        onDelete={async () => {
                            if (!window.confirm(`Are you sure you want to delete ${comp.name}?`)) return;

                            try {
                                const res = await fetch(`https://o46q7fnoel.execute-api.ap-south-1.amazonaws.com/prod/Ets-del-pz/${comp.id}`, {
                                    method: "DELETE",
                                    headers: { "Content-Type": "application/json" }
                                });

                                const data = await res.json();
                                if (!res.ok) throw new Error(data.message || "Failed to delete company");

                                alert(`${comp.name} deleted successfully`);
                                await loadData();
                            } catch (err: any) {
                                console.error("Delete error:", err);
                                alert(err.message || "Failed to delete company");
                            }
                        }}
                    />
                ))}
            </div>

            {filteredCompanies.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-slate-700">No Companies Found</h3>
                    <p className="text-slate-500 mt-2">No companies match your search criteria.</p>
                </div>
            )}

            <Modal title={editingCompany ? "Edit Company" : "Create New Company"} isOpen={isModalOpen} onClose={handleCloseModal}>
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
                        <Button type="submit">{editingCompany ? "Save Changes" : "Create Company"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Companies;
