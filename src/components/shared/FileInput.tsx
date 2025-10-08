import React, { useState, useRef } from 'react';
import { UploadIcon } from '../../constants';

interface FileInputProps {
    id: string;
    label: string;
    onChange: (file: File | null) => void;
    required?: boolean;
}

const FileInput: React.FC<FileInputProps> = ({ id, label, onChange, required }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        setFileName(file ? file.name : null);
        onChange(file);
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="mt-1">
                <input
                    id={id}
                    name={id}
                    type="file"
                    className="sr-only"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    required={required}
                />
                <div 
                    className="flex items-center justify-between w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-white cursor-pointer"
                    onClick={handleButtonClick}
                >
                    <span className={`truncate ${fileName ? 'text-slate-800' : 'text-slate-400'}`}>
                        {fileName || 'No file chosen'}
                    </span>
                     <div className="flex items-center px-3 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Choose File
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileInput;
