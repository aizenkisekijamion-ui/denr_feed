import React, { useState, useEffect, useMemo } from 'react';
// Import Google Fonts (Outfit is premium-looking and easy to read)
const fontImport = document.createElement('link');
fontImport.rel = 'stylesheet';
fontImport.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap';
document.head.appendChild(fontImport);

import { 
    collection, onSnapshot, query, orderBy, limit
} from 'firebase/firestore';
import { db } from '../firebase';
import FinanceBilling from './FinanceBilling';
import { 
    X, Boxes, ChevronLeft,
    PieChart as PieChartIcon, Activity, Database, 
    CalendarPlus, PlusCircle, AlertCircle, Calendar,
    TreeDeciduous, Globe, ShieldCheck, Target,
    CheckCircle2, Download, FileSpreadsheet,
    ChevronDown, Trophy, BarChart2, ArrowLeft, Search, Folder, Maximize2, FileText, Layers,
    MapPin, LocateFixed, DollarSign, LayoutDashboard, Clock, TrendingUp
} from 'lucide-react';
import { trackEvent } from '../utils/track';


const THEME_COLOR = "#d97706";

// Inject CSS animations for this component
if (!document.getElementById('admin-dash-styles')) {
    const s = document.createElement('style');
    s.id = 'admin-dash-styles';
    s.textContent = `
        @keyframes rdatsCardIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes barPulse {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.3) drop-shadow(0 0 8px var(--bar-glow)); }
            100% { filter: brightness(1); }
        }
        .rdats-card-animate {
            animation: rdatsCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .rdats-summary-card {
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .rdats-summary-card:hover {
            transform: translateY(-8px) scale(1.03);
            border-color: ${THEME_COLOR}88 !important;
            background: rgba(30, 41, 59, 0.5) !important;
            box-shadow: 0 25px 50px rgba(0,0,0,0.5), 0 0 25px ${THEME_COLOR}22 !important;
        }
        .matrix-row-premium:hover td {
            background: rgba(255,255,255,0.05) !important;
        }
        .activity-dots-hover:hover {
            background: rgba(255,255,255,0.1) !important;
            transform: scale(1.08);
            box-shadow: 0 0 20px rgba(255,255,255,0.05);
        }
        .activity-dots-hover:hover div {
            transform: scale(1.35);
        }
        @keyframes statCardGlow {
            0%, 100% { box-shadow: 0 0 0px transparent; }
            50% { box-shadow: 0 0 18px var(--card-color, #fff); }
        }
        @keyframes iconPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.25) rotate(6deg); }
        }
        @keyframes tabSlide {
            from { opacity: 0.5; transform: translateY(3px); }
            to   { opacity: 1;   transform: translateY(0); }
        }
        @keyframes exportModalIn {
            from { opacity: 0; transform: scale(0.92) translateY(12px); }
            to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        .adm-stat-card {
            transition: all 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        .adm-stat-card:hover {
            transform: translateY(-4px) scale(1.055);
        }
        .adm-stat-card.active:hover {
            transform: translateY(-4px) scale(1.055);
        }
        .adm-tab-btn {
            transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
            position: relative;
            overflow: hidden;
        }
        .adm-tab-btn::after {
            content: '';
            position: absolute;
            bottom: 0; left: 50%;
            width: 0; height: 2px;
            background: currentColor;
            border-radius: 2px;
            transition: all 0.25s ease;
            transform: translateX(-50%);
        }
        .adm-tab-btn:hover::after, .adm-tab-btn.active::after {
            width: 60%;
        }
        .adm-tab-btn:hover {
            transform: translateY(-2px);
        }
        .adm-export-btn {
            transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
        }
        .adm-export-btn:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 20px rgba(217,119,6,0.4);
        }
        .export-topic-card {
            transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
            cursor: pointer;
        }
        .export-topic-card:hover {
            transform: translateY(-3px) scale(1.02);
        }
        .export-topic-card.selected {
            transform: scale(1.03);
        }
        .premium-maint-card {
            background: rgba(30, 41, 59, 0.4);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .premium-maint-card:hover {
            transform: translateY(-5px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(30, 41, 59, 0.6);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
        }
        @keyframes subtleFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
        }
        .maint-leaderboard-row {
            transition: all 0.2s ease;
        }
        .maint-leaderboard-row:hover {
            background: rgba(255,255,255,0.02) !important;
        }
        .rank-medal {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            font-size: 0.7rem;
            font-weight: 900;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to   { opacity: 1; transform: scale(1); }
        }
    `;
    document.head.appendChild(s);
}


const NURSERY_CATEGORIES = ["Indigenous", "Fruit Trees", "Bamboo"];
const CENRO_LIST = ["CORON", "BROOKE'S POINT", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"];
const SEMES_MONTHS = {
    1: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"],
    2: ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
};

const getCenroMatch = (name) => {
    if (!name) return "";
    const norm = name.replace("CENRO ", "").trim().toUpperCase();
    if (norm.includes("BROOKE") && norm.includes("POINT")) return "BROOKE'S POINT";
    if (norm === "PPC" || norm.includes("PUERTO") || norm.includes("PRINCESA")) return "PUERTO PRINCESA";
    return norm;
};

const PremiumStatCard = ({ title, value, sub, icon: Icon, color, delay, onClick, active }) => (
    <div 
        className={`surface-glass adm-stat-card ${active ? 'active' : ''}`} 
        onClick={onClick}
        style={{ 
            background: active ? `${color}22` : `linear-gradient(135deg, ${color}11 0%, rgba(255,255,255,0.02) 100%)`, 
            padding: '1.5rem', 
            borderRadius: '24px', 
            border: `1px solid ${active ? color : color + '33'}`, 
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: active ? `0 15px 35px ${color}33, inset 0 0 15px ${color}11` : 'none',
            transform: active ? 'translateY(-5px) scale(1.02)' : 'none',
        }} 
    >
        <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '70px', height: '70px', background: active ? `${color}25` : `${color}08`, borderRadius: '50%', filter: 'blur(20px)' }} />
        <div className="flex-between mb-3">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: active ? color : `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                <Icon size={18} color={active ? '#000' : color} />
            </div>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: active ? '#fff' : color, textTransform: 'uppercase', letterSpacing: '1px' }}>{sub}</span>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: '0.65rem', color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.5rem' }}>{title}</div>
        {active && <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: color, boxShadow: `0 0 15px ${color}` }} />}
    </div>
);

// Helper to find RDATS document by checking both variations of Brooke's Point naming in IDs
const findRdatsInArray = (data, table, month, cenro) => {
    if (!cenro || !month || !table) return null;
    const prefix = `${table}_${month}_`.toUpperCase();
    return data.find(d => {
        const id = d.id.toUpperCase();
        if (!id.startsWith(prefix)) return false;
        const namePart = id.slice(prefix.length);
        const normC = cenro.toUpperCase();
        
        // Handle Puerto Princesa variations
        if (normC === "PUERTO PRINCESA" || normC === "PPC") {
            return ["PUERTO PRINCESA", "PPC", "CENRO PPC", "CENRO PUERTO PRINCESA"].includes(namePart);
        }
        
        // Handle Brooke's Point and others
        const variants = [normC, `CENRO ${normC}`, normC.replace("'", ""), `CENRO ${normC.replace("'", "")}`];
        if (normC.includes("BROOKE")) {
            variants.push("BROOKE'S POINT", "CENRO BROOKE'S POINT", "BROOKES POINT", "CENRO BROOKES POINT");
        }
        
        return variants.includes(namePart);
    });
};

// Main Achievement Targets (MOVs)
const FOCUS_MOVs = [
    { key: 'pnm2ndYear', label: 'P&M 2nd YEAR', fullLabel: 'PROTECTION & MAINTENANCE 2nd YEAR' },
    { key: 'yr3WithinPA', label: 'Yr 3 (PA)', fullLabel: 'Year 3 (Within PA)' },
    { key: 'yr3CongInitiative', label: 'Yr 3 (Cong)', fullLabel: 'Year 3 (Congressional Initiative)', quezonOnly: true },
    { key: 'forestNursery', label: 'NURSERY', fullLabel: 'FOREST NURSERY' },
    { key: 'elcac', label: 'ELCAC', fullLabel: 'ELCAC' },
    { key: 'treeReplacement', label: 'TREE REPL.', fullLabel: 'TREE REPLACEMENT' },
    { key: 'forestDisturbance', label: 'DISTURBANCE', fullLabel: 'FOREST DISTURBANCE' }
];

const CATEGORY_COLORS = {
    "Indigenous": "#059669",
    "Fruit Trees": "#3b82f6",
    "Bamboo": "#f59e0b"
};

const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
};

const isHeaderRow = (row) => {
    if (!row || row.length < 1) return false;
    const cell0 = String(row[0] || '').trim().toUpperCase();
    return NURSERY_CATEGORIES.some(cat => cat.toUpperCase() === cell0);
};

const SummaryPieChart = React.memo(({ data, metricLabel, onSelectCategory }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const normalizedData = Array.isArray(data) ? data : [];
    const total = normalizedData.reduce((sum, item) => sum + (parseNumber(item?.value) || 0), 0);

    const getCoord = (pct) => [Math.cos(2 * Math.PI * pct), Math.sin(2 * Math.PI * pct)];
    
    const slices = [];
    let currentCum = 0;
    normalizedData.forEach((item, i) => {
        const val = parseNumber(item?.value) || 0;
        const visualPct = total > 0 ? val / total : 0;
        
        const startPct = currentCum;
        const [sx, sy] = getCoord(startPct);
        
        currentCum += visualPct;
        const endPct = currentCum;
        const [ex, ey] = getCoord(endPct);
        
        const flag = visualPct > 0.5 ? 1 : 0;
        const color = CATEGORY_COLORS[item.name] || "#6366f1";
        slices.push({ ...item, value: val, sx, sy, ex, ey, flag, visualPct, startPct, color, idx: i });
    });

    return (
        <div className="rdats-pie-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1.2fr', gap: '3rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '380px', aspectRatio: '1/1', margin: '0 auto' }}>
                <svg viewBox="-1.2 -1.2 2.4 2.4" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {total === 0 ? (
                        <circle cx="0" cy="0" r="1" fill="rgba(255,255,255,0.05)" />
                    ) : (
                        slices.map((s) => {
                            const isHovered = hoveredSlice === s.idx;
                            const scale = isHovered ? 1.08 : 1;
                            const midAngle = (s.startPct + s.visualPct / 2) * 2 * Math.PI;
                            const tx = isHovered ? Math.cos(midAngle) * 0.08 : 0;
                            const ty = isHovered ? Math.sin(midAngle) * 0.08 : 0;

                            return (
                                <g key={s.idx}
                                    style={{ cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformOrigin: '0 0', transform: `rotate(-90deg) translate(${tx}px, ${ty}px) scale(${scale})` }}
                                    onMouseEnter={() => setHoveredSlice(s.idx)}
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    onClick={() => onSelectCategory(s)}
                                >
                                    {s.visualPct > 0 && (
                                        <path
                                            d={`M ${s.sx} ${s.sy} A 1 1 0 ${s.flag} 1 ${s.ex} ${s.ey} L 0 0`}
                                            fill={s.color}
                                            opacity={hoveredSlice === null || isHovered ? 1 : 0.3}
                                            stroke={isHovered ? "white" : "rgba(0,0,0,0.2)"}
                                            strokeWidth={isHovered ? 0.04 : 0.01}
                                            filter={isHovered ? `drop-shadow(0 0 15px ${s.color}aa)` : 'none'}
                                        />
                                    )}
                                </g>
                            );
                        })
                    )}
                    <circle cx="0" cy="0" r="0.52" fill="#000" />
                </svg>
                
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', background: '#000', borderRadius: '50%', width: '48%', height: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 30px rgba(0,0,0,1)' }}>
                    {hoveredSlice !== null && slices[hoveredSlice] ? (
                        <>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: slices[hoveredSlice].color, lineHeight: 1 }}>{slices[hoveredSlice].value.toLocaleString()}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.2rem' }}>{slices[hoveredSlice].name}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1, color: '#fff' }}>{total.toLocaleString()}</div>
                             <div style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.4rem' }}>{metricLabel || 'TOTAL UNITS'}</div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxHeight: '420px' }}>
                {slices.map((s) => (
                    <div
                        key={s.idx}
                        className="flex-between"
                        onClick={() => onSelectCategory(s)}
                        onMouseEnter={() => setHoveredSlice(s.idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ 
                            padding: '1rem 1.75rem', 
                            background: hoveredSlice === s.idx ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                            borderRadius: '16px', 
                            cursor: 'pointer', 
                            border: `1px solid ${hoveredSlice === s.idx ? s.color : 'rgba(255,255,255,0.04)'}`, 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: hoveredSlice === s.idx ? 'translateX(8px)' : 'none',
                        }}
                    >
                        <div className="flex-center gap-4">
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color, boxShadow: `0 0 12px ${s.color}aa`, flexShrink: 0 }}></div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.name}</span>
                        </div>
                        <div className="flex-center gap-4">
                            <span style={{ fontWeight: 900, color: s.color, fontSize: '1.8rem' }}>{s.value.toLocaleString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const SuperviseModal = ({ onClose, userEmail }) => {
    const [activeTab, setActiveTab] = useState('nursery');
    const [allNurseryData, setAllNurseryData] = useState({});
    const [allMaintenanceData, setAllMaintenanceData] = useState({});
    const [allRdatsData, setAllRdatsData] = useState([]);
    const [allPolygonData, setAllPolygonData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nurseryMonth, setNurseryMonth] = useState('ALL');
    const [analyticsMetric, setAnalyticsMetric] = useState('produced');
    const [selectedCategoryLabel, setSelectedCategoryLabel] = useState(null);
    const [selectedCenroLabel, setSelectedCenroLabel] = useState(null);
    const [rdatsSemester, setRdatsSemester] = useState(1);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportTopic, setExportTopic] = useState('nursery');
    const [exporting, setExporting] = useState(false);
    const [gisSearch, setGisSearch] = useState('');
    const [selectedGisPolyId, setSelectedGisPolyId] = useState(null);
    const [selectedGisFolder, setSelectedGisFolder] = useState(null);
    const [gisExpandedFolders, setGisExpandedFolders] = useState(['Ungrouped']);
    const [financePeriod, setFinancePeriod] = useState('ALL');
    const [allFinanceRawData, setAllFinanceRawData] = useState({});
    const [showFullFinancePortal, setShowFullFinancePortal] = useState(false);
    const [selectedDrillDownCenro, setSelectedDrillDownCenro] = useState(null);
    const [financeMetricToOpen, setFinanceMetricToOpen] = useState(null);
    const [financeRankMetric, setFinanceRankMetric] = useState('disbursed');
    const [financeBreakdownMetric, setFinanceBreakdownMetric] = useState(null);
    const [financeDrillDownCenro, setFinanceDrillDownCenro] = useState(null);
    
    // Map Preview Refs
    const gisMapRef = React.useRef(null);
    const gisMapInstanceRef = React.useRef(null);
    const gisMapLayerRef = React.useRef(null);

    React.useEffect(() => {
        // Guard: Only proceed if in GIS tab and necessary deps are ready
        if (activeTab !== 'gis' || (!selectedGisPolyId && !selectedGisFolder) || !gisMapRef.current || !window.L) {
            // Cleanup: If we leave the GIS tab, ensure map is disposed
            if (activeTab !== 'gis' && gisMapInstanceRef.current) {
                try {
                    gisMapInstanceRef.current.remove();
                } catch (e) { console.warn("Map cleanup error", e); }
                gisMapInstanceRef.current = null;
                gisMapLayerRef.current = null;
            }
            return;
        }
        
        const targetPolys = selectedGisPolyId 
            ? allPolygonData.filter(p => p.id === selectedGisPolyId)
            : (selectedGisFolder ? allPolygonData.filter(p => (p.folder || '').startsWith(selectedGisFolder)) : []);

        if (targetPolys.length === 0) return;

        const L = window.L;

        // Initialize map if not exists
        if (!gisMapInstanceRef.current) {
            try {
                const map = L.map(gisMapRef.current, {
                    zoomControl: false,
                    attributionControl: false,
                    dragging: true,
                    scrollWheelZoom: true,
                    tap: false // Prevent ghost clicks on mobile
                });
                
                L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { 
                    maxZoom: 22,
                    attribution: '© Google Maps'
                }).addTo(map);

                gisMapInstanceRef.current = map;
            } catch (err) {
                console.error("[Supervise] Failed to initialize map engine:", err);
                return;
            }
        }

        const map = gisMapInstanceRef.current;

        // Clear existing spatial layer before adding new one
        if (gisMapLayerRef.current) {
            try {
                map.removeLayer(gisMapLayerRef.current);
            } catch (e) {}
        }

        try {
            const featureGroup = L.featureGroup();

            targetPolys.forEach(poly => {
                if (!poly.coordinates || !Array.isArray(poly.coordinates)) return;

                const normCoords = poly.coordinates.map(c => {
                    if (!c) return null;
                    if (Array.isArray(c)) {
                        // GeoJSON format [lng, lat] -> Leaflet [lat, lng]
                        return [Number(c[1]), Number(c[0])];
                    }
                    return [Number(c.lat), Number(c.lng)];
                }).filter(c => c && !isNaN(c[0]) && !isNaN(c[1]));

                if (normCoords.length >= 3) {
                    L.polygon(normCoords, {
                        color: '#fff',
                        fillColor: poly.color || '#d97706',
                        fillOpacity: 0.6,
                        weight: targetPolys.length > 1 ? 1 : 3,
                        dashArray: targetPolys.length > 1 ? 'none' : '5, 10'
                    }).addTo(featureGroup);
                }
            });

            featureGroup.addTo(map);
            gisMapLayerRef.current = featureGroup;
            
            // Focus view on the selected site
            const bounds = featureGroup.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], animate: true });
            }

            // Fix map rendering issues in relative containers
            setTimeout(() => {
                if (gisMapInstanceRef.current) gisMapInstanceRef.current.invalidateSize();
            }, 200);

        } catch (err) {
            console.error("[Supervise] Spatial Render Error:", err);
        }

    }, [selectedGisPolyId, selectedGisFolder, activeTab, allPolygonData]);

    const normalizeMonth = (m) => {
        if (!m) return "";
        const s = String(m).trim().toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const normalizeCenro = (c) => {
        if (!c) return "";
        return String(c).trim().toUpperCase();
    };
    const [selectedYearForBreakdown, setSelectedYearForBreakdown] = useState(null);
    const [visibleYears, setVisibleYears] = useState([2024, 2025, 2026]);
    const [graphMode, setGraphMode] = useState('regional');
    const [rdatsAnimate, setRdatsAnimate] = useState(false);
    const [cenroRankBarSelected, setCenroRankBarSelected] = useState(null);
    const [showCenroRankPanel, setShowCenroRankPanel] = useState(false);
    const [cenroRankSpeciesBreakdown, setCenroRankSpeciesBreakdown] = useState(null);
    const [selectedRdatsValue, setSelectedRdatsValue] = useState(null);
    const [allLogs, setAllLogs] = useState([]); // Dummy state for backward compatibility/evaluation safety

    useEffect(() => {
        setLoading(true);
        trackEvent('modal_open', { source: 'SuperviseModal' });
        // Sync Nursery Data
        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const unsubscribeNursery = onSnapshot(query(collection(db, 'forest_nursery_data')), (snapshot) => {
            const dataByMonth = {};
            MONTHS.forEach(m => dataByMonth[m] = {});

            snapshot.docs.forEach(doc => {
                let parsed = [];
                try { parsed = JSON.parse(doc.data().rows || '[]'); } catch (e) {}

                if (doc.id.includes('_') || doc.id.includes('-')) {
                    const parts = doc.id.split(/[_-]/);
                    const month = parts.pop();
                    const cenro = parts.join(' ');
                    const normMonth = normalizeMonth(month);
                    const normCenro = getCenroMatch(cenro);
                    
                    if (!dataByMonth[normMonth]) dataByMonth[normMonth] = {};
                    dataByMonth[normMonth][normCenro] = parsed;
                } else {
                    const normCenro = getCenroMatch(doc.id);
                    if (!dataByMonth['March']) dataByMonth['March'] = {};
                    dataByMonth['March'][normCenro] = parsed;
                }
            });
            setAllNurseryData(dataByMonth);
            setLoading(false);
        }, (err) => {
            console.error("Nursery Sync Error:", err);
            setLoading(false);
        });

        // Sync RDATS Data
        const unsubscribeRdats = onSnapshot(collection(db, 'rdats'), (snapshot) => {
            setAllRdatsData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("RDATS Sync Error:", err);
            setLoading(false);
        });

        // Sync Maintenance Data for multiple years
        const yearsToTrack = [2024, 2025, 2026];
        const maintenanceUnsubs = yearsToTrack.map(year => {
            const collectionName = `maintenance_protection_${year}`;
            return onSnapshot(query(collection(db, collectionName)), (snapshot) => {
                const yearData = {};
                snapshot.docs.forEach(doc => {
                    try { yearData[doc.id] = JSON.parse(doc.data().rows || '[]'); } catch (e) {}
                });
                setAllMaintenanceData(prev => ({ ...prev, [year]: yearData }));
                setLoading(false);
            }, (err) => {
                console.error(`Maintenance ${year} Sync Error:`, err);
                setLoading(false);
            });
        });

        // Sync GIS Polygons
        const unsubscribePolygons = onSnapshot(collection(db, 'feo_polygons'), (snapshot) => {
            setAllPolygonData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Polygons Sync Error:", err);
            setLoading(false);
        });

        // Sync Finance Billing Data
        const unsubscribeFinance = onSnapshot(collection(db, 'finance_billing_divisions'), (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                const rawCenros = doc.data().cenros || {};
                const normalized = {};
                Object.entries(rawCenros).forEach(([key, list]) => {
                    const match = getCenroMatch(key);
                    if (!normalized[match]) normalized[match] = [];
                    normalized[match] = [...normalized[match], ...list];
                });
                data[doc.id] = normalized;
            });
            setAllFinanceRawData(data);
            setLoading(false);
        }, (err) => {
            console.error("Finance Sync Error:", err);
            setLoading(false);
        });


        return () => { 
            unsubscribeNursery(); 
            unsubscribeRdats(); 
            unsubscribePolygons();
            unsubscribeFinance();
            maintenanceUnsubs.forEach(unsub => unsub());
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'rdats') {
            setRdatsAnimate(false);
            const timer = setTimeout(() => setRdatsAnimate(true), 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    const getMonthData = (targetMonth) => {
        if (targetMonth === 'ALL') {
            let combined = {};
            Object.values(allNurseryData).forEach(monthDict => {
                Object.entries(monthDict).forEach(([cenro, rows]) => {
                    const normCenro = normalizeCenro(cenro);
                    if (!combined[normCenro]) combined[normCenro] = [];
                    combined[normCenro] = combined[normCenro].concat(rows);
                });
            });
            return combined;
        }
        return allNurseryData[normalizeMonth(targetMonth)] || {};
    };

    const getLatestSnapshotData = () => {
        const MONTHS_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let latest = {};
        CENRO_LIST.forEach(cenro => {
            const normCenro = getCenroMatch(cenro);
            for (let i = MONTHS_ORDER.length - 1; i >= 0; i--) {
                const m = MONTHS_ORDER[i];
                const rows = allNurseryData[m]?.[normCenro];
                if (rows && rows.length > 0) {
                    const hasRealData = rows.some(row => {
                        if (isHeaderRow(row)) return false;
                        return row.slice(3, 9).some(val => parseNumber(val) > 0);
                    });
                    if (hasRealData) {
                        latest[normCenro] = { rows, month: m };
                        break;
                    }
                }
            }
        });
        return latest;
    };

    const aggregatedNurseryStats = useMemo(() => {
        const totals = { beginning: 0, produced: 0, stock: 0, distributed: 0, mortality: 0 };
        const categoryData = {
            beginning: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            produced: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            stock: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            distributed: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            mortality: NURSERY_CATEGORIES.map(name => ({ name, value: 0 }))
        };
        const cenroBreakdown = { beginning: {}, produced: {}, stock: {}, distributed: {}, mortality: {} };
        const detailedRows = { beginning: {}, produced: {}, stock: {}, distributed: {}, mortality: {} };

        const monthData = getMonthData(nurseryMonth);
        const snapshotData = nurseryMonth === 'ALL' ? getLatestSnapshotData() : monthData;

        // Process Summing Metrics (Beginning, Produced, Distributed, Mortality)
        if (nurseryMonth === 'ALL') {
            Object.entries(allNurseryData).forEach(([month, monthDict]) => {
                Object.entries(monthDict).forEach(([cenro, rows]) => {
                    if (!Array.isArray(rows)) return;
                    const cKey = cenro.toUpperCase();
                    let currentCat = null;
                    rows.forEach(row => {
                        if (!Array.isArray(row)) return;
                        if (isHeaderRow(row)) {
                            currentCat = NURSERY_CATEGORIES.find(c => c.toUpperCase() === String(row[0] || "").trim().toUpperCase());
                        } else if (currentCat) {
                            const metrics = { 
                                beginning: parseNumber(row[3]), produced: parseNumber(row[4]), 
                                mortality: parseNumber(row[7]), distributed: parseNumber(row[8]) 
                            };
                            Object.entries(metrics).forEach(([key, val]) => {
                                if (val > 0) {
                                    totals[key] += val;
                                    categoryData[key][NURSERY_CATEGORIES.indexOf(currentCat)].value += val;
                                    if (!cenroBreakdown[key][currentCat]) cenroBreakdown[key][currentCat] = {};
                                    cenroBreakdown[key][currentCat][cKey] = (cenroBreakdown[key][currentCat][cKey] || 0) + val;
                                    if (!detailedRows[key][currentCat]) detailedRows[key][currentCat] = {};
                                    if (!detailedRows[key][currentCat][cKey]) detailedRows[key][currentCat][cKey] = [];
                                    
                                    const rowWithMonth = [...row];
                                    rowWithMonth[17] = month; 
                                    detailedRows[key][currentCat][cKey].push(rowWithMonth);
                                }
                            });
                        }
                    });
                });
            });
        } else {
            const monthData = getMonthData(nurseryMonth);
            Object.entries(monthData).forEach(([cenro, rows]) => {
                if (!Array.isArray(rows)) return;
                const cKey = cenro.toUpperCase();
                let currentCat = null;
                rows.forEach(row => {
                    if (!Array.isArray(row)) return;
                    if (isHeaderRow(row)) {
                        currentCat = NURSERY_CATEGORIES.find(c => c.toUpperCase() === String(row[0] || "").trim().toUpperCase());
                    } else if (currentCat) {
                        const metrics = { 
                            beginning: parseNumber(row[3]), produced: parseNumber(row[4]), 
                            mortality: parseNumber(row[7]), distributed: parseNumber(row[8]) 
                        };
                        Object.entries(metrics).forEach(([key, val]) => {
                            if (val > 0) {
                                totals[key] += val;
                                categoryData[key][NURSERY_CATEGORIES.indexOf(currentCat)].value += val;
                                if (!cenroBreakdown[key][currentCat]) cenroBreakdown[key][currentCat] = {};
                                cenroBreakdown[key][currentCat][cKey] = (cenroBreakdown[key][currentCat][cKey] || 0) + val;
                                if (!detailedRows[key][currentCat]) detailedRows[key][currentCat] = {};
                                if (!detailedRows[key][currentCat][cKey]) detailedRows[key][currentCat][cKey] = [];
                                
                                const rowWithMonth = [...row];
                                rowWithMonth[17] = nurseryMonth;
                                detailedRows[key][currentCat][cKey].push(rowWithMonth);
                            }
                        });
                    }
                });
            });
        }

        // Process ONLY Stock (Inventory) using Snapshot Data
        Object.entries(snapshotData).forEach(([cenro, data]) => {
            if (!data) return;
            const rows = nurseryMonth === 'ALL' ? data.rows : data;
            const month = nurseryMonth === 'ALL' ? data.month : nurseryMonth;
            
            if (!Array.isArray(rows)) return;
            let currentCat = null;
            rows.forEach(row => {
                if (!Array.isArray(row)) return;
                if (isHeaderRow(row)) {
                    currentCat = NURSERY_CATEGORIES.find(c => c && c.toUpperCase() === String(row[0] || "").trim().toUpperCase());
                } else if (currentCat) {
                    const val = parseNumber(row[6]); // Stock
                    if (val > 0) {
                        totals.stock += val;
                        const catIdx = NURSERY_CATEGORIES.indexOf(currentCat);
                        if (catIdx !== -1) {
                            categoryData.stock[catIdx].value += val;
                        }
                        if (!cenroBreakdown.stock[currentCat]) cenroBreakdown.stock[currentCat] = {};
                        const normCenro = normalizeCenro(cenro);
                        cenroBreakdown.stock[currentCat][normCenro] = (cenroBreakdown.stock[currentCat][normCenro] || 0) + val;
                        if (!detailedRows.stock[currentCat]) detailedRows.stock[currentCat] = {};
                        if (!detailedRows.stock[currentCat][normCenro]) detailedRows.stock[currentCat][normCenro] = [];
                        
                        const rowWithMonth = [...row];
                        rowWithMonth[17] = month;
                        detailedRows.stock[currentCat][normCenro].push(rowWithMonth);
                    }
                }
            });
        });

        return { totals, categoryData, cenroBreakdown, detailedRows };
    }, [allNurseryData, nurseryMonth]);

    // CENRO Ranking — total produced per CENRO across ALL months that have data
    const cenroRankChartData = useMemo(() => {
        const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const result = {};
        MONTHS.forEach(month => {
            const monthData = allNurseryData[month] || {};
            Object.entries(monthData).forEach(([cenro, rows]) => {
                if (!Array.isArray(rows)) return;
                let monthTotal = 0;
                rows.forEach(row => {
                    if (!Array.isArray(row) || isHeaderRow(row)) return;
                    monthTotal += parseNumber(row[4]); // Produced
                });
                if (monthTotal === 0) return;
                const cKey = cenro.toUpperCase();
                if (!result[cKey]) result[cKey] = { total: 0, byMonth: {}, monthRows: {} };
                result[cKey].byMonth[month] = (result[cKey].byMonth[month] || 0) + monthTotal;
                result[cKey].monthRows[month] = rows;
                result[cKey].total += monthTotal;
            });
        });
        return Object.entries(result)
            .map(([cenro, data]) => ({ cenro, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [allNurseryData]);

    const aggregatedMaintenanceStats = useMemo(() => {
        const statsByYear = {};
        const years = [2024, 2025, 2026];
        
        let globalPlanted = 0;
        let globalSurvived = 0;
        let globalIssues = 0;

        years.forEach(year => {
            const yearData = allMaintenanceData[year] || {};
            let planted = 0;
            let survived = 0;
            let issues = 0;
            let lastYearRateSum = 0, lastYearRateCount = 0;
            
            // Per Stage Breakdown for this year
            let b0S = 0, b0C = 0; // Mobi
            let b1S = 0, b1C = 0; // B1
            let b2S = 0, b2C = 0; // B2
            let b3S = 0, b3C = 0; // B3
            let b4S = 0, b4C = 0; // B4

            const cenroStats = {};

            Object.entries(yearData).forEach(([rawCenro, rows]) => {
                if (!Array.isArray(rows)) return;
                const cenro = getCenroMatch(rawCenro);
                
                let cPlanted = 0;
                let cSurvived = 0;
                let cLyrSum = 0;
                let cLyrCount = 0;

                let c_b0S = 0, c_b0C = 0;
                let c_b1S = 0, c_b1C = 0;
                let c_b2S = 0, c_b2C = 0;
                let c_b3S = 0, c_b3C = 0;
                let c_b4S = 0, c_b4C = 0;

                rows.forEach(row => {
                    // Dynamic Indexing for backward compatibility (68 cols vs 80 cols)
                    const isNewFormat = row.length >= 80;
                    const pIdx = isNewFormat ? 75 : 63;
                    const sIdx = isNewFormat ? 76 : 64;
                    const lyrIdx = isNewFormat ? 79 : 67;

                    // Planted/Survived
                    const p = row.length > pIdx ? parseNumber(row[pIdx]) : 0;
                    const s = row.length > sIdx ? parseNumber(row[sIdx]) : 0;
                    planted += p;
                    survived += s;
                    cPlanted += p;
                    cSurvived += s;

                    // Final Rate
                    if (row.length > lyrIdx) {
                        const lyr = parseNumber(row[lyrIdx]);
                        if (lyr > 0) { 
                            lastYearRateSum += lyr; lastYearRateCount++; 
                            cLyrSum += lyr; cLyrCount++;
                        }
                    }

                    // Stages
                    if (row.length > 17) { const s0 = parseNumber(row[17]); if (s0 > 0) { b0S += s0; b0C++; c_b0S += s0; c_b0C++; } }
                    if (row.length > 29) { const s1 = parseNumber(row[29]); if (s1 > 0) { b1S += s1; b1C++; c_b1S += s1; c_b1C++; } }
                    if (row.length > 41) { const s2 = parseNumber(row[41]); if (s2 > 0) { b2S += s2; b2C++; c_b2S += s2; c_b2C++; } }
                    if (row.length > 53) { const s3 = parseNumber(row[53]); if (s3 > 0) { b3S += s3; b3C++; c_b3S += s3; c_b3C++; } }
                    if (row.length > 65) { const s4 = parseNumber(row[65]); if (s4 > 0) { b4S += s4; b4C++; c_b4S += s4; c_b4C++; } }

                    const active = row[5] || row[49] || row[48];
                    if (active && (!row[31] || parseNumber(row[31]) === 0)) issues++;
                });

                cenroStats[cenro] = {
                    planted: cPlanted,
                    survived: cSurvived,
                    rate: cLyrCount > 0 ? cLyrSum / cLyrCount : (cPlanted > 0 ? (cSurvived / cPlanted) * 100 : 0),
                    billings: [
                        { label: '15% Mobi', rate: c_b0C > 0 ? c_b0S / c_b0C : 0, active: c_b0C > 0 },
                        { label: '1st Billing', rate: c_b1C > 0 ? c_b1S / c_b1C : 0, active: c_b1C > 0 },
                        { label: '2nd Billing', rate: c_b2C > 0 ? c_b2S / c_b2C : 0, active: c_b2C > 0 },
                        { label: '3rd Billing', rate: c_b3C > 0 ? c_b3S / c_b3C : 0, active: c_b3C > 0 },
                        { label: '4th Billing', rate: c_b4C > 0 ? c_b4S / c_b4C : 0, active: c_b4C > 0 }
                    ]
                };
            });

            const rate = lastYearRateCount > 0 ? lastYearRateSum / lastYearRateCount : (planted > 0 ? (survived / planted) * 100 : 0);
            statsByYear[year] = {
                planted, survived, rate, issues, cenroStats,
                billings: [
                    { label: '15% Mobi', rate: b0C > 0 ? b0S / b0C : 0, active: b0C > 0 },
                    { label: '1st Billing', rate: b1C > 0 ? b1S / b1C : 0, active: b1C > 0 },
                    { label: '2nd Billing', rate: b2C > 0 ? b2S / b2C : 0, active: b2C > 0 },
                    { label: '3rd Billing', rate: b3C > 0 ? b3S / b3C : 0, active: b3C > 0 },
                    { label: '4th Billing', rate: b4C > 0 ? b4S / b4C : 0, active: b4C > 0 }
                ]
            };
            
            globalPlanted += planted;
            globalSurvived += survived;
            globalIssues += issues;
        });

        // Compute global rate: weighted if planted > 0, otherwise simple average of yearly rates
        let globalRate = 0;
        if (globalPlanted > 0) {
            globalRate = (globalSurvived / globalPlanted) * 100;
        } else {
            const activeYears = Object.values(statsByYear).filter(y => y.rate > 0);
            if (activeYears.length > 0) {
                globalRate = activeYears.reduce((sum, y) => sum + y.rate, 0) / activeYears.length;
            }
        }

        const cenroPlanted = {};
        const cenroSurvived = {};

        years.forEach(year => {
            const yearData = statsByYear[year]?.cenroStats || {};
            Object.entries(yearData).forEach(([rawCenro, s]) => {
                const cenro = getCenroMatch(rawCenro);
                cenroPlanted[cenro] = (cenroPlanted[cenro] || 0) + s.planted;
                cenroSurvived[cenro] = (cenroSurvived[cenro] || 0) + s.survived;
            });
        });

        return { 
            planted: globalPlanted, 
            survived: globalSurvived, 
            rate: globalRate, 
            issues: globalIssues, 
            statsByYear,
            cenroPlanted,
            cenroSurvived
        };
    }, [allMaintenanceData]);

    const allFinanceTotals = useMemo(() => {
        const totals = { area: 0, contract: 0, obligated: 0 };
        const targetDivs = financePeriod === 'ALL' 
            ? Object.keys(allFinanceRawData) 
            : [financePeriod];

        targetDivs.forEach(div => {
            const cenros = allFinanceRawData[div] || {};
            Object.values(cenros).forEach(list => {
                if (!Array.isArray(list)) return;
                list.forEach(po => {
                    totals.area += parseFloat(po.area) || 0;
                    totals.contract += parseFloat(po.contractCost?.toString().replace(/,/g, '')) || 0;
                    totals.obligated += parseFloat(po.obligatedAmount?.toString().replace(/,/g, '')) || 0;
                });
            });
        });
        return totals;
    }, [allFinanceRawData, financePeriod]);

    const allFinanceCenroStats = useMemo(() => {
        const cenroBreakdown = {};
        CENRO_LIST.forEach(c => {
            const normC = getCenroMatch(c);
            cenroBreakdown[normC] = { area: 0, contract: 0, obligated: 0 };
        });

        const targetDivs = financePeriod === 'ALL' 
            ? Object.keys(allFinanceRawData) 
            : [financePeriod];

        targetDivs.forEach(div => {
            const cenros = allFinanceRawData[div] || {};
            Object.entries(cenros).forEach(([cenro, list]) => {
                const normC = getCenroMatch(cenro);
                if (!cenroBreakdown[normC]) cenroBreakdown[normC] = { area: 0, contract: 0, obligated: 0 };
                if (!Array.isArray(list)) return;
                list.forEach(po => {
                    cenroBreakdown[normC].area += parseFloat(po.area) || 0;
                    cenroBreakdown[normC].contract += parseFloat(po.contractCost?.toString().replace(/,/g, '')) || 0;
                    cenroBreakdown[normC].obligated += parseFloat(po.obligatedAmount?.toString().replace(/,/g, '')) || 0;
                });
            });
        });
        return cenroBreakdown;
    }, [allFinanceRawData, financePeriod]);

    const allFinanceDivisionStats = useMemo(() => {
        const stats = {};
        Object.entries(allFinanceRawData).forEach(([div, cenros]) => {
            stats[div] = { area: 0, contract: 0, obligated: 0 };
            Object.values(cenros).forEach(list => {
                if (!Array.isArray(list)) return;
                list.forEach(po => {
                    stats[div].area += parseFloat(po.area) || 0;
                    stats[div].contract += parseFloat(po.contractCost?.toString().replace(/,/g, '')) || 0;
                    stats[div].obligated += parseFloat(po.obligatedAmount?.toString().replace(/,/g, '')) || 0;
                });
            });
        });
        return stats;
    }, [allFinanceRawData]);

    const rdatsAchievement = useMemo(() => {
        const months = SEMES_MONTHS[rdatsSemester];
        const scores = {};
        
        CENRO_LIST.forEach(cenro => {
            let completed = 0;
            let expected = 0;
            const matrix = {}; // { activityKey: { month: status } }

            FOCUS_MOVs.forEach(mov => {
                if (mov.quezonOnly && cenro !== 'QUEZON') return;
                matrix[mov.key] = {};
                months.forEach(month => {
                    expected++;
                    const docT1 = findRdatsInArray(allRdatsData, 't1', month, cenro) || {};
                    const docT2 = findRdatsInArray(allRdatsData, 't2', month, cenro) || {};
                    const status = docT1[`${mov.key}_status`] || docT2[`${mov.key}_status`] || 'ongoing';
                    const value = docT1[mov.key] || docT2[mov.key] || '';
                    const isDone = status === 'endorsed' || status === 'consolidated';
                    if (isDone) completed++;
                    matrix[mov.key][month] = { status, isDone, value };
                });
            });

            scores[cenro] = { completed, expected, percent: expected > 0 ? (completed / expected) * 100 : 0, matrix };
        });

        return scores;
    }, [allRdatsData, rdatsSemester]);

    const gisHierarchy = useMemo(() => {
        const root = { folders: {}, polygons: [], path: '' };
        const searchTerm = gisSearch.toLowerCase().trim();

        allPolygonData.forEach(poly => {
            const matchesSearch = !searchTerm || 
                (poly.name?.toLowerCase().includes(searchTerm)) ||
                (poly.folder?.toLowerCase().includes(searchTerm)) ||
                (poly.attributes && Object.values(poly.attributes).some(v => String(v).toLowerCase().includes(searchTerm)));
            
            if (!matchesSearch) return;

            const folderPath = poly.folder || 'Ungrouped';
            const parts = folderPath.split(' / ').map(p => p.trim()).filter(Boolean);
            
            let current = root;
            let currentPath = '';
            parts.forEach((part, idx) => {
                currentPath = currentPath ? `${currentPath} / ${part}` : part;
                if (!current.folders[part]) {
                    current.folders[part] = { folders: {}, polygons: [], path: currentPath };
                }
                current = current.folders[part];
            });
            current.polygons.push(poly);
        });

        return root;
    }, [allPolygonData, gisSearch]);

    const METRIC_CONFIG = {
        beginning: { label: 'Beginning', color: '#8b5cf6', icon: CalendarPlus },
        produced: { label: 'Produced', color: '#10b981', icon: PlusCircle },
        stock: { label: 'Stock', color: '#3b82f6', icon: Database },
        distributed: { label: 'Distributed', color: '#f59e0b', icon: LayoutDashboard },
        mortality: { label: 'Mortality', color: '#ef4444', icon: AlertCircle }
    };

    const MAINT_METRIC_CONFIG = {
        planted: { label: 'Total Planted', color: '#10b981', sub: 'Total Hectares', icon: TreeDeciduous },
        survived: { label: 'Total Survived', color: '#3b82f6', sub: 'Active Inventory', icon: CheckCircle2 },
        rate: { label: 'Survival Rate', color: '#8b5cf6', sub: 'Weighted Average', icon: Target },
        issues: { label: 'Flagged Issues', color: '#f43f5e', sub: 'Maintenance Gaps', icon: AlertCircle }
    };

    const renderGisSpatialView = () => {
        const totalPolygons = allPolygonData.length;
        const selectedPoly = allPolygonData.find(p => p.id === selectedGisPolyId);
        
        // Find all polygons in the selected folder (recursive)
        const folderPolys = selectedGisFolder ? allPolygonData.filter(p => (p.folder || '').startsWith(selectedGisFolder)) : [];
        const totalFolderArea = folderPolys.reduce((sum, p) => sum + (p.area || 0), 0);
        const folderContractIds = [...new Set(folderPolys.map(p => p.attributes?.CTRCT_ID).filter(Boolean))];

        const renderFolder = (folderName, data, depth = 0) => {
            const hasContent = Object.keys(data.folders).length > 0 || data.polygons.length > 0;
            if (!hasContent && depth > 0) return null;

            const isExpanded = gisExpandedFolders.includes(data.path);
            const isRoot = depth === 0;

            return (
                <div key={data.path || 'root'} style={{ marginBottom: isRoot ? '0' : '0.4rem', marginLeft: isRoot ? 0 : '0.75rem' }}>
                    {!isRoot && (
                        <div 
                            onClick={() => {
                                setGisExpandedFolders(prev => isExpanded ? prev.filter(f => f !== data.path) : [...prev, data.path]);
                                setSelectedGisFolder(data.path);
                                setSelectedGisPolyId(null);
                            }}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.7rem', 
                                borderRadius: '10px', background: selectedGisFolder === data.path ? 'rgba(217, 119, 6, 0.25)' : (isExpanded || gisSearch.trim()) ? 'rgba(217, 119, 6, 0.1)' : 'rgba(255,255,255,0.02)', 
                                cursor: 'pointer', marginBottom: '0.2rem', transition: '0.2s',
                                border: `1px solid ${selectedGisFolder === data.path ? '#d97706' : (isExpanded || gisSearch.trim()) ? 'rgba(217, 119, 6, 0.3)' : 'transparent'}`
                            }}
                        >
                            <Folder size={14} color={(isExpanded || gisSearch.trim() || selectedGisFolder === data.path) ? '#d97706' : 'rgba(255,255,255,0.3)'} fill={(isExpanded || gisSearch.trim() || selectedGisFolder === data.path) ? '#d9770633' : 'none'} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: (isExpanded || gisSearch.trim() || selectedGisFolder === data.path) ? '#fff' : 'rgba(255,255,255,0.5)', flex: 1, letterSpacing: '0.3px' }}>{folderName}</span>
                            <ChevronDown size={12} style={{ transform: (isExpanded || gisSearch.trim()) ? 'rotate(180deg)' : 'none', transition: '0.3s', opacity: 0.3 }} />
                        </div>
                    )}

                    {(isExpanded || isRoot || gisSearch.trim()) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: isRoot ? 0 : '0.4rem', borderLeft: isRoot ? 'none' : '1px solid rgba(255,255,255,0.05)', marginLeft: isRoot ? 0 : '0.3rem' }}>
                            {Object.entries(data.folders)
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([name, subData]) => renderFolder(name, subData, depth + 1))
                            }
                            {data.polygons
                                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                .map(p => (
                                    <div 
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedGisPolyId(p.id);
                                            setSelectedGisFolder(null);
                                        }}
                                        style={{ 
                                            padding: '0.5rem 0.8rem', borderRadius: '8px', 
                                            background: selectedGisPolyId === p.id ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255,255,255,0.015)', 
                                            border: `1px solid ${selectedGisPolyId === p.id ? '#d97706' : 'transparent'}`,
                                            cursor: 'pointer', fontSize: '0.72rem', color: selectedGisPolyId === p.id ? '#fff' : 'rgba(255,255,255,0.4)',
                                            fontWeight: selectedGisPolyId === p.id ? 900 : 600,
                                            transition: '0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        <Layers size={10} style={{ opacity: 0.5 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Unnamed Parcel'}</span>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div style={{ height: '100%', display: 'flex', gap: '1.25rem', animation: 'fadeIn 0.4s ease' }}>
                {/* Left Side: Search & Hierarchy */}
                <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
                    <div className="surface-glass" style={{ padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#d97706', opacity: 0.5 }} size={16} />
                            <input 
                                type="text"
                                placeholder="Search Name or Contract ID..."
                                value={gisSearch}
                                onChange={(e) => setGisSearch(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.7rem 1rem 0.7rem 2.5rem', color: '#fff', fontSize: '0.8rem', outline: 'none', transition: 'all 0.3s', boxSizing: 'border-box' }}
                                onFocus={(e) => e.target.style.borderColor = '#d97706'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>

                        <div className="flex-between" style={{ padding: '0.2rem' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Spatial Database</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#d97706' }}>{totalPolygons} SITES</div>
                        </div>
                    </div>

                    <div className="surface-glass custom-scrollbar" style={{ flex: 1, padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', overflowY: 'auto' }}>
                        {Object.keys(gisHierarchy.folders).length === 0 && gisHierarchy.polygons.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.2 }}>
                                <Globe size={40} style={{ marginBottom: '1rem', margin: '0 auto' }} />
                                <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>No project matches</div>
                            </div>
                        ) : (
                            renderFolder('ALL PROJECTS', gisHierarchy)
                        )}
                    </div>
                </div>

                {/* Right Side: Visual Preview & Executive Summary */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: 0 }}>
                    {(selectedPoly || selectedGisFolder) ? (
                        <>
                            {/* Visual & Stats Header */}
                            <div style={{ display: 'flex', gap: '1.25rem', height: '280px', flexShrink: 0 }}>
                                {/* Live Map Preview */}
                                <div className="surface-glass" style={{ flex: 2, borderRadius: '28px', border: '1px solid rgba(255,255,255,0.08)', background: '#000', overflow: 'hidden', position: 'relative' }}>
                                    <div ref={gisMapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
                                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase' }}>Satellite Preview</div>
                                    </div>
                                </div>

                                {/* Key Highlight Stats */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="surface-glass" style={{ flex: 1, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(217, 119, 6, 0.05)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Area</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff' }}>
                                            {selectedPoly 
                                                ? ((Number(selectedPoly.area) || 0) / 10000).toFixed(3) 
                                                : (totalFolderArea / 10000).toFixed(3)}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>HECTARES</div>
                                    </div>
                                    <div className="surface-glass" style={{ flex: 1, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contract ID</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#fff', wordBreak: 'break-all' }}>
                                            {selectedPoly 
                                                ? (selectedPoly.attributes?.CTRCT_ID || selectedPoly.attributes?.CONTRACT_ID || 'PENDING')
                                                : (folderContractIds.length > 0 ? (folderContractIds.length === 1 ? folderContractIds[0] : `${folderContractIds.length} CONTRACTS`) : 'PENDING')}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details View */}
                            <div className="surface-glass custom-scrollbar" style={{ flex: 1, padding: '1.5rem', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.3)', overflowY: 'auto' }}>
                                {selectedPoly ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                                        {(() => {
                                            const attrs = selectedPoly.attributes || {};
                                            const coreFields = [
                                                { key: 'NAME_PART', label: 'Partner Name', icon: ShieldCheck, color: '#d97706' },
                                                { key: 'MUNICIPALITY', label: 'Municipality', icon: MapPin, color: '#3b82f6' },
                                                { key: 'BARANGAY', label: 'Barangay', icon: LocateFixed, color: '#10b981' },
                                                { key: 'TENURE_HOL', label: 'Tenure Instrument', icon: FileText, color: '#8b5cf6' },
                                                { key: 'COMMODITY', label: 'Plantation Type', icon: TreeDeciduous, color: '#059669' },
                                                { key: 'PROJECT', label: 'Project Stream', icon: Boxes, color: '#6366f1' }
                                            ];
                                            const displayedKeys = new Set();
                                            return (
                                                <>
                                                    {coreFields.map(field => {
                                                        const value = attrs[field.key] || attrs[field.key.replace('NAME_PART', 'PARTNER ORGANIZATION NAME')];
                                                        if (!value) return null;
                                                        displayedKeys.add(field.key);
                                                        return (
                                                            <div key={field.key} style={{ padding: '1.2rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.05)`, position: 'relative', overflow: 'hidden' }}>
                                                                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: field.color }}></div>
                                                                <div className="flex-center gap-2" style={{ marginBottom: '0.6rem' }}>
                                                                    <field.icon size={14} color={field.color} />
                                                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{field.label}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.95rem', fontWeight: 850, color: '#fff' }}>{value}</div>
                                                            </div>
                                                        );
                                                    })}
                                                    {Object.entries(attrs).sort((a,b) => a[0].localeCompare(b[0])).map(([key, val]) => {
                                                        if (displayedKeys.has(key) || !val || val === 'N/A') return null;
                                                        if (['id', 'color', 'folder', 'coordinates', 'area', 'geometryType', 'createdAt', 'visible'].includes(key)) return null;
                                                        return (
                                                            <div key={key} style={{ padding: '1rem', borderRadius: '18px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                                <div style={{ fontSize: '0.55rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{key}</div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' }}>{String(val)}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div style={{ padding: '1.5rem', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '24px', border: '1px solid rgba(217, 119, 6, 0.3)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(217,119,6,0.3)' }}>
                                                <Folder size={24} color="#fff" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 950, color: '#fff', letterSpacing: '0.5px' }}>FOLDER SUMMARY: {selectedGisFolder.split(' / ').pop().toUpperCase()}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Consolidated analytics for {folderPolys.length} site parcels</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                            {folderPolys.map(p => (
                                                <div 
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedGisPolyId(p.id);
                                                        setSelectedGisFolder(null);
                                                    }}
                                                    style={{ 
                                                        padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)',
                                                        cursor: 'pointer', transition: '0.3s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                    }}
                                                    className="activity-dots-hover"
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#fff' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{p.attributes?.BARANGAY || 'N/A Barangay'}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 950, color: '#d97706' }}>{(p.area / 10000).toFixed(3)} ha</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
                            <Globe size={80} style={{ marginBottom: '1.5rem' }} />
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>Select a site or folder</h3>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Consolidated spatial data will sync automatically selection</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    const renderRdatsTracker = () => {
        const months = SEMES_MONTHS[rdatsSemester];
        return (
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex-between">
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>RDATS Regional Accomplishment</h3>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Consolidated Regional Targets • {rdatsSemester === 1 ? '1st Semester' : '2nd Semester'}</p>
                    </div>
                    <div className="flex-center gap-2 surface-glass" style={{ padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                        <button onClick={() => setRdatsSemester(1)} className={`btn-glass ${rdatsSemester === 1 ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, background: rdatsSemester === 1 ? `${THEME_COLOR}22` : 'transparent', color: rdatsSemester === 1 ? THEME_COLOR : 'rgba(255,255,255,0.4)', border: 'none' }}>Semester 1</button>
                        <button onClick={() => setRdatsSemester(2)} className={`btn-glass ${rdatsSemester === 2 ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900, background: rdatsSemester === 2 ? `${THEME_COLOR}22` : 'transparent', color: rdatsSemester === 2 ? THEME_COLOR : 'rgba(255,255,255,0.4)', border: 'none' }}>Semester 2</button>
                    </div>
                </div>

                {/* UNIFIED REGIONAL MATRIX (TOP SECTION) - Wrapped in grid for mobile stacking */}
                {/* UNIFIED REGIONAL MATRIX (TOP SECTION) - Wrapped in grid for mobile stacking */}
                <div className="supervise-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', minWidth: 0, minHeight: 0, overflow: 'visible' }}>
                    <div className="surface-glass" style={{ gridColumn: 'span 3', padding: '1.5rem', paddingBottom: '3.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', overflow: 'visible', minWidth: 0 }}>
                        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px 0 0 10px', textAlign: 'left', minWidth: '180px' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '2px' }}>CENRO / FOCUS MOVs</div>
                                        </th>
                                        {FOCUS_MOVs.map((mov, idx) => (
                                            <th key={mov.key} style={{ padding: '0.6rem 0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: idx === FOCUS_MOVs.length - 1 ? '0 10px 10px 0' : '0' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: THEME_COLOR, whiteSpace: 'nowrap' }}>{mov.label}</div>
                                                <div style={{ display: 'flex', gap: '3px', marginTop: '6px', justifyContent: 'center' }}>
                                                    {months.map(m => (
                                                        <div key={m} style={{ width: '8px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }} title={m}></div>
                                                    ))}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {CENRO_LIST.map(cenro => (
                                        <tr 
                                            key={cenro} 
                                            onClick={() => setSelectedCenroLabel(cenro)} 
                                            className="matrix-row-premium"
                                            style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        >
                                            <td style={{ padding: '0.45rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px 0 0 12px' }}>
                                                <div className="flex-center gap-2" style={{ justifyContent: 'flex-start' }}>
                                                    <Globe size={16} color={THEME_COLOR} opacity={0.6} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{cenro}</span>
                                                </div>
                                            </td>
                                            {FOCUS_MOVs.map(mov => {
                                                const isExcluded = mov.quezonOnly && cenro !== 'QUEZON';
                                                const monthData = rdatsAchievement[cenro].matrix[mov.key] || {};
                                                return (
                                                    <td key={mov.key} style={{ padding: '0.35rem 0.5rem', textAlign: 'center' }}>
                                                        {isExcluded ? (
                                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.1)', fontStyle: 'italic' }}>N/A</div>
                                                        ) : (
                                                            <div className="activity-dots-hover" style={{ display: 'flex', gap: '3px', justifyContent: 'center', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', transition: 'all 0.3s' }}>
                                                                    {months.map((m, mIdx) => {
                                                                        const d = monthData[m];
                                                                        const now = new Date();
                                                                        const currentYear = now.getFullYear();
                                                                        const currentMonthIdx = now.getMonth(); // 0-11
                                                                        
                                                                        // Determine if the month being rendered has already passed
                                                                        const ALL_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
                                                                        const mIdxGlobal = ALL_MONTHS.indexOf(m.toUpperCase());
                                                                        const isPastMonth = mIdxGlobal < currentMonthIdx;
                                                                        const hasValue = d?.value && String(d.value).trim() !== '';
                                                                        
                                                                        // RED if past month and no value
                                                                        // GREEN if isDone OR if late but has value
                                                                        const isLacking = isPastMonth && !hasValue;
                                                                        const isGreen = d?.isDone || hasValue;
                                                                        
                                                                        return (
                                                                            <div 
                                                                                key={m} 
                                                                                onClick={(e) => {
                                                                                    if (d?.isDone || hasValue) {
                                                                                        e.stopPropagation();
                                                                                        setSelectedRdatsValue({ cenro, month: m, activity: mov.fullLabel, value: d.value });
                                                                                    }
                                                                                }}
                                                                                style={{ 
                                                                                    width: '12px', height: '12px', borderRadius: '3px', 
                                                                                    background: isGreen ? '#10b981' : isLacking ? '#ef4444' : 'rgba(255,255,255,0.05)',
                                                                                    boxShadow: isGreen ? '0 0 8px #10b98166' : isLacking ? '0 0 8px #ef444466' : 'none',
                                                                                    border: (isGreen || isLacking) ? 'none' : '1px solid rgba(255,255,255,0.03)',
                                                                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                                                    cursor: (d?.isDone || hasValue) ? 'pointer' : 'default'
                                                                                }} 
                                                                                title={`${m}: ${d?.isDone ? 'Achieved' : hasValue ? 'Late/Ongoing' : isLacking ? 'LACKING / OVERDUE' : 'Scheduled'}`}
                                                                            ></div>
                                                                        );
                                                                    })}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* INDIVIDUAL CARDS (BOTTOM SECTION) - Now part of the same grid */}
                    {CENRO_LIST.map((cenro, idx) => {
                        const stats = rdatsAchievement[cenro];
                        const displayPercent = rdatsAnimate ? stats.percent : 0;
                        return (
                            <div 
                                key={cenro} 
                                className={`surface-glass rdats-summary-card ${rdatsAnimate ? 'rdats-card-animate' : ''}`}
                                onClick={() => setSelectedCenroLabel(cenro)} 
                                style={{ 
                                    padding: '1.25rem 1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', 
                                    cursor: 'pointer', background: 'rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
                                    animationDelay: `${idx * 0.1}s`
                                }}
                            >
                                <div className="flex-between mb-3">
                                    <div className="flex-center gap-2">
                                        <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: THEME_COLOR }}>
                                            <Globe size={18} />
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>CENRO {cenro}</h4>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.6rem', fontWeight: 950, color: stats.percent === 100 ? '#10b981' : stats.percent > 50 ? THEME_COLOR : '#ef4444' }}>{Math.round(displayPercent)}%</div>
                                    </div>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${displayPercent}%`, 
                                        background: stats.percent === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : `linear-gradient(90deg, ${THEME_COLOR}, #fbbf24)`, 
                                        transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                        boxShadow: stats.percent > 0 ? `0 0 15px ${stats.percent === 100 ? '#10b98144' : THEME_COLOR + '44'}` : 'none'
                                    }}></div>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 900, marginTop: '0.6rem', textAlign: 'right', letterSpacing: '1px' }}>
                                    {stats.completed} / {stats.expected} TASKS COMPLETE
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Full Detailed Matrix Overlay */}
                {selectedCenroLabel && (
                    <div style={{ position: 'absolute', inset: 0, background: '#020617', zIndex: 100, display: 'flex', flexDirection: 'column', animation: 'modalPop 0.3s ease', borderRadius: '32px' }}>
                        <div style={{ padding: '1rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-center gap-3">
                                <button onClick={() => setSelectedCenroLabel(null)} className="btn btn-glass" style={{ padding: '0.5rem', borderRadius: '12px' }}>
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Achievement Matrix: {selectedCenroLabel}</h2>
                                    <div style={{ fontSize: '0.75rem', color: THEME_COLOR, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>RDATS Focus Tracker • Semester {rdatsSemester}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: THEME_COLOR }}>{Math.round(rdatsAchievement[selectedCenroLabel].percent)}%</div>
                                <div style={{ fontSize: '0.6rem', opacity: 0.3, fontWeight: 800 }}>TOTAL ACCOMPLISHMENT</div>
                            </div>
                        </div>
                        <div style={{ flex: 1, padding: '1rem 2rem', overflowX: 'auto' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '3px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '2rem 3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', textAlign: 'left', fontSize: '1.4rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)', width: '300px', letterSpacing: '0.05em' }}>MONTH / ACTIVITY</th>
                                        {FOCUS_MOVs.map(mov => (
                                            (mov.quezonOnly && selectedCenroLabel !== 'QUEZON') ? null :
                                            <th key={mov.key} style={{ padding: '0.5rem', verticalAlign: 'middle', width: '50px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 900, writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', color: 'rgba(255,255,255,0.8)', maxHeight: '180px', overflow: 'hidden', textAlign: 'right', letterSpacing: '1px' }}>{mov.fullLabel || mov.label}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {months.map((month, mIdx) => (
                                        <tr key={month}>
                                            <td style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 900, color: THEME_COLOR }}>{month}</td>
                                            {FOCUS_MOVs.map(mov => {
                                                if (mov.quezonOnly && selectedCenroLabel !== 'QUEZON') return null;
                                                const d = rdatsAchievement[selectedCenroLabel].matrix[mov.key]?.[month];
                                                
                                                const now = new Date();
                                                const currentMonthIdx = now.getMonth(); // 0-11
                                                
                                                // Map month name to index for comparison
                                                const ALL_MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
                                                const mIdxGlobal = ALL_MONTHS.indexOf(month.toUpperCase());
                                                const isPastMonth = mIdxGlobal < currentMonthIdx;
                                                const hasValue = d?.value && String(d.value).trim() !== '';
                                                
                                                // RED if past month and no value
                                                // GREEN if isDone OR if late but has value
                                                const isLacking = isPastMonth && !hasValue;
                                                const isGreen = d?.isDone || hasValue;

                                                return (
                                                    <td key={mov.key} style={{ textAlign: 'center', padding: '0.5rem' }}>
                                                        <div 
                                                            className="flex-center" 
                                                            onClick={() => (d?.isDone || hasValue) && setSelectedRdatsValue({ cenro: selectedCenroLabel, month, activity: mov.fullLabel, value: d.value })}
                                                            style={{ 
                                                                width: '40px', height: '40px', margin: '0 auto', borderRadius: '10px', 
                                                                background: isGreen ? '#10b98122' : isLacking ? '#ef444422' : 'rgba(255,255,255,0.02)', 
                                                                border: `1px solid ${isGreen ? '#10b98144' : isLacking ? '#ef444444' : 'rgba(255,255,255,0.05)'}`, 
                                                                color: isGreen ? '#10b981' : isLacking ? '#ef4444' : 'rgba(255,255,255,0.1)',
                                                                cursor: (d?.isDone || hasValue) ? 'pointer' : 'default',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {isGreen ? <ShieldCheck size={20} /> : isLacking ? <AlertCircle size={18} /> : <Clock size={16} />}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderFinancialSummary = () => {
        // Only block if we have no raw data and no division stats
        const hasData = allFinanceRawData && Object.keys(allFinanceRawData).length > 0;
        if (!hasData && loading) {
            return <div className="flex-center" style={{ height: '400px', flexDirection: 'column', gap: '1.25rem', color: 'rgba(255,255,255,0.15)' }}>
                <div style={{ position: 'relative' }}>
                    <Activity size={48} className="animate-pulse" color={THEME_COLOR} />
                    <div style={{ position: 'absolute', inset: 0, border: `2px solid ${THEME_COLOR}22`, borderRadius: '50%', animation: 'ping 2s infinite' }} />
                </div>
                <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.6 }}>Synchronizing Financial Data Feed...</div>
            </div>;
        }

        // ── 1:1 MIRROR LOGIC FROM FINANCE HUB ───────────────────────────────
        const stats = (() => {
            const totals = { area: 0, contract: 0, obligated: 0, disbursed: 0, balance: 0 };
            const breakdown = { area: {}, contract: {}, obligated: {}, disbursed: {}, balance: {} };
            const billingBreakdown = { disbursed: {}, balance: {} };
            const CENROS = ["BROOKE'S POINT", "CORON", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"];

            CENROS.forEach(c => {
                breakdown.area[c] = 0; breakdown.contract[c] = 0; breakdown.obligated[c] = 0;
                breakdown.disbursed[c] = 0; breakdown.balance[c] = 0;
                billingBreakdown.disbursed[c] = { mobi: 0, billing1: 0, billing2: 0, billing3: 0 };
                billingBreakdown.balance[c] = { mobi: 0, billing1: 0, billing2: 0, billing3: 0 };
            });

            const targetDivisions = financePeriod === 'ALL' 
                ? ['2nd Year Maintenance and Protection of CY 2025', '3rd Year Maintenance and Protection of CY 2024', '3rd Year Maintenance and Protection of CY 2024 - Congressional']
                : [financePeriod];

            targetDivisions.forEach(div => {
                const cenros = allFinanceRawData[div] || {};
                CENROS.forEach(c => {
                    let list = cenros[c] || [];
                    list.forEach(po => {
                        const clean = (val) => parseFloat(val?.toString().replace(/,/g, '')) || 0;
                        const a = parseFloat(po.area) || 0;
                        const cc = clean(po.contractCost);
                        const ob = clean(po.obligatedAmount);
                        const dis = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.lessRf), 0);
                        const bal = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.net), 0);

                        totals.area += a; totals.contract += cc; totals.obligated += ob;
                        totals.disbursed += dis; totals.balance += bal;

                        breakdown.area[c] += a; breakdown.contract[c] += cc; breakdown.obligated[c] += ob;
                        breakdown.disbursed[c] += dis; breakdown.balance[c] += bal;

                        ['mobi', 'billing1', 'billing2', 'billing3'].forEach(g => {
                            billingBreakdown.disbursed[c][g] += clean(po[g]?.lessRf);
                            billingBreakdown.balance[c][g] += clean(po[g]?.net);
                        });
                    });
                });
            });
            return { totals, breakdown, billingBreakdown };
        })();

        const formatValue = (v) => {
            const num = parseFloat(v?.toString().replace(/,/g, '')) || 0;
            return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        };


        return (
            <>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease' }}>
                {/* ── MAINTENANCE PERIOD SELECTOR (SAME AS HUB) ──────────────── */}
                <div className="surface-glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex-center gap-2" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Clock size={16} color="#3b82f6" />
                        <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Period:</span>
                        <select 
                            value={financePeriod}
                            onChange={(e) => setFinancePeriod(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="ALL" style={{ background: '#0f172a' }}>ALL MAINTENANCE PERIODS</option>
                            <option value="2nd Year Maintenance and Protection of CY 2025" style={{ background: '#0f172a' }}>2nd Year Maintenance and Protection of CY 2025</option>
                            <option value="3rd Year Maintenance and Protection of CY 2024" style={{ background: '#0f172a' }}>3rd Year Maintenance and Protection of CY 2024</option>
                            <option value="3rd Year Maintenance and Protection of CY 2024 - Congressional" style={{ background: '#0f172a' }}>3rd Year Maintenance and Protection of CY 2024 - Congressional</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Displaying Data for: <span style={{ color: '#fff' }}>{financePeriod === 'ALL' ? 'REGIONAL CONSOLIDATED' : financePeriod.toUpperCase()}</span>
                    </div>
                </div>

                {/* ── 1:1 MIRROR STAT CARDS (NO ANIMATION, NO NEON) ─────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
                    {[
                        { label: 'Total Area', key: 'area', icon: Layers, color: '#3b82f6', sub: 'Regional Coverage', val: `${stats.totals.area.toFixed(2)} Ha` },
                        { label: 'Contract Cost', key: 'contract', icon: DollarSign, color: '#10b981', sub: 'Budget Allocation', val: `₱${formatValue(stats.totals.contract)}` },
                        { label: 'Amount Obligated', key: 'obligated', icon: Target, color: '#f59e0b', sub: 'Verified Commitment', val: `₱${formatValue(stats.totals.obligated)}` },
                        { label: 'DISBURSED', key: 'disbursed', icon: Activity, color: '#8b5cf6', sub: 'Total Less RF', val: `₱${formatValue(stats.totals.disbursed)}` },
                        { label: 'NET', key: 'balance', icon: Database, color: '#ef4444', sub: 'Consolidated Net', val: `₱${formatValue(stats.totals.balance)}` }
                    ].map((card, i) => (
                        <div 
                            key={i}
                            onClick={() => {
                                setFinanceBreakdownMetric({ label: card.label, key: card.key, color: card.color });
                            }}
                            className="surface-glass"
                            style={{ 
                                padding: '1.5rem', 
                                borderRadius: '24px', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                background: 'rgba(255,255,255,0.02)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                            }}
                            onMouseEnter={(e) => {
                                setFinanceRankMetric(card.key);
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.05)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.boxShadow = `0 25px 50px rgba(0,0,0,0.4), 0 0 20px ${card.color}15`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                            }}
                        >
                            <div className="flex-between mb-3">
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${card.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <card.icon size={18} color={card.color} />
                                </div>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: card.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{card.sub}</span>
                            </div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>{card.val}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.4rem' }}>{card.label}</div>
                        </div>
                    ))}
                </div>

                <div className="surface-glass" style={{ flex: 1, padding: '0.75rem 2rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ef4444)` }} />
                    
                    <div className="flex-between mb-4">
                        <div>
                            <div className="flex-center gap-3 mb-2">
                                <TrendingUp color={THEME_COLOR} size={24} />
                                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>CENRO Ranking</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <div style={{ padding: '0.3rem 0.8rem', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '8px', color: THEME_COLOR, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>{financeRankMetric.toUpperCase()} PERFORMANCE</div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>Ranking based on selected dashboard metric</div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1.25rem' }}>
                            <button 
                                onClick={() => setShowFullFinancePortal(true)}
                                className="flex-center gap-2"
                                style={{ padding: '0.8rem 1.6rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 900, color: '#000', background: THEME_COLOR, border: 'none', cursor: 'pointer', boxShadow: `0 12px 24px ${THEME_COLOR}44`, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                            >
                                <Maximize2 size={18} /> OPEN FULL PORTAL
                            </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        {(() => {
                            const sorted = Object.entries(stats.breakdown[financeRankMetric]).sort((a,b) => b[1] - a[1]);
                            const maxVal = Math.max(...sorted.map(s => s[1]), 1);

                            return (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {sorted.map(([name, val], idx) => (
                                        <div key={name} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 180px', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.3px' }}>{name}</div>
                                                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>RANK #{idx + 1}</div>
                                            </div>
                                            <div style={{ height: '18px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)' }}>
                                                <div 
                                                    style={{ 
                                                        height: '100%', 
                                                        width: `${(val / maxVal) * 100}%`, 
                                                        background: `linear-gradient(90deg, ${THEME_COLOR}, #f59e0b, #fbbf24)`,
                                                        boxShadow: `0 0 30px ${THEME_COLOR}33`,
                                                        transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                                                        borderRadius: '0 8px 8px 0',
                                                        position: 'relative'
                                                    }} 
                                                />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>
                                                    {financeRankMetric === 'area' ? val.toFixed(2) : `₱${new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format(val)}`}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800 }}>{financeRankMetric === 'area' ? 'HA' : `(${((val/maxVal)*100).toFixed(0)}%)`}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: THEME_COLOR, boxShadow: `0 0 10px ${THEME_COLOR}aa` }} />
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Disbursement</span>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#fff' }}>
                                ₱{formatValue(stats.totals.disbursed)}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Data synchronized from regional finance feed</div>
                    </div>
                </div>
            </div>

                {/* ── FINANCE BREAKDOWN MODAL OVERLAY (1:1 MIRROR) ─────────────── */}
                {financeBreakdownMetric && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(15px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }} onClick={() => { setFinanceBreakdownMetric(null); setFinanceDrillDownCenro(null); }}>
                        <div className="surface-glass animate-pop-in" style={{ width: '100%', maxWidth: '650px', background: '#0f172a', borderRadius: '32px', overflow: 'hidden', border: `1px solid ${financeBreakdownMetric.color}33`, boxShadow: `0 25px 100px rgba(0,0,0,0.8), 0 0 40px ${financeBreakdownMetric.color}15` }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '2rem 2.5rem', background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex-between">
                                    <div>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#fff', margin: 0, letterSpacing: '-0.8px' }}>{financeBreakdownMetric.label} Breakdown</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: financeBreakdownMetric.color, boxShadow: `0 0 10px ${financeBreakdownMetric.color}` }} />
                                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>Consolidated Regional Totals</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setFinanceBreakdownMetric(null); setFinanceDrillDownCenro(null); }} className="btn btn-glass" style={{ padding: '0.6rem', borderRadius: '14px', background: 'rgba(255,255,255,0.05)' }}>
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '2rem 2.5rem', maxHeight: '65vh', overflowY: 'auto' }} className="custom-scrollbar">
                                {financeDrillDownCenro ? (
                                    <>
                                        <button 
                                            onClick={() => setFinanceDrillDownCenro(null)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#3b82f6', padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginBottom: '1.5rem' }}
                                        >
                                            <ChevronLeft size={14} /> BACK TO REGIONAL
                                        </button>
                                        <div style={{ padding: '1.25rem 1.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1.5rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                {['area', 'contract', 'obligated', 'balance'].includes(financeBreakdownMetric.key) ? 'Showing Partner Breakdown for' : 'Showing Billing Breakdown for'}
                                            </span>
                                            <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 950, letterSpacing: '-0.5px' }}>{financeDrillDownCenro}</div>
                                        </div>
                                        
                                        {['area', 'contract', 'obligated', 'balance'].includes(financeBreakdownMetric.key) ? (
                                            (() => {
                                                const targetDivs = financePeriod === 'ALL' ? ['2nd Year Maintenance and Protection of CY 2025', '3rd Year Maintenance and Protection of CY 2024', '3rd Year Maintenance and Protection of CY 2024 - Congressional'] : [financePeriod];
                                                const allPos = [];
                                                targetDivs.forEach(div => {
                                                    (allFinanceRawData[div]?.[financeDrillDownCenro] || []).forEach(po => allPos.push(po));
                                                });
                                                return allPos.map((po, idx) => {
                                                    let val = 0;
                                                    const clean = (v) => parseFloat(v?.toString().replace(/,/g, '')) || 0;
                                                    if (financeBreakdownMetric.key === 'area') val = parseFloat(po.area) || 0;
                                                    else if (financeBreakdownMetric.key === 'contract') val = clean(po.contractCost);
                                                    else if (financeBreakdownMetric.key === 'obligated') val = clean(po.obligatedAmount);
                                                    else if (financeBreakdownMetric.key === 'balance') {
                                                        val = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.net), 0);
                                                    }
                                                    
                                                    return (
                                                        <div key={idx} className="flex-between" style={{ padding: '1.25rem 1.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '1rem', animation: `fadeIn 0.4s ease ${idx * 0.05}s both` }}>
                                                            <div className="flex-center gap-5">
                                                                <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                    <FileText size={20} color="rgba(255,255,255,0.3)" />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.3px' }}>{po.name || 'Unnamed Partner'}</span>
                                                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>{po.location || 'No Location'}</span>
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                                                                    {financeBreakdownMetric.key === 'area' ? val.toFixed(2) : `₱${formatValue(val)}`}
                                                                </div>
                                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                                    {financeBreakdownMetric.key === 'area' ? 'Hectares' : 'Philippine Peso'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()
                                        ) : (
                                            ['mobi', 'billing1', 'billing2', 'billing3'].map((g, idx) => {
                                                const groupLabels = { 'mobi': '1ST BILLING', 'billing1': '2ND BILLING', 'billing2': '3RD BILLING', 'billing3': '4TH BILLING' };
                                                const billingColors = ['#fca5a5', '#7dd3fc', '#86efac', '#fde047'];
                                                const mappingKey = ['balance'].includes(financeBreakdownMetric.key) ? 'balance' : 'disbursed';
                                                const val = stats.billingBreakdown[mappingKey][financeDrillDownCenro][g];

                                                return (
                                                    <div key={g} className="flex-between" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '1rem', animation: `fadeIn 0.4s ease ${idx * 0.05}s both` }}>
                                                        <div className="flex-center gap-4">
                                                            <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <Activity size={18} color={billingColors[idx]} />
                                                            </div>
                                                            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: 800 }}>{groupLabels[g]}</span>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.25rem', letterSpacing: '-0.5px' }}>₱{formatValue(val)}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Philippine Peso</div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {["BROOKE'S POINT", "CORON", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"].map((c, idx) => (
                                            <div 
                                                key={c} 
                                                className="flex-between" 
                                                onClick={() => setFinanceDrillDownCenro(c)}
                                                style={{ 
                                                    padding: '1.25rem 1.75rem', 
                                                    background: 'rgba(255,255,255,0.02)', 
                                                    borderRadius: '24px', 
                                                    border: '1px solid rgba(255,255,255,0.03)', 
                                                    transition: 'all 0.3s', 
                                                    animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            >
                                                <div className="flex-center gap-5">
                                                    <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        <Globe size={20} color="rgba(255,255,255,0.3)" />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.3px' }}>{c.toUpperCase()}</span>
                                                        <span style={{ fontSize: '0.6rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.2rem' }}>
                                                            {['area', 'contract', 'obligated', 'balance'].includes(financeBreakdownMetric.key) ? 'Click for Partner Breakdown' : 'Click for Billing Breakdown'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                                                        {financeBreakdownMetric.key === 'area' ? stats.breakdown.area[c].toFixed(2) : `₱${formatValue(stats.breakdown[financeBreakdownMetric.key][c])}`}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{financeBreakdownMetric.key === 'area' ? 'Hectares' : 'Philippine Peso'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Live Data Feed Synchronized</p>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    .finance-row-hover:hover { background: rgba(255,255,255,0.08) !important; }
                    .finance-card-mini-hover:hover { background: rgba(255,255,255,0.05) !important; }
                    .adm-stat-card { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; cursor: pointer; }
                    .adm-stat-card:hover { transform: translateY(-5px); border-color: ${THEME_COLOR}55 !important; background: rgba(255,255,255,0.03) !important; box-shadow: 0 15px 30px rgba(0,0,0,0.3); }
                    .adm-stat-card:active { transform: translateY(-2px) scale(0.98); }
                `}</style>


                {/* Detailed Overlay */}
                {showFullFinancePortal && (
                    <div style={{ position: 'absolute', inset: 0, background: '#020617', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1)', borderRadius: '32px' }}>
                        <div style={{ padding: '0.75rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-center gap-4">
                                <button onClick={() => setShowFullFinancePortal(false)} className="btn btn-glass" style={{ padding: '0.5rem', borderRadius: '12px' }}>
                                    <ChevronLeft size={24} />
                                </button>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>{selectedDrillDownCenro ? `${selectedDrillDownCenro} | ` : ''}Detailed Financial Matrix</h2>
                                    <div style={{ fontSize: '0.65rem', color: THEME_COLOR, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>{financePeriod === 'ALL' ? 'REGIONAL CONSOLIDATED' : financePeriod.toUpperCase()}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setShowFullFinancePortal(false); setFinanceMetricToOpen(null); }}
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: '#fff', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                            >
                                CLOSE MATRIX
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <FinanceBilling 
                                initialDivision={financePeriod === 'ALL' ? 'ALL MAINTENANCE PERIODS' : financePeriod} 
                                initialCenro={selectedDrillDownCenro} 
                                initialMetric={financeMetricToOpen}
                            />
                        </div>
                    </div>
                )}
            </>
        );
    };

    const renderNurserySummary = () => {
        if (loading) return <div className="flex-center" style={{ height: '200px', color: 'rgba(255,255,255,0.3)' }}>Gathering data...</div>;
        const { totals, categoryData, cenroBreakdown, detailedRows } = aggregatedNurseryStats;
        const currentData = categoryData[analyticsMetric] || [];
        const currentConfig = METRIC_CONFIG[analyticsMetric];

        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {/* CENRO Ranking stat card — replaces Beginning */}
                    <div
                        onClick={() => { setShowCenroRankPanel(true); setSelectedCategoryLabel(null); setSelectedCenroLabel(null); setCenroRankBarSelected(null); }}
                        className={`surface-glass adm-stat-card${showCenroRankPanel ? ' active' : ''}`}
                        style={{
                            padding: '0.9rem 0.8rem',
                            border: `1px solid ${showCenroRankPanel ? '#f59e0b' : 'rgba(255,255,255,0.06)'}`,
                            background: showCenroRankPanel ? 'linear-gradient(135deg, #f59e0b20 0%, rgba(0,0,0,0.35) 100%)' : 'rgba(255,255,255,0.01)',
                            cursor: 'pointer', borderRadius: '16px', textAlign: 'center',
                            boxShadow: showCenroRankPanel ? '0 0 20px #f59e0b33, inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                            <Trophy size={20} color="#f59e0b" style={{ filter: showCenroRankPanel ? 'drop-shadow(0 0 8px #f59e0b)' : 'none', transition: 'filter 0.3s' }} />
                        </div>
                        <div style={{ letterSpacing: '1px', fontSize: '0.55rem', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', color: '#fff' }}>CENRO Ranking</div>
                        <div style={{ color: showCenroRankPanel ? '#fff' : 'rgba(255,255,255,0.55)', marginTop: '0.2rem', fontWeight: 900, fontSize: '1.15rem' }}>{cenroRankChartData.length > 0 ? `#${cenroRankChartData.length}` : '—'}</div>
                        {showCenroRankPanel && <div style={{ marginTop: '0.35rem', height: '2px', background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', borderRadius: '1px' }} />}
                    </div>
                    {/* Remaining 4 metric stat cards (produced, stock, distributed, mortality) */}
                    {Object.entries(METRIC_CONFIG).filter(([key]) => key !== 'beginning').map(([key, cfg]) => {
                        const isActive = !showCenroRankPanel && analyticsMetric === key;
                        return (
                            <div
                                key={key}
                                onClick={() => { setAnalyticsMetric(key); setShowCenroRankPanel(false); setSelectedCategoryLabel(null); setSelectedCenroLabel(null); }}
                                className={`surface-glass adm-stat-card${isActive ? ' active' : ''}`}
                                style={{
                                    padding: '0.9rem 0.8rem',
                                    border: `1px solid ${isActive ? cfg.color : 'rgba(255,255,255,0.06)'}`,
                                    background: isActive ? `linear-gradient(135deg, ${cfg.color}20 0%, rgba(0,0,0,0.35) 100%)` : 'rgba(255,255,255,0.01)',
                                    cursor: 'pointer', borderRadius: '16px', textAlign: 'center',
                                    boxShadow: isActive ? `0 0 20px ${cfg.color}33, inset 0 1px 0 rgba(255,255,255,0.05)` : 'none',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem' }}>
                                    <cfg.icon size={20} color={cfg.color} style={{ filter: isActive ? `drop-shadow(0 0 8px ${cfg.color})` : 'none', transition: 'filter 0.3s' }} />
                                </div>
                                <div style={{ letterSpacing: '1px', fontSize: '0.55rem', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', color: '#fff' }}>{cfg.label}</div>
                                <div style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', marginTop: '0.2rem', fontWeight: 900, fontSize: '1.15rem' }}>{totals[key].toLocaleString()}</div>
                                {isActive && <div style={{ marginTop: '0.35rem', height: '2px', background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`, borderRadius: '1px' }} />}
                            </div>
                        );
                    })}
                </div>


                <div className="surface-glass" style={{ flex: 1, padding: '1.5rem 2.5rem', borderRadius: '24px', border: `1px solid ${showCenroRankPanel ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)'}`, position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: showCenroRankPanel ? 'linear-gradient(90deg, transparent, #f59e0b, transparent)' : `linear-gradient(90deg, transparent, ${currentConfig.color}, transparent)` }}></div>
                    <div className="flex-between mb-4">
                        <div className="flex-center gap-3">
                            <PieChartIcon color={currentConfig.color} size={20} />
                            <h3 style={{ margin: '0', fontSize: '1.4rem', fontWeight: 900 }}>Regional Analysis <span style={{ color: currentConfig.color, opacity: 0.7, marginLeft: '0.4rem' }}>• {analyticsMetric.toUpperCase()}</span></h3>
                        </div>
                        
                        <div className="flex-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.6rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>MONTH:</span>
                            <select 
                                value={nurseryMonth} 
                                onChange={(e) => setNurseryMonth(e.target.value)}
                                style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                <option value="ALL" style={{ background: '#0f172a' }}>LATEST CONSOLIDATED</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => 
                                    <option key={m} value={m} style={{ background: '#0f172a' }}>{m}</option>
                                )}
                            </select>
                        </div>

                        <button 
                            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1GmF1gTnmd1era6bmQxCk4xk26P4fWKwUWY5lbX0wHOk/edit?gid=540575671#gid=540575671', '_blank')}
                            className="adm-export-btn flex-center gap-2"
                            style={{ 
                                padding: '0.4rem 0.8rem', 
                                borderRadius: '10px', 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                color: '#fff', 
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                background: 'rgba(59, 130, 246, 0.1)',
                                cursor: 'pointer'
                            }}
                        >
                            <FileSpreadsheet size={14} color="#3b82f6" />
                            REGIONAL DATABASE
                        </button>
                    </div>
                    <SummaryPieChart data={currentData} metricLabel={analyticsMetric.toUpperCase()} onSelectCategory={(s) => { setSelectedCategoryLabel(s.name); setSelectedCenroLabel(null); }} />

                    {/* ── CENRO Ranking Panel overlay (shown when Trophy stat card clicked) ── */}
                    {showCenroRankPanel && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.98)', borderRadius: '24px', zIndex: 30, display: 'flex', flexDirection: 'column', animation: 'modalPop 0.25s ease' }}>
                            {/* Header */}
                            <div style={{ padding: '1.2rem 1.8rem', borderBottom: '1px solid rgba(245,158,11,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'rgba(245,158,11,0.04)' }}>
                                <div className="flex-center gap-3">
                                    <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.15)', borderRadius: '12px', color: '#f59e0b' }}><Trophy size={18} /></div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>CENRO Production Ranking</div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Total Seedlings Produced · All Available Months · Click a bar to drill down</div>
                                    </div>
                                </div>
                                <div className="flex-center gap-3">
                                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 800, background: 'rgba(245,158,11,0.1)', padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        {cenroRankChartData.length} CENROs &nbsp;·&nbsp; {cenroRankChartData.reduce((s,c)=>s+c.total,0).toLocaleString()} total
                                    </div>
                                    <button onClick={() => { setShowCenroRankPanel(false); setCenroRankBarSelected(null); }} className="btn btn-glass" style={{ padding: '0.4rem', borderRadius: '10px' }}><ChevronLeft size={18} /></button>
                                </div>
                            </div>

                            {cenroRankBarSelected ? (
                                /* Monthly Breakdown View */
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '1rem 1.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                        <div className="flex-center gap-3">
                                            <button onClick={() => setCenroRankBarSelected(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '10px', padding: '0.4rem 0.75rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700 }}>
                                                <ArrowLeft size={14} /> Back to Ranking
                                            </button>
                                            <div>
                                                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#fff' }}>{cenroRankBarSelected.cenro}</div>
                                                <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly Production Breakdown</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{cenroRankBarSelected.total.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase' }}>Total Produced</div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
                                        {(() => {
                                            const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                                            const maxVal = Math.max(...MONTHS.map(m => cenroRankBarSelected.byMonth[m] || 0), 1);
                                            return MONTHS.map(month => {
                                                const val = cenroRankBarSelected.byMonth[month] || 0;
                                                const pct = (val / maxVal) * 100;
                                                const hasData = val > 0;
                                                return (
                                                    <div 
                                                        key={month} 
                                                        onClick={() => hasData && setCenroRankSpeciesBreakdown({ cenro: cenroRankBarSelected.cenro, month, rows: cenroRankBarSelected.monthRows[month] })}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: hasData ? 'pointer' : 'default', padding: '0.35rem 0', borderRadius: '8px', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => hasData && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ width: '88px', fontSize: '0.72rem', color: hasData ? '#fff' : 'rgba(255,255,255,0.2)', fontWeight: hasData ? 700 : 400, textAlign: 'right', flexShrink: 0 }}>{month}</div>
                                                        <div style={{ flex: 1, height: '28px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', overflow: 'hidden', border: hasData ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                                            {hasData && (
                                                                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b98144, #10b981)', borderRadius: '8px', display: 'flex', alignItems: 'center', paddingLeft: '1rem', color: '#fff', fontSize: '0.75rem', fontWeight: 950, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                                    {val.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ width: '60px', fontSize: '0.78rem', fontWeight: 900, color: hasData ? '#10b981' : 'rgba(255,255,255,0.12)', textAlign: 'right', flexShrink: 0 }}>{hasData ? val.toLocaleString() : '—'}</div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                        <div style={{ marginTop: '0.75rem', padding: '0.9rem 1rem', background: 'rgba(16,185,129,0.06)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Months with data</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#10b981' }}>{Object.values(cenroRankBarSelected.byMonth).filter(v => v > 0).length} / 12</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Main Ranking Bar Graph */
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.8rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }} className="custom-scrollbar">
                                    {cenroRankChartData.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '0.75rem', opacity: 0.3 }}>
                                            <BarChart2 size={28} />
                                            <span style={{ fontSize: '0.9rem' }}>No production data yet</span>
                                        </div>
                                    ) : (() => {
                                        const maxVal = cenroRankChartData[0]?.total || 1;
                                        const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
                                        return cenroRankChartData.map((item, idx) => {
                                            const pct = (item.total / maxVal) * 100;
                                            const color = RANK_COLORS[idx] || '#3b82f6';
                                            const isTop3 = idx < 3;
                                            return (
                                                <div
                                                    key={item.cenro}
                                                    onClick={() => setCenroRankBarSelected(item)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.4rem 0.5rem', borderRadius: '10px', transition: 'background 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, background: isTop3 ? color : 'rgba(255,255,255,0.06)', color: isTop3 ? '#000' : 'rgba(255,255,255,0.3)' }}>#{idx+1}</div>
                                                    <div style={{ width: '110px', fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.cenro}</div>
                                                    <div style={{ flex: 1, height: '30px', background: 'rgba(255,255,255,0.04)', borderRadius: '9px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: isTop3 ? `linear-gradient(90deg,${color}88,${color})` : 'linear-gradient(90deg,#1d4ed888,#3b82f6)', borderRadius: '9px', transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.6rem' }}>
                                                            {pct > 18 && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{item.total.toLocaleString()}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ width: '64px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 900, color: isTop3 ? color : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{item.total.toLocaleString()}</div>
                                                </div>
                                            );
                                        });
                                    })()}
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontWeight: 600 }}>Click any bar to see monthly breakdown →</div>
                                </div>
                            )}

                        {/* Species Breakdown Sub-Modal (Drill-down from Monthly Ranking) */}
                        {cenroRankSpeciesBreakdown && (
                            <div style={{ position: 'absolute', inset: '8% 6%', background: '#020617', borderRadius: '28px', border: '1px solid #10b98166', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 40px #10b98122', animation: 'modalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                                <div style={{ padding: '1.25rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.03)' }}>
                                    <div className="flex-center gap-4">
                                        <div style={{ padding: '0.6rem', background: '#10b98122', borderRadius: '12px', color: '#10b981' }}><TreeDeciduous size={22} /></div>
                                        <div>
                                            <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: '0.2rem' }}>Detailed Species Breakdown</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#fff' }}>{cenroRankSpeciesBreakdown.cenro} <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 0.5rem' }}>•</span> {cenroRankSpeciesBreakdown.month}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setCenroRankSpeciesBreakdown(null)} 
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '14px', color: '#fff', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                                <div style={{ flex: 1, padding: '1.5rem 2.5rem', overflowY: 'auto' }} className="custom-scrollbar">
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                                        <thead>
                                            <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#020617' }}>
                                                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Common Name / Scientific</th>
                                                <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Category</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Produced</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Available Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                let currentCat = "";
                                                return (cenroRankSpeciesBreakdown.rows || []).map((row, idx) => {
                                                    if (isHeaderRow(row)) {
                                                        currentCat = row[0];
                                                        return (
                                                            <tr key={`h-${idx}`}>
                                                                <td colSpan="4" style={{ padding: '1.5rem 1rem 0.5rem 1rem', fontSize: '0.75rem', fontWeight: 950, color: CATEGORY_COLORS[currentCat] || '#fff', textTransform: 'uppercase', letterSpacing: '3px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: CATEGORY_COLORS[currentCat] || '#fff' }}></div>
                                                                        {currentCat}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                    const prod = parseNumber(row[4]);
                                                    const stock = parseNumber(row[6]);
                                                    if (prod === 0 && stock === 0) return null;
                                                    const cColor = CATEGORY_COLORS[currentCat] || '#fff';
                                                    
                                                    return (
                                                        <tr 
                                                            key={idx} 
                                                            className="species-row-compact"
                                                            style={{ background: 'rgba(255,255,255,0.02)', transition: '0.2s' }}
                                                        >
                                                            <td style={{ padding: '0.8rem 1rem', borderRadius: '12px 0 0 12px' }}>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{row[1] || 'Unknown'}</div>
                                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>{row[2] || '---'}</div>
                                                            </td>
                                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: cColor, background: `${cColor}15`, padding: '0.2rem 0.5rem', borderRadius: '6px', border: `1px solid ${cColor}33` }}>
                                                                    {currentCat}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: '#10b981' }}>{prod.toLocaleString()}</td>
                                                            <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontSize: '1rem', fontWeight: 900, color: '#f59e0b', borderRadius: '0 12px 12px 0' }}>{stock.toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ padding: '1.2rem 2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', borderRadius: '0 0 28px 28px' }}>
                                    <div className="flex-center gap-6">
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>Month Total Produced</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#10b981' }}>{(cenroRankSpeciesBreakdown.rows || []).reduce((s,r)=>s + (isHeaderRow(r)?0:parseNumber(r[4])),0).toLocaleString()}</div>
                                        </div>
                                        <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>Current Available Stock</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#f59e0b' }}>{(cenroRankSpeciesBreakdown.rows || []).reduce((s,r)=>s + (isHeaderRow(r)?0:parseNumber(r[6])),0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                    {selectedCategoryLabel && (
                        <div style={{ position: 'absolute', inset: 0, background: '#020617', zIndex: 10, display: 'flex', flexDirection: 'column', animation: 'modalPop 0.3s ease' }}>
                            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="flex-center gap-3">
                                    <button onClick={() => setSelectedCategoryLabel(null)} className="btn btn-glass" style={{ padding: '0.4rem', borderRadius: '10px' }}><ChevronLeft size={18} /></button>
                                    <div><h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedCategoryLabel} Distribution</h4><div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Per CENRO Breakdown</div></div>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: CATEGORY_COLORS[selectedCategoryLabel] }}>{(cenroBreakdown[analyticsMetric]?.[selectedCategoryLabel] ? Object.values(cenroBreakdown[analyticsMetric][selectedCategoryLabel]).reduce((a,b)=>a+b, 0) : 0).toLocaleString()}</div>
                            </div>
                            <div style={{ flex: 1, padding: '1rem 2rem', overflowY: 'auto' }} className="custom-scrollbar">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '0.5rem' }}>
                                    {Object.entries(cenroBreakdown[analyticsMetric]?.[selectedCategoryLabel] || {}).sort((a,b) => b[1] - a[1]).map(([cenro, val]) => (
                                        <div key={cenro} onClick={() => setSelectedCenroLabel(cenro)} className="flex-between surface-glass" style={{ padding: '1rem 1.5rem', borderRadius: '14px', cursor: 'pointer', transition: '0.2s', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div className="flex-center gap-3"><Globe size={18} color={CATEGORY_COLORS[selectedCategoryLabel]} style={{ opacity: 0.6 }} /><span style={{ fontSize: '1.1rem', fontWeight: 700 }}>CENRO {cenro}</span></div>
                                            <div className="flex-center gap-5"><span style={{ fontWeight: 800, color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '1.4rem' }}>{val.toLocaleString()}</span><ChevronLeft size={18} style={{ transform: 'rotate(180deg)', opacity: 0.1 }} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedCenroLabel && (
                        <div style={{ position: 'absolute', inset: 0, background: '#010409', zIndex: 20, display: 'flex', flexDirection: 'column', animation: 'modalPop 0.3s ease' }}>
                            <div style={{ padding: '1rem 2rem', borderBottom: `1px solid ${CATEGORY_COLORS[selectedCategoryLabel]}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${CATEGORY_COLORS[selectedCategoryLabel]}08` }}>
                                <div className="flex-center gap-3">
                                    <button onClick={() => setSelectedCenroLabel(null)} className="btn btn-glass" style={{ padding: '0.4rem', borderRadius: '10px' }}><ChevronLeft size={18} color={CATEGORY_COLORS[selectedCategoryLabel]} /></button>
                                    <div><h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedCenroLabel} <span style={{ opacity: 0.3 }}>| {selectedCategoryLabel}</span></h4><div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Species Detail • {analyticsMetric.toUpperCase()}</div></div>
                                </div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: CATEGORY_COLORS[selectedCategoryLabel] }}>{(cenroBreakdown[analyticsMetric]?.[selectedCategoryLabel]?.[selectedCenroLabel] || 0).toLocaleString()}</div>
                            </div>
                                            <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }} className="custom-scrollbar">
                                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'left', padding: '0.6rem', color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Location</th>
                                                            <th style={{ textAlign: 'left', padding: '0.6rem', color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Common Name</th>
                                                            {nurseryMonth === 'ALL' && <th style={{ textAlign: 'center', padding: '0.6rem', color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Month</th>}
                                                            <th style={{ textAlign: 'right', padding: '0.6rem', color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(detailedRows[analyticsMetric]?.[selectedCategoryLabel]?.[selectedCenroLabel] || []).map((row, idx) => (
                                                            <tr key={idx} style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                                <td style={{ padding: '0.6rem', borderRadius: '8px 0 0 8px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{row[0] || '---'}</td>
                                                                <td style={{ padding: '0.6rem', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{row[1] || '---'}</td>
                                                                {nurseryMonth === 'ALL' && (
                                                                    <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                                                                        <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.65rem', color: CATEGORY_COLORS[selectedCategoryLabel], fontWeight: 800 }}>{row[17] || '---'}</div>
                                                                    </td>
                                                                )}
                                                                <td style={{ padding: '0.6rem', borderRadius: '0 8px 8px 0', textAlign: 'right', fontWeight: 900, color: CATEGORY_COLORS[selectedCategoryLabel], fontSize: '1rem' }}>{parseNumber(row[analyticsMetric === 'beginning' ? 3 : analyticsMetric === 'produced' ? 4 : analyticsMetric === 'stock' ? 6 : analyticsMetric === 'mortality' ? 7 : 8]).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMaintenanceSummary = () => {
        const stats = aggregatedMaintenanceStats;

        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                
                {/* HERO SECTION: Main Survival Trend */}
                <div className="surface-glass" style={{ padding: '3rem', borderRadius: '40px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.3)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '400px', background: `radial-gradient(circle at 50% 0%, ${THEME_COLOR}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    
                    <div className="flex-between mb-32" style={{ position: 'relative', zIndex: 5 }}>
                        <div>
                            <div className="flex-center gap-4">
                                <div style={{ padding: '0.8rem', background: `${THEME_COLOR}22`, borderRadius: '16px', color: THEME_COLOR, boxShadow: `0 8px 24px ${THEME_COLOR}22` }}>
                                    <Activity size={28} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>Regional Survival Trend</h3>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.2rem' }}>Executive Multi-Year Analysis</div>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginRight: '1rem' }}>
                            <button 
                                onClick={() => setGraphMode('regional')}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', background: graphMode === 'regional' ? THEME_COLOR : 'transparent', color: graphMode === 'regional' ? '#000' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', transition: '0.2s' }}
                            >
                                REGIONAL
                            </button>
                            <button 
                                onClick={() => setGraphMode('cenro')}
                                style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', background: graphMode === 'cenro' ? THEME_COLOR : 'transparent', color: graphMode === 'cenro' ? '#000' : 'rgba(255,255,255,0.3)', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', transition: '0.2s' }}
                            >
                                UNIT COMPARE
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {[2024, 2025, 2026].map(y => {
                                const isVisible = visibleYears.includes(y);
                                const yColor = y === 2026 ? '#10b981' : y === 2025 ? '#3b82f6' : '#8b5cf6';
                                return (
                                    <button
                                        key={y}
                                        onClick={() => setVisibleYears(prev => isVisible ? prev.filter(v => v !== y) : [...prev, y].sort())}
                                        style={{
                                            padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none',
                                            background: isVisible ? yColor : 'transparent', color: isVisible ? '#000' : 'rgba(255,255,255,0.3)',
                                            fontSize: '0.75rem', fontWeight: 950, cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ height: '350px', position: 'relative', margin: '1rem 1rem 1rem 3rem' }}>
                        {/* Y-Axis Labels & Clean Grid */}
                        {[0, 25, 50, 75, 100].map(v => (
                            <div key={v} style={{ position: 'absolute', bottom: `${v}%`, left: 0, right: 0, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '-3.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900 }}>{v}%</span>
                            </div>
                        ))}

                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="superviseTrendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="33%" stopColor="#8b5cf6" />
                                    <stop offset="66%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>

                            {graphMode === 'regional' ? (
                                visibleYears.length > 1 && (() => {
                                    const points = visibleYears.map((y, i) => {
                                        const rate = stats?.statsByYear?.[y]?.rate || 0;
                                        const x = (i / (visibleYears.length - 1)) * 100;
                                        const yPos = 100 - rate;
                                        return { x, y: yPos };
                                    });
                                    const d = points.map((p, i) => i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`).join(' ');
                                    return (
                                        <>
                                            <path d={d} fill="none" stroke="url(#superviseTrendGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
                                            <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                                        </>
                                    );
                                })()
                            ) : (
                                // CENRO Comparative Lines
                                visibleYears.length > 1 && stats?.statsByYear?.[visibleYears[0]] && Object.keys(stats.statsByYear[visibleYears[0]]?.cenroStats || {}).map((cenro, ci) => {
                                    const cColor = `hsl(${(ci * 360) / 8}, 70%, 60%)`;
                                    const points = visibleYears.map((y, i) => {
                                        const rate = stats?.statsByYear?.[y]?.cenroStats?.[cenro]?.rate || 0;
                                        const x = (i / (visibleYears.length - 1)) * 100;
                                        const yPos = 100 - rate;
                                        return { x, y: yPos };
                                    });
                                    const d = points.map((p, i) => i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`).join(' ');
                                    return (
                                        <path key={cenro} d={d} fill="none" stroke={cColor} strokeWidth="1.5" opacity="0.4" style={{ transition: 'all 0.3s' }} />
                                    );
                                })
                            )}
                        </svg>

                        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
                            {visibleYears.map((year, i) => {
                                const rate = stats?.statsByYear?.[year]?.rate || 0;
                                const isSelected = selectedYearForBreakdown === year;
                                const nodeColor = ['#3b82f6', '#8b5cf6', '#f59e0b'][i] || '#ef4444';
                                
                                return (
                                    <div key={year} onClick={() => setSelectedYearForBreakdown(isSelected ? null : year)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}>
                                        <div style={{ 
                                            position: 'absolute', bottom: `${rate}%`, 
                                            transform: 'translateY(50%)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}>
                                            {/* Floating Pill Label */}
                                            <div style={{ 
                                                padding: '0.4rem 0.8rem', background: nodeColor, 
                                                borderRadius: '8px', color: '#fff', 
                                                fontWeight: 950, fontSize: '0.8rem', marginBottom: '1rem', 
                                                boxShadow: `0 8px 20px ${nodeColor}44`,
                                                position: 'relative',
                                                transform: isSelected ? 'scale(1.2) translateY(-5px)' : 'scale(1)',
                                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                            }}>
                                                {Math.round(rate)}%
                                                <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: nodeColor }}></div>
                                            </div>

                                            {/* Data Node */}
                                            <div style={{ 
                                                width: '16px', height: '16px', borderRadius: '50%', 
                                                background: '#fff', border: `4px solid ${nodeColor}`, 
                                                boxShadow: `0 0 20px ${nodeColor}`,
                                                transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                                                transition: '0.3s'
                                            }} />
                                        </div>
                                        <div style={{ marginTop: 'auto', marginBottom: '-3.5rem', fontSize: '0.9rem', fontWeight: 950, color: isSelected ? '#fff' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', transition: 'all 0.3s' }}>{year}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* DRILL-DOWN SECTION */}
                {selectedYearForBreakdown && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        
                        {/* Selected Year Core Stats */}
                        <div className="surface-glass" style={{ padding: '2.5rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '2rem' }}>
                                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                                    <circle 
                                        cx="50" cy="50" r="45" fill="none" 
                                        stroke={stats.statsByYear[selectedYearForBreakdown].rate >= 85 ? '#10b981' : '#3b82f6'} 
                                        strokeWidth="10" 
                                        strokeDasharray={`${stats.statsByYear[selectedYearForBreakdown].rate * 2.827} 282.7`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 1.5s ease' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 950, color: '#fff', lineHeight: 1 }}>{Math.round(stats.statsByYear[selectedYearForBreakdown].rate)}%</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.5rem' }}>Survival Score</div>
                                </div>
                            </div>
                            
                            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Planted</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#fff' }}>{stats.statsByYear[selectedYearForBreakdown].planted.toLocaleString()}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Survived</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 950, color: '#10b981' }}>{stats.statsByYear[selectedYearForBreakdown].survived.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Billing Breakdown Flow */}
                        <div className="surface-glass" style={{ padding: '2.5rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)', position: 'relative' }}>
                            <button 
                                onClick={() => setSelectedYearForBreakdown(null)}
                                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <X size={16} /> Close Analysis
                            </button>
                            <h4 style={{ margin: '0 0 2rem 0', fontSize: '1.1rem', fontWeight: 950, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ShieldCheck size={20} color={THEME_COLOR} />
                                Billing Verification Stages ({selectedYearForBreakdown})
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {stats.statsByYear[selectedYearForBreakdown].billings.filter(b => b.active).map((b, bi) => {
                                    const sc = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981'][bi] || '#fff';
                                    return (
                                        <div key={bi} style={{ position: 'relative' }}>
                                            <div className="flex-between mb-2">
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>{b.label}</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 950, color: sc }}>{Math.round(b.rate)}%</div>
                                            </div>
                                            <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${b.rate}%`, background: `linear-gradient(90deg, ${sc}44, ${sc})`, borderRadius: '10px', boxShadow: `0 0 10px ${sc}44` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                )}

                {/* REGIONAL TABLE SECTION */}
                {selectedYearForBreakdown && (
                    <div style={{ animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div className="custom-scrollbar" style={{ borderRadius: '32px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(15, 23, 42, 0.7)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '1.75rem', textAlign: 'left', width: '80px' }}>Rank</th>
                                        <th style={{ padding: '1.75rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 950, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>Operational Unit</th>
                                        <th style={{ padding: '1.75rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: 950, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>Inventory</th>
                                        {stats.statsByYear[selectedYearForBreakdown].billings.map((b, bi) => b.active ? (
                                            <th key={bi} style={{ padding: '1.75rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: 950, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>{b.label}</th>
                                        ) : null)}
                                        <th style={{ padding: '1.75rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: 950, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>Survival Index</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats.statsByYear[selectedYearForBreakdown].cenroStats).sort((a,b) => b[1].rate - a[1].rate).map(([cenro, cStat], ci) => {
                                        const isTop = ci < 3;
                                        const medalColor = ci === 0 ? '#fbbf24' : ci === 1 ? '#e2e8f0' : ci === 2 ? '#f59e0b' : 'transparent';
                                        
                                        return (
                                            <tr key={cenro} className="maint-leaderboard-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: ci % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ padding: '1.5rem' }}>
                                                    <div className="rank-medal" style={{ 
                                                        width: '32px', height: '32px',
                                                        background: isTop ? `${medalColor}22` : 'rgba(255,255,255,0.05)', 
                                                        color: isTop ? medalColor : 'rgba(255,255,255,0.2)', 
                                                        border: `1px solid ${isTop ? medalColor : 'transparent'}`,
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {ci + 1}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.5rem' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{cenro}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Monitoring Sector</div>
                                                </td>
                                                <td style={{ padding: '1.5rem', textAlign: 'right', fontSize: '1.1rem', color: '#94a3b8', fontWeight: 700 }}>{cStat.planted.toLocaleString()}</td>
                                                {stats.statsByYear[selectedYearForBreakdown].billings.map((b, bi) => b.active ? (
                                                    <td key={bi} style={{ padding: '1.5rem', textAlign: 'right', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
                                                        {cStat.billings[bi].active ? `${Math.round(cStat.billings[bi].rate)}%` : '---'}
                                                    </td>
                                                ) : null)}
                                                <td style={{ padding: '1.5rem', textAlign: 'right' }}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.8rem',
                                                        padding: '0.6rem 1.25rem', borderRadius: '18px',
                                                        background: cStat.rate >= 85 ? '#10b98115' : cStat.rate >= 70 ? '#3b82f615' : '#f43f5e15',
                                                        border: `1px solid ${cStat.rate >= 85 ? '#10b98133' : cStat.rate >= 70 ? '#3b82f633' : '#f43f5e33'}`
                                                    }}>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cStat.rate >= 85 ? '#10b981' : cStat.rate >= 70 ? '#3b82f6' : '#f43f5e', boxShadow: `0 0 15px ${cStat.rate >= 85 ? '#10b981' : cStat.rate >= 70 ? '#3b82f6' : '#f43f5e'}` }} />
                                                        <span style={{ 
                                                            fontSize: '1.3rem', fontWeight: 950, 
                                                            color: cStat.rate >= 85 ? '#10b981' : cStat.rate >= 70 ? '#3b82f6' : '#f43f5e',
                                                            letterSpacing: '-0.5px'
                                                        }}>{Math.round(cStat.rate)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    // ─── Premium CSV Helper ────────────────────────────────────────────────
    const generatePremiumCSV = async (rows, filename) => {
        let csv = '\uFEFF'; // UTF-8 BOM so Excel opens correctly
        rows.forEach(row => {
            if (row.__BLANK__) { csv += '\r\n'; return; }
            if (row.__TITLE__) { csv += `"${row.__TITLE__}"\r\n`; return; }
            if (row.__SEP__)   { csv += `"${'─'.repeat(100)}"\r\n`; return; }
            csv += row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',') + '\r\n';
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

        // ── Prefer Save As dialog ──────────────────────────────────────────
        if (window.showSaveFilePicker) {
            try {
                const fh = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'CSV Spreadsheet', accept: { 'text/csv': ['.csv'] } }],
                });
                const writable = await fh.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // user cancelled — do nothing
            }
        }

        // ── Fallback: auto-download ────────────────────────────────────────
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    };

    // ─── Forest Nursery Premium Export (3 Sections) ───────────────────────
    const exportNurseryCSV = async () => {
        const { totals, categoryData, cenroBreakdown } = aggregatedNurseryStats;
        const now = new Date();
        const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });
        const rows = [];

        rows.push({ __TITLE__: 'DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN' });
        rows.push({ __TITLE__: 'ADMINISTRATIVE DASHBOARD  |  FOREST NURSERY  |  REGIONAL CONSOLIDATED REPORT' });
        rows.push({ __TITLE__: `Tracking Period: ${nurseryMonth === 'ALL' ? 'CONSOLIDATED (ALL MONTHS)' : nurseryMonth} 2026` });
        rows.push({ __TITLE__: `Generated: ${dateStr}` });
        rows.push({ __BLANK__: true });

        // ── SECTION 1 — GENERAL SUMMARY ──────────────────────────────────
        rows.push({ __SEP__: true });
        rows.push({ __TITLE__: 'SECTION 1  —  GENERAL SUMMARY  (ALL METRICS, ALL CENROS COMBINED)' });
        rows.push({ __SEP__: true });
        rows.push(['METRIC', 'TOTAL UNITS', 'INDIGENOUS', 'FRUIT TREES', 'BAMBOO']);
        Object.entries(METRIC_CONFIG).forEach(([key, cfg]) => {
            const catData = categoryData[key] || [];
            rows.push([
                cfg.label.toUpperCase(),
                totals[key].toLocaleString(),
                (catData.find(c => c.name === 'Indigenous')?.value  || 0).toLocaleString(),
                (catData.find(c => c.name === 'Fruit Trees')?.value || 0).toLocaleString(),
                (catData.find(c => c.name === 'Bamboo')?.value      || 0).toLocaleString(),
            ]);
        });
        rows.push({ __BLANK__: true });

        // ── SECTION 2 — BREAKDOWN DETAILED (species level) ───────────────
        rows.push({ __SEP__: true });
        rows.push({ __TITLE__: 'SECTION 2  —  BREAKDOWN DETAILED  (PER CENRO × CATEGORY × SPECIES / ROW)' });
        rows.push({ __SEP__: true });
        rows.push([
            'CENRO', 'CATEGORY',
            'LOCATION / NURSERY SITE', 'COMMON NAME', 'SCIENTIFIC NAME',
            'BEGINNING', 'PRODUCED', 'STOCK', 'DISTRIBUTED', 'MORTALITY'
        ]);
        CENRO_LIST.forEach(cenro => {
            const monthData = getMonthData(nurseryMonth);
            const key = Object.keys(monthData).find(k => k.toUpperCase() === cenro.toUpperCase());
            const cenroRows = key ? monthData[key] : [];
            let currentCat = null;
            cenroRows.forEach(row => {
                if (isHeaderRow(row)) {
                    currentCat = NURSERY_CATEGORIES.find(c =>
                        c.toUpperCase() === String(row[0] || '').trim().toUpperCase()
                    );
                } else if (currentCat) {
                    const beg  = parseNumber(row[3]);
                    const prod = parseNumber(row[4]);
                    const stk  = parseNumber(row[6]);
                    const mort = parseNumber(row[7]);
                    const dist = parseNumber(row[8]);
                    if (beg > 0 || prod > 0 || stk > 0 || dist > 0 || mort > 0) {
                        rows.push([
                            cenro,
                            currentCat,
                            row[0] || '',   // Location / Nursery Site
                            row[1] || '',   // Common Name  ← the important field
                            row[2] || '',   // Scientific Name
                            beg.toLocaleString(),
                            prod.toLocaleString(),
                            stk.toLocaleString(),
                            dist.toLocaleString(),
                            mort.toLocaleString(),
                        ]);
                    }
                }
            });
        });
        rows.push({ __BLANK__: true });

        // ── SECTION 3 — SUMMARY PER CENRO ────────────────────────────────
        rows.push({ __SEP__: true });
        rows.push({ __TITLE__: 'SECTION 3  —  SUMMARY PER CENRO  (ALL CATEGORIES COMBINED)' });
        rows.push({ __SEP__: true });
        rows.push(['CENRO', 'BEGINNING', 'PRODUCED', 'STOCK', 'DISTRIBUTED', 'MORTALITY']);
        CENRO_LIST.forEach(cenro => {
            const gt = (m) => NURSERY_CATEGORIES.reduce((s, cat) => s + (cenroBreakdown[m]?.[cat]?.[cenro] || 0), 0);
            rows.push([
                cenro,
                gt('beginning').toLocaleString(),
                gt('produced').toLocaleString(),
                gt('stock').toLocaleString(),
                gt('distributed').toLocaleString(),
                gt('mortality').toLocaleString(),
            ]);
        });

        await generatePremiumCSV(rows, `DENR_Forest_Nursery_Report_${now.toISOString().split('T')[0]}.csv`);
    };

    // ─── RDATS Premium Export (2 Sections) ───────────────────────────────
    const exportRdatsCSV = async () => {
        const months = SEMES_MONTHS[rdatsSemester];
        const now = new Date();
        const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });
        const rows = [];

        rows.push({ __TITLE__: 'DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN' });
        rows.push({ __TITLE__: 'RDATS FOCUS TRACKER  |  REGIONAL ACCOMPLISHMENT REPORT' });
        rows.push({ __TITLE__: `Semester: ${rdatsSemester === 1 ? '1st Semester (January – June)' : '2nd Semester (July – December)'}` });
        rows.push({ __TITLE__: `Generated: ${dateStr}` });
        rows.push({ __BLANK__: true });

        rows.push({ __SEP__: true });
        rows.push({ __TITLE__: 'SECTION 1  —  ACHIEVEMENT MATRIX  (PER CENRO × FOCUS MOV × MONTH)' });
        rows.push({ __SEP__: true });
        rows.push(['CENRO', 'FOCUS MOV (FULL LABEL)', ...months, 'ACHIEVED', 'EXPECTED', 'COMPLETION %']);
        CENRO_LIST.forEach(cenro => {
            const stats = rdatsAchievement[cenro];
            FOCUS_MOVs.forEach(mov => {
                if (mov.quezonOnly && cenro !== 'QUEZON') return;
                const dataRow = [cenro, mov.fullLabel];
                months.forEach(m => {
                    const d = stats.matrix[mov.key]?.[m];
                    dataRow.push(d?.isDone ? 'ACHIEVED' : 'ONGOING');
                });
                dataRow.push(stats.completed, stats.expected, `${Math.round(stats.percent)}%`);
                rows.push(dataRow);
            });
        });
        rows.push({ __BLANK__: true });

        rows.push({ __SEP__: true });
        rows.push({ __TITLE__: 'SECTION 2  —  CENRO COMPLETION SUMMARY' });
        rows.push({ __SEP__: true });
        rows.push(['CENRO', 'TOTAL ACHIEVED', 'TOTAL EXPECTED', 'COMPLETION %', 'OVERALL STATUS']);
        CENRO_LIST.forEach(cenro => {
            const s = rdatsAchievement[cenro];
            const pct = Math.round(s.percent);
            rows.push([cenro, s.completed, s.expected, `${pct}%`, pct === 100 ? 'COMPLETE' : pct > 50 ? 'IN PROGRESS' : 'NEEDS ATTENTION']);
        });

        await generatePremiumCSV(rows, `DENR_RDATS_Tracker_Sem${rdatsSemester}_${now.toISOString().split('T')[0]}.csv`);
    };

    const handleExport = async () => {
        setExporting(true);
        trackEvent('report_gen', { topic: exportTopic });
        try {
            if (exportTopic === 'nursery') await exportNurseryCSV();
            else if (exportTopic === 'rdats') await exportRdatsCSV();
            else if (exportTopic === 'maintenance') {
                const now = new Date();
                const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });
                const rows = [
                    { __TITLE__: 'DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN' },
                    { __TITLE__: 'MAINTENANCE & PROTECTION REGIONAL CONSOLIDATED REPORT' },
                    { __TITLE__: `Generated: ${dateStr}` },
                    { __BLANK__: true },
                    { __SEP__: true },
                    { __TITLE__: 'SECTION 1 — REGIONAL SUMMARY' },
                    { __SEP__: true },
                    ['CENRO', 'PLANTED', 'SURVIVED', 'SURVIVAL RATE %'],
                ];

                CENRO_LIST.forEach(cenro => {
                    const p = aggregatedMaintenanceStats.cenroPlanted[cenro] || 0;
                    const s = aggregatedMaintenanceStats.cenroSurvived[cenro] || 0;
                    const r = p > 0 ? (s/p)*100 : 0;
                    rows.push([cenro, p.toLocaleString(), s.toLocaleString(), `${Math.round(r)}%`]);
                });

                rows.push({ __BLANK__: true });
                rows.push(['REGION TOTAL', aggregatedMaintenanceStats.planted.toLocaleString(), aggregatedMaintenanceStats.survived.toLocaleString(), `${Math.round(aggregatedMaintenanceStats.rate)}%`]);

                await generatePremiumCSV(rows, `DENR_Maintenance_Regional_Report_${now.toISOString().split('T')[0]}.csv`);
            }

        } finally {
            setExporting(false);
            setShowExportModal(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ border: `1px solid ${THEME_COLOR}55`, boxShadow: `0 0 60px ${THEME_COLOR}22` }}>
                <div className="premium-modal-header" style={{ padding: '1.5rem 2.5rem', background: 'rgba(2, 6, 23, 0.95)', borderBottom: `2px solid ${THEME_COLOR}33`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `radial-gradient(circle at 15% 50%, ${THEME_COLOR}11 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    
                    <div className="flex-center gap-6" style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ padding: '0.8rem', background: `linear-gradient(135deg, ${THEME_COLOR}33, ${THEME_COLOR}11)`, borderRadius: '18px', color: THEME_COLOR, border: `1px solid ${THEME_COLOR}44`, boxShadow: `0 0 20px ${THEME_COLOR}22` }}>
                                <ShieldCheck size={28} />
                            </div>
                            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '16px', height: '16px', borderRadius: '50%', background: '#10b981', border: '3px solid #020617', boxShadow: '0 0 10px #10b981' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 950, color: THEME_COLOR, textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '0.2rem' }}>Republic of the Philippines</div>
                            <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>Administrative Dashboard</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.4)' }}>DENR • PENRO PALAWAN</span>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: THEME_COLOR, textTransform: 'uppercase' }}>Official Regional Hub</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-center gap-4" style={{ position: 'relative', zIndex: 2 }}>

                        <button
                            onClick={() => setShowExportModal(true)}
                            className="adm-export-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.4rem', background: `linear-gradient(135deg, ${THEME_COLOR}, #b45309)`, border: 'none', borderRadius: '14px', color: '#000', fontWeight: 950, fontSize: '0.85rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: `0 8px 20px ${THEME_COLOR}44` }}
                        >
                            <Download size={18} /><span>GENERATE REPORTS</span>
                        </button>
                        <button 
                            onClick={onClose} 
                            className="btn btn-glass" 
                            style={{ 
                                padding: '0.8rem', 
                                borderRadius: '16px', 
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <X size={26} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="premium-modal-tabs">
                    {[
                        { id: 'nursery', label: 'Forest Nursery', icon: TreeDeciduous },
                        { id: 'rdats', label: 'RDATS Tracker', icon: Activity },
                        { id: 'maintenance', label: 'Maintenance & Protection', icon: ShieldCheck },
                        { id: 'financial', label: 'Financial Portal', icon: DollarSign },
                        { id: 'gis', label: 'GIS Spatial', icon: Globe }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { 
                                setActiveTab(tab.id); 
                                setSelectedCategoryLabel(null); 
                                setSelectedCenroLabel(null); 
                                setSelectedDrillDownDivision(null);
                                setShowFullFinancePortal(false);
                                trackEvent('tab_switch', { tab: tab.id });
                            }}
                            className={`adm-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                            style={{
                                padding: '0.48rem 1.1rem',
                                background: activeTab === tab.id ? `${THEME_COLOR}22` : 'transparent',
                                color: activeTab === tab.id ? THEME_COLOR : 'rgba(255,255,255,0.35)',
                                border: `1px solid ${activeTab === tab.id ? `${THEME_COLOR}44` : 'transparent'}`,
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontFamily: "'Outfit', sans-serif",
                            }}
                        >
                            <tab.icon size={15} style={{ transition: 'transform 0.2s ease' }} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="premium-modal-body">
                    {activeTab === 'nursery' && renderNurserySummary()}
                    {activeTab === 'rdats' && renderRdatsTracker()}
                    {activeTab === 'maintenance' && renderMaintenanceSummary()}
                    {activeTab === 'financial' && renderFinancialSummary()}
                    {activeTab === 'gis' && renderGisSpatialView()}
                </div>

                {/* RDATS Detail Modal */}
                {selectedRdatsValue && (
                    <div className="modal-overlay" onClick={() => setSelectedRdatsValue(null)} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
                        <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto', padding: '2.5rem', border: '1px solid #10b98144', background: '#020617', borderRadius: '32px', boxShadow: '0 0 60px rgba(16, 185, 129, 0.15)', animation: 'modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                            <div className="flex-center mb-6" style={{ background: 'rgba(16, 185, 129, 0.1)', width: '64px', height: '64px', borderRadius: '20px', color: '#10b981', margin: '0 auto 1.5rem auto', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center', fontSize: '1.6rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>RDATS Verification</h3>
                            <p style={{ margin: '0 0 2.5rem 0', textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>Reference Details & Recorded Data</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="flex-between">
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Operational Unit</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>{selectedRdatsValue.cenro}</span>
                                </div>
                                <div className="flex-between">
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Reporting Month</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#fff' }}>{selectedRdatsValue.month}</span>
                                </div>
                                <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Activity Tracked</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#10b981' }}>{selectedRdatsValue.activity}</span>
                                </div>
                                <div style={{ paddingTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.75rem', textAlign: 'center' }}>RECORDED RDATS NUMBER / DATA</div>
                                    <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed rgba(16, 185, 129, 0.3)', color: '#fff', fontSize: '1.2rem', fontWeight: 950, textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                                        {selectedRdatsValue.value || 'NO DATA RECORDED'}
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setSelectedRdatsValue(null)}
                                style={{ 
                                    background: '#10b981', color: '#000', fontWeight: 950, 
                                    padding: '1.1rem', borderRadius: '18px', border: 'none', 
                                    cursor: 'pointer', width: '100%', marginTop: '2rem',
                                    fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px',
                                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                CLOSE DETAIL
                            </button>
                        </div>
                    </div>
                )}
                
                {/* ── Export Modal Overlay ─────────────────────────────────── */}
                {showExportModal && (
                    <div
                        style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
                        onClick={() => setShowExportModal(false)}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{ width: '90%', maxWidth: '500px', background: '#060d1f', border: `1px solid ${THEME_COLOR}44`, borderRadius: '28px', padding: '2rem', boxShadow: `0 0 80px ${THEME_COLOR}30, 0 25px 50px rgba(0,0,0,0.5)`, animation: 'exportModalIn 0.35s cubic-bezier(0.16,1,0.3,1)', fontFamily: "'Outfit', sans-serif" }}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                                    <div style={{ padding: '0.6rem', background: `${THEME_COLOR}22`, borderRadius: '12px', color: THEME_COLOR, border: `1px solid ${THEME_COLOR}33` }}>
                                        <FileSpreadsheet size={22} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#fff' }}>Export Report</div>
                                        <div style={{ fontSize: '0.58rem', color: THEME_COLOR, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8, marginTop: '0.1rem' }}>Supervisor-Level CSV Export</div>
                                    </div>
                                </div>
                                <button onClick={() => setShowExportModal(false)} className="btn btn-glass" style={{ padding: '0.4rem', borderRadius: '10px' }}><X size={18} /></button>
                            </div>

                            {/* Topic Selector */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.8rem' }}>Select Topic to Export</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                    {[
                                        { id: 'nursery', label: 'Forest Nursery', icon: TreeDeciduous, color: '#059669', desc: 'General · Breakdown Detailed · Summary' },
                                        { id: 'rdats',   label: 'RDATS Tracker',  icon: Activity,      color: THEME_COLOR, desc: 'Achievement Matrix · CENRO Completion Summary' },
                                        { id: 'maintenance', label: 'Maintenance & Protection', icon: ShieldCheck, color: '#10b981', desc: 'Regional Summary · Survival Rates · Regional Coverage' },
                                    ].map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => setExportTopic(t.id)}
                                            className={`export-topic-card${exportTopic === t.id ? ' selected' : ''}`}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.9rem 1.2rem', borderRadius: '16px',
                                                border: `2px solid ${exportTopic === t.id ? t.color : 'rgba(255,255,255,0.06)'}`,
                                                background: exportTopic === t.id ? `${t.color}15` : 'rgba(255,255,255,0.01)',
                                                boxShadow: exportTopic === t.id ? `0 0 20px ${t.color}22` : 'none',
                                            }}
                                        >
                                            <div style={{ padding: '0.5rem', borderRadius: '10px', background: exportTopic === t.id ? `${t.color}22` : 'rgba(255,255,255,0.04)', color: exportTopic === t.id ? t.color : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                                                <t.icon size={18} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: exportTopic === t.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{t.label}</div>
                                                <div style={{ fontSize: '0.65rem', color: exportTopic === t.id ? t.color : 'rgba(255,255,255,0.18)', fontWeight: 700, marginTop: '0.15rem' }}>{t.desc}</div>
                                            </div>
                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${exportTopic === t.id ? t.color : 'rgba(255,255,255,0.15)'}`, background: exportTopic === t.id ? t.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                                {exportTopic === t.id && <div style={{ width: '6px', height: '6px', background: exportTopic === t.id ? '#000' : '#fff', borderRadius: '50%' }} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scope Note */}
                            <div style={{ padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.35rem' }}>Export Scope</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                                    {exportTopic === 'nursery'  && 'Forest Nursery data only — includes 3 sections: General Totals, Breakdown per CENRO/Category, and CENRO Summary. Comprehensive and detailed.'}
                                    {exportTopic === 'rdats'    && 'RDATS Tracker data only — includes Achievement Matrix per CENRO and MOV for the selected semester, plus a CENRO Completion Summary.'}
                                    {exportTopic === 'maintenance' && 'Maintenance & Protection regional report — includes overall summary of planted, survived, and survival rates across all CENROs.'}
                                </div>
                            </div>

                            {/* Download Button */}
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                style={{ width: '100%', padding: '1rem', background: exporting ? 'rgba(217,119,6,0.4)' : `linear-gradient(135deg, ${THEME_COLOR} 0%, #b45309 100%)`, border: 'none', borderRadius: '14px', color: '#000', fontWeight: 900, fontSize: '1rem', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontFamily: "'Outfit', sans-serif", boxShadow: exporting ? 'none' : `0 4px 24px ${THEME_COLOR}44`, transition: 'all 0.2s' }}
                            >
                                <Download size={18} />
                                {exporting ? 'Generating CSV...' : 'Download Premium CSV'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperviseModal;
