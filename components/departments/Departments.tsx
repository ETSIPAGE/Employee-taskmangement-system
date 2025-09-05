import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { apiService } from '../../services/apiService';
import * as AuthService from '../../services/authService';
import { Department, UserRole, TaskStatus, Company } from '../../types';
import { Navigate, useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { UsersIcon, BuildingOfficeIcon } from '../../constants';
import { toast, ToastContainer } from 'react-toastify'; // ✅ Import ToastContainer here
import 'react-toastify/dist/ReactToastify.css'; // ✅ CSS for toasts

// Custom styles for enhanced toast appearance
const toastStyles = `
  .custom-toast {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  .custom-toast-body {
    font-size: 14px;
    font-weight: 500;
  }
  .custom-progress {
    background: linear-gradient(90deg, #3b82f6, #6366f1);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = toastStyles;
  document.head.appendChild(styleSheet);
}

interface DepartmentStats {
  employeeCount: number;
  managerCount: number;
  projectsCompleted: number;
  projectsInProgress: number;
  projectsPending: number;
  companyNames: string;
}

interface DepartmentWithStats extends Department, DepartmentStats {
  timestamp?: string; // Needed for delete API key
}

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
              <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                {department.projectsCompleted}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">In Progress</span>
              <span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {department.projectsInProgress}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Pending</span>
              <span className="font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                {department.projectsPending}
              </span>
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [newDepartmentCompanyIds, setNewDepartmentCompanyIds] = useState<string[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');

  // Alternative approach: dismiss loading and show new success toast
  const showSuccessToast = (message: string, loadingId: any) => {
    toast.dismiss(loadingId);
    setTimeout(() => {
      toast.success(message, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }, 100);
  };

  const showErrorToast = (message: string, loadingId: any) => {
    toast.dismiss(loadingId);
    setTimeout(() => {
      toast.error(message, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }, 100);
  };

  const loadData = useCallback(async () => {
    console.log('Loading departments data...');
    setIsLoading(true);
    
    try {
      // Start with local data as baseline
      let departments = DataService.getDepartments();
      console.log('Local departments before API call:', departments);
      
      // Attempt API call with enhanced error handling
      try {
        const depApi = await apiService.getDepartments();
        console.log('API departments response:', depApi);
        
        if (depApi.success && depApi.data && depApi.data.length > 0) {
          departments = depApi.data;
          console.log('Using API departments data:', departments);
          
          // Sync API data with local storage to prevent ID mismatch issues
          DataService.setDepartments(departments);
          console.log('Synced API departments with local storage');
          
          toast.success('Departments loaded from API successfully');
        } else {
          console.log('Using local departments data (API failed or empty):', depApi.error);
          toast.warn('API unavailable, using local data. Error: ' + (depApi.error || 'Unknown'));
        }
      } catch (apiError) {
        console.error('API call completely failed:', apiError);
        toast.error('API connection failed completely, using local data only');
      }
      
      const users = AuthService.getUsers();
      const projects = DataService.getAllProjects();

      // Enhanced company loading with fallback
      let companiesList: Company[] = [];
      console.log('Loading companies data...');
      
      try {
        const apiRes = await apiService.getCompanies();
        console.log('Company API response:', apiRes);
        
        if (apiRes.success && apiRes.data && apiRes.data.length > 0) {
          companiesList = apiRes.data;
          console.log('Using API companies data:', companiesList);
        } else {
          console.log('API failed, using local companies data:', apiRes.error);
          companiesList = DataService.getCompanies();
          toast.warn('⚠️ Companies API failed: ' + (apiRes.error || 'Unknown error'));
        }
      } catch (companyError) {
        console.error('💥 Error fetching companies:', companyError);
        companiesList = DataService.getCompanies();
        toast.error('❌ Company API connection failed, using local data');
      }
      
      console.log('🏢 Final companies list:', companiesList);
      setCompanies(companiesList);
      
      // Set default company selection if available
      if (companiesList.length > 0) {
        setNewDepartmentCompanyIds([companiesList[0].id]);
      }

      // Process department statistics
      const stats = departments.map((dept: any) => {
        const deptUsers = users.filter((u) => u.departmentIds?.includes(dept.id));
        const deptProjects = projects.filter((p) => p.departmentIds.includes(dept.id));
        const companyNames = (dept.companyIds || [])
          .map((id: string) => companiesList.find((c) => c.id === id)?.name)
          .filter(Boolean)
          .join(', ');

        let projectsCompleted = 0;
        let projectsInProgress = 0;
        let projectsPending = 0;

        deptProjects.forEach((project) => {
          const tasks = DataService.getTasksByProject(project.id);
          if (tasks.length === 0) {
            projectsPending++;
            return;
          }
          const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
          const progress = Math.round((completedTasks / tasks.length) * 100);

          if (progress === 100) {
            projectsCompleted++;
          } else {
            projectsInProgress++;
          }
        });

        return {
          ...dept,
          timestamp: dept.timestamp,
          employeeCount: deptUsers.filter((u) => u.role === UserRole.EMPLOYEE).length,
          managerCount: deptUsers.filter((u) => u.role === UserRole.MANAGER).length,
          projectsCompleted,
          projectsInProgress,
          projectsPending,
          companyNames: companyNames || 'N/A',
        } as DepartmentWithStats;
      });

      console.log('📈 Final departments with stats:', stats);
      setDepartmentsWithStats(stats);
      
      // Success notification
      if (stats.length > 0) {
        console.log('Data loading completed successfully');
      } else {
        console.warn('⚠️ No departments found after loading');
        toast.warn('⚠️ No departments found. You may need to create some.');
      }
      
    } catch (error) {
      console.error('💥 Critical error in loadData:', error);
      toast.error('❌ Failed to load department data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Fallback to empty state but don't crash
      setDepartmentsWithStats([]);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDepartments = useMemo(() => {
    return departmentsWithStats.filter((dept) => {
      const companyMatch =
        companyFilter === 'all' || (dept.companyIds && dept.companyIds.includes(companyFilter));
      const searchMatch = dept.name.toLowerCase().includes(searchTerm.toLowerCase());
      return companyMatch && searchMatch;
    });
  }, [searchTerm, companyFilter, departmentsWithStats]);

  const visibleCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()));
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

  const handleCloseConfirm = () => {
    setIsConfirmOpen(false);
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation with specific toast messages
    if (!newDepartmentName.trim()) {
      toast.error('Department name is required!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }
    
    if (newDepartmentCompanyIds.length === 0) {
      toast.error('Please select at least one company!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Show loading toast for better UX
    const loadingToastId = toast.loading(
      editingDepartmentId 
        ? `Updating department "${newDepartmentName}"...` 
        : `Creating department "${newDepartmentName}"...`,
      {
        position: "top-right",
      }
    );
    
    console.log('Loading toast created with ID:', loadingToastId);

    try {
      if (editingDepartmentId) {
        // 🔧 Enhanced update with your specific API endpoint
        console.log('Updating department:', {
          id: editingDepartmentId,
          name: newDepartmentName,
          companyIds: newDepartmentCompanyIds,
          latest: true
        });

        const apiResult = await apiService.updateDepartment({
          id: editingDepartmentId,
          name: newDepartmentName,
          companyIds: newDepartmentCompanyIds,
          latest: true,
        });

        console.log('API update result:', apiResult);

        if (apiResult.success) {
          console.log('API update successful, showing success toast...');
          
          // Try alternative approach: dismiss + new toast
          showSuccessToast(`Department "${newDepartmentName}" updated successfully!`, loadingToastId);
          
          console.log('Success toast shown');
          
          // Also update locally to keep data in sync
          const localResult = DataService.updateDepartment(editingDepartmentId, {
            name: newDepartmentName,
            companyIds: newDepartmentCompanyIds,
          });
          
          if (localResult) {
            console.log('Local update successful - updated department:', localResult);
          }
          
          // Wait a bit before reloading to ensure toast is visible
          setTimeout(async () => {
            console.log('Reloading data and closing modal...');
            await loadData();
            handleCloseModal();
          }, 800);
          
          return; // Early return to prevent double execution
        } else {
          console.warn('API update failed, using local update:', apiResult.error);
          
          // Always update local state when API fails
          const localResult = DataService.updateDepartment(editingDepartmentId, {
            name: newDepartmentName,
            companyIds: newDepartmentCompanyIds,
          });

          console.log('Local update result:', localResult);

          if (localResult) {
            console.log('Local update successful - updated department:', localResult);
            console.log('Showing local success toast...');
            
            // Use alternative approach for local success too
            showSuccessToast(`Department "${newDepartmentName}" updated locally (API unavailable)`, loadingToastId);
            
            // Wait a bit before reloading to ensure toast is visible
            setTimeout(async () => {
              console.log('Reloading data and closing modal...');
              await loadData();
              handleCloseModal();
            }, 800);
            
            return; // Early return to prevent double execution
          } else {
            console.error('Local update failed!');
            
            // Use alternative approach for error too
            showErrorToast(`Failed to update department "${newDepartmentName}"`, loadingToastId);
            return; // Exit early if local update fails
          }
        }
      } else {
        // Creating new department
        console.log('🆕 Creating new department:', {
          name: newDepartmentName,
          companyIds: newDepartmentCompanyIds
        });

        let apiResult: any = null;
        try {
          apiResult = await apiService.createDepartment({ 
            name: newDepartmentName, 
            companyIds: newDepartmentCompanyIds 
          });
          
          console.log('API create result:', apiResult);
          
          if (apiResult.success) {
            // Update loading toast to success
            toast.update(loadingToastId, {
              render: `Department "${newDepartmentName}" created successfully!`,
              type: "success",
              isLoading: false,
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
            
            // Wait a bit before reloading to ensure toast is visible
            setTimeout(async () => {
              await loadData();
              handleCloseModal();
            }, 500);
            
            return; // Early return to prevent double execution
          } else {
            console.warn('API create failed, using local create:', apiResult.error);
            // Update loading toast to warning
            toast.update(loadingToastId, {
              render: `Department "${newDepartmentName}" created locally (API unavailable)`,
              type: "warning",
              isLoading: false,
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          }
        } catch (createError) {
          console.error('API create error:', createError);
          // Update loading toast to error
          toast.update(loadingToastId, {
            render: 'API create error, department created locally only.',
            type: "warning",
            isLoading: false,
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }

        // Always create locally as fallback (only if API didn't succeed)
        if (!apiResult || !apiResult.success) {
          DataService.createDepartment(newDepartmentName, newDepartmentCompanyIds);
          
          // If we haven't already shown a success message, show local creation success
          if (!apiResult || !apiResult.success) {
            toast.update(loadingToastId, {
              render: `Department "${newDepartmentName}" created locally!`,
              type: "success",
              isLoading: false,
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
          }
        }
      }

      // Only reload data if we haven't already done it above
      // (This prevents the loading/modal close from interfering with toast display)
      if (editingDepartmentId) {
        // For edits, we handle reload in the success/error blocks above
        return;
      } else {
        // For creates, reload data here if not already handled
        setTimeout(async () => {
          await loadData();
          handleCloseModal();
        }, 500);
      }
    } catch (error) {
      console.error('Error in handleCreateDepartment:', error);
      
      // Update loading toast to error
      toast.update(loadingToastId, {
        render: `An error occurred while ${editingDepartmentId ? 'updating' : 'creating'} the department: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: "error",
        isLoading: false,
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Don't close modal on error so user can retry
    }
  };

  const handleDeleteDepartment = useCallback(
    async (dept: DepartmentWithStats, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      setConfirmAction(() => async () => {
        if (!dept.timestamp) {
          toast.error(`Cannot delete department "${dept.name}": Missing timestamp data!`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          return;
        }

        // Show loading toast for delete operation
        const loadingToastId = toast.loading(
          `Deleting department "${dept.name}"...`,
          {
            position: "top-right",
          }
        );
        
        console.log('Delete loading toast created with ID:', loadingToastId);
        
        try {
          const res = await apiService.deleteDepartment(dept.id, dept.timestamp);
          const isSuccess = typeof res === 'object' ? (res as any).success !== false : true;

          if (isSuccess) {
            console.log('Delete API successful, showing success toast...');
            // Use alternative approach: dismiss + new success toast
            showSuccessToast(`Department "${dept.name}" has been deleted successfully!`, loadingToastId);
            
            setDepartmentsWithStats((prev) =>
              prev.filter((d) => !(d.id === dept.id && d.timestamp === dept.timestamp))
            );
          } else {
            console.warn('Delete API failed:', res);
            const msg = (res as any)?.error || (res as any)?.message || 'Unknown error';
            // Use alternative approach: dismiss + new error toast
            showErrorToast(`Failed to delete department "${dept.name}": ${msg}`, loadingToastId);
          }
        } catch (err: any) {
          console.error('Delete API error:', err);
          // Use alternative approach for error handling
          showErrorToast(`Error deleting department "${dept.name}": ${err?.message || 'Unknown error occurred'}`, loadingToastId);
        }
      });

      setIsConfirmOpen(true);
    },
    [setDepartmentsWithStats]
  );

  if (user?.role !== UserRole.ADMIN) {
    return <Navigate to="/" />;
  }

  if (isLoading) {
    return <div>Loading departments...</div>;
  }

  return (
    <div>
      {/* Page Content */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Departments</h1>
        <div className="flex space-x-3">
          <Button onClick={handleOpenModal}>Create New Department</Button>
        </div>
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
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDepartments.map((dept) => (
          <div key={dept.id} className="relative group">
            <DepartmentCard department={dept} />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(dept);
                }}
                className="text-xs px-2 py-1 rounded bg-indigo-600 text-white shadow"
              >
                Edit
              </button>
              <button
                onClick={(e) => handleDeleteDepartment(dept, e)}
                className="text-xs px-2 py-1 rounded bg-rose-600 text-white shadow"
                disabled={!dept.timestamp}
                title={!dept.timestamp ? 'Timestamp missing; cannot delete (reload data from API)' : undefined}
              >
                Delete
              </button>
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

      {/* Create/Edit Modal */}
      <Modal
        title={editingDepartmentId ? 'Edit Department' : 'Create New Department'}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      >
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
                onClick={() => setNewDepartmentCompanyIds(companies.map((c) => c.id))}
                className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setNewDepartmentCompanyIds([])}
                className="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              >
                Clear
              </button>
            </div>
            {newDepartmentCompanyIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {newDepartmentCompanyIds.map((id) => {
                  const comp = companies.find((c) => c.id === id);
                  if (!comp) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-1"
                    >
                      {comp.name}
                      <button
                        type="button"
                        className="hover:text-indigo-900"
                        onClick={() =>
                          setNewDepartmentCompanyIds((prev) => prev.filter((cid) => cid !== id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="mt-2 max-h-56 overflow-y-auto border border-slate-200 rounded-md bg-white divide-y divide-slate-100">
              {visibleCompanies.map((c) => {
                const checked = newDepartmentCompanyIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      checked={checked}
                      onChange={(e) => {
                        setNewDepartmentCompanyIds((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                        );
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
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm"
            >
              Cancel
            </button>
            <Button type="submit">{editingDepartmentId ? 'Save Changes' : 'Create Department'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      {isConfirmOpen && (
        <Modal title="Confirm Delete" isOpen={isConfirmOpen} onClose={handleCloseConfirm}>
          <div className="p-4">
            <p className="text-slate-700 mb-6">
              Delete this department? This will also unlink it from projects.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={handleCloseConfirm}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  handleCloseConfirm();
                  confirmAction();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ✅ Enhanced ToastContainer configuration */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastClassName="custom-toast"
        className="custom-toast-body"
        aria-label="Notification messages"
      />
    </div>
  );
};

export default Departments;