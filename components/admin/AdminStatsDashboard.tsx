import React, { useMemo, useState, useEffect } from 'react';
import { Case, Professional, Intervention, ProfessionalRole, InterventionType } from '../../types';
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
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
const colorPalette = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#f59e0b', '#06b6d4'];
let colorIndex = 0;
const assignedColors: Record<string, string> = {};

const getInterventionHexColor = (type: string): string => {
    if (assignedColors[type]) return assignedColors[type];
    if (interventionTypeHexColors[type]) {
        assignedColors[type] = interventionTypeHexColors[type];
        return assignedColors[type];
    }
    assignedColors[type] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;
    return assignedColors[type];
};

interface LineChartProps {
    title: string;
    data: {
        labels: string[];
        datasets: { label: string; data: number[]; color: string }[];
    };
    visibleDatasets: Record<string, boolean>;
    onToggleDataset: (label: string) => void;
}

const LineChart: React.FC<LineChartProps> = ({ title, data, visibleDatasets, onToggleDataset }) => {
    const [hoveredPoint, setHoveredPoint] = useState<{ seriesIndex: number; dataIndex: number } | null>(null);
    const { labels, datasets } = data;

    if (!labels || labels.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
                <p className="text-slate-500 text-center py-4">No hay suficientes datos para mostrar el gráfico.</p>
            </div>
        );
    }
    
    const padding = { top: 20, right: 20, bottom: 60, left: 40 };
    const width = 600;
    const height = 350;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const visibleData = datasets.filter(d => visibleDatasets[d.label]).flatMap(d => d.data);
    const maxValue = Math.max(...visibleData, 1);

    const xStep = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth / 2;
    const xScale = (index: number) => padding.left + index * xStep;
    const yScale = (value: number) => height - padding.bottom - (value / maxValue) * chartHeight;

    const yAxisTicks = 5;
    const yAxis = Array.from({ length: yAxisTicks + 1 }, (_, i) => {
        const value = Math.round((maxValue / yAxisTicks) * i);
        const y = yScale(value);
        return (
            <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10px" fill="#64748b">{value}</text>
            </g>
        );
    });

    const xAxis = labels.map((label, index) => (
        <text key={index} x={xScale(index)} y={height - padding.bottom + 20} textAnchor="middle" fontSize="10px" fill="#64748b" transform={`rotate(-45, ${xScale(index)}, ${height - padding.bottom + 20})`}>
            {label}
        </text>
    ));

    const paths = datasets.map(dataset => {
        if (!visibleDatasets[dataset.label] || dataset.data.length === 0) return null;
        if (dataset.data.length === 1) {
             return <circle key={dataset.label} cx={xScale(0)} cy={yScale(dataset.data[0])} r="3" fill={dataset.color} />;
        }
        const points = dataset.data.map((value, index) => `${xScale(index)},${yScale(value)}`).join(' L ');
        return <path key={dataset.label} d={`M ${points}`} fill="none" stroke={dataset.color} strokeWidth="2" />;
    });

    const legend = (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
            {datasets.map(dataset => (
                <button
                    key={dataset.label}
                    onClick={() => onToggleDataset(dataset.label)}
                    className={`flex items-center gap-2 p-1 rounded transition-opacity ${!visibleDatasets[dataset.label] ? 'opacity-40' : ''}`}
                >
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: dataset.color }}></span>
                    <span className="text-slate-600">{dataset.label}</span>
                </button>
            ))}
        </div>
    );
    
    const tooltip = hoveredPoint && (
        <g transform={`translate(${xScale(hoveredPoint.dataIndex)}, ${yScale(datasets[hoveredPoint.seriesIndex].data[hoveredPoint.dataIndex])})`}>
            <rect x="-60" y="-45" width="120" height="30" fill="rgba(0,0,0,0.75)" rx="4" />
            <text x="0" y="-25" textAnchor="middle" fill="white" fontSize="11px" fontWeight="bold">
                {`${datasets[hoveredPoint.seriesIndex].label}: ${datasets[hoveredPoint.seriesIndex].data[hoveredPoint.dataIndex]}`}
            </text>
        </g>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                {yAxis}
                {xAxis}
                {paths}
                {datasets.map((dataset, seriesIndex) => 
                    visibleDatasets[dataset.label] && dataset.data.map((value, dataIndex) => (
                        <circle
                            // FIX: Replaced template literal with standard string concatenation.
                            // This is a speculative fix for a potential toolchain bug where a template literal
                            // containing a hyphen inside a JSX property might be misinterpreted as an arithmetic operation.
                            key={seriesIndex + '-' + dataIndex}
                            cx={xScale(dataIndex)}
                            cy={yScale(value)}
                            r="8"
                            fill="transparent"
                            onMouseEnter={() => setHoveredPoint({ seriesIndex, dataIndex })}
                            onMouseLeave={() => setHoveredPoint(null)}
                        />
                    ))
                )}
                {tooltip}
            </svg>
            {legend}
        </div>
    );
};

const AdminStatsDashboard: React.FC<AdminStatsDashboardProps> = ({ cases, professionals, allInterventions }) => {
    const [visibleDatasets, setVisibleDatasets] = useState<Record<string, boolean>>({});

    const stats = useMemo(() => {
        const totalCases = cases.length;
        const activeCases = cases.filter(c => c.status !== 'Cerrado');
        const activeCasesCount = activeCases.length;
        const totalProfessionals = professionals.length;
        const edisCount = professionals.filter(p => p.role === ProfessionalRole.EdisTechnician).length;
        const tsCount = professionals.filter(p => p.role === ProfessionalRole.SocialWorker).length;
        const totalInterventions = allInterventions.length;

        const interventionsByType = allInterventions.reduce((acc, intervention) => {
            const type = intervention.interventionType || 'Sin Tipo';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const interventionsByTypeChartData = Object.entries(interventionsByType)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value);

        const casesByMonth = activeCases.reduce((acc: Record<string, number>, caseItem) => {
            const date = new Date(caseItem.orderIndex || 0);
            if (isNaN(date.getTime()) || date.getFullYear() < 2020) return acc;
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const casesByMonthChartData = Object.entries(casesByMonth)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(-12);

        const casesPerProfessional: Record<string, number> = {};
        activeCases.forEach(c => {
            (c.professionalIds || []).forEach(profId => {
                casesPerProfessional[profId] = (casesPerProfessional[profId] || 0) + 1;
            });
        });

        const casesByEdisData = professionals
            .filter(p => p.role === ProfessionalRole.EdisTechnician && p.systemRole !== 'admin')
            .map(p => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
            .sort((a, b) => b.value - a.value);

        const casesByTsData = professionals
            .filter(p => p.role === ProfessionalRole.SocialWorker)
            .map(p => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
            .sort((a, b) => b.value - a.value);

        const interventionsByMonthType: Record<string, Record<string, number>> = {};
        const interventionTypes = new Set<string>();
        allInterventions.forEach(intervention => {
            const date = new Date(intervention.start);
            if (isNaN(date.getTime()) || date.getFullYear() < 2020) return;

            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const type = intervention.interventionType || 'Sin Tipo';
            
            if (!interventionsByMonthType[monthKey]) {
                interventionsByMonthType[monthKey] = {};
            }
            interventionsByMonthType[monthKey][type] = (interventionsByMonthType[monthKey][type] || 0) + 1;
            interventionTypes.add(type);
        });
        
        const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        const sortedMonths = Object.keys(interventionsByMonthType)
            .sort()
            .filter(month => month <= currentMonthKey)
            .slice(-12);

        const sortedTypes = Array.from(interventionTypes).sort();

        const interventionsByMonthChartData = {
            labels: sortedMonths,
            datasets: sortedTypes.map(type => ({
                label: type,
                data: sortedMonths.map(month => interventionsByMonthType[month][type] || 0),
                color: getInterventionHexColor(type),
            })).filter(dataset => dataset.data.some(d => d > 0))
        };

        return {
            totalCases, activeCasesCount, totalProfessionals, edisCount, tsCount, totalInterventions,
            interventionsByTypeChartData, casesByMonthChartData, casesByEdisData,
            casesByTsData, interventionsByMonthChartData,
        };

    }, [cases, professionals, allInterventions]);

    useEffect(() => {
        const initialVisibility = stats.interventionsByMonthChartData.datasets.reduce((acc, dataset) => {
            acc[dataset.label] = true;
            return acc;
        }, {} as Record<string, boolean>);
        setVisibleDatasets(initialVisibility);
    }, [stats.interventionsByMonthChartData.datasets]);

    const handleToggleDataset = (label: string) => {
        setVisibleDatasets(prev => ({
            ...prev,
            [label]: !prev[label]
        }));
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-slate-800">Estadísticas Generales</h2>
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 <div className="lg:col-span-2">
                    <BarChart title="Intervenciones por Tipo" data={stats.interventionsByTypeChartData} />
                 </div>
                 <BarChart title="Casos Activos por Técnico EDIS" data={stats.casesByEdisData} />
                 <BarChart title="Casos Activos por Trabajador/a Social" data={stats.casesByTsData} />
                 <div className="lg:col-span-2">
                    <BarChart title="Casos Creados por Mes (Últimos 12)" data={stats.casesByMonthChartData} />
                 </div>
                 <div className="lg:col-span-2">
                    <LineChart 
                        title="Evolución de Intervenciones por Mes" 
                        data={stats.interventionsByMonthChartData}
                        visibleDatasets={visibleDatasets}
                        onToggleDataset={handleToggleDataset}
                    />
                 </div>
            </div>
        </div>
    );
};

export default AdminStatsDashboard;