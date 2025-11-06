import React, { useState, useMemo } from 'react';
import { Professional } from '../types';
import { IoLogInOutline } from 'react-icons/io5';

interface LoginProps {
    professionals: Professional[];
    onLogin: (user: Professional) => void;
}

const Login: React.FC<LoginProps> = ({ professionals, onLogin }) => {
    const [selectedUserId, setSelectedUserId] = useState('');

    const systemUsers = useMemo(() => {
        // The list of professionals is pre-filtered by the App component
        // to only include those with `isSystemUser: true`.
        return professionals.sort((a, b) => a.name.localeCompare(b.name));
    }, [professionals]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedUser = systemUsers.find(u => u.id === selectedUserId);
        if (selectedUser) {
            onLogin(selectedUser);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-slate-800 text-center">Cuaderno de Campo</h1>
                    <p className="text-slate-500 text-center mt-2">Bienvenido/a. Por favor, identifícate para continuar.</p>
                    
                    <form onSubmit={handleSubmit} className="mt-8">
                        <div className="mb-6">
                            <label htmlFor="user-select" className="block text-slate-700 font-semibold mb-2">Usuario</label>
                            <select
                                id="user-select"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 border-slate-300 focus:ring-teal-500"
                            >
                                <option value="" disabled>Selecciona tu perfil...</option>
                                {systemUsers.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
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