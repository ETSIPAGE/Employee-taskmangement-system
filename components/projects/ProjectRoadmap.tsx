import React, { useState, useEffect, useRef } from 'react';
import { ProjectMilestone, MilestoneStatus } from '../../types';
import { CheckCircleIcon, ArrowPathIcon, ClockIcon, CheckIcon } from '../../constants';

interface ProjectRoadmapProps {
    roadmap: ProjectMilestone[];
    onUpdate?: (milestoneId: string, newStatus: MilestoneStatus) => void;
}

const ProjectRoadmap: React.FC<ProjectRoadmapProps> = ({ roadmap, onUpdate }) => {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    if (!roadmap || roadmap.length === 0) {
        return <p className="text-center text-slate-500 py-8">No roadmap has been defined for this project.</p>;
    }

    const sortedRoadmap = [...roadmap].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const getStatusStyles = (status: MilestoneStatus) => {
        switch (status) {
            case MilestoneStatus.COMPLETED:
                return {
                    timelineIconContainer: 'bg-green-500',
                    timelineIcon: <CheckIcon className="h-5 w-5 text-white" />,
                    cardBorder: 'border-green-500',
                    badgeContainer: 'bg-green-100 text-green-700',
                    badgeIcon: <CheckCircleIcon className="h-4 w-4" />,
                };
            case MilestoneStatus.IN_PROGRESS:
                return {
                    timelineIconContainer: 'bg-blue-500',
                    timelineIcon: <ArrowPathIcon className="h-5 w-5 text-white" />,
                    cardBorder: 'border-blue-500',
                    badgeContainer: 'bg-blue-100 text-blue-700',
                    badgeIcon: <ArrowPathIcon className="h-4 w-4" />,
                };
            case MilestoneStatus.PENDING:
            default:
                return {
                    timelineIconContainer: 'bg-white border-2 border-slate-400',
                    timelineIcon: <ClockIcon className="h-5 w-5 text-slate-400" />,
                    cardBorder: 'border-slate-400',
                    badgeContainer: 'bg-slate-100 text-slate-600',
                    badgeIcon: <ClockIcon className="h-4 w-4" />,
                };
        }
    };
    
    const handleStatusUpdate = (milestoneId: string, newStatus: MilestoneStatus) => {
        onUpdate?.(milestoneId, newStatus);
        setActiveDropdown(null);
    };

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {sortedRoadmap.map((milestone, milestoneIdx) => {
                    const styles = getStatusStyles(milestone.status);
                    return (
                        <li key={milestone.id}>
                            <div className="relative pb-8">
                                {milestoneIdx !== sortedRoadmap.length - 1 ? (
                                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex items-start space-x-3">
                                    <div>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${styles.timelineIconContainer}`}>
                                            {styles.timelineIcon}
                                        </div>
                                    </div>
                                    <div className={`min-w-0 flex-1 bg-white p-4 rounded-lg shadow-sm border ${styles.cardBorder} border-l-[3px]`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-800">{milestone.name}</p>
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {new Date(milestone.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(milestone.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <div className="relative flex-shrink-0" ref={activeDropdown === milestone.id ? dropdownRef : null}>
                                                <button
                                                    onClick={() => onUpdate && setActiveDropdown(activeDropdown === milestone.id ? null : milestone.id)}
                                                    className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badgeContainer}`}
                                                    aria-label={`Change status for ${milestone.name}`}
                                                    disabled={!onUpdate}
                                                >
                                                    {styles.badgeIcon}
                                                    {milestone.status}
                                                </button>
                                                
                                                {onUpdate && activeDropdown === milestone.id && (
                                                    <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-20 border animate-fade-in-up">
                                                        <p className="px-3 py-2 text-xs font-semibold text-slate-500 border-b">Change Status</p>
                                                        {Object.values(MilestoneStatus).map(status => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusUpdate(milestone.id, status)}
                                                                className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                            >
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-2">{milestone.description}</p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
             <style>{`
                 @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ProjectRoadmap;