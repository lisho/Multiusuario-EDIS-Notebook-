import React, { useMemo } from 'react';
import { Case, Professional, Intervention, ProfessionalRole } from '../../types';
import { IoBriefcaseOutline, IoPeopleOutline, IoConstructOutline } from 'react-icons/io5';

interface AdminStatsDashboardProps {
    cases: Case[];
    professionals: Professional[];
    allInterventions: Intervention[];
}

const StatCard: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    iconBgColor: string;
    iconColor: string;
}> = ({ icon: Icon, title, value, iconBgColor, iconColor }) => (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
        <div className={`rounded-full p-3 ${iconBgColor}`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>
        <div>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            <p className="text-sm font-medium text-slate-500">{title}</p>
        </div>
    </div>
);

const BarChart: React.FC<{ title: string; data: { label: string; value: number }[] }> = ({ title, data }) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 0), [data]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {data.length > 0 ? data.map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-4 items-center gap-2 text-sm">
                        <span className="col-span-1 font-medium text-slate-600 truncate text-right pr-2" title={label}>{label}</span>
                        <div className="col-span-3 flex items-center gap-2">
                            <div className="w-full bg-slate-200 rounded-full h-4">
                                <div
                                    className="bg-teal-500 h-4 rounded-full transition-all duration-500"
                                    style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }}
                                />
                            </div>
                            <span className="font-bold text-slate-700 w-8 text-right">{value}</span>
                        </div>
                    </div>
                )) : <p className="text-slate-500 text-center py-4">No hay datos disponibles.</p>}
            </div>
        </div>
    );
};

const AdminStatsDashboard: React.FC<AdminStatsDashboardProps> = ({ cases, professionals, allInterventions }) => {
    
    const stats = useMemo(() => {
        // General Counts
        const totalCases = cases.length;
        const activeCasesCount = cases.filter(c => c.status !== 'Cerrado').length;
        const totalProfessionals = professionals.length;
        const edisCount = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician).length;
        const tsCount = professionals.filter(p => p.role === ProfessionalRole.SocialWorker).length;
        const totalInterventions = allInterventions.length;

        // Interventions by Type
        const interventionsByType = allInterventions.reduce((acc, intervention) => {
            const type = intervention.interventionType || 'Sin Tipo';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const interventionsByTypeChartData = Object.entries(interventionsByType)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);

        // Cases created by month
        // FIX: Explicitly type the accumulator `acc` in the reduce function to resolve a TypeScript error related to arithmetic operations.
        const casesByMonth = cases.reduce((acc: Record<string, number>, caseItem) => {
            // Using orderIndex as a proxy for creation date
            const date = new Date(caseItem.orderIndex || 0);
            if (isNaN(date.getTime()) || date.getFullYear() < 2020) return acc; // Filter out invalid dates
            
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const casesByMonthChartData = Object.entries(casesByMonth)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(-12); // Show last 12 months

        return {
            totalCases,
            activeCasesCount,
            totalProfessionals,
            edisCount,
            tsCount,
            totalInterventions,
            interventionsByTypeChartData,
            casesByMonthChartData
        };

    }, [cases, professionals, allInterventions]);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-800">Estadísticas Generales</h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    icon={IoBriefcaseOutline} 
                    title="Casos Totales / Activos"
                    value={`${stats.totalCases} / ${stats.activeCasesCount}`}
                    iconBgColor="bg-teal-100"
                    iconColor="text-teal-600"
                />
                 <StatCard 
                    icon={IoPeopleOutline} 
                    title="Profesionales (EDIS / TS)"
                    value={`${stats.totalProfessionals} (${stats.edisCount}/${stats.tsCount})`}
                    iconBgColor="bg-sky-100"
                    iconColor="text-sky-600"
                />
                 <StatCard 
                    icon={IoConstructOutline} 
                    title="Intervenciones Totales"
                    value={stats.totalInterventions}
                    iconBgColor="bg-amber-100"
                    iconColor="text-amber-600"
                />
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 <BarChart title="Intervenciones por Tipo" data={stats.interventionsByTypeChartData} />
                 <BarChart title="Casos Creados por Mes (Últimos 12)" data={stats.casesByMonthChartData} />
            </div>
        </div>
    );
};

export default AdminStatsDashboard;
