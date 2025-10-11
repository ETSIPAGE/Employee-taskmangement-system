import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Company, Project, TaskStatus } from '../../types';
import ProjectCard from '../projects/ProjectCard';

const CompanyProjects: React.FC = () => {
    const { companyId: rawCompanyId } = useParams<{ companyId: string }>(); // Getting raw companyId from URL params
    const companyId = rawCompanyId || ''; // Ensure companyId is always a string

    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // Added error state

    const loadData = useCallback(async () => {
        if (!companyId) {
            console.warn("CompanyProjects: companyId is undefined or empty from URL parameters. Cannot load projects.");
            setIsLoading(false);
            setError("No company ID provided in the URL.");
            return;
        }
        
        console.log("CompanyProjects: Attempting to load data for companyId:", companyId); // <-- IMPORTANT DEBUG LOG

        setIsLoading(true);
        setError(null); // Clear previous errors
        try {
            // Fetch the current company details
            const currentCompany = await DataService.getCompanyById(companyId); 
            console.log("CompanyProjects: Fetched currentCompany details:", currentCompany); // <-- IMPORTANT DEBUG LOG
            
            if (!currentCompany) {
                setCompany(null);
                setIsLoading(false); 
                setError(`Company with ID '${companyId}' not found.`);
                console.warn(`CompanyProjects: Company with ID '${companyId}' not found.`);
                return;
            }
            setCompany(currentCompany);

            // Fetch all projects and all departments
            const [allProjects, depts] = await Promise.all([
                DataService.getAllProjects(), // Fetch ALL projects first
                DataService.getDepartments()
            ]);
            console.log("CompanyProjects: All projects fetched (first 2 items):", allProjects.slice(0,2), "Total:", allProjects.length); // <-- IMPORTANT DEBUG LOG
            console.log("CompanyProjects: All departments fetched (first 2 items):", depts.slice(0,2), "Total:", depts.length); // <-- IMPORTANT DEBUG LOG

            // --- CRITICAL FILTERING LOGIC ---
            const companyProjects = allProjects.filter(p => {
                // Defensive checks: Ensure p.companyId exists and is a string
                const projectCompanyId = typeof p.companyId === 'string' ? p.companyId.trim() : String(p.companyId).trim();
                const targetCompanyId = companyId.trim();

                const isMatch = projectCompanyId === targetCompanyId;
                
                // Detailed logging for each project if it doesn't match
                if (!isMatch) {
                    // console.log(`Project ID: ${p.id}, Project Name: ${p.name}, Project Company ID: '${projectCompanyId}' (Type: ${typeof p.companyId}) did NOT match target Company ID: '${targetCompanyId}' (Type: ${typeof targetCompanyId})`);
                }
                return isMatch;
            });
            // --- END CRITICAL FILTERING LOGIC ---

            console.log(`CompanyProjects: Filtered projects for company ID '${companyId}' (total ${companyProjects.length} projects):`, companyProjects); // <-- IMPORTANT DEBUG LOG

            if (companyProjects.length === 0) {
                console.log(`CompanyProjects: No projects found for company '${currentCompany.name}' (ID: '${companyId}') after filtering.`);
            }

            const projectsWithDetailsPromises = companyProjects.map(async p => {
                const projectTasks = await DataService.getTasksByProject(p.id);
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                
                // Ensure p.departmentIds is an array before mapping
                const departmentNames = Array.isArray(p.departmentIds) 
                    ? p.departmentIds.map(id => depts.find(d => d.id === id)?.name).filter(Boolean).join(', ')
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
            console.log("CompanyProjects: Final projects with details set:", projectsWithDetails); // <-- IMPORTANT DEBUG LOG

        } catch (err) {
            console.error("CompanyProjects: Failed to load company projects:", err);
            setError("Failed to load projects. An error occurred."); // Set user-friendly error
            setCompany(null); 
            setProjects([]); 
        } finally {
            setIsLoading(false);
        }
    }, [companyId]); // Dependency array should only include companyId

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