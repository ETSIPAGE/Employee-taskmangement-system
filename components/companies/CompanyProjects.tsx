import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Company, Project, TaskStatus } from '../../types';
import ProjectCard from '../projects/ProjectCard';

const CompanyProjects: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            const currentCompany = DataService.getCompanyById(companyId); // This is still mock data
            if (!currentCompany) {
                setCompany(null);
                return;
            }
            setCompany(currentCompany);

            const [companyProjects, depts] = await Promise.all([
                DataService.getProjectsByCompany(companyId),
                DataService.getDepartments()
            ]);

            const projectsWithDetailsPromises = companyProjects.map(async p => {
                const projectTasks = await DataService.getTasksByProject(p.id);
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                const departmentNames = p.departmentIds.map(id => depts.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                
                return {
                    ...p,
                    progress,
                    departmentNames,
                    companyName: currentCompany.name,
                };
            });
            const projectsWithDetails = await Promise.all(projectsWithDetailsPromises);
            setProjects(projectsWithDetails);

        } catch (error) {
            console.error("Failed to load company projects:", error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return <div className="text-center p-8">Loading projects...</div>;
    }

    if (!company) {
        return <div className="text-center p-8">Company not found.</div>;
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
//pz
