import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Link } from 'react-router-dom';
import { ProjectDisplayData } from './Projects';
import { CalendarIcon, BriefcaseIcon, DocumentTextIcon, UsersIcon } from '../../constants';
// Import MilestoneStatus for the dropdown options
import { MilestoneStatus } from '../../types'; // Assuming MilestoneStatus is suitable for overall project status

// NEW: Add onUpdateStatus prop
interface ProjectCardProps {
    project: ProjectDisplayData;
    onUpdateStatus?: (projectId: string, newStatus: string) => void; // Callback for status update
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onUpdateStatus }) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // State for dropdown visibility
    const dropdownRef = useRef<HTMLDivElement>(null); // Ref for click-outside detection

    // --- ADDED DIAGNOSTIC useEffect ---
    useEffect(() => {
        console.log(`[ProjectCard ${project.id}] Prop 'project.overallStatus' is: "${project.overallStatus}"`);
        console.log(`[ProjectCard ${project.id}] Prop 'project.progress' is: ${project.progress}%`);
        // You can also inspect the entire project object if needed:
        // console.log(`[ProjectCard ${project.id}] Full project prop:`, project);
    }, [project.overallStatus, project.progress, project.id]); // Dependencies to re-run when these props change
    // --- END DIAGNOSTIC useEffect ---


    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const priorityStyles = {
        low: 'bg-slate-100 text-slate-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-red-100 text-red-800',
    };

    const overallStatusStyles = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'On Hold': return 'bg-yellow-100 text-yellow-800';
            case 'Overdue': return 'bg-red-100 text-red-800';
            case 'Pending':
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleStatusUpdate = (newStatus: string) => {
        if (onUpdateStatus && project.id) {
            onUpdateStatus(project.id, newStatus);
        }
        setActiveDropdown(null); // Close dropdown after selection
    };

    return (
        <Link
            to={`/projects/${project.id}`}
            // Prevent navigation when clicking on the dropdown button/menu
            onClick={(e) => {
                if (activeDropdown) { // If dropdown is open, prevent navigating
                    e.preventDefault();
                    e.stopPropagation(); // Stop propagation to prevent card's Link click
                }
            }}
            className="block bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-lg transition-all duration-200 h-full"
        >
            <div className="flex flex-col space-y-3 h-full">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl text-slate-800">{project.name}</h3>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                        {project.priority && (
                            <span className={`capitalize text-xs font-semibold px-3 py-1 rounded-full ${priorityStyles[project.priority]}`}>
                                {project.priority}
                            </span>
                        )}
                        {/* Make the Overall Status badge clickable */}
                        <div className="relative" ref={activeDropdown === project.id ? dropdownRef : null}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault(); // Prevent navigating to project detail
                                    e.stopPropagation(); // Prevent parent Link click
                                    onUpdateStatus && setActiveDropdown(activeDropdown === project.id ? null : project.id);
                                }}
                                className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${overallStatusStyles(project.overallStatus)}`}
                                aria-label={`Change status for ${project.name}`}
                                disabled={!onUpdateStatus}
                            >
                                {project.overallStatus}
                            </button>

                            {/* Status Dropdown Menu */}
                            {onUpdateStatus && activeDropdown === project.id && (
                                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-20 border animate-fade-in-up">
                                    <p className="px-3 py-2 text-xs font-semibold text-slate-500 border-b">Change Status</p>
                                    {/* Use MilestoneStatus enum for options, map to string for callback */}
                                    {Object.values(MilestoneStatus).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusUpdate(status)} // Pass status string
                                            className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 pt-1 flex-grow overflow-hidden text-ellipsis line-clamp-2">{project.description}</p>

                {/* Details List */}
                <div className="space-y-3 text-sm text-slate-700 pt-2">
                    {project.companyName && (
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            <span>{project.companyName}</span>
                        </div>
                    )}
                    {project.departmentNames && (
                        <div className="flex items-center space-x-3">
                            <UsersIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{project.departmentNames}</span>
                        </div>
                    )}
                    {project.managerName && (
                        <div className="flex items-center space-x-3">
                            <BriefcaseIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            <span>Manager: {project.managerName}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between !mt-4">
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-5 w-5 text-slate-400" />
                            <span>{project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {project.estimatedTime !== undefined && (
                            <div className="flex items-center space-x-2">
                                <BriefcaseIcon className="h-4 w-4 text-slate-400" />
                                <span>{project.estimatedTime} hours</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="pt-3 mt-auto">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-700">Progress</span>
                        <span className="text-sm font-bold text-blue-600">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.progress}%` }}></div>
                    </div>
                </div>
            </div>
             <style>{`
                 @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
            `}</style>
        </Link>
    );
};

export default ProjectCard;
//pz
