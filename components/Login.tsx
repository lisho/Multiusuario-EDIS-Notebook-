import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Professional } from '../types';
import { IoLogInOutline, IoChevronDownOutline } from 'react-icons/io5';

interface LoginProps {
    professionals: Professional[];
    onLogin: (user: Professional) => void;
}

const Login: React.FC<LoginProps> = ({ professionals, onLogin }) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const systemUsers = useMemo(() => {
        return professionals.sort((a, b) => a.name.localeCompare(b.name));
    }, [professionals]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedUser = systemUsers.find(u => u.id === selectedUserId);
        if (selectedUser) {
            onLogin(selectedUser);
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUserId(userId);
        setIsDropdownOpen(false);
    };

    const selectedUser = systemUsers.find(u => u.id === selectedUserId);

    return (
        <div className="bg-slate-50 min-h-screen flex items-start justify-center p-4 pt-20 sm:pt-32">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-slate-800 text-center">Cuaderno de Campo</h1>
                    <p className="text-slate-500 text-center mt-2">Bienvenido/a. Por favor, identifícate para continuar.</p>
                    
                    <form onSubmit={handleSubmit} className="mt-8">
                        <div className="mb-8">
                            <label htmlFor="user-select-button" className="block text-slate-700 font-semibold mb-2">Usuario</label>
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    id="user-select-button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    aria-haspopup="listbox"
                                    aria-expanded={isDropdownOpen}
                                    className={`w-full flex justify-between items-center px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500 text-left ${!selectedUser ? 'text-slate-500' : ''}`}
                                >
                                    <span>{selectedUser ? selectedUser.name : 'Selecciona tu perfil...'}</span>
                                    <IoChevronDownOutline className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDropdownOpen && (
                                    <ul
                                        role="listbox"
                                        className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                                    >
                                        {systemUsers.map(user => (
                                            <li
                                                key={user.id}
                                                role="option"
                                                aria-selected={selectedUserId === user.id}
                                                onClick={() => handleSelectUser(user.id)}
                                                className={`px-4 py-2 cursor-pointer text-slate-800 hover:bg-teal-50 ${selectedUserId === user.id ? 'bg-teal-100 font-semibold' : ''}`}
                                            >
                                                {user.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!selectedUserId}
                            className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center gap-2 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            <IoLogInOutline className="text-xl"/>
                            Entrar
                        </button>
                    </form>
                </div>
                <p className="text-center text-xs text-slate-400 mt-6">
                    AI Field Notebook for Social Support Professionals
                </p>
            </div>
        </div>
    );
};

export default Login;
