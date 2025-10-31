import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../../types';
import { CalendarIcon, BriefcaseIcon, BuildingOfficeIcon, UsersIcon } from '../../constants';

interface ProjectCardProps {
    project: Project;
    progress: number;
    departmentNames: string;
    companyName?: string;
    overallStatus?: string;
    managerNames?: string;
    employeeNames?: string;
    linkState?: any;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, progress, departmentNames, companyName, overallStatus, managerNames, employeeNames, linkState }) => {

    const priorityStyles = {
        low: 'bg-slate-100 text-slate-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-red-100 text-red-800',
    };

    return (
        <Link to={`/projects/${project.id}`} state={linkState} className="block bg-white rounded-lg shadow p-5 border border-slate-200 hover:shadow-lg hover:border-indigo-500 transition-all duration-300">
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-slate-800">{project.name}</h3>
                    {project.priority && (
                        <span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full ${priorityStyles[project.priority]}`}>
                            {project.priority}
                        </span>
                    )}
                </div>
                
                {/* Description */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{project.description}</p>
                
                <div className="space-y-2 mb-4 flex-grow">
                    {companyName && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <BuildingOfficeIcon className="h-5 w-5 text-slate-400" />
                            <span>{companyName}</span>
                        </div>
                    )}
                    {departmentNames && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <UsersIcon className="h-5 w-5 text-slate-400" />
                            <span className="truncate">{departmentNames}</span>
                        </div>
                    )}
                    {overallStatus && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <BriefcaseIcon className="h-5 w-5 text-slate-400" />
                            <span>Status: {overallStatus}</span>
                        </div>
                    )}
                </div>

                {/* People */}
                {(managerNames || employeeNames) && (
                    <div className="space-y-1 text-sm text-slate-500 mb-4">
                        {managerNames && (
                            <div className="flex items-center space-x-2">
                                <BriefcaseIcon className="h-4 w-4" />
                                <span>Managers: {managerNames}</span>
                            </div>
                        )}
                        {employeeNames && (
                            <div className="flex items-center space-x-2">
                                <UsersIcon className="h-4 w-4" />
                                <span className="truncate">Working: {employeeNames}</span>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Meta */}
                <div className="flex items-center justify-between text-sm text-slate-500 mb-3">
                    {project.deadline && (
                        <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1.5" />
                            <span>{new Date(project.deadline).toLocaleDateString()}</span>
                        </div>
                    )}
                    {project.estimatedTime !== undefined && (
                        <div className="flex items-center">
                            <BriefcaseIcon className="h-4 w-4 mr-1.5" />
                            <span>{project.estimatedTime} hours</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-slate-700">Progress</span>
                        <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProjectCard;