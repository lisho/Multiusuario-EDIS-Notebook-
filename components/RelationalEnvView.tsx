import React, { useState, useMemo } from 'react';
import { Case, FamilyMember, DashboardView } from '../types';
import FamilyMemberModal from './FamilyMemberModal';
import ContactCard from './ContactCard';
import { IoAddOutline } from 'react-icons/io5';

interface RelationalEnvViewProps {
  caseData: Case;
  onUpdateCase: (updatedCase: Case) => void;
  requestConfirmation: (title: string, message: string, onConfirm: () => void) => void;
  cases: Case[];
  onSelectCaseById: (caseId: string, view: DashboardView) => void;
}

const RelationalEnvView: React.FC<RelationalEnvViewProps> = ({ caseData, onUpdateCase, requestConfirmation, cases, onSelectCaseById }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const hydratedContacts = useMemo(() => {
    const caseMap = new Map(cases.map(c => [c.id, c]));
    const originalContacts = caseData.familyGrid || [];

    return originalContacts.map(contact => {
      if (contact.caseIdLink) {
        const linkedCase = caseMap.get(contact.caseIdLink);
        if (linkedCase) {
          // Return a new object with updated data from the linked case,
          // while preserving the specific relationship data from the original contact.
          return {
            ...contact, // Keeps id, relationship, birthDate, notes, isFamily, isConflictual, caseIdLink
            name: linkedCase.name, // Override with fresh data
            phone: linkedCase.phone,
            email: linkedCase.email,
            address: linkedCase.address,
          };
        }
      }
      // If no link or linked case not found, return the original contact as is.
      return contact;
    });
  }, [caseData.familyGrid, cases]);


  const categorizedContacts = useMemo(() => {
    const cohabits = (member: FamilyMember) => member.address === caseData.address && !!caseData.address;

    const conflictual = hydratedContacts.filter(m => m.isConflictual);
    const nonConflictual = hydratedContacts.filter(m => !m.isConflictual);

    return {
      familyUnit: nonConflictual.filter(m => m.isFamily && cohabits(m)),
      cohabitationUnit: nonConflictual.filter(m => !m.isFamily && cohabits(m)),
      familySupport: nonConflictual.filter(m => m.isFamily && !cohabits(m)),
      otherResources: nonConflictual.filter(m => !m.isFamily && !cohabits(m)),
      conflictualRelationships: conflictual,
    };
  }, [hydratedContacts, caseData.address]);

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: FamilyMember) => {
    // Find the original, un-hydrated member data to pass to the modal
    // This ensures that fields like 'notes' or 'relationship' are the stored values.
    const originalMember = (caseData.familyGrid || []).find(m => m.id === member.id);
    setEditingMember(originalMember || null);
    setIsModalOpen(true);
  };

  const handleDeleteMember = (id: string) => {
    requestConfirmation(
      'Eliminar Contacto',
      '¿Estás seguro de que quieres eliminar este contacto? Esta acción no se puede deshacer.',
      () => {
        const updatedGrid = (caseData.familyGrid || []).filter(member => member.id !== id);
        onUpdateCase({ ...caseData, familyGrid: updatedGrid });
      }
    );
  };

  const handleSaveMember = (memberData: Omit<FamilyMember, 'id'> & { id?: string }) => {
    const originalContacts = caseData.familyGrid || [];
    let updatedGrid: FamilyMember[];

    if (memberData.id) { // Editing
      updatedGrid = originalContacts.map(m => (m.id === memberData.id ? { ...m, ...memberData } as FamilyMember : m));
    } else { // Adding
      const newMember: FamilyMember = {
        id: `fm-${Date.now()}`,
        name: memberData.name,
        relationship: memberData.relationship,
        birthDate: memberData.birthDate,
        phone: memberData.phone,
        email: memberData.email,
        address: memberData.address,
        notes: memberData.notes,
        isFamily: memberData.isFamily,
        isConflictual: memberData.isConflictual,
        caseIdLink: memberData.caseIdLink,
      };
      updatedGrid = [...originalContacts, newMember];
    }
    onUpdateCase({ ...caseData, familyGrid: updatedGrid });
    setIsModalOpen(false);
  };

  const renderSection = (title: string, members: FamilyMember[], description: string, titleColor: string = 'text-slate-800') => {
    if (members.length === 0) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className={`text-xl font-bold ${titleColor} mb-2`}>{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(member => (
            <ContactCard
              key={member.id}
              member={member}
              onEdit={() => handleOpenEditModal(member)}
              onDelete={() => handleDeleteMember(member.id)}
              onSelectCaseById={(caseId) => onSelectCaseById(caseId, 'profile')}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">
                Mapa Relacional de {caseData.name}
                {caseData.nickname && <strong className="ml-2 text-slate-600">({caseData.nickname})</strong>}
            </h2>
            <button
              onClick={handleOpenAddModal}
              className="bg-teal-600 text-white w-10 h-10 rounded-lg hover:bg-teal-700 flex items-center justify-center transition-colors"
              title="Añadir Contacto"
            >
              <IoAddOutline className="text-2xl" />
            </button>
        </div>

        {hydratedContacts.length > 0 ? (
            <div className="space-y-6">
                {renderSection('Unidad Familiar', categorizedContacts.familyUnit, 'Familiares que residen en el mismo domicilio.')}
                {renderSection('Unidad de Convivencia', categorizedContacts.cohabitationUnit, 'Personas no familiares que residen en el mismo domicilio.')}
                {renderSection('Apoyos Familiares', categorizedContacts.familySupport, 'Otros familiares que no conviven en el domicilio.')}
                {renderSection('Otros Recursos', categorizedContacts.otherResources, 'Amigos, compañeros, vecinos u otros apoyos significativos.')}
                {renderSection('Relaciones Conflictivas', categorizedContacts.conflictualRelationships, 'Personas con conflictos abiertos o influencia negativa.', 'text-red-700')}
            </div>
        ) : (
            <div className="text-center py-10 px-4 bg-white rounded-lg border-2 border-dashed border-slate-200 shadow-sm">
              <p className="text-slate-500 font-medium">No hay contactos en el entorno relacional.</p>
              <p className="text-slate-500 mt-2">Utiliza el botón "Añadir Contacto" para empezar a construir el mapa relacional.</p>
          </div>
        )}
      </div>

      <FamilyMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMember}
        initialData={editingMember}
        caseAddress={caseData.address || ''}
        cases={cases}
        currentCaseId={caseData.id}
      />
    </>
  );
};

export default RelationalEnvView;
