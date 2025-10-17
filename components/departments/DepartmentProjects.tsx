import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Department, Project, TaskStatus, Company, MilestoneStatus } from '../../types'; // Ensure MilestoneStatus is imported
import ProjectCard from '../projects/ProjectCard';

const DepartmentProjects: React.FC = () => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const [department, setDepartment] = useState<Department | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    // ProjectDisplayData is the type expected by ProjectCard (from Projects.tsx)
    interface ProjectDisplayData extends Project {
        progress: number;
        overallStatus: string;
        departmentNames: string;
        companyName: string;
    }
    const [projects, setProjects] = useState<ProjectDisplayData[]>([]); 
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!departmentId) {
            console.log("[DepartmentProjects] No departmentId found in URL parameters.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        // Normalize the departmentId from URL params for consistent comparison
        const normalizedDepartmentIdFromParams = String(departmentId).toLowerCase().trim();

        console.log(`[DepartmentProjects] Loading data for department ID from URL: "${departmentId}" (Normalized: "${normalizedDepartmentIdFromParams}")`);
        try {
            const currentDepartment = await DataService.getDepartmentById(departmentId);
            if (!currentDepartment) {
                console.log(`[DepartmentProjects] Department not found in DataService for ID: ${departmentId}`);
                setDepartment(null);
                setIsLoading(false);
                return;
            }
            setDepartment(currentDepartment);
            console.log("[DepartmentProjects] Fetched Department:", currentDepartment);
            // CRITICAL CHECK: Does the fetched department's ID match the URL ID?
            console.log(`[DepartmentProjects] Fetched Dept ID: "${currentDepartment.id}" (Should match URL ID: "${normalizedDepartmentIdFromParams}")`);


            // Fetch all companies, all projects, all departments, and all tasks in parallel
            const [allCompanies, allProjectsFetched, allDeptsFetched, allTasksFetched] = await Promise.all([
                DataService.getCompanies(),
                DataService.getAllProjects(),
                DataService.getDepartments(),
                DataService.getAllTasks(), // Fetch all tasks once for efficient status calculation
            ]);
            console.log("[DepartmentProjects] All Companies fetched:", allCompanies);
            console.log("[DepartmentProjects] All Projects fetched (raw from DataService):", allProjectsFetched);
            console.log("[DepartmentProjects] All Departments fetched (raw from DataService):", allDeptsFetched);
            console.log("[DepartmentProjects] All Tasks fetched (raw from DataService):", allTasksFetched);


            // Set the company for the department display (currentDepartment.companyId is already normalized)
            const currentCompany = allCompanies.find(c => c.id === currentDepartment.companyId);
            setCompany(currentCompany || null);
            console.log("[DepartmentProjects] Matched Company for Department:", currentCompany);


            // --- CRITICAL FILTERING LOGIC ---
            const departmentProjects = allProjectsFetched.filter(p => {
                const projectDepartmentIds = Array.isArray(p.departmentIds) ? p.departmentIds : [];
                
                const matches = projectDepartmentIds.some(projDeptId => 
                    // CRITICAL: Both sides of comparison must be normalized
                    String(projDeptId).toLowerCase().trim() === normalizedDepartmentIdFromParams
                );
                // --- Uncomment for extremely detailed per-project debugging ---
                // if (!matches) {
                //     console.log(`  Project filter: "${p.name || p.id}" -- NO MATCH. ProjectDeptIDs: ${JSON.stringify(projectDepartmentIds.map(id => String(id).toLowerCase().trim()))}, TargetDeptID: "${normalizedDepartmentIdFromParams}"`);
                // } else {
                //     console.log(`  Project filter: "${p.name || p.id}" -- MATCH FOUND! ProjectDeptIDs: ${JSON.stringify(projectDepartmentIds.map(id => String(id).toLowerCase().trim()))}, TargetDeptID: "${normalizedDepartmentIdFromParams}"`);
                // }
                // -----------------------------------------------------------
                return matches;
            });
            console.log("[DepartmentProjects] Projects filtered for current department:", departmentProjects);
            // --- END CRITICAL FILTERING LOGIC ---


            const projectsWithDetailsPromises = departmentProjects.map(p => { // Removed 'async' as it's no longer awaiting inside map
                // Use the already fetched allTasksFetched for efficient status calculation
                const projectTasks = allTasksFetched.filter(task => task.projectId === p.id);
                
                let projectProgress = 0;
                let projectOverallStatus: string = 'Pending'; // This will be the actual status string

                if (p.roadmap && p.roadmap.length > 0) {
                    const totalMilestones = p.roadmap.length;
                    const completedMilestones = p.roadmap.filter(m => m.status === MilestoneStatus.COMPLETED).length;
                    const inProgressMilestones = p.roadmap.filter(m => m.status === MilestoneStatus.IN_PROGRESS).length;
                    const onHoldMilestones = p.roadmap.filter(m => m.status === MilestoneStatus.ON_HOLD).length;

                    if (totalMilestones > 0) {
                        projectProgress = Math.round(((completedMilestones * 1.0 + inProgressMilestones * 0.5) / totalMilestones) * 100);
                        if (projectProgress === 100) projectOverallStatus = 'Completed';
                        else if (onHoldMilestones > 0) projectOverallStatus = 'On Hold';
                        else if (inProgressMilestones > 0 || completedMilestones > 0) projectOverallStatus = 'In Progress';
                        else projectOverallStatus = 'Pending';
                    }
                } else {
                    // Derive from tasks if no roadmap
                    if (projectTasks.length === 0) {
                        // If no tasks and no roadmap, check deadline for overdue
                        if (p.deadline && new Date(p.deadline) < new Date()) {
                            projectOverallStatus = 'Overdue';
                        } else {
                            projectOverallStatus = 'Pending';
                        }
                    } else {
                        const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                        const totalTasks = projectTasks.length;
                        const inProgressTasks = projectTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
                        const onHoldTasks = projectTasks.filter(t => t.status === TaskStatus.ON_HOLD).length;

                        projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0; // Calculate progress based on tasks

                        if (completedTasks === totalTasks) {
                            projectOverallStatus = 'Completed';
                        } else if (onHoldTasks > 0) {
                            projectOverallStatus = 'On Hold';
                        } else if (inProgressTasks > 0 || completedTasks > 0) {
                            projectOverallStatus = 'In Progress';
                        } else {
                            projectOverallStatus = 'Pending';
                        }
                    }
                }
                
                // Override status if overdue, if not already completed
                if (projectOverallStatus !== 'Completed' && p.deadline && new Date(p.deadline) < new Date()) {
                    projectOverallStatus = 'Overdue';
                }

                const departmentNames = (p.departmentIds || [])
                                        .map(id => allDeptsFetched.find(d => String(d.id || '').toLowerCase().trim() === String(id || '').toLowerCase().trim())?.name)
                                        .filter(Boolean).join(', ');
                
                const projCompany = allCompanies.find(c => c.id === p.companyId); // p.companyId is already normalized
                
                return {
                    ...p,
                    progress: projectProgress, // Add calculated progress
                    overallStatus: projectOverallStatus, // Add overallStatus
                    departmentNames,
                    companyName: projCompany?.name || 'N/A',
                };
            });
            // No need for Promise.all here if map is not async
            setProjects(projectsWithDetailsPromises); // renamed to projectsWithDetails for consistency
            console.log("[DepartmentProjects] Projects with Details (final state for rendering):", projectsWithDetailsPromises);

        } catch (error) {
            console.error("[DepartmentProjects] Failed to load department projects:", error);
            setDepartment(null);
            setProjects([]);
        } finally {
            setIsLoading(false);
        }
    }, [departmentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return <div className="text-center p-8">Loading projects...</div>;
    }

    if (!department) {
        return <div className="text-center p-8">Department not found.</div>;
    }

    return (
        <div>
            <Link to="/departments" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back to Departments
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">
                Projects for {department.name}
                {company && <span className="block text-lg text-slate-500 font-normal mt-1">at {company.name}</span>}
            </h1>
            
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <h3 className="text-xl font-semibold text-slate-700">No Projects Found</h3>
                    <p className="text-slate-500 mt-2">This department is not associated with any projects yet.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentProjects;