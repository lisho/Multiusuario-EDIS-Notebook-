import React, { useMemo } from 'react';
import { Case, Professional, Intervention, ProfessionalRole } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminStatsDashboardProps {
    cases: Case[];
    professionals: Professional[];
    allInterventions: Intervention[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57'];

export const AdminStatsDashboard: React.FC<AdminStatsDashboardProps> = ({ cases, professionals, allInterventions }) => {
    
    const casesPerProfessional = useMemo(() => {
        const counts: Record<string, number> = {};
        cases.forEach(c => {
            c.professionalIds?.forEach(pid => {
                counts[pid] = (counts[pid] || 0) + 1;
            });
        });
        return counts;
    }, [cases]);

    const casesByCeas = useMemo(() => {
        const counts: Record<string, number> = {};
        const professionalMap = new Map(professionals.map(p => [p.id, p]));
        
        cases.forEach(c => {
             const socialWorker = c.professionalIds
                ?.map(id => professionalMap.get(id))
                .find(p => p?.role === ProfessionalRole.SocialWorker);
            
            if (socialWorker && socialWorker.ceas) {
                counts[socialWorker.ceas] = (counts[socialWorker.ceas] || 0) + 1;
            } else {
                counts['Sin Asignar'] = (counts['Sin Asignar'] || 0) + 1;
            }
        });
        return counts;
    }, [cases, professionals]);

    const casesByEdisData = useMemo(() => professionals
        .filter(p => p.role === ProfessionalRole.EdisTechnician && p.systemRole !== 'admin')
        .map((p): { label: string; value: number } => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value), [professionals, casesPerProfessional]);

    const casesByTsData = useMemo(() => professionals
        .filter(p => p.role === ProfessionalRole.SocialWorker)
        .map((p): { label: string; value: number } => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value), [professionals, casesPerProfessional]);
        
    const casesByCeasData = useMemo(() => Object.entries(casesByCeas)
        .map(([label, value]): { label: string; value: number } => ({ label, value }))
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value), [casesByCeas]);

    return (
        <div className="space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Carga de Trabajo - Técnicos EDIS</h3>
                    {casesByEdisData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={casesByEdisData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis type="category" dataKey="label" width={120} style={{fontSize: '12px'}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" fill="#0d9488" name="Casos" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-10">No hay datos disponibles.</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Distribución de Casos por CEAS</h3>
                    {casesByCeasData.length > 0 ? (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={casesByCeasData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="label"
                                        label={({name, percent}) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {casesByCeasData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-10">No hay datos disponibles.</p>
                    )}
                </div>
             </div>

             <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Carga de Trabajo - Trabajadores/as Sociales</h3>
                {casesByTsData.length > 0 ? (
                    <div className="h-96">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={casesByTsData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" angle={-45} textAnchor="end" interval={0} height={80} style={{fontSize: '11px'}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" fill="#6366f1" name="Casos" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-10">No hay datos disponibles.</p>
                )}
             </div>
        </div>
    );
};