import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
// Ensure all necessary types are imported.
// ProjectMilestone now has description, startDate, endDate.
import { Project, ProjectMilestone, MilestoneStatus } from '../../types'; 
import { TrashIcon } from '../../constants'; // Assuming TrashIcon is correctly imported from here

interface RoadmapBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSave: (roadmap: ProjectMilestone[]) => void;
}

const RoadmapBuilderModal: React.FC<RoadmapBuilderModalProps> = ({ isOpen, onClose, project, onSave }) => {
    const [roadmap, setRoadmap] = useState<ProjectMilestone[]>([]);

    useEffect(() => {
        if (isOpen) {
            // IMPORTANT: Create a deep copy of the roadmap from the project prop.
            // Ensure each milestone has a proper ID and adheres to the now-updated ProjectMilestone interface.
            const initialRoadmap = (project.roadmap || []).map(ms => ({
                ...ms, // Spread existing properties (id, name, status)
                id: ms.id || `ms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Ensure ID is present
                name: ms.name || 'New Milestone',
                // Now including description, startDate, endDate as per updated types.ts
                description: ms.description || '', 
                startDate: ms.startDate || new Date().toISOString().split('T')[0], // Default current date
                endDate: ms.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 week later
                status: ms.status || MilestoneStatus.PENDING,
            }));
            setRoadmap(initialRoadmap);
        }
    }, [isOpen, project.roadmap]);

    const handleAddMilestone = () => {
        const newMilestone: ProjectMilestone = {
            id: `ms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: 'New Milestone',
            description: '', // Include description
            startDate: new Date().toISOString().split('T')[0], // Include startDate
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Include endDate
            status: MilestoneStatus.PENDING,
        };
        setRoadmap(prev => [...prev, newMilestone]);
        console.log("Milestone added:", newMilestone);
    };

    const handleRemoveMilestone = (id: string) => {
        setRoadmap(prev => prev.filter(ms => ms.id !== id));
        console.log("Milestone removed:", id);
    };

    // This handleChange is generic and correctly updates a specific field of a specific milestone.
    const handleChange = (id: string, field: keyof ProjectMilestone, value: string) => {
        setRoadmap(prev => prev.map(ms => ms.id === id ? { ...ms, [field]: value } : ms));
        console.log(`Milestone ${id} field ${String(field)} changed to: ${value}`);
    };

    const handleSave = () => {
        onSave(roadmap);
        console.log("Roadmap saved (passing to parent):", roadmap);
        // onClose(); // Consider if modal should close immediately on save, or parent handles
    };

    // Helper to format ISO date string to 'YYYY-MM-DD' for date inputs
    const formatDateForInput = (isoDate?: string) => (isoDate ? isoDate.split('T')[0] : '');

    return (
        <Modal title={`Roadmap for "${project.name}"`} isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {roadmap.map(milestone => (
                    <div key={milestone.id} className="p-4 border rounded-lg bg-slate-50 relative">
                        <button
                            type="button"
                            onClick={() => handleRemoveMilestone(milestone.id)}
                            className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                            title="Remove milestone"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id={`name-${milestone.id}`}
                                label="Milestone Name"
                                type="text"
                                value={milestone.name}
                                onChange={e => handleChange(milestone.id, 'name', e.target.value)}
                            />
                             <div>
                                <label htmlFor={`status-${milestone.id}`} className="block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    id={`status-${milestone.id}`}
                                    value={milestone.status}
                                    onChange={e => handleChange(milestone.id, 'status', e.target.value as MilestoneStatus)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md shadow-sm"
                                >
                                    {Object.values(MilestoneStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            {/* Restored Description textarea */}
                            <div className="col-span-2">
                                <label htmlFor={`desc-${milestone.id}`} className="block text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    id={`desc-${milestone.id}`}
                                    rows={2}
                                    value={milestone.description || ''} // Use || '' to handle optional string
                                    onChange={e => handleChange(milestone.id, 'description', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm"
                                />
                            </div>
                            {/* Restored Start Date Input */}
                            <Input
                                id={`start-${milestone.id}`}
                                label="Start Date"
                                type="date"
                                value={formatDateForInput(milestone.startDate)}
                                onChange={e => handleChange(milestone.id, 'startDate', e.target.value)}
                            />
                            {/* Restored End Date Input */}
                            <Input
                                id={`end-${milestone.id}`}
                                label="End Date"
                                type="date"
                                value={formatDateForInput(milestone.endDate)}
                                onChange={e => handleChange(milestone.id, 'endDate', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
                <Button onClick={handleAddMilestone} fullWidth>
                    Add Milestone
                </Button>
            </div>
            <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border">Cancel</button>
                <Button type="button" onClick={handleSave}>Save Roadmap</Button>
            </div>
        </Modal>
    );
};

export default RoadmapBuilderModal;
//pz