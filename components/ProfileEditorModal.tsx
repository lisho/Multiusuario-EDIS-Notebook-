import React, { useState, useEffect, useRef } from 'react';
import { Professional, ProfessionalRole } from '../types';
import { IoCloseOutline, IoSaveOutline, IoPersonCircleOutline, IoChevronDownOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

interface ProfileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (professional: Professional) => void;
  currentUser: Professional;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ProfileEditorModal: React.FC<ProfileEditorModalProps> = ({ isOpen, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        avatar: '',
    });
    const [errors, setErrors] = useState<{ name?: string; email?: string, password?: string }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            setFormData({
                name: currentUser.name || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
                avatar: currentUser.avatar || '',
            });
            setErrors({});
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsPasswordSectionOpen(false);
        }
    }, [isOpen, currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                
                setFormData(prev => ({ ...prev, avatar: dataUrl }));
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const validate = (): boolean => {
        const newErrors: { name?: string; email?: string, password?: string } = {};
        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es obligatorio.';
        }
        if (formData.email && !emailRegex.test(formData.email)) {
            newErrors.email = 'El formato del correo no es válido.';
        }
        if (isPasswordSectionOpen && (newPassword || confirmPassword || currentPassword)) {
            if (!currentUser.password) {
                 newErrors.password = 'No se puede cambiar la contraseña porque no tienes una establecida. Contacta a un administrador.';
            } else if (currentPassword !== currentUser.password) {
                newErrors.password = 'La contraseña actual es incorrecta.';
            } else if (newPassword.length < 6) {
                newErrors.password = 'La nueva contraseña debe tener al menos 6 caracteres.';
            } else if (newPassword !== confirmPassword) {
                newErrors.password = 'Las nuevas contraseñas no coinciden.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const finalProfessional = { ...currentUser, ...formData };
            if (isPasswordSectionOpen && newPassword) {
                finalProfessional.password = newPassword;
            }
            onSave(finalProfessional);
            onClose();
        }
    };

    if (!isOpen) return null;

    const formInputStyle = (hasError: boolean, disabled: boolean = false) => `w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 ${disabled ? 'bg-slate-200 cursor-not-allowed' : 'bg-slate-100'} text-slate-900 placeholder:text-slate-500 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">Editar Mi Perfil</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <IoCloseOutline className="text-3xl" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-3xl overflow-hidden border-4 border-teal-200">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span>{currentUser ? getInitials(currentUser.name) : <IoPersonCircleOutline />}</span>
                            )}
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-teal-600 hover:text-teal-800">
                            Cambiar foto
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="name" className="block text-slate-700 font-semibold mb-2">Nombre Completo</label>
                            <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className={formInputStyle(!!errors.name)} required />
                            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-slate-700 font-semibold mb-2">Email</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={formInputStyle(!!errors.email)} />
                            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-slate-700 font-semibold mb-2">Teléfono</label>
                            <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className={formInputStyle(false)} />
                        </div>
                        <div>
                            <label htmlFor="role" className="block text-slate-700 font-semibold mb-2">Rol Profesional</label>
                            <input id="role" name="role" type="text" value={currentUser.role} className={formInputStyle(false, true)} disabled />
                        </div>
                        {currentUser.role === ProfessionalRole.SocialWorker && (
                            <div className="md:col-span-2">
                                <label htmlFor="ceas" className="block text-slate-700 font-semibold mb-2">CEAS</label>
                                <input id="ceas" name="ceas" type="text" value={currentUser.ceas || 'No asignado'} className={formInputStyle(false, true)} disabled />
                            </div>
                        )}
                    </div>
                     <div className="mt-4 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)} className="w-full flex justify-between items-center font-semibold text-slate-800">
                            <span className="flex items-center gap-2"><IoLockClosedOutline /> Cambiar Contraseña</span>
                            <IoChevronDownOutline className={`transition-transform ${isPasswordSectionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isPasswordSectionOpen && (
                            <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="relative">
                                    <label className="block text-slate-700 font-semibold mb-2 text-sm">Contraseña Actual</label>
                                    <input type={isCurrentPasswordVisible ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={formInputStyle(!!errors.password) + " pr-10"} />
                                    <button type="button" onClick={() => setIsCurrentPasswordVisible(!isCurrentPasswordVisible)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500"><IoEyeOutline/></button>
                                </div>
                                 <div className="relative">
                                    <label className="block text-slate-700 font-semibold mb-2 text-sm">Nueva Contraseña</label>
                                    <input type={isNewPasswordVisible ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={formInputStyle(!!errors.password) + " pr-10"} />
                                    <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500"><IoEyeOutline/></button>
                                </div>
                                <div className="relative">
                                    <label className="block text-slate-700 font-semibold mb-2 text-sm">Confirmar Nueva Contraseña</label>
                                    <input type={isConfirmPasswordVisible ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={formInputStyle(!!errors.password) + " pr-10"} />
                                    <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500"><IoEyeOutline/></button>
                                </div>
                                {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
                            </div>
                        )}
                     </div>
                </form>
                <div className="flex justify-end gap-4 p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                        <IoSaveOutline />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditorModal;
