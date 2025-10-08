import React, { useState } from 'react';
import { User, Document } from '../../../types';
import ProfileSection from '../ProfileSection';
import { UploadIcon } from '../../../constants';

interface DocumentsSectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ user, onSave }) => {
    const [documents, setDocuments] = useState<Document[]>(user.documents || []);

    const handleSave = () => {
        onSave({ documents });
    };

    const handleCancel = () => {
        setDocuments(user.documents || []);
    };

    const handleUpload = (docId: string) => {
        // This is a mock upload. In a real app, this would trigger a file picker and API call.
        setDocuments(docs => docs.map(doc => doc.id === docId ? { ...doc, status: 'Submitted' } : doc));
    };

    const statusPillStyles: Record<Document['status'], string> = {
        Pending: 'bg-yellow-100 text-yellow-800',
        Submitted: 'bg-blue-100 text-blue-800',
        Verified: 'bg-green-100 text-green-800',
    };

    return (
        <ProfileSection title="Documents" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => (
                <div className="space-y-3">
                    {documents.length > 0 ? documents.map(doc => (
                        <div key={doc.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-md border">
                            <div>
                                <p className="font-semibold text-slate-800">{doc.name}</p>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusPillStyles[doc.status]}`}>{doc.status}</span>
                            </div>
                            {isEditing && doc.status !== 'Verified' && (
                                <button
                                    onClick={() => handleUpload(doc.id)}
                                    className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-800 border rounded-md px-3 py-1.5 bg-white shadow-sm"
                                >
                                    <UploadIcon />
                                    <span>{doc.status === 'Pending' ? 'Upload' : 'Re-upload'}</span>
                                </button>
                            )}
                        </div>
                    )) : <p className="text-sm text-slate-500">No documents required or submitted.</p>}
                </div>
            )}
        </ProfileSection>
    );
};

export default DocumentsSection;
