import React, { useState, useEffect, useRef } from 'react';
import { Professional } from '../types';
import { IoAddOutline, IoChevronDownOutline, IoCreateOutline, IoLogOutOutline, IoAppsOutline, IoConstructOutline, IoCalendarOutline, IoStatsChartOutline } from 'react-icons/io5';

interface HeaderProps {
    onNewCase: () => void;
    onNewTask: () => void;
    currentView: 'cases' | 'admin' | 'calendar' | 'stats';
    onSetView: (view: 'cases' | 'admin' | 'calendar' | 'stats') => void;
    isCaseView: boolean;
    isSidebarCollapsed: boolean;
    currentUser: Professional | null;
    onLogout: () => void;
    onOpenProfile: () => void;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const Header: React.FC<HeaderProps> = ({ onNewCase, onNewTask, currentView, onSetView, isCaseView, currentUser, onLogout, onOpenProfile }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const NavButton: React.FC<{ view: 'cases' | 'admin' | 'calendar' | 'stats'; label: string; icon: React.ComponentType<{className?: string}>}> = ({ view, label, icon: Icon }) => {
        const isActive = currentView === view && !isCaseView;
        return (
            <button
                onClick={() => onSetView(view)}
                disabled={isCaseView}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isActive
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                } disabled:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed`}
            >
                <Icon className="text-lg" />
                {label}
            </button>
        );
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-30">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xl font-bold text-slate-800">
                    <IoAppsOutline className="text-teal-600" />
                    <span>EDIS</span>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <NavButton view="cases" label="Mesa de Trabajo" icon={IoAppsOutline} />
                    <NavButton view="calendar" label="Calendario" icon={IoCalendarOutline} />
                    <NavButton view="stats" label="Mis Estadísticas" icon={IoStatsChartOutline} />
                    {currentUser?.systemRole === 'admin' && (
                        <NavButton view="admin" label="Administración" icon={IoConstructOutline} />
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
                <button
                    onClick={onNewTask}
                    className="hidden sm:flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-md hover:bg-slate-200 font-semibold text-sm transition-colors"
                >
                    <IoAddOutline className="text-lg" />
                    Nueva Tarea
                </button>
                <button
                    onClick={onNewCase}
                    className="flex items-center gap-2 bg-teal-600 text-white px-3 py-2 rounded-md hover:bg-teal-700 font-semibold text-sm transition-colors"
                >
                    <IoAddOutline className="text-lg" />
                    <span className="hidden sm:inline">Nuevo Caso</span>
                </button>
                
                {currentUser && (
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2">
                             <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-teal-200 transition-transform duration-200 ease-in-out hover:scale-110">
                                {currentUser.avatar ? (
                                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{getInitials(currentUser.name)}</span>
                                )}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
                                <p className="text-xs text-slate-500 capitalize">{currentUser.systemRole}</p>
                            </div>
                            <IoChevronDownOutline className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                    <button onClick={() => { onOpenProfile(); setIsDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                        <IoCreateOutline className="text-lg" />
                                        Editar Perfil
                                    </button>
                                    <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                        <IoLogOutOutline className="text-lg" />
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;