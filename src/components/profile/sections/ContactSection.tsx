import React, { useState } from 'react';
import { User, Address } from '../../../types';
import ProfileSection from '../ProfileSection';
import Input from '../../shared/Input';

interface ContactSectionProps {
    user: User;
    onSave: (updates: Partial<User>) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-3 gap-4 py-2">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <dd className="text-sm text-slate-900 col-span-2">{value}</dd>
    </div>
);

const ContactSection: React.FC<ContactSectionProps> = ({ user, onSave }) => {
    const [contactNumber, setContactNumber] = useState(user.contactNumber || '');
    const [address, setAddress] = useState<Address>(user.address || { street: '', city: '', state: '', zipCode: '', country: '' });

    const handleSave = () => {
        onSave({ contactNumber, address });
    };

    const handleCancel = () => {
        setContactNumber(user.contactNumber || '');
        setAddress(user.address || { street: '', city: '', state: '', zipCode: '', country: '' });
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <ProfileSection title="Contact & Address" onSave={handleSave} onCancel={handleCancel}>
            {(isEditing) => isEditing ? (
                <div className="space-y-4">
                    <Input id="email" label="Email Address" name="email" type="email" value={user.email} disabled />
                    <Input id="contactNumber" label="Contact Number" name="contactNumber" type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                    <Input id="street" label="Street" name="street" type="text" value={address.street} onChange={handleAddressChange} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="city" label="City" name="city" type="text" value={address.city} onChange={handleAddressChange} />
                        <Input id="state" label="State" name="state" type="text" value={address.state} onChange={handleAddressChange} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <Input id="zipCode" label="Zip Code" name="zipCode" type="text" value={address.zipCode} onChange={handleAddressChange} />
                        <Input id="country" label="Country" name="country" type="text" value={address.country} onChange={handleAddressChange} />
                    </div>
                </div>
            ) : (
                <dl>
                    <DetailRow label="Email Address" value={user.email} />
                    <DetailRow label="Contact Number" value={user.contactNumber || 'N/A'} />
                    <DetailRow label="Address" value={user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state} ${user.address.zipCode}` : 'N/A'} />
                    <DetailRow label="Country" value={user.address?.country || 'N/A'} />
                </dl>
            )}
        </ProfileSection>
    );
};

export default ContactSection;
