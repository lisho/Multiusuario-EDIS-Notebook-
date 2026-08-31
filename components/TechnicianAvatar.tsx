import React from 'react';
import { Professional, User } from '../types';

interface TechnicianAvatarProps {
    professional?: Professional | User | { id?: string; name: string; avatar?: string; role?: string };
    name?: string;
    avatar?: string;
    role?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    tooltipPosition?: 'top' | 'bottom';
    prefix?: string; // e.g. "Asignado a:", "De:", "Para:"
    isCurrentUser?: boolean;
    showRole?: boolean;
}

const sizeClasses = {
    xs: 'w-4 h-4 text-[7px]',
    sm: 'w-5 h-5 text-[8px]',
    md: 'w-6 h-6 text-[10px]',
    lg: 'w-8 h-8 text-xs',
    xl: 'w-10 h-10 text-sm'
};

const getInitials = (name: string = 'T') => {
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'T';
};

export const TechnicianAvatar: React.FC<TechnicianAvatarProps> = ({
    professional,
    name: nameProp,
    avatar: avatarProp,
    role: roleProp,
    size = 'sm',
    className = '',
    tooltipPosition = 'top',
    prefix,
    isCurrentUser,
    showRole = false
}) => {
    const fullName = nameProp || professional?.name || 'Técnico/a';
    const avatarUrl = avatarProp || professional?.avatar;
    const roleText = roleProp || (professional && 'role' in professional ? professional.role : undefined);

    const tooltipPosClasses = tooltipPosition === 'bottom'
        ? 'top-full mt-1.5 left-1/2 -translate-x-1/2'
        : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';

    const arrowPosClasses = tooltipPosition === 'bottom'
        ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent'
        : 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent';

    return (
        <div 
            className={`relative inline-flex items-center justify-center group/avatar cursor-pointer flex-shrink-0 ${className}`}
            title={`${prefix ? prefix + ' ' : ''}${fullName}${isCurrentUser ? ' (Tú)' : ''}`}
        >
            {/* Avatar Circle */}
            <div 
                className={`${sizeClasses[size]} rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold border border-white shadow-2xs overflow-hidden transition-transform duration-150 group-hover/avatar:scale-110 group-hover/avatar:ring-2 group-hover/avatar:ring-teal-500 group-hover/avatar:z-20`}
            >
                {avatarUrl ? (
                    <img 
                        src={avatarUrl} 
                        alt={fullName} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                    />
                ) : (
                    <span>{getInitials(fullName)}</span>
                )}
            </div>

            {/* Instant Floating Name Popup / Tooltip */}
            <div 
                className={`absolute ${tooltipPosClasses} pointer-events-none opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:scale-100 scale-95 transition-all duration-150 z-50 flex flex-col items-center min-w-max`}
            >
                <div className="bg-slate-900/95 text-white text-xs py-1 px-2.5 rounded-lg shadow-xl backdrop-blur-xs border border-slate-700/60 flex flex-col items-center gap-0.5 whitespace-nowrap">
                    {prefix && (
                        <span className="text-[10px] font-medium text-teal-300">
                            {prefix}
                        </span>
                    )}
                    <span className="font-semibold text-slate-100 text-xs flex items-center gap-1">
                        <span>{fullName}</span>
                        {isCurrentUser && (
                            <span className="text-[10px] bg-teal-600 text-white px-1 rounded font-normal">
                                Tú
                            </span>
                        )}
                    </span>
                    {(showRole || roleText) && roleText && (
                        <span className="text-[9px] text-slate-400 font-normal">
                            {roleText}
                        </span>
                    )}
                </div>
                {/* Tooltip caret arrow */}
                <div className={`w-0 h-0 border-4 ${arrowPosClasses}`} />
            </div>
        </div>
    );
};

export default TechnicianAvatar;
