import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
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
            const [departments, users, projects, allCompanies] = await Promise.all([
                DataService.getDepartments(),
                AuthService.getUsers(),
                DataService.getAllProjects(),
                DataService.getCompanies()
            ]);

            setCompanies(allCompanies);
            if (allCompanies.length > 0) {
                setNewDepartmentCompanyId(allCompanies[0].id);
            }

            const statsPromises = departments.map(async dept => {
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

    const handleCreateDepartment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim() || !newDepartmentCompanyId) {
            alert('Department name and company are required.');
            return;
        }
        DataService.createDepartment(newDepartmentName, newDepartmentCompanyId);
        loadData();
        handleCloseModal();
    };

<<<<<<< HEAD
          if (progress === 100) {
            projectsCompleted++;
          } else {
            projectsInProgress++;
          }
        });

        return {
          ...dept,
          timestamp: dept.timestamp,
          createdAt: dept.createdAt, // Include createdAt property
          employeeCount: deptUsers.filter((u) => u.role === UserRole.EMPLOYEE).length,
          managerCount: deptUsers.filter((u) => u.role === UserRole.MANAGER).length,
          projectsCompleted,
          projectsInProgress,
          projectsPending,
          companyNames: companyNames || 'N/A',
        } as DepartmentWithStats;
      });

      console.log('📈 Final departments with stats:', stats);
      
      // Sort departments by creation date (newest first) - same as roles
      const sortedStats = stats.sort((a, b) => {
        // If createdAt exists, sort by createdAt (newest first)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // If timestamp exists, sort by timestamp (newest first) as fallback
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        // If only one has createdAt, prioritize it
        if (a.createdAt && !b.createdAt) return -1;
        if (!a.createdAt && b.createdAt) return 1;
        // If only one has timestamp, prioritize it
        if (a.timestamp && !b.timestamp) return -1;
        if (!a.timestamp && b.timestamp) return 1;
        // If neither has timestamp or createdAt, maintain original order
        return 0;
      });
      
      setDepartmentsWithStats(sortedStats);
      
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
          // Find the existing department to preserve its createdAt and timestamp
          const existingDepartment = departmentsWithStats.find(dept => dept.id === editingDepartmentId);
          const localResult = DataService.updateDepartment(editingDepartmentId, {
            name: newDepartmentName,
            companyIds: newDepartmentCompanyIds,
            timestamp: existingDepartment?.timestamp, // Preserve the timestamp
            createdAt: existingDepartment?.createdAt // Preserve the createdAt
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
          // Find the existing department to preserve its createdAt and timestamp
          const existingDepartment = departmentsWithStats.find(dept => dept.id === editingDepartmentId);
          const localResult = DataService.updateDepartment(editingDepartmentId, {
            name: newDepartmentName,
            companyIds: newDepartmentCompanyIds,
            timestamp: existingDepartment?.timestamp, // Preserve the timestamp
            createdAt: existingDepartment?.createdAt // Preserve the createdAt
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
            
            // Also update locally to keep data in sync
            // If the API returns department data, use it; otherwise create locally
            if (apiResult.data && typeof apiResult.data === 'object') {
              // Transform the API response to match our Department type
              const apiDepartment = {
                id: apiResult.data.id || `dept-${Date.now()}`,
                name: apiResult.data.name || newDepartmentName,
                companyIds: apiResult.data.companyIds || newDepartmentCompanyIds,
                timestamp: apiResult.data.timestamp || apiResult.data.createdAt || new Date().toISOString(),
                createdAt: apiResult.data.createdAt || apiResult.data.timestamp || new Date().toISOString() // Add createdAt property
              };
              DataService.updateDepartment(apiDepartment.id, apiDepartment);
            } else {
              DataService.createDepartment(newDepartmentName, newDepartmentCompanyIds);
            }
            
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
=======
    if (user?.role !== UserRole.ADMIN) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div>Loading departments...</div>;
>>>>>>> origin/main
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
