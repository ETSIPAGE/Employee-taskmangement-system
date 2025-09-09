import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as DataService from '../../services/dataService';
import { Department, Project, TaskStatus, Company } from '../../types';
import ProjectCard from '../projects/ProjectCard';

const DepartmentProjects: React.FC = () => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const [department, setDepartment] = useState<Department | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(() => {
        if (!departmentId) return;
        setIsLoading(true);
        try {
            const currentDepartment = DataService.getDepartmentById(departmentId);
            if (!currentDepartment) {
                setDepartment(null);
                return;
            }
            setDepartment(currentDepartment);

            const allCompanies = DataService.getCompanies();
            const currentCompany = allCompanies.find(c => c.id === currentDepartment.companyId);
            setCompany(currentCompany || null);

            const departmentProjects = DataService.getProjectsByDepartment(departmentId);
            const allDepts = DataService.getDepartments();

            const projectsWithDetails = departmentProjects.map(p => {
                const projectTasks = DataService.getTasksByProject(p.id);
                const completedTasks = projectTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
                const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                const departmentNames = p.departmentIds.map(id => allDepts.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                const projCompany = allCompanies.find(c => c.id === p.companyId);
                
                return {
                    ...p,
                    progress,
                    departmentNames,
                    companyName: projCompany?.name || 'N/A',
                };
            });
            setProjects(projectsWithDetails);

        } catch (error) {
            console.error("Failed to load department projects:", error);
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
                            progress={project.progress} 
                            departmentNames={project.departmentNames}
                            companyName={project.companyName}
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