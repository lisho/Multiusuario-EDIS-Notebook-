import React, { useState, useEffect } from 'react';
import { Professional, ProfessionalRole } from '../../types';
import { IoCloseOutline, IoSaveOutline, IoPeopleOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

interface ProfessionalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (professional: Professional) => void;
  initialData?: Professional | null;
  defaultRole: ProfessionalRole;
}

const getInitialProfessional = (role: ProfessionalRole): Omit<Professional, 'id'> => ({
    name: '',
    role: role,
    ceas: '',
    phone: '',
    email: '',
    isSystemUser: role === ProfessionalRole.EdisTechnician,
    systemRole: 'tecnico',
    password: '',
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ceasOptions = [
    'Centro',
    'Mariano Andrés',
    'Palomera',
    'El Ejido-Santa Ana',
    'El Crucero . La Vega',
    'Armunia',
    'Puente Castro - San Claudio'
];

const ProfessionalEditorModal: React.FC<ProfessionalEditorModalProps> = ({ isOpen, onClose, onSave, initialData, defaultRole }) => {
  const [professional, setProfessional] = useState(getInitialProfessional(defaultRole));
  const [errors, setErrors] = useState<{ name?: string; email?: string, password?: string }>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setProfessional({
              ...getInitialProfessional(initialData.role),
              ...initialData
            });
        } else {
            setProfessional(getInitialProfessional(defaultRole));
        }
        setErrors({});
        setNewPassword('');
        setConfirmPassword('');
    }
  }, [isOpen, initialData, defaultRole]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setProfessional(prev => {
        const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
        if (name === 'role' && value === ProfessionalRole.SocialWorker) {
            newState.isSystemUser = false;
            newState.systemRole = undefined;
        }
        if (name === 'isSystemUser' && !checked) {
            newState.systemRole = 'tecnico'; // Reset role to default when access is disabled
        }
        return newState;
    });

    if (errors[name as keyof typeof errors]) {
        setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; email?: string, password?: string } = {};
    if (!professional.name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
    }
    if (professional.role === ProfessionalRole.SocialWorker && professional.email && !emailRegex.test(professional.email)) {
        newErrors.email = 'El formato del correo no es válido.';
    }
    if (newPassword || confirmPassword) {
        if (newPassword.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (newPassword !== confirmPassword) {
            newErrors.password = 'Las contraseñas no coinciden.';
        }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const finalProfessional: Professional = {
        id: (professional as Professional).id || `prof-${Date.now()}`,
        ...professional,
        name: professional.name.trim(),
      };
      if(newPassword){
        finalProfessional.password = newPassword;
      }
      onSave(finalProfessional);
    }
  };

  if (!isOpen) return null;

  const isEditing = !!(professional as Professional).id;
  const formInputStyle = (hasError: boolean) => `w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 bg-slate-100 text-slate-900 placeholder:text-slate-500 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <IoPeopleOutline className="text-teal-600"/>
                {isEditing ? `Editar Profesional` : `Nuevo/a Profesional`}
            </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <IoCloseOutline className="text-3xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
                <label htmlFor="role" className="block text-slate-700 font-semibold mb-2">Rol Profesional</label>
                <select id="role" name="role" value={professional.role} onChange={handleChange} className={formInputStyle(false)}>
                    {Object.values(ProfessionalRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>
            <div>
              <label htmlFor="name" className="block text-slate-700 font-semibold mb-2">Nombre Completo</label>
              <input id="name" name="name" type="text" value={professional.name} onChange={handleChange} className={formInputStyle(!!errors.name)} placeholder="Ej. María López" required autoFocus/>
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            {professional.role === ProfessionalRole.SocialWorker && (
              <>
                <div>
                  <label htmlFor="ceas" className="block text-slate-700 font-semibold mb-2">CEAS</label>
                  <select id="ceas" name="ceas" value={professional.ceas || ''} onChange={handleChange} className={formInputStyle(false)}>
                    <option value="">Selecciona un CEAS...</option>
                    {ceasOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-slate-700 font-semibold mb-2">Teléfono</label>
                  <input id="phone" name="phone" type="tel" value={professional.phone || ''} onChange={handleChange} className={formInputStyle(false)} placeholder="900 123 456" />
                </div>
                 <div>
                  <label htmlFor="email" className="block text-slate-700 font-semibold mb-2">Email</label>
                  <input id="email" name="email" type="email" value={professional.email || ''} onChange={handleChange} className={formInputStyle(!!errors.email)} placeholder="email@ejemplo.com" />
                   {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>
              </>
            )}

            {professional.role === ProfessionalRole.EdisTechnician && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                        <input type="checkbox" name="isSystemUser" checked={!!professional.isSystemUser} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                        Habilitar como usuario del sistema
                    </label>

                    {professional.isSystemUser && (
                        <>
                            <div>
                                <label htmlFor="systemRole" className="block text-slate-700 font-semibold mb-2">Rol del Sistema</label>
                                <select id="systemRole" name="systemRole" value={professional.systemRole || 'tecnico'} onChange={handleChange} className={formInputStyle(false)}>
                                    <option value="tecnico">Técnico</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                             <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><IoLockClosedOutline /> Gestión de Contraseña</h4>
                                {isEditing && !(professional as Professional).password && (
                                    <p className="text-sm text-amber-700 bg-amber-100 p-2 rounded-md mb-3">Este usuario no tiene contraseña. Establece una para habilitar el inicio de sesión.</p>
                                )}
                                <div className="space-y-4">
                                    <div className="relative">
                                        <label className="block text-slate-700 font-semibold mb-2 text-sm">Nueva Contraseña</label>
                                        <input type={isNewPasswordVisible ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={formInputStyle(!!errors.password) + " pr-10"} placeholder="Dejar en blanco para no cambiar"/>
                                        <button type="button" onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500 hover:text-slate-700"><IoEyeOutline/></button>
                                    </div>
                                     <div className="relative">
                                        <label className="block text-slate-700 font-semibold mb-2 text-sm">Confirmar Contraseña</label>
                                        <input type={isConfirmPasswordVisible ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={formInputStyle(!!errors.password) + " pr-10"} />
                                        <button type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} className="absolute inset-y-0 right-0 top-6 px-3 flex items-center text-slate-500 hover:text-slate-700"><IoEyeOutline/></button>
                                    </div>
                                </div>
                                {errors.password && <p className="text-red-600 text-sm mt-2">{errors.password}</p>}
                            </div>
                        </>
                    )}
                </div>
            )}
        </form>
         <div className="flex justify-end gap-4 p-4 mt-auto border-t border-slate-200 bg-slate-50 rounded-b-lg">
            <button type="button" onClick={onClose} className="py-2 px-4 text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
            <button type="button" onClick={handleSubmit} className="py-2 px-4 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2">
                <IoSaveOutline />
                Guardar
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalEditorModal;
