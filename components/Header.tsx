import React from 'react';
import { FiFolder, FiCalendar, FiSettings, FiFolderPlus } from 'react-icons/fi';
import { IoCheckboxOutline } from 'react-icons/io5';

interface HeaderProps {
    onNewCase: () => void;
    onNewTask: () => void;
    currentView: 'cases' | 'admin' | 'calendar';
    onSetView: (view: 'cases' | 'admin' | 'calendar') => void;
    isCaseView?: boolean;
    isSidebarCollapsed?: boolean;
}

const navItems = [
    { view: 'cases' as const, label: 'Mesa de Trabajo', icon: FiFolder },
    { view: 'calendar' as const, label: 'Calendario', icon: FiCalendar },
    { view: 'admin' as const, label: 'Administración', icon: FiSettings }
];

const Header: React.FC<HeaderProps> = ({ onNewCase, onNewTask, currentView, onSetView, isCaseView, isSidebarCollapsed }) => {
    
    const navButtonStyle = "text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500";
    const activeStyle = "bg-white text-teal-700 shadow-sm";
    const inactiveStyle = "bg-transparent text-slate-600 hover:bg-white/60";

    const headerPaddingClass = isCaseView
        ? `transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`
        : '';

    return (
        <header className={`bg-white shadow-sm sticky top-0 z-40 flex items-center ${headerPaddingClass} h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)]`}>
            <div className={`${isCaseView ? '' : 'container mx-auto'} w-full px-4 flex flex-wrap justify-between items-center gap-2 sm:gap-4`}>
                <div className="flex items-center gap-2 sm:gap-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Cuaderno de Campo</h1>
                    <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        {navItems.map(({ view, label, icon: Icon }) => (
                             <button 
                                key={view}
                                onClick={() => onSetView(view)} 
                                className={`${navButtonStyle} flex items-center justify-center gap-2 py-2 sm:px-4 w-10 sm:w-auto h-10 sm:h-auto ${currentView === view ? activeStyle : inactiveStyle}`}
                                title={label}
                            >
                                <Icon className="text-xl flex-shrink-0" />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onNewTask}
                        className="bg-sky-600 text-white w-10 h-10 rounded-lg hover:bg-sky-700 flex items-center justify-center transition-colors"
                        title="Nueva Tarea"
                    >
                        <IoCheckboxOutline className="w-6 h-6" />
                    </button>
                    {currentView === 'cases' && (
                        <button
                            onClick={onNewCase}
                            className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors"
                            title="Nuevo Caso"
                        >
                            <FiFolderPlus className="w-7 h-7" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;