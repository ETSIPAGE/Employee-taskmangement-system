import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Company, Project, TaskStatus, Task } from '../../types'; // Import Task type
import ProjectCard from '../projects/ProjectCard';

const CompanyProjects: React.FC = () => {
    const { companyId: rawCompanyId } = useParams<{ companyId: string }>();
    const companyId = rawCompanyId || '';

    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!companyId) {
            console.warn("CompanyProjects: companyId is undefined or empty from URL parameters. Cannot load projects.");
            setIsLoading(false);
            setError("No company ID provided in the URL.");
            return;
        }
        
        console.log("CompanyProjects: Attempting to load data for companyId:", companyId);

        setIsLoading(true);
        setError(null);
        try {
            const currentCompany = await DataService.getCompanyById(companyId); 
            console.log("CompanyProjects: Fetched currentCompany details:", currentCompany);
            
            if (!currentCompany) {
                setCompany(null);
                setIsLoading(false); 
                setError(`Company with ID '${companyId}' not found.`);
                console.warn(`CompanyProjects: Company with ID '${companyId}' not found.`);
                return;
            }
            setCompany(currentCompany);

            // Fetch ALL projects, ALL departments, and ALL tasks in parallel
            const [allProjects, allDepartments, allTasks] = await Promise.all([
                DataService.getAllProjects(),
                DataService.getDepartments(),
                DataService.getAllTasks() // Fetch all tasks ONCE
            ]);
            console.log("CompanyProjects: All projects fetched (first 2 items):", allProjects.slice(0,2), "Total:", allProjects.length);
            console.log("CompanyProjects: All departments fetched (first 2 items):", allDepartments.slice(0,2), "Total:", allDepartments.length);
            console.log("CompanyProjects: All tasks fetched (first 2 items):", allTasks.slice(0,2), "Total:", allTasks.length);


            const companyProjects = allProjects.filter(p => {
                const projectCompanyId = typeof p.companyId === 'string' ? p.companyId.trim() : String(p.companyId).trim();
                const targetCompanyId = companyId.trim();
                return projectCompanyId === targetCompanyId;
            });

            console.log(`CompanyProjects: Filtered projects for company ID '${companyId}' (total ${companyProjects.length} projects):`, companyProjects);

            if (companyProjects.length === 0) {
                console.log(`CompanyProjects: No projects found for company '${currentCompany.name}' (ID: '${companyId}') after filtering.`);
            }

            const projectsWithDetailsPromises = companyProjects.map(async p => {
                // Filter tasks for the current project from the 'allTasks' list
                const projectTasks = allTasks.filter(task => task.projectId === p.id); // Optimized filtering
                
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                
                const departmentNames = Array.isArray(p.departmentIds) 
                    ? p.departmentIds.map(id => allDepartments.find(d => d.id === id)?.name).filter(Boolean).join(', ')
                    : 'N/A';
                
                return {
                    ...p,
                    progress,
                    departmentNames,
                    companyName: currentCompany.name, 
                };
            });
            const projectsWithDetails = await Promise.all(projectsWithDetailsPromises);
            setProjects(projectsWithDetails);
            console.log("CompanyProjects: Final projects with details set:", projectsWithDetails);

        } catch (err) {
            console.error("CompanyProjects: Failed to load company projects:", err);
            setError("Failed to load projects. An error occurred.");
            setCompany(null); 
            setProjects([]); 
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return <div className="text-center p-8 text-slate-500">Loading projects...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-600">{error}</div>;
    }

    if (!company) {
        return <div className="text-center p-8 text-red-600">Company not found or failed to load company details.</div>;
    }

    return (
        <div>
            <Link to="/companies" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Back to Companies
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Projects for {company.name}</h1>
            
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(project => (
                        <ProjectCard 
                            key={project.id} 
                            project={project} 
                            progress={project.progress} 
                            departmentNames={project.departmentNames}
                            companyName={project.companyName}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <h3 className="text-xl font-semibold text-slate-700">No Projects Found</h3>
                    <p className="text-slate-500 mt-2">This company does not have any projects yet.</p>
                </div>
            )}
        </div>
    );
};

export default CompanyProjects;