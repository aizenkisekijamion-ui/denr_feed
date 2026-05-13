import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
    ShieldCheck, Plus, Trash2, Settings, Printer, Info, 
    X, ChevronLeft, ChevronRight, Save, PlusCircle, 
    CalendarPlus, AlertCircle, LayoutDashboard, Database,
    Maximize2, PieChart as PieChartIcon, ArrowLeft, RefreshCcw, 
    CheckCircle, Activity, TrendingUp, Search, Eye, EyeOff,
    FileSpreadsheet, Download, Layers, Shield, Trees, FileDown, Zap
} from 'lucide-react';

// --- CONSTANTS ---
const CENRO_LIST = ["Quezon", "Brooke's Point", "Roxas", "Coron", "Taytay", "Puerto Princesa"];

const STAGE_SUBHEADERS = [
    "sampling size (Ha)",
    "sampling Intensity (% validation)",
    "No of Seedlings Planted (Expected)",
    "No of Seedlings Survived",
    "% Survival",
    "Date Requested For Validation (by PO)",
    "Date Letter from PO received (by Office)",
    "Date Validated",
    "Date of Geotagged Photos",
    "Date of Inspection Report",
    "Date of Certification of Inspection and Acceptance",
    "Days Elapsed"
];

const AVG_SUBHEADERS = [
    "sampling size (Ha)",
    "sampling Intensity (% validation)",
    "No of Seedlings Planted (Expected)",
    "No of Seedlings Survived",
    "% Survival",
    "Working days Elpased",
    "Final Survival Rate (%) for the last year"
];

const MAINT_HEADERS = [
    { name: "REGION", sub: [] },
    { name: "PENRO", sub: [] },
    { name: "CENRO", sub: [] },
    { name: "Year Contracted", sub: [] },
    { name: "Year M&P", sub: [] },
    { name: "Name of PO/Contractor", sub: [] },
    { name: "Contract Code", sub: [] },
    { name: "Commodity", sub: [] },
    { name: "Species Planted", sub: [] },
    { name: "Area Contracted (Ha)", sub: [] },
    { name: "Final Area Maintained and Protected (Ha)", sub: [] },
    { name: "Final % Area maintained and Protected", sub: [] },
    { name: "No. of Seedlings Planted (per Contract)", sub: [] },
    { name: "15% Mobilization", sub: STAGE_SUBHEADERS },
    { name: "1st Billing", sub: STAGE_SUBHEADERS },
    { name: "2nd Billing", sub: STAGE_SUBHEADERS },
    { name: "3rd Billing", sub: STAGE_SUBHEADERS },
    { name: "4th Billing", sub: STAGE_SUBHEADERS },
    { name: "AVERAGE", sub: AVG_SUBHEADERS }
];

// Flatten headers for index-based access (legacy compatibility with source data)
const getFlatHeaders = () => {
    const flat = [];
    MAINT_HEADERS.forEach(h => {
        if (h.sub && h.sub.length > 0) h.sub.forEach(sh => flat.push(`${h.name} - ${sh}`));
        else flat.push(h.name);
    });
    return flat;
};

const FLAT_HEADERS_LIST = getFlatHeaders();

const STAGE_COLORS = {
    '15% Mobilization': '#3b82f6',
    '1st Billing': '#8b5cf6',
    '2nd Billing': '#f59e0b',
    '3rd Billing': '#ef4444',
    '4th Billing': '#ec4899',
    'AVERAGE': '#eab308'
};

// --- PREMIUM COMPONENTS ---

const MaintenancePieChart = React.memo(({ data, metricLabel, onSelectCategory }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    const getCoord = (pct) => [Math.cos(2 * Math.PI * pct), Math.sin(2 * Math.PI * pct)];
    let cumPct = 0;

    const slices = data.map((item, i) => {
        const visualPct = total > 0 ? item.value / total : 0;
        const [sx, sy] = getCoord(cumPct);
        cumPct += visualPct;
        const [ex, ey] = getCoord(cumPct);
        const flag = visualPct > 0.5 ? 1 : 0;
        return { ...item, sx, sy, ex, ey, flag, visualPct, color: colors[i % colors.length], idx: i };
    });

    return (
        <div className="analytics-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '2rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', aspectRatio: '1/1', margin: '0 auto' }}>
                <svg viewBox="-1.2 -1.2 2.4 2.4" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    {total === 0 ? (
                        <circle cx="0" cy="0" r="1" fill="rgba(255,255,255,0.05)" />
                    ) : (
                        slices.map((s) => {
                            const isHovered = hoveredSlice === s.idx;
                            const scale = isHovered ? 1.08 : 1;
                            return (
                                <g key={s.idx}
                                    style={{ cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformOrigin: '0 0', transform: `rotate(-90deg) scale(${scale})` }}
                                    onMouseEnter={() => setHoveredSlice(s.idx)}
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    onClick={() => onSelectCategory && onSelectCategory(s)}
                                >
                                    {s.visualPct > 0 && (
                                        <path
                                            d={`M ${s.sx} ${s.sy} A 1 1 0 ${s.flag} 1 ${s.ex} ${s.ey} L 0 0`}
                                            fill={s.color}
                                            opacity={hoveredSlice === null || isHovered ? 1 : 0.4}
                                            stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.2)'}
                                            strokeWidth={isHovered ? 0.05 : 0.01}
                                            filter={isHovered ? `drop-shadow(0 0 12px ${s.color}80)` : 'none'}
                                        />
                                    )}
                                </g>
                            );
                        })
                    )}
                    <circle cx="0" cy="0" r="0.6" fill="#0f172a" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', background: '#0f172a', borderRadius: '50%', width: '55%', height: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)' }}>
                    {hoveredSlice !== null && slices[hoveredSlice] ? (
                        <>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: slices[hoveredSlice].color, lineHeight: 1 }}>{slices[hoveredSlice].value.toLocaleString()}</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', maxWidth: '100px', marginTop: '0.25rem', textTransform: 'uppercase' }}>{slices[hoveredSlice].name}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1, color: '#fff' }}>{metricLabel.includes('%') ? total.toFixed(1) + '%' : total.toLocaleString()}</div>
                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>{metricLabel}</div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
                {slices.map((s) => (
                    <div
                        key={s.idx}
                        className="flex-between"
                        onMouseEnter={() => setHoveredSlice(s.idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ 
                            padding: '0.75rem 1rem', 
                            background: hoveredSlice === s.idx ? 'rgba(255,255,255,0.05)' : 'transparent', 
                            borderRadius: '12px', 
                            cursor: 'default', 
                            border: `1px solid ${hoveredSlice === s.idx ? s.color : 'transparent'}`, 
                            transition: 'all 0.2s'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}` }}></div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{s.name}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: s.color, fontSize: '0.9rem' }}>{s.value.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

const MaintenanceProtection = ({ userEmail, userRole, setSuccess, setError, onCloseModal, isAdmin: propIsAdmin }) => {
    const [activeCenro, setActiveCenro] = useState(CENRO_LIST[0]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [sheetData, setSheetData] = useState({}); // CENRO -> rows[]
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('base'); // 'base' | 'all' | 'mobi' | 'bill1' | 'bill2' | 'bill3' | 'avg'
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [analyticsMetric, setAnalyticsMetric] = useState('planted');
    const [selectedCategoryLabel, setSelectedCategoryLabel] = useState(null); // Drilldown state
    const [formulaInfo, setFormulaInfo] = useState(null);
    const [show4thBilling, setShow4thBilling] = useState(false);
    
    const pasteZoneRef = useRef(null);

    const isAdmin = userRole === 'admin' || userRole === 'supervisor';

    // Firebase Sync
    const [selectedStage, setSelectedStage] = useState(null); // For Stage Modal

    useEffect(() => {
        setLoading(true);
        // Use year-specific collection: maintenance_protection_2025, etc.
        const collectionName = `maintenance_protection_${selectedYear}`;
        const q = query(collection(db, collectionName));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                try {
                    let rows = JSON.parse(doc.data().rows || '[]');
                    // CRITICAL: Pad rows to match current FLAT_HEADERS_LIST length
                    rows = rows.map(row => {
                        const padded = [...row];
                        // MIGRATION: Shift Average to the right for 4th billing
                        if (padded.length === 68) {
                            padded.splice(61, 0, ...Array(12).fill(''));
                        }
                        while (padded.length < FLAT_HEADERS_LIST.length) padded.push('');
                        return padded;
                    });
                    
                    while (rows.length < 50) {
                        rows.push(Array(FLAT_HEADERS_LIST.length).fill(''));
                    }
                    
                    data[doc.id] = rows;
                } catch (e) {
                    console.error("Parse error for", doc.id, e);
                    data[doc.id] = generateBlankRows(50);
                }
            });
            // Ensure all CENROs exist
            CENRO_LIST.forEach(cenro => {
                if (!data[cenro]) data[cenro] = generateBlankRows(50);
            });
            setSheetData(data);
            setLoading(false);
        }, (err) => {
            console.error("Firebase Sync Error:", err);
            // Fallback for new years that don't have collections yet
            const emptyData = {};
            CENRO_LIST.forEach(cenro => emptyData[cenro] = generateBlankRows(50));
            setSheetData(emptyData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [selectedYear]);

    const generateBlankRows = (count) => {
        return Array.from({ length: count }, () => Array(FLAT_HEADERS_LIST.length).fill(''));
    };

    const handleCellBlur = async (cenro, rowIdx, colIdx, newValue) => {
        if (!isAdmin) return;
        const currentData = sheetData[cenro] || [];
        const trimmedValue = (newValue || "").trim();
        if (currentData[rowIdx][colIdx] === trimmedValue) return;

        const newData = [...currentData];
        newData[rowIdx] = [...newData[rowIdx]];
        newData[rowIdx][colIdx] = trimmedValue;

        // Optimistic update
        setSheetData(prev => ({ ...prev, [cenro]: newData }));

        setIsSaving(true);
        const collectionName = `maintenance_protection_${selectedYear}`;
        try {
            await setDoc(doc(db, collectionName, cenro), {
                rows: JSON.stringify(newData),
                lastUpdated: Date.now(),
                updatedBy: userEmail
            }, { merge: true });
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err) {
            console.error("Firebase Update Error:", err);
            alert("Failed to sync change. Please check connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePaste = async (e) => {
        if (!isEditMode || !isAdmin) return;
        const activeEl = document.activeElement;
        if (!activeEl || !activeEl.classList.contains('editable-cell')) return;

        e.preventDefault();
        
        const clipboardText = (e.clipboardData || window.clipboardData).getData('text');
        if (!clipboardText) return;

        const rows = clipboardText.split(/\r?\n/).map(row => row.split('\t'));
        while (rows.length > 0 && rows[rows.length - 1].every(cell => !cell || cell.trim() === '')) { rows.pop(); }
        if (rows.length === 0) return;

        const cenroData = [...(sheetData[activeCenro] || [])];
        let currentRowEl = activeEl.closest('tr');
        
        for (let r = 0; r < rows.length; r++) {
            if (!currentRowEl) break;
            
            const rowIdx = parseInt(currentRowEl.getAttribute('data-row-idx'));
            if (isNaN(rowIdx)) break;
            
            if (!cenroData[rowIdx]) cenroData[rowIdx] = Array(FLAT_HEADERS_LIST.length).fill('');
            
            const startColIdx = parseInt(activeEl.getAttribute('data-col-idx'));
            let currentCell = currentRowEl.querySelector(`td[data-col-idx="${startColIdx}"]`);
            
            for (let c = 0; c < rows[r].length; c++) {
                if (!currentCell || !currentCell.classList.contains('editable-cell')) break;
                
                const targetColIdx = parseInt(currentCell.getAttribute('data-col-idx'));
                if (!isNaN(targetColIdx) && targetColIdx < FLAT_HEADERS_LIST.length) {
                    cenroData[rowIdx][targetColIdx] = rows[r][c].trim();
                    currentCell.innerText = rows[r][c].trim(); // Optimistic visual update
                }
                
                let nextCell = currentCell.nextElementSibling;
                while (nextCell && !nextCell.classList.contains('editable-cell')) {
                    nextCell = nextCell.nextElementSibling;
                }
                currentCell = nextCell;
            }
            
            currentRowEl = currentRowEl.nextElementSibling;
        }

        setSheetData(prev => ({ ...prev, [activeCenro]: cenroData }));
        setIsSaving(true);
        const collectionName = `maintenance_protection_${selectedYear}`;
        try {
            await setDoc(doc(db, collectionName, activeCenro), {
                rows: JSON.stringify(cenroData),
                lastUpdated: Date.now(),
                updatedBy: userEmail
            }, { merge: true });
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (!isEditMode || !isAdmin) return;
        const target = e.target;
        if (!target.classList.contains('editable-cell')) return;

        const rowIdx = parseInt(target.getAttribute('data-row-idx'));
        const colIdx = parseInt(target.getAttribute('data-col-idx'));

        if (isNaN(rowIdx) || isNaN(colIdx)) return;

        const selection = window.getSelection();
        const atStart = selection.focusOffset === 0;
        const atEnd = selection.focusOffset === target.innerText.length;
        
        let nextFocusEl = null;

        if (e.key === 'ArrowRight' && atEnd) {
            e.preventDefault();
            let next = target.nextElementSibling;
            while (next && !next.classList.contains('editable-cell')) next = next.nextElementSibling;
            nextFocusEl = next;
        } else if (e.key === 'ArrowLeft' && atStart) {
            e.preventDefault();
            let prev = target.previousElementSibling;
            while (prev && !prev.classList.contains('editable-cell')) prev = prev.previousElementSibling;
            nextFocusEl = prev;
        } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const tr = target.closest('tr').nextElementSibling;
            if (tr) nextFocusEl = tr.querySelector(`td[data-col-idx="${colIdx}"]`);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const tr = target.closest('tr').previousElementSibling;
            if (tr) nextFocusEl = tr.querySelector(`td[data-col-idx="${colIdx}"]`);
        }

        if (nextFocusEl) {
            nextFocusEl.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(nextFocusEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    const exportMaintenanceCSV = async () => {
        const data = sheetData[activeCenro] || [];
        if (data.length === 0) {
            alert("No data to export.");
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });

        try {
            const filename = `DENR_Maintenance_Protection_${activeCenro}_2025_${now.toISOString().split('T')[0]}.csv`;
            
            let csvContent = "\uFEFF"; // UTF-8 BOM
            const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const SEP = `"${'─'.repeat(120)}"`;

            csvContent += q('DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN') + "\n";
            csvContent += q(`ANNEX E: MAINTENANCE AND PROTECTION 2025 | CENRO: ${activeCenro.toUpperCase()}`) + "\n";
            csvContent += q(`Generated: ${dateStr}`) + "\n\n";
            csvContent += SEP + "\n\n";

            // Headers (Double Row)
            const h1 = ["#"];
            const h2 = [""];
            MAINT_HEADERS.forEach(h => {
                const span = h.sub.length || 1;
                h1.push(h.name);
                for(let k=1; k<span; k++) h1.push("");
                if (h.sub.length > 0) h.sub.forEach(sh => h2.push(sh));
                else h2.push("");
            });

            csvContent += h1.map(q).join(",") + "\n";
            csvContent += h2.map(q).join(",") + "\n";
            csvContent += SEP + "\n";

            // Data Rows
            data.forEach((row, idx) => {
                const line = [idx + 1, ...row];
                csvContent += line.map(q).join(",") + "\n";
            });

            csvContent += SEP + "\n";
            
            // Totals Row (Calculated from summary)
            const totalsRow = Array(h1.length).fill("");
            totalsRow[0] = "SUMMARY TOTALS";
            totalsRow[h1.indexOf("No. of Seedlings Planted (per Contract)")] = stats.planted.toLocaleString();
            csvContent += totalsRow.map(q).join(",") + "\n";

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'CSV Spreadsheet', accept: { 'text/csv': ['.csv'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                alert("Export Success!");
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename; a.click();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Export Error:", err);
                alert("Export failed: " + err.message);
            }
        }
    };

    const addRow = async () => {
        if (!isAdmin) return;
        const currentData = sheetData[activeCenro] || [];
        const newData = [...currentData, Array(FLAT_HEADERS_LIST.length).fill('')];
        
        const collectionName = `maintenance_protection_${selectedYear}`;
        try {
            await setDoc(doc(db, collectionName, activeCenro), {
                rows: JSON.stringify(newData),
                lastUpdated: Date.now()
            }, { merge: true });
        } catch (err) { console.error(err); }
    };

    const deleteRow = async (idx) => {
        if (!isAdmin || !window.confirm("Delete this row permanently?")) return;
        const currentData = sheetData[activeCenro] || [];
        const newData = currentData.filter((_, i) => i !== idx);
        
        const collectionName = `maintenance_protection_${selectedYear}`;
        try {
            await setDoc(doc(db, collectionName, activeCenro), {
                rows: JSON.stringify(newData),
                lastUpdated: Date.now()
            }, { merge: true });
        } catch (err) { console.error(err); }
    };

    // Analytics Aggregation
    const stats = useMemo(() => {
        let planted = 0;
        let survived = 0;
        let days = 0;
        let issues = 0;

        // Stage-specific survivors
        let s0 = 0, s0Count = 0; // 15% Mobilization
        let s1 = 0, s1Count = 0; // 1st billing
        let s2 = 0, s2Count = 0; // 2nd billing
        let s3 = 0, s3Count = 0; // 3rd billing
        let s4 = 0, s4Count = 0; // 4th billing
        let lastYearRateSum = 0, lastYearRateCount = 0;

        const targetRows = sheetData[activeCenro] || [];
        targetRows.forEach(row => {
            if (row.length < FLAT_HEADERS_LIST.length) return;
            
            const isNewFormat = row.length >= 80;
            const pIdx = isNewFormat ? 75 : 63;
            const sIdx = isNewFormat ? 76 : 64;
            const dIdx = isNewFormat ? 78 : 66;
            const lyrIdx = isNewFormat ? 79 : 67;

            const p = parseFloat(row[pIdx]) || 0;
            const s = parseFloat(row[sIdx]) || 0;
            const d = parseFloat(row[dIdx]) || 0;

            planted += p;
            survived += s;
            days += d;

            // Final Survival Rate for Last Year
            const lyr = parseFloat(row[lyrIdx]) || 0;
            if (lyr > 0) { lastYearRateSum += lyr; lastYearRateCount++; }

            // 15% Mobilization survival (Index 13 + 4 = 17)
            const b0 = parseFloat(row[17]) || 0;
            if (b0 > 0) { s0 += b0; s0Count++; }

            // Billing 1 survival (Index 25 + 4 = 29)
            const b1 = parseFloat(row[29]) || 0;
            if (b1 > 0) { s1 += b1; s1Count++; }

            // Billing 2 survival (Index 37 + 4 = 41)
            const b2 = parseFloat(row[41]) || 0;
            if (b2 > 0) { s2 += b2; s2Count++; }

            // Billing 3 survival (Index 49 + 4 = 53)
            const b3 = parseFloat(row[53]) || 0;
            if (b3 > 0) { s3 += b3; s3Count++; }

            // Billing 4 survival (Index 61 + 4 = 65)
            const b4 = parseFloat(row[65]) || 0;
            if (b4 > 0) { s4 += b4; s4Count++; }

            const active = row[5] || row[49] || row[48];
            if (active && (!row[31] || parseFloat(row[31]) === 0)) issues++;
        });

        const finalRate = lastYearRateCount > 0 ? lastYearRateSum / lastYearRateCount : (planted > 0 ? (survived / planted) * 100 : 0);
        return { 
            planted: Math.round(planted) || 0, 
            survived: Math.round(survived) || 0, 
            days: Math.round(days * 10) / 10 || 0, 
            issues: issues || 0, 
            rate: finalRate || 0,
            bill0Rate: s0Count > 0 ? s0 / s0Count : 0,
            bill1Rate: s1Count > 0 ? s1 / s1Count : 0,
            bill2Rate: s2Count > 0 ? s2 / s2Count : 0,
            bill3Rate: s3Count > 0 ? s3 / s3Count : 0,
            bill4Rate: s4Count > 0 ? s4 / s4Count : 0
        };
    }, [sheetData, activeCenro]);

    const activeRows = useMemo(() => {
        const rows = sheetData[activeCenro] || [];
        if (!searchTerm) return rows;
        return rows.filter(row => 
            row.some(cell => String(cell).toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [sheetData, activeCenro, searchTerm]);

    // Header Renderer
    const renderHeaders = () => {
        const topRow = [];
        const subRow = [];
        
        MAINT_HEADERS.forEach((h, i) => {
            const isStage = h.sub.length > 0;
            const isVisible = viewMode === 'all' || 
                             (viewMode === 'base' && !isStage) ||
                             (viewMode === 'mobi' && h.name === '15% Mobilization') ||
                             (viewMode === 'bill1' && h.name === '1st Billing') ||
                             (viewMode === 'bill2' && h.name === '2nd Billing') ||
                             (viewMode === 'bill3' && h.name === '3rd Billing') ||
                             (viewMode === 'bill4' && h.name === '4th Billing') ||
                             (viewMode === 'avg' && h.name === 'AVERAGE') ||
                             (!isStage && viewMode !== 'base' && viewMode !== 'all'); // Always show base cols?

            // Hide 4th billing if not toggled
            if (h.name === '4th Billing' && !show4thBilling) return;

            // Logic: Always show first 13 cols (Index 0-12)
            const isGlobalBase = i <= 12;
            
            if (isGlobalBase || isVisible) {
                const stageCol = STAGE_COLORS[h.name];
                const headerColor = stageCol ? '#ffffff' : (isStage ? '#10b981' : '#94a3b8');
                const headerBg = stageCol ? stageCol : (isStage ? 'rgba(16, 185, 129, 0.1)' : '#1e293b');

                topRow.push(
                    <th 
                        key={`top-${i}`} 
                        rowSpan={isStage ? 1 : 2} 
                        colSpan={isStage ? h.sub.length : 1}
                        style={{ 
                            padding: '1rem 1.5rem', borderRight: stageCol ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '0.8rem', color: headerColor, textAlign: 'center', background: headerBg,
                            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900,
                            borderLeft: i === 13 ? '3px solid #ffffff' : 'none'
                        }}
                    >
                        {h.name}
                    </th>
                );
                if (isStage) {
                    h.sub.forEach((sh, j) => {
                        const isLastInGroup = j === h.sub.length - 1;
                        subRow.push(
                            <th 
                                key={`sub-${i}-${j}`} 
                                style={{ 
                                    padding: '0.5rem 1rem', borderRight: isLastInGroup && stageCol ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.1)', borderBottom: '2px solid rgba(255,255,255,0.2)', 
                                    fontSize: '0.65rem', color: stageCol ? '#ffffff' : '#64748b', background: stageCol ? `${stageCol}1A` : 'rgba(30, 41, 59, 0.8)',
                                    textTransform: 'uppercase', fontWeight: 800,
                                    borderLeft: j === 0 && h.name === '15% Mobilization' ? '3px solid #ffffff' : 'none'
                                }}
                            >
                                {sh}
                            </th>
                        );
                    });
                }
            }
        });

        return { topRow, subRow };
    };

    const { topRow, subRow } = renderHeaders();

    // Data Cell Renderer
    const renderRowCells = (row, rowIdx) => {
        const cells = [];
        let flatIdx = 0;

        MAINT_HEADERS.forEach((h, i) => {
            const isStage = h.sub.length > 0;
            const isVisible = viewMode === 'all' || 
                             (viewMode === 'base' && !isStage) ||
                             (viewMode === 'mobi' && h.name === '15% Mobilization') ||
                             (viewMode === 'bill1' && h.name === '1st Billing') ||
                             (viewMode === 'bill2' && h.name === '2nd Billing') ||
                             (viewMode === 'bill3' && h.name === '3rd Billing') ||
                             (viewMode === 'bill4' && h.name === '4th Billing') ||
                             (viewMode === 'avg' && h.name === 'AVERAGE') ||
                             (i <= 12);

            // Hide 4th billing cells if not toggled
            if (h.name === '4th Billing' && !show4thBilling) {
                flatIdx += h.sub.length;
                return;
            }

            const colSpan = isStage ? h.sub.length : 1;
            
            for (let s = 0; s < colSpan; s++) {
                const currentIdx = flatIdx + s;
                if (isVisible) {
                    cells.push(
                        <td 
                            key={`cell-${rowIdx}-${currentIdx}`}
                            data-row-idx={rowIdx}
                            data-col-idx={currentIdx}
                            contentEditable={isEditMode && isAdmin}
                            suppressContentEditableWarning
                            onBlur={(e) => handleCellBlur(activeCenro, rowIdx, currentIdx, e.target.innerText)}
                            onKeyDown={handleKeyDown}
                            className={`spreadsheet-cell ${isEditMode ? "editable-cell" : ""} ${h.name === 'AVERAGE' ? 'avg-column' : ''}`}
                        >
                            {row[currentIdx]}
                        </td>
                    );
                }
            }
            flatIdx += colSpan;
        });
        return cells;
    };

    const currentYear = new Date().getFullYear();

    if (loading) return <div className="flex-center p-20 text-muted">Initialize Maintenance Database...</div>;

    return (
        <div className="maintenance-module animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden', padding: '0 0.5rem', minWidth: 0, minHeight: 0 }}>
            {/* Header / Stats */}
            <div className="module-header flex-between mb-6">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))', padding: '0.6rem', borderRadius: '16px', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.1)', display: 'flex' }}>
                            <ShieldCheck color="#10b981" size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black section-title-premium tracking-tight" style={{ background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 4px 15px rgba(16, 185, 129, 0.3))', margin: 0 }}>
                                ANNEX E: MAINTENANCE & PROTECTION {selectedYear}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <CalendarPlus size={14} color="#94a3b8" />
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', outline: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>Year {y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <p className="text-muted text-sm mt-1 uppercase tracking-[0.3em] font-bold opacity-80" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Regional Compliance & Monitoring Portal</p>
                </div>
                    {/* Cloud Sync Indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.3s ease', opacity: (isSaving || syncSuccess) ? 1 : 0, marginRight: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                        {isSaving && <><RefreshCcw size={16} className="animate-spin" color="#10b981" /> <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>Syncing...</span></>}
                        {syncSuccess && <><CheckCircle size={16} color="#10b981" style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' }} /> <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>Updated</span></>}
                    </div>

                    {onCloseModal && (
                        <button className="btn btn-glass" onClick={onCloseModal} style={{ padding: '0.75rem', borderRadius: '16px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1)' }}>
                            <X size={24} />
                        </button>
                    )}
            </div>

            {/* Unified Analytics Dashboard (Replacing multiple stat cards) */}
            <div className="surface-glass" style={{ 
                margin: '0 0 1.5rem 0', 
                padding: '1.5rem 2rem', 
                borderRadius: '32px', 
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.7))',
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: '2.5rem',
                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(to bottom, #10b981, #3b82f6)' }}></div>
                
                {/* Left: Summary Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '2rem' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>Final Survival Rate</div>
                        <div style={{ fontSize: '3rem', fontWeight: 950, color: '#10b981', lineHeight: 1, letterSpacing: '-1px' }}>{stats.rate.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem', fontWeight: 700 }}>{stats.survived.toLocaleString()} Seedlings</div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expected</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{stats.planted.toLocaleString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Working Days</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f59e0b' }}>{Math.round(stats.days)}</div>
                        </div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertCircle size={18} color="#ef4444" />
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#ef4444' }}>{stats.issues} Issues</div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(239, 68, 68, 0.6)', fontWeight: 700 }}>Missing Billing Data</div>
                        </div>
                    </div>
                </div>

                {/* Right: Comparative Survival Trend (The ONLY Line Graph) */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div className="flex-between mb-6">
                        <div className="flex-center gap-3">
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                                <TrendingUp size={20} color="#3b82f6" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '0.5px' }}>Survival Rate Trend across Billing Stages</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {[
                                { label: 'Mobi', color: '#3b82f6' },
                                { label: 'B1', color: '#8b5cf6' },
                                { label: 'B2', color: '#f59e0b' },
                                { label: 'B3', color: '#ef4444' }
                            ].concat(show4thBilling ? [{ label: 'B4', color: '#ec4899' }] : []).map(l => (
                                <div key={l.label} className="flex-center gap-2">
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }}></div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>{l.label}</span>
                                </div>
                            ))}
                            {(!show4thBilling && isEditMode && isAdmin) && (
                                <button 
                                    onClick={() => setShow4thBilling(true)}
                                    style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', padding: '0.3rem 0.6rem', borderRadius: '8px', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: '0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                >
                                    <Plus size={12} /> ADD 4TH BILL
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', minHeight: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 2rem' }}>
                        {/* Grid Background */}
                        {[0, 25, 50, 75, 100].map(val => (
                            <div key={val} style={{ position: 'absolute', bottom: `${val}%`, left: 0, right: 0, borderBottom: '1px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, marginLeft: '-1.5rem' }}>{val}%</span>
                            </div>
                        ))}

                        {/* Survival Line (SVG) */}
                        <svg 
                            style={{ position: 'absolute', inset: '0 2rem', width: 'calc(100% - 4rem)', height: '100%', overflow: 'visible', zIndex: 1 }}
                            viewBox="0 0 100 100" preserveAspectRatio="none"
                        >
                            <defs>
                                <linearGradient id="dbmoTrendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="33%" stopColor="#8b5cf6" />
                                    <stop offset="66%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                            {(() => {
                                const bRates = [stats.bill0Rate, stats.bill1Rate, stats.bill2Rate, stats.bill3Rate];
                                if (show4thBilling) bRates.push(stats.bill4Rate);
                                const points = bRates.map((r, i) => {
                                    const x = (i / (show4thBilling ? 4 : 3)) * 100; // Dynamic interval
                                    const y = 100 - (r || 0);
                                    return `${x},${y}`;
                                }).join(' ');
                                return (
                                    <>
                                        <path d={`M ${points}`} fill="none" stroke="url(#dbmoTrendGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
                                        <polyline points={points} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                                    </>
                                );
                            })()}
                        </svg>

                        {/* Data Points / Interaction */}
                        <div style={{ position: 'absolute', left: '2rem', right: '2rem', bottom: 0, top: 0, pointerEvents: 'none' }}>
                            {[
                                { label: '15% Mobi', val: stats.bill0Rate, color: '#3b82f6', stage: 'mobi' },
                                { label: '1st Bill', val: stats.bill1Rate, color: '#8b5cf6', stage: 'bill1' },
                                { label: '2nd Bill', val: stats.bill2Rate, color: '#f59e0b', stage: 'bill2' },
                                { label: '3rd Bill', val: stats.bill3Rate, color: '#ef4444', stage: 'bill3' }
                            ].concat(show4thBilling ? [{ label: '4th Bill', val: stats.bill4Rate, color: '#ec4899', stage: 'bill4' }] : []).map((b, i) => {
                                const xPos = (i / (show4thBilling ? 4 : 3)) * 100; // Dynamic interval
                                return (
                                <div key={i} 
                                    onClick={() => setViewMode(b.stage)}
                                    style={{ 
                                        position: 'absolute', left: `${xPos}%`, bottom: 0, transform: 'translateX(-50%)',
                                        zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '0.4rem 0.8rem', 
                                        background: b.color, 
                                        borderRadius: '8px', 
                                        color: '#fff', 
                                        fontSize: '0.75rem', 
                                        fontWeight: 950, 
                                        marginBottom: '1rem',
                                        boxShadow: `0 5px 15px ${b.color}44`,
                                        position: 'relative',
                                        transform: viewMode === b.stage ? 'scale(1.2) translateY(-5px)' : 'scale(1)',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                    }}>
                                        {Math.round(b.val || 0)}%
                                        <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: b.color }}></div>
                                    </div>
                                    <div style={{ 
                                        width: '14px', 
                                        height: '14px', 
                                        borderRadius: '50%', 
                                        background: '#fff', 
                                        border: `4px solid ${b.color}`, 
                                        boxShadow: `0 0 20px ${b.color}`, 
                                        marginBottom: `${(b.val || 0) * 1.5}px`,
                                        transform: viewMode === b.stage ? 'scale(1.5)' : 'scale(1)',
                                        transition: 'all 0.3s'
                                    }}></div>
                                    <div style={{ marginTop: 'auto', fontSize: '0.65rem', fontWeight: 950, color: viewMode === b.stage ? '#fff' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{b.label}</div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            </div>

            <div className="tabs-bar-premium mb-6" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem 1rem' }}>
                {CENRO_LIST.map(cenro => (
                    <div 
                        key={cenro}
                        onClick={() => setActiveCenro(cenro)}
                        className={`tab-premium ${activeCenro === cenro ? 'active' : ''}`}
                        style={{ 
                            padding: '1rem 1.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800,
                            letterSpacing: '0.05em',
                            color: activeCenro === cenro ? 'var(--denr-green-light)' : 'var(--text-tertiary)',
                            borderBottom: activeCenro === cenro ? '3px solid var(--denr-green-light)' : '3px solid transparent',
                            marginTop: '3px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => { if (activeCenro !== cenro) e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { if (activeCenro !== cenro) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                        <Shield size={14} opacity={activeCenro === cenro ? 1 : 0.5} color={activeCenro === cenro ? 'var(--denr-green-light)' : 'var(--text-tertiary)'} />
                        {cenro.toUpperCase()}
                        {activeCenro === cenro && (
                            <div style={{ position: 'absolute', bottom: '-px', left: '0', width: '100%', height: '3px', background: 'var(--denr-green-glow)', filter: 'blur(4px)', opacity: 0.6 }}></div>
                        )}
                    </div>
                ))}
            </div>
                <div className="flex-between mb-6">
                    <div className="relative" style={{ width: '100%', maxWidth: '400px' }}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter data by PO or Keyword..." 
                            className="input-modern"
                            style={{ 
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '12px', 
                                padding: '0.7rem 1rem 0.7rem 2.5rem', 
                                color: '#fff', 
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                outline: 'none',
                                transition: 'all 0.3s'
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            
            <div className="flex-between mb-4 px-2" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', flex: 1 }} className="custom-scrollbar">
                { [
                    { id: 'base', icon: <Eye size={14} />, label: 'Base', color: '#64748b' },
                    { id: 'mobi', icon: <Layers size={14} />, label: '15%', name: '15% Mobilization', color: '#3b82f6' },
                    { id: 'bill1', icon: <FileSpreadsheet size={14} />, label: '1st Billing', name: '1st Billing', color: '#8b5cf6' },
                    { id: 'bill2', icon: <FileSpreadsheet size={14} />, label: '2nd Billing', name: '2nd Billing', color: '#f59e0b' },
                    { id: 'bill3', icon: <FileSpreadsheet size={14} />, label: '3rd Billing', name: '3rd Billing', color: '#ef4444' }
                ].concat(show4thBilling ? [{ id: 'bill4', icon: <FileSpreadsheet size={14} />, label: '4th Billing', name: '4th Billing', color: '#ec4899' }] : [])
                .concat([
                    { id: 'avg', icon: <TrendingUp size={14} />, label: 'Average', name: 'AVERAGE', color: '#eab308' },
                    { id: 'all', icon: <Maximize2 size={14} />, label: 'Full', color: '#10b981' }
                ]).map(view => (
                    <button 
                        key={view.id}
                        onClick={() => {
                            if (['mobi', 'bill1', 'bill2', 'bill3', 'bill4', 'avg'].includes(view.id)) {
                                setSelectedStage(MAINT_HEADERS.find(h => h.name === view.name));
                            } else {
                                setViewMode(view.id);
                            }
                        }}
                        className={`view-toggle-btn ${viewMode === view.id ? 'active' : ''}`}
                        style={{
                            '--view-color': view.color,
                            '--view-bg': `${view.color}25`,
                            '--view-border': `${view.color}60`
                        }}
                    >
                        {view.icon}
                        {view.label}
                    </button>
                ))}
                {(!show4thBilling && isEditMode && isAdmin) && (
                    <button 
                        onClick={() => setShow4thBilling(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', background: 'rgba(236, 72, 153, 0.1)', border: '1px dashed #ec4899', color: '#ec4899', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                    >
                        <Plus size={14} /> ADD 4TH BILL
                    </button>
                )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem', marginLeft: '1rem' }}>
                    <button className="btn-export-premium" onClick={exportMaintenanceCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: 900, borderRadius: '8px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <Download size={14} /> Export CSV
                    </button>
                    {isAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isEditMode ? '#10b981' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Edit Mode</span>
                            <div 
                                onClick={() => setIsEditMode(!isEditMode)}
                                style={{ 
                                    width: '32px', height: '16px', background: isEditMode ? '#10b981' : 'rgba(255,255,255,0.1)', 
                                    borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                                }}
                            >
                                <div style={{ 
                                    width: '12px', height: '12px', background: '#fff', borderRadius: '50%', 
                                    position: 'absolute', top: '2px', left: isEditMode ? '18px' : '2px', transition: 'all 0.3s' 
                                }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Spreadsheet Container */}
            <div 
                ref={pasteZoneRef}
                className="sheet-container-premium custom-scrollbar" 
                onPaste={handlePaste}
                style={{ 
                    flex: 1, overflow: 'auto', borderRadius: '24px', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95))', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                    position: 'relative', backdropFilter: 'blur(15px)',
                    minWidth: 0, minHeight: 0
                }}
            >
                {isEditMode && (
                    <div style={{ position: 'sticky', top: '20px', left: 0, width: '100%', height: 0, zIndex: 100, display: 'flex', justifyContent: 'center', overflow: 'visible', pointerEvents: 'none' }}>
                        <div className="paste-mode-indicator flex-center gap-2" style={{ background: 'linear-gradient(to right, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 900, border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.5)', letterSpacing: '0.1em' }}>
                            <Database size={16} className="animate-bounce" /> PASTE MODE ACTIVE: CLICK A CELL & CTRL+V
                        </div>
                    </div>
                )}
                <table className="nursery-table-premium" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 50, background: '#1e293b' }}>
                        <tr className="top-head-row">
                            <th rowSpan={2} className="sticky-col-header" style={{ width: '50px', background: '#1e293b', color: 'rgba(255,255,255,0.8)', position: 'sticky', left: 0, zIndex: 60 }}>#</th>
                            {topRow.map((th, i) => (
                                <th key={`top-${i}`} style={{ padding: '0.8rem 1.25rem', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: th.props.rowSpan === 2 ? '2px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.15)', fontSize: '0.75rem', textAlign: 'center', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', ...(th.props?.style || {}) }} colSpan={th.props.colSpan} rowSpan={th.props.rowSpan}>{th.props.children}</th>
                            ))}
                        </tr>
                        <tr className="sub-head-row">
                            {subRow.map((th, i) => (
                                <th key={`sub-${i}`} style={{ padding: '0.6rem 1.25rem', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', ...(th.props?.style || {}) }}>{th.props.children}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {activeRows.map((row, rIdx) => (
                            <tr key={rIdx} data-row-idx={rIdx} className={`nursery-data-row ${rIdx % 2 === 0 ? 'row-even' : 'row-odd'}`}>
                                <td style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', left: 0, background: '#1e293b', zIndex: 20, fontWeight: 900 }}>
                                    {isEditMode && isAdmin ? (
                                        <Trash2 size={12} className="hover-red" color="#ff4d4f" style={{ cursor: 'pointer', margin: '0 auto' }} onClick={e => {
                                            e.preventDefault();
                                            deleteRow(rIdx);
                                        }} />
                                    ) : (rIdx + 1)}
                                </td>
                                {renderRowCells(row, rIdx).map((td, i) => {
                                    let extraBg = {};
                                    let extraBorderL = '';
                                    let extraBorderR = '1px solid rgba(255,255,255,0.15)';
                                    
                                    if (viewMode === 'all') {
                                        if (i >= 13 && i <= 24) { extraBg = { background: 'rgba(59, 130, 246, 0.08)' }; if(i===13) extraBorderL='3px solid #3b82f6'; if(i===24) extraBorderR='3px solid #3b82f6'; }
                                        else if (i >= 25 && i <= 36) { extraBg = { background: 'rgba(139, 92, 246, 0.08)' }; if(i===36) extraBorderR='3px solid #8b5cf6'; }
                                        else if (i >= 37 && i <= 48) { extraBg = { background: 'rgba(245, 158, 11, 0.08)' }; if(i===48) extraBorderR='3px solid #f59e0b'; }
                                        else if (i >= 49 && i <= 60) { extraBg = { background: 'rgba(239, 68, 68, 0.08)' }; if(i===60) extraBorderR='3px solid #ef4444'; }
                                        else if (i >= 61) { extraBg = { background: 'rgba(234, 179, 8, 0.1)' }; if(i===67) extraBorderR='3px solid #eab308'; }
                                    }
                                    return React.cloneElement(td, {
                                        style: {
                                            padding: '0.75rem 1rem', borderRight: extraBorderR, borderLeft: extraBorderL || undefined, borderBottom: '1px solid rgba(255,255,255,0.15)',
                                            fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', outline: 'none', transition: 'all 0.2s',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            minWidth: '100px', maxWidth: '300px',
                                            ...extraBg,
                                            ...(td.props.style || {})
                                        }
                                    });
                                })}
                            </tr>
                        ))}
                        {isAdmin && isEditMode && (
                            <tr>
                                <td colSpan={MAINT_HEADERS.reduce((acc, h) => acc + (h.sub.length || 1), 0) + 1} style={{ padding: 0 }}>
                                    <button onClick={addRow} className="w-full p-4 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors font-bold uppercase tracking-widest text-xs" style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <PlusCircle size={16} /> Add New PO / Contract Row
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stage Detail Modal (Full Function from Original) */}
            {selectedStage && (
                <div className="modal-overlay" onClick={() => setSelectedStage(null)}>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()}>
                        <div className="premium-modal-header" style={{ background: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="flex items-center gap-4">
                                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '0.75rem', borderRadius: '14px', color: '#10b981' }}>
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em' }}>{selectedStage.name.toUpperCase()} DATA FOCUS</h3>
                                    <p className="text-xs text-emerald-400 uppercase tracking-widest font-black mt-1">{activeCenro} DISTRICT &middot; EDIT MODE {isEditMode ? 'ACTIVE' : 'LOCKED'}</p>
                                </div>
                            </div>
                            <button className="btn btn-glass" onClick={() => setSelectedStage(null)} style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 900, fontSize: '0.8rem' }}>
                                <X size={20} className="mr-2" /> EXIT FOCUS
                            </button>
                        </div>

                        <div className="premium-modal-body">
                            <table className="focus-table-premium" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={{ width: '50px', position: 'sticky', left: 0, background: '#1e293b', zIndex: 20, color: 'rgba(255,255,255,0.8)', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>#</th>
                                        {MAINT_HEADERS.slice(5, 9).map(h => <th key={h.name} style={{ background: '#0f172a', color: 'rgba(255,255,255,0.8)', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '2px solid rgba(255,255,255,0.15)' }}>{h.name}</th>)}
                                        {selectedStage.sub.map(sh => (
                                            <th key={sh} style={{ color: '#10b981', borderBottom: '3px solid #10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                                                {sh.toUpperCase()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(sheetData[activeCenro] || []).map((row, rIdx) => {
                                        let offset = 0;
                                        for (let i = 0; i < MAINT_HEADERS.length; i++) {
                                            if (MAINT_HEADERS[i].name === selectedStage.name) break;
                                            offset += MAINT_HEADERS[i].sub.length || 1;
                                        }

                                        return (
                                            <tr key={rIdx} className="nursery-data-row">
                                                <td style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)', position: 'sticky', left: 0, background: '#1e293b', zIndex: 15, fontWeight: 900 }}>
                                                    {rIdx + 1}
                                                </td>
                                                {/* Info Cells (PO, Code, Commodity, Species) */}
                                                {[row[5], row[6], row[7], row[8]].map((cell, cIdx) => (
                                                    <td key={`info-${cIdx}`} className="spreadsheet-cell" style={{ fontWeight: cIdx === 0 ? 800 : 600, color: cIdx === 0 ? '#fff' : 'rgba(255,255,255,0.8)', minWidth: cIdx === 0 ? '250px' : '150px', padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cell}</td>
                                                ))}
                                                {/* Stage Cells */}
                                                {selectedStage.sub.map((sh, sIdx) => (
                                                    <td 
                                                        key={`stage-${sIdx}`} 
                                                        contentEditable={isEditMode && isAdmin}
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => handleCellBlur(activeCenro, rIdx, offset + sIdx, e.target.innerText)}
                                                        className={`spreadsheet-cell ${isEditMode ? 'editable-cell' : ''}`}
                                                        style={{ textAlign: 'center', padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8rem', minWidth: '120px', color: 'rgba(255,255,255,0.9)' }}
                                                    >
                                                        {row[offset + sIdx]}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal (Refined) */}
            {isAnalyticsOpen && (
                <div className="modal-overlay" onClick={() => { setIsAnalyticsOpen(false); setSelectedCategoryLabel(null); }}>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', height: '80vh' }}>
                        <div className="premium-modal-header" style={{ background: 'rgba(16, 185, 129, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="flex-between">
                                <div className="flex items-center gap-3">
                                    <PieChartIcon size={24} color="var(--denr-green-light)" />
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-wider">ANNEX E ANALYTICS</h3>
                                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{analyticsMetric}</div>
                                    </div>
                                </div>
                                <button className="btn btn-glass p-2" onClick={() => { setIsAnalyticsOpen(false); setSelectedCategoryLabel(null); }}><X size={20} /></button>
                            </div>
                        </div>
                        
                        <div className="premium-modal-body">
                            {!selectedCategoryLabel ? (
                                <MaintenancePieChart 
                                    metricLabel={analyticsMetric.toUpperCase()}
                                    data={CENRO_LIST.map(cenro => {
                                        const rows = sheetData[cenro] || [];
                                        let val = 0;
                                        rows.forEach(row => {
                                            if (row.length < 63) return;
                                            if (analyticsMetric === 'expected planted') val += parseFloat(row[63] || 0); 
                                            else if (analyticsMetric === 'survivor rate') {
                                                const rate = parseFloat(row[65]) || 0;
                                                if (rate > 0) val += rate;
                                            }
                                            else if (analyticsMetric === 'working days') val += parseFloat(row[66] || 0);
                                            else if (analyticsMetric === 'missing inputs') {
                                                if (row[5] && (!row[28] || parseFloat(row[28]) === 0)) val++;
                                            }
                                        });
                                        if (analyticsMetric === 'survivor rate') {
                                            const validRows = rows.filter(r => (parseFloat(r[65]) || 0) > 0).length || 1;
                                            val = val / validRows;
                                        }
                                        return { name: cenro, value: val };
                                    })}
                                    onSelectCategory={(s) => setSelectedCategoryLabel(s.name)}
                                />
                            ) : (
                                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                    <button className="btn btn-glass mb-4 flex items-center gap-2" style={{ fontSize: '0.75rem', fontWeight: 800 }} onClick={() => setSelectedCategoryLabel(null)}>
                                        <ArrowLeft size={16} /> BACK TO OVERVIEW
                                    </button>
                                    <div className="flex-between mb-6">
                                        <h4 className="text-lg font-black text-white uppercase tracking-widest">{selectedCategoryLabel} BREAKDOWN</h4>
                                        <div className="text-sm font-bold text-emerald-400">STAGE PERFORMANCE</div>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontBlack: 900 }}>PO / Contractor</th>
                                                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontBlack: 900 }}>Commodity / Species</th>
                                                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', fontBlack: 900 }}>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(sheetData[selectedCategoryLabel] || []).filter(r => r[5]).map((row, rIdx) => {
                                                let val = 0;
                                                if (analyticsMetric === 'expected planted') val = parseFloat(row[63] || 0);
                                                else if (analyticsMetric === 'survivor rate') val = parseFloat(row[65] || 0);
                                                else if (analyticsMetric === 'working days') val = parseFloat(row[66] || 0);
                                                else if (analyticsMetric === 'missing inputs') val = (!row[28] || parseFloat(row[28]) === 0) ? 1 : 0;
                                                
                                                if (val === 0 && analyticsMetric !== 'missing inputs') return null;

                                                return (
                                                    <tr key={rIdx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                                        <td style={{ padding: '0.75rem', color: '#fff', fontSize: '0.8rem', fontWeight: 600, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>{row[5]}</td>
                                                        <td style={{ padding: '0.75rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{row[7]} / {row[8]}</td>
                                                        <td style={{ padding: '0.75rem', color: 'var(--denr-green-light)', fontSize: '0.9rem', fontWeight: 900, textAlign: 'right', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                                            {analyticsMetric === 'survivor rate' ? `${val.toFixed(2)}%` : (analyticsMetric === 'missing inputs' ? 'MISSING' : val.toLocaleString())}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Formula Info Modal */}
            {formulaInfo && (
                <div className="modal-overlay" onClick={() => setFormulaInfo(null)} style={{ zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                    <div className="surface-glass p-8 rounded-3xl" onClick={e => e.stopPropagation()} style={{ width: '400px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        <div className="mb-4 flex justify-center">
                            <div style={{ background: `${formulaInfo.color}20`, padding: '1rem', borderRadius: '20px', color: formulaInfo.color }}>
                                <formulaInfo.icon size={32} />
                            </div>
                        </div>
                        <h4 className="text-white font-bold mb-2 uppercase tracking-widest">{formulaInfo.label} Formula</h4>
                        <div className="bg-black/40 p-4 rounded-xl font-mono text-emerald-400 text-sm border border-white/5 mb-6">
                            {formulaInfo.formula}
                        </div>
                        <button className="btn btn-glass w-full py-3" onClick={() => setFormulaInfo(null)}>Close</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .maintenance-module { font-family: 'Outfit', sans-serif; }
                .btn-glass { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); transition: all 0.3s; }
                .btn-glass:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateY(-2px); }
                
                .btn-premium:hover { background: rgba(255,255,255,0.08) !important; color: #fff !important; transform: translateY(-2px); }
                .btn-premium.active { background: rgba(16, 185, 129, 0.2) !important; color: #10b981 !important; border-color: rgba(16, 185, 129, 0.4) !important; }
                
                .input-modern:focus { background: rgba(255,255,255,0.08) !important; border-color: var(--denr-green-light) !important; box-shadow: 0 0 20px rgba(16, 185, 129, 0.2); }

                .maintenance-table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.2); table-layout: auto; }
                .maintenance-table th { 
                    position: sticky; top: 0; z-index: 50;
                    background: #1e293b; color: #fff; padding: 0.6rem 0.8rem; 
                    border: 1px solid rgba(255,255,255,0.2); 
                    white-space: nowrap; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; 
                    font-size: 0.65rem;
                }
                .maintenance-table td { 
                    padding: 0.5rem 0.75rem; 
                    border: 1px solid rgba(255,255,255,0.18); 
                    color: rgba(255,255,255,0.95); 
                    white-space: nowrap;
                    font-size: 0.72rem;
                    font-weight: 600;
                    min-width: 130px;
                    height: 36px;
                    transition: all 0.1s;
                }
                .row-num { position: sticky; left: 0; z-index: 20; background: #1e293b !important; color: #fff; text-align: center; font-weight: 900; font-size: 0.65rem; border-right: 2px solid rgba(16, 185, 129, 0.4) !important; width: 50px !important; min-width: 50px !important; }
                .avg-column { background: rgba(16, 185, 129, 0.1) !important; font-weight: 900 !important; color: #10b981 !important; }
                .nursery-data-row { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                .nursery-data-row:hover td { background: rgba(255,255,255,0.1) !important; color: #fff !important; text-shadow: 0 0 15px rgba(255,255,255,0.4); }
                .editable-cell:focus { 
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1)) !important; 
                    outline: none;
                    box-shadow: inset 0 0 0 2px #10b981;
                    color: #fff;
                    z-index: 46;
                    position: relative;
                }
                .tab-premium { transition: all 0.3s ease; position: relative; }
                .tab-premium:hover { color: #fff !important; background: rgba(255,255,255,0.05); border-radius: 12px 12px 0 0; }
                .tab-premium.active::after { content: ''; position: absolute; bottom: -3px; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #10b981, #3b82f6); filter: blur(2px); opacity: 0.8; border-radius: 4px; }

                .view-toggle-btn {
                    display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.75rem; 
                    font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; cursor: pointer; white-space: nowrap;
                    background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .view-toggle-btn svg {
                    color: var(--view-color); /* Colorful icons by default */
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .view-toggle-btn:hover {
                    background: var(--view-bg);
                    color: var(--view-color);
                    border-color: var(--view-border);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 0 8px var(--view-bg);
                }
                .view-toggle-btn:hover svg {
                    transform: scale(1.15) rotate(5deg);
                }
                .view-toggle-btn.active {
                    background: var(--view-bg) !important;
                    color: var(--view-color) !important;
                    border-color: var(--view-border) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 0 15px rgba(0,0,0,0.2), inset 0 0 8px var(--view-bg) !important;
                }
                .view-toggle-btn.active svg {
                    transform: scale(1.1);
                }

                @media print {
                    .module-header, .tabs-bar-premium, .flex-between, .flex-gap-2, .stat-card-premium, .btn, .paste-mode-indicator { display: none !important; }
                    .surface-glass { background: white !important; border: 1px solid #000 !important; color: #000 !important; }
                    .maintenance-table td, .maintenance-table th { color: #000 !important; border: 1px solid #000 !important; font-size: 8pt !important; padding: 2pt !important; }
                    .maintenance-module { padding: 0 !important; margin: 0 !important; width: 100% !important; background: white !important; }
                    h2 { color: #000 !important; font-size: 14pt !important; margin-bottom: 20pt !important; }
                }

                .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.6); border: 2px solid transparent; background-clip: content-box; }
            `}</style>
        </div>
    );
};

export default MaintenanceProtection;
