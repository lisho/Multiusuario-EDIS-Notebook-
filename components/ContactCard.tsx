import React from 'react';
import { FamilyMember } from '../types';
import { IoPersonCircleOutline, IoCallOutline, IoMailOutline, IoLocationOutline, IoPencilOutline, IoTrashOutline } from 'react-icons/io5';

interface ContactCardProps {
    member: FamilyMember;
    onEdit: () => void;
    onDelete: () => void;
}


const calculateAge = (birthDateString: string): number | null => {
    if (!birthDateString) return null;
    try {
        const birthDate = new Date(birthDateString);
        const today = new Date();
        const birthDateUTC = new Date(Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate()));
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

        let age = todayUTC.getUTCFullYear() - birthDateUTC.getUTCFullYear();
        const m = todayUTC.getUTCMonth() - birthDateUTC.getUTCMonth();
        if (m < 0 || (m === 0 && todayUTC.getUTCDate() < birthDateUTC.getUTCDate())) {
            age--;
        }
        return isNaN(age) || age < 0 ? null : age;
    } catch (e) {
        return null;
    }
};

const ContactCard: React.FC<ContactCardProps> = ({ member, onEdit, onDelete }) => {
    const age = calculateAge(member.birthDate);
    const cardBorderColor = member.isConflictual ? 'border-red-300' : 'border-slate-200';
    const cardBgColor = member.isConflictual ? 'bg-red-50' : 'bg-slate-50';

    return (
        <div className={`border rounded-lg p-4 flex flex-col justify-between hover:shadow-sm transition-shadow ${cardBorderColor} ${cardBgColor}`}>
            <div>
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <IoPersonCircleOutline className="text-4xl text-slate-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">{member.name || <span className="italic text-slate-400">Sin nombre</span>}</h4>
                        <div className="flex items-baseline gap-2">
                            <p className="text-sm font-medium text-teal-700">{member.relationship || <span className="italic text-slate-400">Sin relación</span>}</p>
                            {age !== null && <p className="text-sm text-slate-500">({age} años)</p>}
                        </div>
                    </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-sm text-slate-700">
                    {member.phone && <div className="flex items-center gap-2"><IoCallOutline className="text-slate-400 flex-shrink-0" /> <span>{member.phone}</span></div>}
                    {member.email && <div className="flex items-center gap-2"><IoMailOutline className="text-slate-400 flex-shrink-0" /> <span className="truncate">{member.email}</span></div>}
                    {member.address && <div className="flex items-start gap-2"><IoLocationOutline className="text-slate-400 mt-0.5 flex-shrink-0" /> <span>{member.address}</span></div>}
                </div>
                
                {member.notes && <p className="text-sm text-slate-600 mt-2 p-2 bg-white rounded break-words">{member.notes}</p>}
            </div>
            <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                <button onClick={onEdit} className="text-slate-500 hover:text-teal-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors" title="Editar contacto"><IoPencilOutline /></button>
                <button onClick={onDelete} className="text-slate-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-100 transition-colors" title="Eliminar contacto"><IoTrashOutline /></button>
            </div>
        </div>
    );
};

export default ContactCard;