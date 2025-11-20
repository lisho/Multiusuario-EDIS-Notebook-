import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Case, Professional, Intervention, ProfessionalRole, InterventionType } from '../../types';
import { IoBriefcaseOutline, IoPeopleOutline, IoConstructOutline } from 'react-icons/io5';
import { 
    BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';


interface AdminStatsDashboardProps {
    cases: Case[];
    professionals: Professional[];
    allInterventions: Intervention[];
}

const AnimatedSection: React.FC<{
    children: React.ReactNode,
    className?: string,
    delay?: number,
    delayChildRender?: boolean,
    placeholderHeight?: number | 'auto'
}> = ({ children, className, delay = 0, delayChildRender = false, placeholderHeight = 'auto' }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isContainerVisible, setIsContainerVisible] = useState(false);
    const [isChildRendered, setIsChildRendered] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsContainerVisible(true);
                    if (delayChildRender) {
                        setTimeout(() => {
                            setIsChildRendered(true);
                        }, delay + 700); // animation delay + animation duration
                    }
                    observer.unobserve(entry.target);
                }
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.1,
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [delay, delayChildRender]);

    const style = {
        transitionDelay: `${delay}ms`
    };
    const placeholderStyle: React.CSSProperties = placeholderHeight === 'auto' ? {} : { minHeight: `${placeholderHeight}px` };

    const shouldRenderChild = !delayChildRender || isChildRendered;

    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-700 ease-out ${isContainerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={style}
        >
            {shouldRenderChild ? children : <div style={placeholderStyle} aria-hidden="true" />}
        </div>
    );
};


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
const colorPalette = ['#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#14b8a6', '#ec4899', '#f59e0b', '#06b6d4', '#22c55e', '#d946ef'];
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

const AdminStatsDashboard: React.FC<AdminStatsDashboardProps> = ({ cases, professionals, allInterventions }) => {
    const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
    const [selectedYear, setSelectedYear] = useState<string>('all');

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
            // FIX: Explicitly type the sort comparator arguments to avoid arithmetic errors.
            .sort((a: { value: number }, b: { value: number }) => b.value - a.value);

        const casesPerProfessional: Record<string, number> = {};
        activeCases.forEach(c => {
            (c.professionalIds || []).forEach(profId => {
                casesPerProfessional[profId] = (casesPerProfessional[profId] || 0) + 1;
            });
        });

        const casesByEdisData = professionals
            .filter(p => p.role === ProfessionalRole.EdisTechnician && p.systemRole !== 'admin')
            .map(p => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
            .filter(p => p.value > 0)
            // FIX: Explicitly type the sort comparator arguments to avoid arithmetic errors.
            .sort((a: { value: number }, b: { value: number }) => b.value - a.value);

        const casesByTsData = professionals
            .filter(p => p.role === ProfessionalRole.SocialWorker)
            .map(p => ({ label: p.name, value: casesPerProfessional[p.id] || 0 }))
            .filter(p => p.value > 0)
            // FIX: Explicitly type the sort comparator arguments to avoid arithmetic errors.
            .sort((a: { value: number }, b: { value: number }) => b.value - a.value);
            
        const casesByCeas: Record<string, number> = {};
        const profMap = new Map(professionals.map(p => [p.id, p]));
        activeCases.forEach(c => {
            const socialWorker = (c.professionalIds || [])
                .map(id => profMap.get(id))
                .find(p => p?.role === ProfessionalRole.SocialWorker);
            const ceas = socialWorker?.ceas || 'Sin CEAS Asignado';
            casesByCeas[ceas] = (casesByCeas[ceas] || 0) + 1;
        });

        const casesByCeasData = Object.entries(casesByCeas)
            .map(([label, value]) => ({ label, value }))
            .filter(p => p.value > 0)
            // FIX: Explicitly type the sort comparator arguments to avoid arithmetic errors.
            .sort((a: { value: number }, b: { value: number }) => b.value - a.value);

        const availableYears = Array.from(new Set(allInterventions
            .map(i => new Date(i.start).getFullYear())
            .filter(year => year >= 2020)
            // FIX: Explicitly type the sort comparator arguments to avoid arithmetic errors.
        )).sort((a: number, b: number) => b - a).map(String);
        
        const filteredInterventionsByYear = selectedYear === 'all'
            ? allInterventions
            : allInterventions.filter(i => new Date(i.start).getFullYear().toString() === selectedYear);

        const interventionsByMonthType: Record<string, Record<string, number>> = {};
        const interventionTypes = new Set<string>();
        filteredInterventionsByYear.forEach(intervention => {
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
            .filter(month => month <= currentMonthKey);

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
            interventionsByTypeChartData, casesByEdisData,
            casesByTsData, casesByCeasData, interventionsByMonthChartData,
            availableYears
        };

    }, [cases, professionals, allInterventions, selectedYear]);
    
    useEffect(() => {
        const initialVisibility = stats.interventionsByMonthChartData.datasets.reduce((acc, dataset) => {
            acc[dataset.label] = false;
            return acc;
        }, {} as Record<string, boolean>);
        setHiddenSeries(initialVisibility);
    }, [stats.interventionsByMonthChartData.datasets]);

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
    };

    const lineChartData = useMemo(() => {
        const { labels, datasets } = stats.interventionsByMonthChartData;
        if (!labels) return [];
        return labels.map((label, index) => {
            const dataPoint: { name: string; [key: string]: string | number } = { name: label };
            datasets.forEach(dataset => {
                dataPoint[dataset.label] = dataset.data[index];
            });
            return dataPoint;
        });
    }, [stats.interventionsByMonthChartData, hiddenSeries]);

    return (
        <div className="space-y-8">
            <AnimatedSection>
                <h2 className="text-3xl font-bold text-slate-800">Estadísticas Generales</h2>
            </AnimatedSection>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 <AnimatedSection delay={100}>
                    <StatCard 
                        icon={IoBriefcaseOutline} 
                        title="Casos Totales / Activos"
                        value={`${stats.totalCases} / ${stats.activeCasesCount}`}
                        iconBgColor="bg-teal-100"
                        iconColor="text-teal-600"
                    />
                 </AnimatedSection>
                 <AnimatedSection delay={200}>
                    <StatCard 
                        icon={IoPeopleOutline} 
                        title="Profesionales (EDIS / TS)"
                        value={`${stats.totalProfessionals} (${stats.edisCount}/${stats.tsCount})`}
                        iconBgColor="bg-sky-100"
                        iconColor="text-sky-600"
                    />
                 </AnimatedSection>
                 <AnimatedSection delay={300}>
                    <StatCard 
                        icon={IoConstructOutline} 
                        title="Intervenciones Totales"
                        value={stats.totalInterventions}
                        iconBgColor="bg-amber-100"
                        iconColor="text-amber-600"
                    />
                 </AnimatedSection>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                 <AnimatedSection className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-slate-200" delayChildRender placeholderHeight={stats.interventionsByTypeChartData.length * 40}>
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Intervenciones por Tipo</h3>
                    <ResponsiveContainer width="100%" height={stats.interventionsByTypeChartData.length * 40}>
                         <RechartsBarChart layout="vertical" data={stats.interventionsByTypeChartData} margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="label" type="category" width={100} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#2dd4bf" barSize={20} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                 </AnimatedSection>
                 <AnimatedSection className="bg-white p-6 rounded-lg shadow-sm border border-slate-200" delayChildRender placeholderHeight={300}>
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Casos Activos por Técnico EDIS</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                            <Pie 
                                data={stats.casesByEdisData} 
                                dataKey="value" 
                                nameKey="label" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80} 
                                label
                                paddingAngle={5}
                                cornerRadius={10}
                            >
                                {stats.casesByEdisData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                 </AnimatedSection>
                 <AnimatedSection className="bg-white p-6 rounded-lg shadow-sm border border-slate-200" delayChildRender placeholderHeight={300}>
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Casos Activos por Trabajador/a Social</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                            <Pie 
                                data={stats.casesByTsData} 
                                dataKey="value" 
                                nameKey="label" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80} 
                                label
                                paddingAngle={5}
                                cornerRadius={10}
                            >
                                {stats.casesByTsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                 </AnimatedSection>
                 <AnimatedSection className="bg-white p-6 rounded-lg shadow-sm border border-slate-200" delayChildRender placeholderHeight={300}>
                     <h3 className="text-lg font-bold text-slate-800 mb-4">Casos Activos por CEAS</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                            <Pie 
                                data={stats.casesByCeasData} 
                                dataKey="value" 
                                nameKey="label" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80} 
                                label
                                paddingAngle={5}
                                cornerRadius={10}
                            >
                                {stats.casesByCeasData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                 </AnimatedSection>
                 <AnimatedSection className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-slate-200" delayChildRender placeholderHeight={400}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Evolución de Intervenciones por Mes</h3>
                         <div>
                            <label htmlFor="year-filter" className="text-sm font-medium text-slate-600 mr-2">Año:</label>
                            <select
                                id="year-filter"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-white border-slate-300 focus:ring-teal-500 text-slate-900"
                            >
                                <option value="all">Todos</option>
                                {stats.availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                        <RechartsLineChart data={lineChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12 }}
                                // FIX: Explicitly type the 'tick' parameter as a string to resolve an error where it was inferred as 'unknown', preventing string operations.
                                tickFormatter={(tick: string) => {
                                    if (!tick.includes('-')) return tick;
                                    const [year, month] = tick.split('-');
                                    return `${month}/${year}`;
                                }}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend onClick={handleLegendClick} />
                            {stats.interventionsByMonthChartData.datasets.map(dataset => (
                                <Line 
                                    key={dataset.label} 
                                    type="monotone" 
                                    dataKey={dataset.label} 
                                    stroke={dataset.color} 
                                    hide={hiddenSeries[dataset.label]}
                                    activeDot={{ r: 6 }} 
                                    strokeWidth={2}
                                />
                            ))}
                        </RechartsLineChart>
                    </ResponsiveContainer>
                 </AnimatedSection>
            </div>
        </div>
    );
};

export default AdminStatsDashboard;