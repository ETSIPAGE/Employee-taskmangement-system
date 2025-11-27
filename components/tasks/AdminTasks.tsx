import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import * as AuthService from '../../services/authService';
import * as DataService from '../../services/dataService';
import { Project, Task, TaskStatus, User, UserRole, Department, Company } from '../../types';

import TaskCard from './TaskCard';
import ViewSwitcher from '../shared/ViewSwitcher';
import { EditIcon, TrashIcon } from '../../constants';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import Input from '../shared/Input';

// --- MultiSelect Component ---
interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    label: string;
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selectedValues, onChange, placeholder = "Select...", disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const removeTag = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };

    const selectedLabels = selectedValues.map(v => options.find(o => o.value === v)?.label).filter(Boolean);

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <div
                className={`min-h-[42px] w-full border rounded-md shadow-sm px-3 py-2 bg-white cursor-pointer flex flex-wrap gap-2 items-center transition-all duration-200 ${isOpen ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400'} ${disabled ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedValues.length === 0 && (
                    <span className="text-slate-400 text-sm">{placeholder}</span>
                )}
                {selectedValues.map(value => {
                    const option = options.find(o => o.value === value);
                    return (
                        <span key={value} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            {option?.label || value}
                            <button
                                type="button"
                                onClick={(e) => removeTag(e, value)}
                                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600 focus:outline-none"
                            >
                                <span className="sr-only">Remove</span>
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </span>
                    );
                })}
                <div className="ml-auto">
                    <svg className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-xl rounded-md border border-slate-200 py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none sm:text-sm animate-in fade-in zoom-in duration-100">
                    <div className="px-2 py-2 border-b border-slate-100">
                        <input
                            type="text"
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-60 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-slate-500">No options found.</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 transition-colors ${selectedValues.includes(option.value) ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-slate-900'}`}
                                    onClick={() => toggleOption(option.value)}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 mr-3 pointer-events-none"
                                            checked={selectedValues.includes(option.value)}
                                            readOnly
                                        />
                                        <span className="block truncate">{option.label}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---

interface HydratedTask extends Task {
    projectName: string;
    assigneeName: string;
    companyName?: string;
    departmentName?: string;
}

export default function AdminTasks() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [hydratedTasks, setHydratedTasks] = useState<HydratedTask[]>([]);
    const [allEmployees, setAllEmployees] = useState<User[]>([]);
    const [allManagers, setAllManagers] = useState<User[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'card' | 'table'>('card');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiDepartments, setApiDepartments] = useState<Department[]>([]);
    const [apiCompanies, setApiCompanies] = useState<Company[]>([]);
    const [apiProjects, setApiProjects] = useState<Project[]>([]);
    const [dropdownsLoading, setDropdownsLoading] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string } | null>(null);
    const [deptSearch, setDeptSearch] = useState('');
    const [newTaskData, setNewTaskData] = useState({
        company: '',
        departments: [] as string[],
        project: '',
        titles: [] as string[],
        description: '',
        due_date: '',
        priority: 'medium',
        est_time: '',
        assign_to: [] as string[]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');
    const [assigneeFilter, setAssigneeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadData = useCallback(async () => {
        if (!user || user.role !== UserRole.ADMIN) return;
        setIsLoading(true);
        try {
            const [tasks, projects, allUsersFromApi, departments, companies] = await Promise.all([
                DataService.getAllTasks(),
                DataService.getAllProjects(),
                DataService.getAllUsersFromApi(),
                DataService.getDepartments(),
                DataService.getCompanies().catch(() => []),
            ]);

            setAllProjects(projects);
            const employees = allUsersFromApi.filter(u => u.role === UserRole.EMPLOYEE);
            const managers = allUsersFromApi.filter(u => u.role === UserRole.MANAGER);
            setAllEmployees(employees);
            setAllManagers(managers);
            setAllDepartments(departments);
            setAllCompanies(companies || []);

            const projectsMap = new Map(projects.map(p => [p.id, p]));
            const departmentsMap = new Map(departments.map(d => [d.id, d]));
            const companiesMap = new Map((companies || []).map(c => [c.id, c]));
            const usersMap = new Map(allUsersFromApi.map(u => [u.id, u]));

            const newHydratedTasks = tasks.map(task => ({
                ...task,
                projectName: projectsMap.get(task.projectId)?.name || 'N/A',
                companyName: (() => {
                    const proj = projectsMap.get(task.projectId);
                    if (!proj) return undefined;
                    const cid = (proj as any).companyId;
                    return cid ? companiesMap.get(cid)?.name : undefined;
                })(),
                departmentName: (() => {
                    const proj = projectsMap.get(task.projectId) as any;
                    const deptIds: string[] = Array.isArray(proj?.departmentIds) ? proj.departmentIds : [];
                    const first = deptIds[0];
                    return first ? departmentsMap.get(first)?.name : undefined;
                })(),
                assigneeName: Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0
                    ? task.assigneeIds
                        .map(id => usersMap.get(id)?.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'Unassigned',
            }));
            setHydratedTasks(newHydratedTasks);

        } catch (error) {
            console.error("Failed to load admin task data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (isModalOpen) {
            const fetchDropdownData = async () => {
                setDropdownsLoading(true);
                try {
                    const [companies, depts, projs] = await Promise.all([
                        DataService.getCompanies(),
                        DataService.getDepartments(),
                        DataService.getAllProjects()
                    ]);
                    setApiCompanies(companies || []);
                    setApiDepartments(depts);
                    setApiProjects(projs);
                    if (companies && companies.length > 0) {
                        const defaultCompanyId = companies[0].id;
                        setNewTaskData(prev => ({
                            ...prev,
                            company: defaultCompanyId,
                            departments: []
                        }));
                    }
                    if (projs.length > 0) {
                        setNewTaskData(prev => ({ ...prev, project: projs[0].id }));
                    }
                } catch (error) {
                    console.error("Failed to fetch dropdown data:", error);
                } finally {
                    setDropdownsLoading(false);
                }
            };
            fetchDropdownData();
        }
    }, [isModalOpen]);

    const filteredManagers = useMemo(() => {
        if (newTaskData.departments.length === 0) return allManagers;
        return allManagers.filter(m => Array.isArray(m.departmentIds) && m.departmentIds.some(id => newTaskData.departments.includes(id)));
    }, [allManagers, newTaskData.departments]);

    const filteredEmployees = useMemo(() => {
        if (newTaskData.departments.length === 0) return allEmployees;
        return allEmployees.filter(e => Array.isArray(e.departmentIds) && e.departmentIds.some(id => newTaskData.departments.includes(id)));
    }, [allEmployees, newTaskData.departments]);

    const filteredDepartments = useMemo(() => {
        if (!newTaskData.company) return apiDepartments;
        return apiDepartments.filter(d => d.companyId === newTaskData.company);
    }, [apiDepartments, newTaskData.company]);

    const deptTitleMap = useMemo<Record<string, string[]>>(() => ({
        'business dev': ['Market Research', 'Client Relations', 'Sales Support', 'Proposal Dev', 'Partnerships', 'New Business Init', 'Contract Mgmt', 'Cust Acq Strategy'],
        'business department': ['Market Research', 'Client Relations', 'Sales Support', 'Proposal Dev', 'Partnerships', 'New Business Init', 'Contract Mgmt', 'Cust Acq Strategy'],
        'business development': ['Market Research', 'Client Relations', 'Sales Support', 'Proposal Dev', 'Partnerships', 'New Business Init', 'Contract Mgmt', 'Cust Acq Strategy'],
        'operations': ['Project Mgmt', 'Drone Ops', 'Pilot Coord', 'Logistics Sched', 'Fleet Mgmt', 'Quality Assur', 'Site Survey', 'Aerial Survey'],
        'sales marketing': ['Lead Gen', 'Digital Mktg', 'Social Media Mgmt', 'Public Relations', 'Content Creation', 'Customer Outreach', 'Market Analytics', 'Prod Marketing'],
        'sales marketing department': ['Lead Gen', 'Digital Mktg', 'Social Media Mgmt', 'Public Relations', 'Content Creation', 'Customer Outreach', 'Market Analytics', 'Prod Marketing'],
        'tech research': ['Tech Research', 'Drone R&D', 'AI Robotics Int', 'Software Dev', 'Drone Customization', 'Advanced Sensor Tech', 'Data Analytics', 'Innovation Prototyp'],
        'tech research department': ['Tech Research', 'Drone R&D', 'AI Robotics Int', 'Software Dev', 'Drone Customization', 'Advanced Sensor Tech', 'Data Analytics', 'Innovation Prototyp'],
        'ipage training dept': ['IPage Training Dept', 'Drone Pilot Trng', 'Flight Safety Trng', 'Aerial Mapping Trng', 'Surveying Tech Trng', 'Drone Ops Trng', 'Data Processing', 'GIS Mapping Trng', 'LiDAR Tech Trng', 'Thermal Imaging', 'Agri Drone Apps', 'Infra Monitoring', 'Emergency Resp Trng', 'Media Drone Trng', 'Fleet Mgmt Trng', 'Post-Processing', 'Battery Maint Trng', 'Equip Maint Trng', 'Customer Handling', 'Facility Spec Adjust'],
        'ipage training department': ['IPage Training Dept', 'Drone Pilot Trng', 'Flight Safety Trng', 'Aerial Mapping Trng', 'Surveying Tech Trng', 'Drone Ops Trng', 'Data Processing', 'GIS Mapping Trng', 'LiDAR Tech Trng', 'Thermal Imaging', 'Agri Drone Apps', 'Infra Monitoring', 'Emergency Resp Trng', 'Media Drone Trng', 'Fleet Mgmt Trng', 'Post-Processing', 'Battery Maint Trng', 'Equip Maint Trng', 'Customer Handling', 'Facility Spec Adjust'],
        'finance accounts': ['Finance Accounts', 'Budget Forecasting', 'Payroll Mgmt', 'Financial Reports', 'Tax Compliance', 'Accounts Pay Rec', 'Auditing Recon', 'Vendor Payments'],
        'finance accounts department': ['Finance Accounts', 'Budget Forecasting', 'Payroll Mgmt', 'Financial Reports', 'Tax Compliance', 'Accounts Pay Rec', 'Auditing Recon', 'Vendor Payments'],
        'hr': ['HR', 'Recruitment Staff', 'Employee Training', 'Compensation Ben', 'Employee Relations', 'Perf Mgmt', 'HR Compliance', 'Payroll Process'],
        'hr department': ['HR', 'Recruitment Staff', 'Employee Training', 'Compensation Ben', 'Employee Relations', 'Perf Mgmt', 'HR Compliance', 'Payroll Process'],
        'legal compliance': ['Legal Compliance', 'Regulatory Compl', 'Contracts Agreemts', 'Risk Mgmt', 'Airspace Regs', 'Licensing Certs', 'Govt Liaison', 'IP Protection'],
        'legal compliance department': ['Legal Compliance', 'Regulatory Compl', 'Contracts Agreemts', 'Risk Mgmt', 'Airspace Regs', 'Licensing Certs', 'Govt Liaison', 'IP Protection'],
        'cust support': ['Cust Support', 'Tech Support', 'Client Comm', 'Issue Resolution', 'SLA Mgmt', 'Service Monitor', 'After Sales Supp', 'Troubleshooting'],
        'customer support': ['Cust Support', 'Tech Support', 'Client Comm', 'Issue Resolution', 'SLA Mgmt', 'Service Monitor', 'After Sales Supp', 'Troubleshooting'],
        'cust support department': ['Cust Support', 'Tech Support', 'Client Comm', 'Issue Resolution', 'SLA Mgmt', 'Service Monitor', 'After Sales Supp', 'Troubleshooting'],
        'customer support department': ['Cust Support', 'Tech Support', 'Client Comm', 'Issue Resolution', 'SLA Mgmt', 'Service Monitor', 'After Sales Supp', 'Troubleshooting'],
        'it infra': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'it infra department': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'information technology infrastruct': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'information technology infrastructure': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'information technology infrastructure and software development': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'information technology infrastructure & software development': ['IT Infra', 'Soft Development', 'Network Mgmt', 'Cybersecurity', 'Cloud Services', 'Software Maint', 'Data Backup', 'Equip Maint', 'System Integr'],
        'procurement sc': ['Procurement SC', 'Vendor Mgmt', 'Inventory Mgmt', 'Equip Sourcing', 'Supplier Relations', 'PO Processing', 'Import Export', 'SC Optimization'],
        'procurement sc department': ['Procurement SC', 'Vendor Mgmt', 'Inventory Mgmt', 'Equip Sourcing', 'Supplier Relations', 'PO Processing', 'Import Export', 'SC Optimization'],
        'procurement & supply chain department': ['Procurement SC', 'Vendor Mgmt', 'Inventory Mgmt', 'Equip Sourcing', 'Supplier Relations', 'PO Processing', 'Import Export', 'SC Optimization'],
        'procurement and supply chain department': ['Procurement SC', 'Vendor Mgmt', 'Inventory Mgmt', 'Equip Sourcing', 'Supplier Relations', 'PO Processing', 'Import Export', 'SC Optimization'],
        'procurement supply chain': ['Procurement SC', 'Vendor Mgmt', 'Inventory Mgmt', 'Equip Sourcing', 'Supplier Relations', 'PO Processing', 'Import Export', 'SC Optimization'],
        'maintenance repair': ['Maintenance Repair', 'Drone Maint', 'Battery Mgmt', 'Repair Upkeep', 'Maint Scheduling', 'Equip Testing', 'Equip Calibration', 'Service Logs'],
        'maintenance repair department': ['Maintenance Repair', 'Drone Maint', 'Battery Mgmt', 'Repair Upkeep', 'Maint Scheduling', 'Equip Testing', 'Equip Calibration', 'Service Logs'],
        'maintenance & repair department': ['Maintenance Repair', 'Drone Maint', 'Battery Mgmt', 'Repair Upkeep', 'Maint Scheduling', 'Equip Testing', 'Equip Calibration', 'Service Logs'],
        'maintenance and repair department': ['Maintenance Repair', 'Drone Maint', 'Battery Mgmt', 'Repair Upkeep', 'Maint Scheduling', 'Equip Testing', 'Equip Calibration', 'Service Logs'],
        'gis department': ['GIS Department', 'Spatial Data Coll', 'GIS Mapping', 'GIS Analysis', 'Remote Sensing', 'GIS Database Mgmt', 'Cartography'],
        'geographic information systems (gis) department': ['GIS Department', 'Spatial Data Coll', 'GIS Mapping', 'GIS Analysis', 'Remote Sensing', 'GIS Database Mgmt', 'Cartography'],
        'geographic information systems department': ['GIS Department', 'Spatial Data Coll', 'GIS Mapping', 'GIS Analysis', 'Remote Sensing', 'GIS Database Mgmt', 'Cartography'],
        'geographic information systems': ['GIS Department', 'Spatial Data Coll', 'GIS Mapping', 'GIS Analysis', 'Remote Sensing', 'GIS Database Mgmt', 'Cartography'],
        'dgps survey dept': ['DGPS Survey Dept', 'DGPS Equip Maint', 'DGPS Data Coll', 'Survey Coord', 'Field Survey Ops', 'Post-Processing', 'Survey Logs'],
        'dgps survey department': ['DGPS Survey Dept', 'DGPS Equip Maint', 'DGPS Data Coll', 'Survey Coord', 'Field Survey Ops', 'Post-Processing', 'Survey Logs'],
        'differential global positioning system (dgps) survey': ['DGPS Survey Dept', 'DGPS Equip Maint', 'DGPS Data Coll', 'Survey Coord', 'Field Survey Ops', 'Post-Processing', 'Survey Logs'],
        'differential global positioning system (dgps) survey department': ['DGPS Survey Dept', 'DGPS Equip Maint', 'DGPS Data Coll', 'Survey Coord', 'Field Survey Ops', 'Post-Processing', 'Survey Logs'],
        'differential global positioning system survey': ['DGPS Survey Dept', 'DGPS Equip Maint', 'DGPS Data Coll', 'Survey Coord', 'Field Survey Ops', 'Post-Processing', 'Survey Logs'],
        'ida drone pilots': ['Drone Pilot Trng', 'DGCA Cert Programs', 'Corporate Training', 'Edu Partnerships', 'Instructor Mgmt', 'Curriculum Dev', 'Training Facilities', 'Student Coord', 'Flight Sim Trng', 'Practical Flight Ops', 'Exam Prep', 'Safety Compliance', 'Pilot Cert Mgmt', 'Flight Safety Protocols'],
        'ida drone pilots department': ['Drone Pilot Trng', 'DGCA Cert Programs', 'Corporate Training', 'Edu Partnerships', 'Instructor Mgmt', 'Curriculum Dev', 'Training Facilities', 'Student Coord', 'Flight Sim Trng', 'Practical Flight Ops', 'Exam Prep', 'Safety Compliance', 'Pilot Cert Mgmt', 'Flight Safety Protocols'],
        'ida training edu': ['Drone Pilot Trng', 'DGCA Cert Programs', 'Corporate Training', 'Edu Partnerships', 'Instructor Mgmt', 'Curriculum Dev', 'Training Facilities'],
        'ida training education': ['Drone Pilot Trng', 'DGCA Cert Programs', 'Corporate Training', 'Edu Partnerships', 'Instructor Mgmt', 'Curriculum Dev', 'Training Facilities'],
        'ida training education department': ['Drone Pilot Trng', 'DGCA Cert Programs', 'Corporate Training', 'Edu Partnerships', 'Instructor Mgmt', 'Curriculum Dev', 'Training Facilities'],
        'ipage media dept': ['Video Prod', 'Aerial Photography', 'Post Production', 'Video Editing', 'Content Dist', 'Drone Videography', 'Media Planning', 'Live Streaming'],
        'ipage media department': ['Video Prod', 'Aerial Photography', 'Post Production', 'Video Editing', 'Content Dist', 'Drone Videography', 'Media Planning', 'Live Streaming'],
        'ipage drone pilots': ['Aerial Survey', 'Drone Filming', 'Mapping Ops', 'Flight Planning', 'Time Lapse Shots', '360 Cam Shoots', 'Maint Logs', 'Battery Monitoring', 'Flight Data Logs'],
        'ipage drone pilots department': ['Aerial Survey', 'Drone Filming', 'Mapping Ops', 'Flight Planning', 'Time Lapse Shots', '360 Cam Shoots', 'Maint Logs', 'Battery Monitoring', 'Flight Data Logs'],
    }), []);

    const titleOptions = useMemo(() => {
        if (newTaskData.departments.length === 0) return [];
        const allTitles = new Set<string>();
        newTaskData.departments.forEach(deptId => {
            const dept = apiDepartments.find(d => d.id === deptId);
            if (dept) {
                const key = dept.name.trim().toLowerCase();
                const titles = deptTitleMap[key] || [];
                titles.forEach(t => allTitles.add(t));
            }
        });
        return Array.from(allTitles);
    }, [newTaskData.departments, apiDepartments, deptTitleMap]);

    // Ensure selected departments are valid for selected company
    useEffect(() => {
        if (!newTaskData.company) return;
        const validDeptIds = filteredDepartments.map(d => d.id);
        const newSelectedDepts = newTaskData.departments.filter(id => validDeptIds.includes(id));

        // Only update if selection changed to avoid loops
        if (newSelectedDepts.length !== newTaskData.departments.length) {
            setNewTaskData(prev => ({ ...prev, departments: newSelectedDepts }));
        }
    }, [newTaskData.company, filteredDepartments, newTaskData.departments]);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSubmitError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewTaskData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setSubmitError('You must be logged in to create a task.');
            return;
        }
        if (newTaskData.titles.length === 0) {
            setSubmitError('Please select at least one task title.');
            return;
        }

        setSubmitError('');
        setIsSubmitting(true);
        try {
            const normalizeDate = (d: string) => {
                if (!d) return undefined;
                const ddmmyyyy = /^\d{2}-\d{2}-\d{4}$/;
                if (ddmmyyyy.test(d)) {
                    const [dd, mm, yyyy] = d.split('-');
                    return `${yyyy}-${mm}-${dd}`;
                }
                return d;
            };

            const estTimeNumber = newTaskData.est_time !== '' ? Number(newTaskData.est_time) : undefined;
            const creationPromises = newTaskData.titles.map(async (title) => {
                // Infer department from title for THIS specific task
                let selectedDepartmentId = '';
                for (const deptId of newTaskData.departments) {
                    const dept = apiDepartments.find(d => d.id === deptId);
                    if (dept) {
                        const key = dept.name.trim().toLowerCase();
                        const titles = deptTitleMap[key] || [];
                        if (titles.includes(title)) {
                            selectedDepartmentId = deptId;
                            break;
                        }
                    }
                }
                // Fallback if title not found in map (e.g. custom title) or no title selected yet
                if (!selectedDepartmentId && newTaskData.departments.length > 0) {
                    selectedDepartmentId = newTaskData.departments[0];
                }

                const payload = {
                    title: title,
                    description: newTaskData.description,
                    project: newTaskData.project,
                    department: selectedDepartmentId, // Send single department ID
                    due_date: normalizeDate(newTaskData.due_date),
                    priority: newTaskData.priority,
                    est_time: typeof estTimeNumber === 'number' && !Number.isNaN(estTimeNumber) ? estTimeNumber : undefined,
                    assign_to: Array.isArray(newTaskData.assign_to) ? newTaskData.assign_to : [],
                    currentUserId: user.id,
                };
                return DataService.createTask(payload);
            });

            await Promise.all(creationPromises);
            handleCloseModal();
            loadData();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestDelete = (taskId: string) => {
        const task = hydratedTasks.find(t => t.id === taskId);
        if (task) {
            setTaskToDelete({ id: task.id, name: task.name });
        }
    };

    const handleConfirmDelete = async () => {
        if (!taskToDelete || !user) return;
        try {
            await DataService.deleteTask(taskToDelete.id, user.id);
            loadData();
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setTaskToDelete(null);
        }
    };

    const filteredTasks = useMemo(() => {
        return hydratedTasks.filter(task => {
            const searchMatch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || (task.description || '').toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = projectFilter === 'all' || task.projectId === projectFilter;
            const assigneeMatch = assigneeFilter === 'all' || (Array.isArray(task.assigneeIds) && task.assigneeIds.includes(assigneeFilter));
            const statusMatch = statusFilter === 'all' || task.status === statusFilter;
            return searchMatch && projectMatch && assigneeMatch && statusMatch;
        });
    }, [hydratedTasks, searchTerm, projectFilter, assigneeFilter, statusFilter]);

    if (user?.role !== UserRole.ADMIN) {
        return <Navigate to="/" />;
    }

    if (isLoading) {
        return <div className="text-center p-8">Loading all tasks...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">All Tasks</h1>
                <Button onClick={handleOpenModal}>Create New Task</Button>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full md:w-auto md:flex-1"></div>
                <div className="w-full md:w-64">
                    <ViewSwitcher view={view} setView={setView} />
                </div>
            </div>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Projects</option>
                        {allProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Assignees</option>
                        {allEmployees.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="all">All Statuses</option>
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 col-span-full">
                    <h3 className="text-xl font-semibold text-slate-700">No Tasks Found</h3>
                    <p className="text-slate-500 mt-2">No tasks were found or there was an issue fetching them.</p>
                </div>
            ) : view === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            assigneeName={task.assigneeName}
                            projectName={task.projectName}
                            onDelete={handleRequestDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Task</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Project</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Assignee</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Due Date</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 border-b-2 border-slate-200 bg-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => {
                                const statusStyles = {
                                    [TaskStatus.TODO]: 'bg-yellow-100 text-yellow-800',
                                    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
                                    [TaskStatus.ON_HOLD]: 'bg-slate-100 text-slate-800',
                                    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
                                };
                                return (
                                    <tr key={task.id} onClick={() => navigate(`/tasks/${task.id}`)} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm font-semibold text-indigo-600 transition-colors group-hover:text-indigo-800">{task.name}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.projectName}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.companyName || 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.departmentName || 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.assigneeName}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <span className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[task.status]}`}>{task.status}</span>
                                        </td>
                                        <td className="px-5 py-4 border-b border-slate-200 bg-white text-sm">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/tasks/${task.id}`);
                                                    }}
                                                    className="text-slate-500 hover:text-indigo-600"
                                                    title="Edit Task"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRequestDelete(task.id);
                                                    }}
                                                    className="text-slate-500 hover:text-red-600"
                                                    title="Delete Task"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <Modal title="Create New Task" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleCreateTask} className="space-y-4">
                    {submitError && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{submitError}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="company" className="block text-sm font-medium text-slate-700">Company</label>
                            <select id="company" name="company" value={newTaskData.company} onChange={handleInputChange} disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                                {dropdownsLoading ? <option>Loading...</option> :
                                    apiCompanies.length > 0 ? apiCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : <option value="">No companies found</option>}
                            </select>
                        </div>
                        <div>
                            <MultiSelect
                                label="Departments"
                                options={filteredDepartments.map(d => ({ value: d.id, label: d.name }))}
                                selectedValues={newTaskData.departments}
                                onChange={(values) => setNewTaskData(prev => ({ ...prev, departments: values }))}
                                placeholder="Select departments..."
                                disabled={dropdownsLoading}
                            />
                        </div>
                    </div>
                    {titleOptions.length > 0 ? (
                        <div>
                            <MultiSelect
                                label="Task Titles"
                                options={titleOptions.map(t => ({ value: t, label: t }))}
                                selectedValues={newTaskData.titles}
                                onChange={(values) => setNewTaskData(prev => ({ ...prev, titles: values }))}
                                placeholder="Select task titles..."
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="title-input" className="block text-sm font-medium text-slate-700">Task Title</label>
                            <input
                                id="title-input"
                                type="text"
                                value={newTaskData.titles[0] || ''}
                                onChange={(e) => setNewTaskData(prev => ({ ...prev, titles: [e.target.value] }))}
                                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter task title"
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea id="description" name="description" rows={3} value={newTaskData.description} onChange={handleInputChange}
                            className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="project" className="block text-sm font-medium text-slate-700">Project</label>
                        <select id="project" name="project" value={newTaskData.project} onChange={handleInputChange} required disabled={dropdownsLoading} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm disabled:bg-slate-50">
                            {dropdownsLoading ? <option>Loading...</option> :
                                apiProjects.length > 0 ? apiProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">No projects found</option>}
                        </select>
                    </div>
                    <Input id="due_date" name="due_date" type="date" label="Due Date" value={newTaskData.due_date} onChange={handleInputChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-slate-700">Priority</label>
                            <select id="priority" name="priority" value={newTaskData.priority} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <Input id="est_time" name="est_time" type="number" label="Est. Time (hours)" value={newTaskData.est_time} onChange={handleInputChange} min="0" />
                    </div>
                    <div>
                        <MultiSelect
                            label="Assign Managers"
                            options={filteredManagers.map(m => ({ value: m.id, label: m.name }))}
                            selectedValues={newTaskData.assign_to.filter(id => filteredManagers.some(m => m.id === id))}
                            onChange={(values) => {
                                // Keep existing employees, update managers
                                const currentEmployees = newTaskData.assign_to.filter(id => filteredEmployees.some(e => e.id === id));
                                setNewTaskData(prev => ({ ...prev, assign_to: [...currentEmployees, ...values] }));
                            }}
                            placeholder="Select managers..."
                        />
                    </div>
                    <div>
                        <MultiSelect
                            label="Assign Employees"
                            options={filteredEmployees.map(e => ({ value: e.id, label: e.name }))}
                            selectedValues={newTaskData.assign_to.filter(id => filteredEmployees.some(e => e.id === id))}
                            onChange={(values) => {
                                // Keep existing managers, update employees
                                const currentManagers = newTaskData.assign_to.filter(id => filteredManagers.some(m => m.id === id));
                                setNewTaskData(prev => ({ ...prev, assign_to: [...currentManagers, ...values] }));
                            }}
                            placeholder="Select employees..."
                        />
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                            Cancel
                        </button>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Task'}</Button>
                    </div>
                </form>
            </Modal>
            <Modal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                title="Confirm Task Deletion"
            >
                <p className="text-slate-600">
                    Are you sure you want to delete the task "{taskToDelete?.name}"? This action cannot be undone.
                </p>
                <div className="pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setTaskToDelete(null)} className="px-4 py-2 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 shadow-sm">
                        Cancel
                    </button>
                    <Button onClick={handleConfirmDelete}>Delete Task</Button>
                </div>
            </Modal>
        </div>
    );
}