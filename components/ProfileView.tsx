import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Case } from '../types';
import { 
    IoInformationCircleOutline, 
    IoSaveOutline, 
    IoRefreshOutline,
    IoStatsChartOutline,
    IoCheckboxOutline,
    IoCheckmarkDoneCircleOutline,
    IoTimeOutline,
    IoWarningOutline,
    IoSyncOutline,
    IoCheckmarkCircleOutline
} from 'react-icons/io5';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/cloudinary';

interface ProfileViewProps {
  caseData: Case;
  onUpdateCase: (updatedCase: Case) => void;
  onDeleteCase: (caseId: string) => void;
  onOpenGenogramViewer: (url: string) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
}

const getCaseFormData = (caseData: Case) => ({
    nickname: caseData.nickname || '',
    dni: caseData.dni || '',
    phone: caseData.phone || '',
    email: caseData.email || '',
    address: caseData.address || '',
    profileNotes: caseData.profileNotes || '',
});

const formInputStyle = (hasError: boolean) => `block w-full rounded-lg border shadow-sm focus:outline-none focus:ring-2 text-base px-4 py-3 bg-slate-100 text-slate-900 placeholder:text-slate-500 disabled:opacity-70 disabled:cursor-not-allowed ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'}`;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InputField: React.FC<{
    name: string;
    label: string;
    value: string;
    placeholder?: string;
    error?: string;
    tooltip?: string;
    required?: boolean;
    className?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, label, value, placeholder, error, tooltip, required, className, onChange }) => (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {required && <span className="text-red-500 font-semibold">*</span>}
        {tooltip && (
            <div className="relative group flex items-center">
                <IoInformationCircleOutline className="text-slate-400 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 text-xs text-white bg-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {tooltip}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-700"></div>
                </div>
            </div>
        )}
      </div>
      <div>
        <input
          type="text"
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={formInputStyle(!!error)}
          placeholder={placeholder}
        />
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      </div>
    </div>
);

const StatItem: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="text-teal-600 bg-teal-50 p-3 rounded-lg">
          <Icon className="w-6 h-6" />
      </div>
      <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

const ProfileView: React.FC<ProfileViewProps> = ({ caseData, onUpdateCase, onDeleteCase, onOpenGenogramViewer, requestConfirmation }) => {
  const [formData, setFormData] = useState(getCaseFormData(caseData));
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageSaveSuccess, setImageSaveSuccess] = useState(false);
  const genogramFileInputRef = useRef<HTMLInputElement>(null);
  const prevCaseIdRef = useRef<string | undefined>(undefined);
  
  const stats = useMemo(() => {
    const totalInterventions = caseData.interventions.length;
    const pendingTasks = caseData.tasks.filter(t => !t.completed).length;
    const completedTasks = caseData.tasks.filter(t => t.completed).length;
    
    let daysInProgram: string | number = 'N/A';
    if (caseData.interventions.length > 0) {
        const firstInterventionDate = new Date(caseData.interventions.reduce((earliest, current) => {
            return new Date(current.start) < new Date(earliest.start) ? current : earliest;
        }).start);
        
        const diffTime = new Date().getTime() - firstInterventionDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysInProgram = diffDays >= 0 ? diffDays : 0;
    }

    return { totalInterventions, pendingTasks, completedTasks, daysInProgram };
  }, [caseData]);
  
  useEffect(() => {
    if (prevCaseIdRef.current !== caseData.id) {
        setFormData(getCaseFormData(caseData));
        setErrors({});
        setIsDirty(false);
        setIsSaving(false);
        setIsSaved(false);
    } else {
        // If caseData updates from parent (e.g., after an image upload),
        // sync the form state but preserve dirtiness.
        setFormData(getCaseFormData(caseData));
    }
    prevCaseIdRef.current = caseData.id;
  }, [caseData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setIsDirty(true);
    setIsSaved(false);

    if (name === 'email' && errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };
  
  const deleteFromCloudinary = async (deleteToken: string) => {
    const formData = new FormData();
    formData.append('token', deleteToken);
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.result !== 'ok') {
            console.warn('Cloudinary deletion failed:', data);
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
    }
  };

  const handleGenogramImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setImageError(null);
    setImageSaveSuccess(false);

    try {
      if (caseData.genogramImageDeleteToken) {
        await deleteFromCloudinary(caseData.genogramImageDeleteToken);
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'La subida de la imagen falló.');
      }
      
      const data = await response.json();
      
      const updatedCaseData: Case = {
        ...caseData,
        genogramImage: data.secure_url,
        genogramImageDeleteToken: data.delete_token,
      };

      await onUpdateCase(updatedCaseData);
      
      setImageSaveSuccess(true);
      setTimeout(() => setImageSaveSuccess(false), 3000);

    } catch (error: any) {
      console.error("Error uploading to Cloudinary:", error);
      setImageError(error.message);
    } finally {
      setIsUploading(false);
      if (genogramFileInputRef.current) {
        genogramFileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveGenogramImage = () => {
    requestConfirmation(
      'Eliminar Imagen del Genograma',
      '¿Estás seguro de que quieres eliminar la imagen? Esta acción la borrará permanentemente del servidor y no se puede deshacer.',
      async () => {
        if (!caseData.genogramImageDeleteToken) return;
        
        setImageError(null);
        setImageSaveSuccess(false);
        setIsUploading(true); // Use 'isUploading' state to show loading feedback

        try {
          await deleteFromCloudinary(caseData.genogramImageDeleteToken);
          
          const updatedCaseData: Case = {
            ...caseData,
            genogramImage: undefined,
            genogramImageDeleteToken: undefined,
          };

          await onUpdateCase(updatedCaseData);
          setImageSaveSuccess(true);
          setTimeout(() => setImageSaveSuccess(false), 3000);
        } catch (error) {
          console.error("Error during image deletion from Cloudinary:", error);
          setImageError('No se pudo completar la eliminación del servidor.');
        } finally {
            setIsUploading(false);
        }
      }
    );
  };
  
  const handleReset = () => {
      setFormData(getCaseFormData(caseData));
      setErrors({});
      setIsDirty(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email && !emailRegex.test(formData.email)) {
      setErrors({ email: 'El formato del correo electrónico no es válido.' });
      return;
    }
    
    setErrors({});
    setIsSaving(true);
    
    const caseToUpdate = { ...caseData, ...formData };
    
    await onUpdateCase(caseToUpdate);

    setIsSaving(false);
    setIsDirty(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };
  

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatItem icon={IoStatsChartOutline} label="Intervenciones" value={stats.totalInterventions} />
            <StatItem icon={IoCheckboxOutline} label="Tareas Pendientes" value={stats.pendingTasks} />
            <StatItem icon={IoCheckmarkDoneCircleOutline} label="Tareas Completadas" value={stats.completedTasks} />
            <StatItem icon={IoTimeOutline} label="Días en programa" value={stats.daysInProgram} />
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
            <div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <InputField name="nickname" label="Apodo" value={formData.nickname} placeholder="Cómo prefiere que le llamen" className="sm:col-span-2" onChange={handleChange} />
                    <InputField name="dni" label="DNI / Documento" value={formData.dni} placeholder="12345678X" required onChange={handleChange} />
                    <InputField name="phone" label="Teléfono" value={formData.phone} placeholder="600 123 456" required onChange={handleChange} />
                    <InputField 
                        name="email" 
                        label="Correo Electrónico" 
                        value={formData.email} 
                        placeholder="nombre@email.com" 
                        error={errors.email}
                        tooltip="El formato del correo electrónico debe ser válido (ej. nombre@email.com)"
                        onChange={handleChange}
                    />
                    <InputField name="address" label="Dirección de Residencia" value={formData.address} placeholder="Calle, Número, Ciudad" onChange={handleChange} />
                </div>
                <div className="mt-6">
                    <label htmlFor="profileNotes" className="block text-sm font-medium text-slate-700">
                    Anotaciones del Perfil
                    </label>
                    <div className="mt-1">
                    <textarea
                        rows={4}
                        name="profileNotes"
                        id="profileNotes"
                        value={formData.profileNotes}
                        onChange={handleChange}
                        className={formInputStyle(false)}
                        placeholder="Añade aquí notas generales sobre la persona, su situación, fortalezas, etc."
                    />
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-200">
                {isSaved && <span className="text-sm font-medium text-green-600 transition-opacity duration-300">¡Guardado!</span>}
                <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <IoRefreshOutline className="text-xl" />
                    Descartar
                </button>
                <button
                    type="submit"
                    disabled={!isDirty || isSaving}
                    className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <IoSaveOutline className="text-xl" />
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Genograma Familiar</h3>
            <div className="mt-2 border-t border-slate-200 pt-4">
                {caseData.genogramImage ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">Haz clic en la imagen para abrir el visor de página completa.</p>
                        <div 
                            className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-2"
                            onClick={() => onOpenGenogramViewer(caseData.genogramImage!)}
                        >
                            <img 
                                src={caseData.genogramImage} 
                                alt="Genograma familiar" 
                                className="w-full h-auto max-h-96 object-contain rounded-md"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                                <span className="text-white text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ampliar</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 font-medium">No hay un genograma subido.</p>
                        <p className="text-slate-500 mt-1 text-sm">Sube una imagen para visualizarla aquí.</p>
                    </div>
                )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <input
                        ref={genogramFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleGenogramImageChange}
                        className="hidden"
                        disabled={isUploading}
                    />
                    <button
                        type="button"
                        onClick={() => genogramFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 font-semibold flex items-center gap-2 transition-colors text-sm disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isUploading && <IoSyncOutline className="animate-spin" />}
                        {isUploading ? 'Subiendo...' : (caseData.genogramImage ? 'Cambiar Imagen' : 'Subir Imagen')}
                    </button>
                    {caseData.genogramImage && (
                        <button
                            type="button"
                            onClick={handleRemoveGenogramImage}
                            disabled={isUploading}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 rounded-lg transition-colors text-sm disabled:opacity-70"
                        >
                            Eliminar Imagen
                        </button>
                    )}
                </div>
                <div className="flex-grow">
                    {imageError && <p className="text-red-600 text-sm flex items-center gap-1.5"><IoWarningOutline/> {imageError}</p>}
                    {imageSaveSuccess && <p className="text-green-600 text-sm font-medium flex items-center gap-1.5"><IoCheckmarkCircleOutline/> Imagen guardada correctamente.</p>}
                </div>
            </div>
        </div>

        <div className="p-6 bg-red-50 rounded-lg shadow-sm border border-red-300">
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <IoWarningOutline />
                Zona de Peligro
            </h3>
            <p className="mt-2 text-sm text-slate-600">
                La eliminación de un caso es una acción permanente y no se puede deshacer. 
                Se borrarán todos los datos asociados, incluyendo intervenciones, tareas y notas.
            </p>
            <div className="mt-4 text-right">
                <button
                    type="button"
                    onClick={() => onDeleteCase(caseData.id)}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Eliminar Caso Permanentemente
                </button>
            </div>
        </div>
    </div>
  );
};

export default ProfileView;
