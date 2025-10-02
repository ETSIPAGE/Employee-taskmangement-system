import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as DataService from '../../services/dataService';
import { AcademicCapIcon, BriefcaseIcon, CurrencyDollarIcon, DocumentTextIcon, IdentificationIcon, LocationMarkerIcon, UsersIcon } from '../../constants';
import { Department, User } from '../../types';

import PersonalDetailsSection from './sections/PersonalDetailsSection';
import ContactSection from './sections/ContactSection';
import FamilySection from './sections/FamilySection';
import EducationSection from './sections/EducationSection';
import WorkSection from './sections/WorkSection';
import DocumentsSection from './sections/DocumentsSection';


const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};


const Profile: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [profileData, setProfileData] = useState<User | null>(user);
    const [allDepartments, setAllDepartments] = useState<Record<string, Department>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDepts = async () => {
            setIsLoading(true);
            try {
                const depts = await DataService.getDepartments();
                const deptsMap = depts.reduce((acc, dept) => {
                    acc[dept.id] = dept;
                    return acc;
                }, {} as Record<string, Department>);
                setAllDepartments(deptsMap);
            } catch (error) {
                console.error("Failed to load departments", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDepts();
    }, []);

    const sectionRefs = {
        personal: useRef<HTMLDivElement>(null),
        contact: useRef<HTMLDivElement>(null),
        family: useRef<HTMLDivElement>(null),
        education: useRef<HTMLDivElement>(null),
        work: useRef<HTMLDivElement>(null),
        documents: useRef<HTMLDivElement>(null),
    };

    const scrollToSection = (refKey: keyof typeof sectionRefs) => {
        sectionRefs[refKey].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const navItems = [
        { id: 'personal', label: 'Personal Details', icon: IdentificationIcon, refKey: 'personal' },
        { id: 'contact', label: 'Contact & Address', icon: LocationMarkerIcon, refKey: 'contact' },
        { id: 'family', label: 'Family Information', icon: UsersIcon, refKey: 'family' },
        { id: 'education', label: 'Education & Skills', icon: AcademicCapIcon, refKey: 'education' },
        { id: 'work', label: 'Work & Compensation', icon: CurrencyDollarIcon, refKey: 'work' },
        { id: 'documents', label: 'Documents', icon: DocumentTextIcon, refKey: 'documents' },
    ] as const;

    const handleUpdate = async (updates: Partial<User>) => {
        if (!profileData) return;
        
        const updatedData = { ...profileData, ...updates };
        setProfileData(updatedData);

        try {
            await updateProfile(updates);
        } catch (error) {
            console.error("Failed to update profile:", error);
            setProfileData(user); 
            alert("Failed to save changes. Please try again.");
        }
    };
    
    useEffect(() => {
        setProfileData(user);
    }, [user]);

    if (!profileData || isLoading) {
        return <div className="text-center p-8">Loading profile...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8 flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-4xl font-bold flex-shrink-0">
                    {getInitials(profileData.name)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">{profileData.name}</h1>
                    <div className="flex items-center space-x-4 text-slate-500 mt-1">
                        <span className="flex items-center"><BriefcaseIcon className="mr-2" /> {profileData.jobTitle || 'N/A'}</span>
                        <span className="flex items-center">
                            Department: {profileData.departmentIds?.map(id => allDepartments[id]?.name).join(', ') || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:space-x-8">
                {/* Left Sidebar */}
                <aside className="lg:w-1/4 mb-8 lg:mb-0">
                    <div className="sticky top-6 bg-white rounded-lg shadow-md p-4">
                        <nav className="space-y-1">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.refKey)}
                                    className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                    <item.icon />
                                    <span className="ml-3">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Right Content */}
                <main className="lg:w-3/4 space-y-8">
                    <div ref={sectionRefs.personal} className="scroll-mt-24"><PersonalDetailsSection user={profileData} onSave={handleUpdate} /></div>
                    <div ref={sectionRefs.contact} className="scroll-mt-24"><ContactSection user={profileData} onSave={handleUpdate} /></div>
                    <div ref={sectionRefs.family} className="scroll-mt-24"><FamilySection user={profileData} onSave={handleUpdate} /></div>
                    <div ref={sectionRefs.education} className="scroll-mt-24"><EducationSection user={profileData} onSave={handleUpdate} /></div>
                    <div ref={sectionRefs.work} className="scroll-mt-24"><WorkSection user={profileData} onSave={handleUpdate} /></div>
                    <div ref={sectionRefs.documents} className="scroll-mt-24"><DocumentsSection user={profileData} onSave={handleUpdate} /></div>
                </main>
            </div>
        </div>
    );
};

export default Profile;
