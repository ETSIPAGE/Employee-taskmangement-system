import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Input from '../shared/Input';
import { Project, ProjectMilestone, MilestoneStatus } from '../../types';
import { TrashIcon } from '../../constants';

interface RoadmapBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSave: (roadmap: ProjectMilestone[]) => void;
    isSaving?: boolean;
}

const RoadmapBuilderModal: React.FC<RoadmapBuilderModalProps> = ({ isOpen, onClose, project, onSave, isSaving }) => {
    const [roadmap, setRoadmap] = useState<ProjectMilestone[]>([]);

    useEffect(() => {
        if (isOpen) {
            setRoadmap(project.roadmap || []);
        }
    }, [isOpen, project.roadmap]);

    const handleAddMilestone = () => {
        const newMilestone: ProjectMilestone = {
            id: `ms-${Date.now()}`,
            name: 'New Milestone',
            description: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week later
            status: MilestoneStatus.PENDING,
        };
        setRoadmap(prev => [...prev, newMilestone]);
    };

    const handleRemoveMilestone = (id: string) => {
        setRoadmap(prev => prev.filter(ms => ms.id !== id));
    };

    const handleChange = (id: string, field: keyof ProjectMilestone, value: string) => {
        setRoadmap(prev => prev.map(ms => ms.id === id ? { ...ms, [field]: value } : ms));
    };

    const handleSave = () => {
        onSave(roadmap);
    };

    const formatDateForInput = (isoDate: string) => isoDate ? isoDate.split('T')[0] : '';

    return (
        <Modal title={`Roadmap for "${project.name}"`} isOpen={isOpen} onClose={onClose}>
            {/* Saving overlay indicator */}
            {isSaving && (
                <div className="mb-3 flex items-center text-sm text-slate-600">
                    <span className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
                    Saving roadmap...
                </div>
            )}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {roadmap.map(milestone => (
                    <div key={milestone.id} className="p-4 border rounded-lg bg-slate-50 relative opacity-100">
                        <button
                            type="button"
                            onClick={() => !isSaving && handleRemoveMilestone(milestone.id)}
                            className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                            disabled={!!isSaving}
                        >
                            <TrashIcon />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id={`name-${milestone.id}`}
                                label="Milestone Name"
                                value={milestone.name}
                                onChange={e => handleChange(milestone.id, 'name', e.target.value)}
                                disabled={!!isSaving}
                            />
                             <div>
                                <label htmlFor={`status-${milestone.id}`} className="block text-sm font-medium text-slate-700">Status</label>
                                <select
                                    id={`status-${milestone.id}`}
                                    value={milestone.status}
                                    onChange={e => handleChange(milestone.id, 'status', e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 rounded-md shadow-sm disabled:opacity-50"
                                    disabled={!!isSaving}
                                >
                                    {Object.values(MilestoneStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label htmlFor={`desc-${milestone.id}`} className="block text-sm font-medium text-slate-700">Description</label>
                                <textarea
                                    id={`desc-${milestone.id}`}
                                    rows={2}
                                    value={milestone.description}
                                    onChange={e => handleChange(milestone.id, 'description', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm disabled:opacity-50"
                                    disabled={!!isSaving}
                                />
                            </div>
                            <Input
                                id={`start-${milestone.id}`}
                                label="Start Date"
                                type="date"
                                value={formatDateForInput(milestone.startDate)}
                                onChange={e => handleChange(milestone.id, 'startDate', e.target.value)}
                                disabled={!!isSaving}
                            />
                            <Input
                                id={`end-${milestone.id}`}
                                label="End Date"
                                type="date"
                                value={formatDateForInput(milestone.endDate)}
                                onChange={e => handleChange(milestone.id, 'endDate', e.target.value)}
                                disabled={!!isSaving}
                            />
                        </div>
                    </div>
                ))}
                <Button onClick={handleAddMilestone} fullWidth disabled={!!isSaving}>
                    Add Milestone
                </Button>
            </div>
            <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border disabled:opacity-50" disabled={!!isSaving}>Cancel</button>
                <Button type="button" onClick={handleSave} disabled={!!isSaving}>
                    {isSaving ? (
                        <span className="inline-flex items-center">
                            <span className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                            Saving...
                        </span>
                    ) : (
                        'Save Roadmap'
                    )}
                </Button>
            </div>
        </Modal>
    );
};

export default RoadmapBuilderModal;
