import React, { useMemo } from 'react';
import { Case, CaseStatus, Professional, ProfessionalRole, InterventionType } from '../types';
import {
    IoBriefcaseOutline,
    IoLocationOutline,
    IoBarChartOutline
} from 'react-icons/io5';
import { 
    PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label,
    BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

interface MyStatsDashboardProps {
  cases: Case[];
  professionals: Professional[];
}

const getStatusColorClass = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral: return 'bg-amber-400';
        case CaseStatus.Welcome: return 'bg-emerald-400';
        case CaseStatus.CoDiagnosis: return 'bg-blue-400';
        case CaseStatus.SharedPlanning: return 'bg-purple-400';
        case CaseStatus.Accompaniment: return 'bg-teal-400';
        case CaseStatus.FollowUp: return 'bg-lime-400';
        case CaseStatus.Closed: return 'bg-zinc-400';
        default: return 'bg-slate-400';
    }
};

const getStatusHexColor = (status: CaseStatus): string => {
    switch (status) {
        case CaseStatus.PendingReferral: return '#fbbf24';
        case CaseStatus.Welcome: return '#34d399';
        case CaseStatus.CoDiagnosis: return '#60a5fa';
        case CaseStatus.SharedPlanning: return '#a78bfa';
        case CaseStatus.Accompaniment: return '#2dd4bf';
        case CaseStatus.FollowUp: return '#a3e635';
        case CaseStatus.Closed: return '#a1a1aa';
        default: return '#94a3b8';
    }
};

const interventionTypeHexColors: Record<string, string> = {
    [InterventionType.HomeVisit]: '#10b981',
    [InterventionType.PhoneCall]: '#38bdf8',
    [InterventionType.Meeting]: '#6366f1',
    [InterventionType.Workshop]: '#a855f7',
    [InterventionType.Administrative]: '#64748b',
    [InterventionType.Coordination]: '#f59e0b',
    [InterventionType.PsychologicalSupport]: '#f43f5e',
    [InterventionType.GroupSession]: '#22d3ee',
    [InterventionType.Accompaniment]: '#84cc16',
    [InterventionType.Other]: '#9ca3af',
    [InterventionType.Reunion]: '#3b82f6',
    [InterventionType.AssessmentInterview]: '#0ea5e9',
    [InterventionType.ElaborarMemoria]: '#6b7280',
    [InterventionType.ElaborarDocumento]: '#6b7280',
    [InterventionType.Fiesta]: '#ec4899',
    [InterventionType.Vacaciones]: '#facc15',
    [InterventionType.Viaje]: '#06b6d4',
    [InterventionType.CursoFormacion]: '#fb923c',
};

const MyStatsDashboard: React.FC<MyStatsDashboardProps> = ({ cases, professionals }) => {

    const stats = useMemo(() => {
        const activeCases = cases.filter(c => c.status !== CaseStatus.Closed);
        const totalCases = activeCases.length;
        
        const statusOrder: CaseStatus[] = [
            CaseStatus.PendingReferral,
            CaseStatus.Welcome,
            CaseStatus.CoDiagnosis,
            CaseStatus.SharedPlanning,
            CaseStatus.Accompaniment,
            CaseStatus.FollowUp,
            CaseStatus.Closed,
        ];

        const casesByStatus = Object.values(CaseStatus)
            .map(status => ({
                status,
                count: activeCases.filter(c => c.status === status).length,
                color: getStatusHexColor(status),
                className: getStatusColorClass(status),
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

        const ceasCounts: { [key: string]: number } = {};
        const professionalMap = new Map(professionals.map(p => [p.id, p]));

        activeCases.forEach(c => {
            const socialWorker = c.professionalIds
                ?.map(id => professionalMap.get(id))
                .find(p => p?.role === ProfessionalRole.SocialWorker);
            
            const ceasName = socialWorker?.ceas || 'Sin CEAS Asignado';
            ceasCounts[ceasName] = (ceasCounts[ceasName] || 0) + 1;
        });

        const casesByCeas = Object.entries(ceasCounts)
            .map(([ceas, count]) => ({ ceas, count }))
            .sort((a, b) => b.count - a.count);
        
        const maxCeasCount = casesByCeas.reduce((max, item) => Math.max(max, item.count), 0);

        return { totalCases, casesByStatus, casesByCeas, maxCeasCount };
    }, [cases, professionals]);
    
    const lastMonthStats = useMemo(() => {
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 30);
        
        const data: { name: string; total: number; [key: string]: any }[] = [];
        const activeTypes = new Set<string>();

        cases.forEach(c => {
            const recentInterventions = c.interventions.filter(i => new Date(i.start) >= lastMonth);
            if (recentInterventions.length > 0) {
                const caseStats: any = { 
                    name: c.name.split(' ')[0] + (c.nickname ? ` (${c.nickname})` : ''), 
                    total: recentInterventions.length 
                };
                recentInterventions.forEach(i => {
                    const type = i.interventionType;
                    caseStats[type] = (caseStats[type] || 0) + 1;
                    activeTypes.add(type);
                });
                data.push(caseStats);
            }
        });

        // Sort by total interventions descending and take top 10
        const sortedData = data.sort((a, b) => b.total - a.total).slice(0, 10);
        const sortedTypes = Array.from(activeTypes).sort();

        return { data: sortedData, types: sortedTypes };
    }, [cases]);

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-8">Mis Estadísticas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Active Cases Summary */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <IoBriefcaseOutline className="text-teal-600 text-xl" />
                        <h3 className="font-semibold text-slate-800">Resumen de Casos Activos</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <div className="flex-shrink-0 w-48 h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={stats.casesByStatus}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                    >
                                        {stats.casesByStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                        <Label value={stats.totalCases} position="center" className="text-3xl font-bold text-slate-800" dy={-5} />
                                        <Label value="Casos" position="center" className="text-sm text-slate-500" dy={15} />
                                    </Pie>
                                    <Tooltip formatter={(value: number, name: string, props) => [`${value} (${((value / stats.totalCases) * 100).toFixed(1)}%)`, props.payload.status]} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full flex-grow">
                            <ul className="space-y-2 text-sm">
                                {stats.casesByStatus.map(({ status, count, className }) => (
                                    <li key={status} className="flex justify-between items-center p-2 rounded-md bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${className}`}></span>
                                            <span className="text-slate-700 font-medium">{status}</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Cases by CEAS */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <IoLocationOutline className="text-teal-600 text-xl" />
                        <h3 className="font-semibold text-slate-800">Casos por CEAS</h3>
                    </div>
                    <ul className="space-y-4 text-sm">
                        {stats.casesByCeas.map(({ ceas, count }) => {
                            const barWidth = stats.maxCeasCount > 0 ? (count / stats.maxCeasCount) * 100 : 0;
                            return (
                                <li key={ceas}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-slate-700 truncate pr-2">{ceas}</span>
                                        <span className="font-bold text-slate-800">{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3">
                                        <div
                                            className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%` }}
                                            title={`${count} caso(s)`}
                                        ></div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Last Month Actions */}
                {lastMonthStats.data.length > 0 && (
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6">
                            <IoBarChartOutline className="text-teal-600 text-xl" />
                            <h3 className="font-semibold text-slate-800">Actuaciones último mes (Top 10 Casos)</h3>
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart
                                    data={lastMonthStats.data}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12 }} 
                                        interval={0}
                                        angle={-30}
                                        textAnchor="end"
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    {lastMonthStats.types.map((type, index) => (
                                        <Bar 
                                            key={type} 
                                            dataKey={type} 
                                            stackId="a" 
                                            fill={interventionTypeHexColors[type] || '#9ca3af'} 
                                        />
                                    ))}
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyStatsDashboard;