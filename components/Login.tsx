import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Professional } from '../types';
import { IoLogInOutline, IoChevronDownOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

interface LoginProps {
    professionals: Professional[];
    onLogin: (user: Professional) => void;
    authError?: string | null;
}

const Login: React.FC<LoginProps> = ({ professionals, onLogin, authError }) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const systemUsers = useMemo(() => {
        return professionals.sort((a, b) => a.name.localeCompare(b.name));
    }, [professionals]);

    useEffect(() => {
        if (!selectedUserId && systemUsers.length > 0) {
            const lishoUser = systemUsers.find(u => u.name.toLowerCase().includes('lisho'));
            setSelectedUserId(lishoUser ? lishoUser.id : systemUsers[0].id);
        }
    }, [systemUsers, selectedUserId]);

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
        setError(null);
        const selectedUser = systemUsers.find(u => u.id === selectedUserId);
        if (selectedUser) {
            if (!selectedUser.password) {
                setError('Este usuario no tiene una contraseña configurada. Contacta a un administrador.');
            } else if (selectedUser.password === password) {
                onLogin(selectedUser);
            } else {
                setError('La contraseña es incorrecta.');
            }
        } else {
            setError('Por favor, selecciona un usuario.');
        }
    };
    
    const handleSelectUser = (userId: string) => {
        setSelectedUserId(userId);
        setIsDropdownOpen(false);
        setError(null);
    };

    const selectedUser = systemUsers.find(u => u.id === selectedUserId);

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-start p-4 pt-20 sm:pt-32">
            {authError && (
                <div className="w-full max-w-sm mb-6 bg-amber-100 border border-amber-300 text-amber-900 px-4 py-3 rounded-lg shadow-sm text-sm" role="alert">
                    <p className="font-bold">Error de conexión</p>
                    <p>{authError}</p>
                </div>
            )}
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-slate-800 text-center">Cuaderno de Campo</h1>
                    <p className="text-slate-500 text-center mt-2">Bienvenido/a. Por favor, identifícate para continuar.</p>
                    
                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div>
                            <label htmlFor="user-select" className="block text-slate-700 font-semibold mb-2">Usuario</label>
                            <div className="relative">
                                <select
                                    id="user-select"
                                    value={selectedUserId}
                                    onChange={(e) => { setSelectedUserId(e.target.value); setError(null); }}
                                    className={`w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500 appearance-none ${!selectedUserId ? 'text-slate-500' : ''}`}
                                    disabled={systemUsers.length === 0}
                                >
                                    <option value="" disabled>
                                        {systemUsers.length === 0 ? 'No hay usuarios disponibles...' : 'Selecciona tu perfil...'}
                                    </option>
                                    {systemUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-600">
                                    <IoChevronDownOutline />
                                </div>
                            </div>
                            {systemUsers.length === 0 && !authError && (
                                <button 
                                    type="button" 
                                    onClick={() => window.location.reload()} 
                                    className="mt-2 text-sm text-teal-600 hover:underline flex items-center justify-center w-full"
                                >
                                    Hubo un problema al cargar. Click aquí para recargar la página.
                                </button>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="password-input" className="block text-slate-700 font-semibold mb-2">Contraseña</label>
                            <div className="relative">
                                <input
                                    id="password-input"
                                    type={isPasswordVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    className="w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500 pr-10"
                                    placeholder="Introduce tu contraseña"
                                    disabled={!selectedUserId}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700"
                                    aria-label={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {isPasswordVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-md">{error}</p>}

                        <button
                            type="submit"
                            disabled={!selectedUserId || !password}
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
