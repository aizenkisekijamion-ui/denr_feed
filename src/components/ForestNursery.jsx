import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    collection, query, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    Trees, Plus, Trash2, Settings, Printer, Info,
    X, ChevronLeft, ChevronRight, Save, PlusCircle,
    CalendarPlus, AlertCircle, LayoutDashboard, Database,
    Maximize2, PieChart as PieChartIcon, ArrowLeft, RefreshCcw, CheckCircle
} from 'lucide-react';


// --- CONSTANTS ---
const NURSERY_CATEGORIES = ["Indigenous", "Fruit Trees", "Bamboo"];
const DEFAULT_SHEETS = ["Quezon", "Brooke's Point", "Roxas", "Coron", "Taytay", "Puerto Princesa"];
const DEFAULT_HEADERS = [
    { name: "Specific Location of Nursery", sub: [] },
    { name: "Species", sub: ["Common Name", "Scientific Name"] },
    { name: "Beginning Seedling Stock", sub: [] },
    { name: "Current No. of Seedlings Produced", sub: [] },
    { name: "Month Produced", sub: [] },
    { name: "Available Seedling Stock", sub: [] },
    { name: "Mortality to Date", sub: [] },
    { name: "No. of Seedlings Disposed/Planted", sub: [] },
    { name: "Recipient/s", sub: ["PO/LGU/Office", "Representative"] },
    { name: "Date of Disposition/Planting", sub: [] },
    { name: "Location of Plantation", sub: ["Barangay", "Municipality", "Province"] },
    { name: "Intended Use", sub: [] },
    { name: "Remarks", sub: [] }
];

const parseNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
};

// Custom High-Performance Premium Pie Chart with Interactivity
const NurseryPieChart = React.memo(({ data, metricLabel, onSelectCategory }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const normalizedData = Array.isArray(data) ? data : [];
    const total = normalizedData.reduce((sum, item) => sum + (parseNumber(item?.value) || 0), 0);
    const CATEGORY_COLORS = { "Indigenous": "#10b981", "Fruit Trees": "#3b82f6", "Bamboo": "#f59e0b" };

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
        <div className="nursery-analytics-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1.2fr', gap: '4rem', alignItems: 'center', width: '100%', height: '100%' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', aspectRatio: '1/1', margin: '0 auto' }}>
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
                            <div style={{ fontSize: '3rem', fontWeight: 950, color: slices[hoveredSlice].color, lineHeight: 1 }}>{slices[hoveredSlice].value.toLocaleString()}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.2rem' }}>{slices[hoveredSlice].name}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: '#fff' }}>{total.toLocaleString()}</div>
                            <div style={{ fontSize: '0.75rem', color: '#fff', opacity: 0.3, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.4rem' }}>{metricLabel || 'TOTAL UNITS'}</div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxHeight: '420px' }}>
                {slices.map((s) => (
                    <div
                        key={s.idx}
                        className="flex-between"
                        onClick={() => onSelectCategory(s)}
                        onMouseEnter={() => setHoveredSlice(s.idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        style={{ 
                            padding: '1.5rem 2.5rem', 
                            background: hoveredSlice === s.idx ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', 
                            borderRadius: '20px', 
                            cursor: 'pointer', 
                            border: `1px solid ${hoveredSlice === s.idx ? s.color : 'rgba(255,255,255,0.04)'}`, 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: hoveredSlice === s.idx ? 'translateX(12px)' : 'none',
                        }}
                    >
                        <div className="flex-center gap-4">
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: s.color, boxShadow: `0 0 12px ${s.color}aa`, flexShrink: 0 }}></div>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.name}</span>
                        </div>
                        <div className="flex-center gap-4">
                            <span style={{ fontWeight: 900, color: s.color, fontSize: '2rem' }}>{s.value.toLocaleString()}</span>
                            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '1rem', fontWeight: 800, minWidth: '45px' }}>{Math.round(s.visualPct * 100)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

const ForestNursery = ({ isAdmin, userRole, setSuccess, setError, onCloseModal }) => {
    // --- STATE ---
    const [sheets, setSheets] = useState([]);
    const [activeSheet, setActiveSheet] = useState(null);
    const [activeMonth, setActiveMonth] = useState('March');
    const [sheetData, setSheetData] = useState({});
    const [headers, setHeaders] = useState([...DEFAULT_HEADERS]);
    const [customHeaders, setCustomHeaders] = useState({});
    const [targets, setTargets] = useState({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [pasteWarning, setPasteWarning] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [analyticsMetric, setAnalyticsMetric] = useState('produced');
    const [selectedCategoryLabel, setSelectedCategoryLabel] = useState(null);
    const [formulaInfo, setFormulaInfo] = useState(null);


    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // UI Modals
    const [showSettings, setShowSettings] = useState(false);
    const [showAddTab, setShowAddTab] = useState(false);
    const [newSheetName, setNewSheetName] = useState('');
    const [newMonthName, setNewMonthName] = useState('');

    const pasteZoneRef = useRef(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        setLoading(true);
        const unsubConfig = onSnapshot(doc(db, 'forest_nursery_config', 'main'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.active_sheets_list && Array.isArray(data.active_sheets_list)) setSheets(data.active_sheets_list);
                if (data.headers_dyn && Array.isArray(data.headers_dyn)) setHeaders(data.headers_dyn);
                if (data.targets) setTargets(data.targets);
                if (data.custom_headers) setCustomHeaders(data.custom_headers);

                if (!activeSheet && data.active_sheets_list?.length > 0) {
                    setActiveSheet(data.active_sheets_list[0]);
                }
            } else {
                const defaultConfig = {
                    active_sheets_list: DEFAULT_SHEETS,
                    headers_dyn: DEFAULT_HEADERS,
                    targets: DEFAULT_SHEETS.reduce((acc, s) => ({ ...acc, [s]: 1000 }), {}),
                    custom_headers: {}
                };
                setDoc(doc(db, 'forest_nursery_config', 'main'), defaultConfig);
            }
        });

        return () => unsubConfig();
    }, []);

    useEffect(() => {
        if (!activeSheet) return;

        const targetDocId = activeMonth === 'March' ? activeSheet : `${activeSheet}_${activeMonth}`;
        const unsubData = onSnapshot(doc(db, 'forest_nursery_data', targetDocId), (snapshot) => {
            if (snapshot.exists()) {
                let parsedRows = [];
                try {
                    const rowData = snapshot.data().rows;
                    parsedRows = typeof rowData === 'string' ? JSON.parse(rowData) :
                        (Array.isArray(rowData) ? rowData : Object.values(rowData || {}));
                } catch (e) {
                    console.error("Firebase Parse Error", e);
                }

                if (!parsedRows || parsedRows.length < 5) {
                    parsedRows = generateDefaultSheetData();
                }
                setSheetData(prev => ({ ...prev, [targetDocId]: parsedRows }));
            } else {
                const defaultRows = generateDefaultSheetData();
                setDoc(doc(db, 'forest_nursery_data', targetDocId), { rows: JSON.stringify(defaultRows) });
                setSheetData(prev => ({ ...prev, [targetDocId]: defaultRows }));
            }
            setLoading(false);
        });

        return () => unsubData();
    }, [activeSheet, activeMonth]);

    // --- HELPERS ---
    const getFlatHeaderCount = () => {
        return headers.reduce((count, h) => count + (h.sub?.length > 0 ? h.sub.length : 1), 0);
    };

    const generateDefaultSheetData = () => {
        const flatCount = getFlatHeaderCount();
        const blankRow = Array(flatCount).fill("");
        let data = [];
        NURSERY_CATEGORIES.forEach(cat => {
            data.push([cat]);
            for (let k = 0; k < 5; k++) data.push([...blankRow]);
        });
        return data;
    };

    const isHeaderRow = (row, sheetId) => {
        if (!row || !Array.isArray(row) || row.length === 0) return false;
        const firstCell = String(row[0] || "").trim().toUpperCase();
        if (!firstCell) return false;

        const rawCustom = customHeaders[sheetId] || [];
        const custom = Array.isArray(rawCustom) ? rawCustom : Object.values(rawCustom);
        const isKnown = NURSERY_CATEGORIES.some(c => c.toUpperCase() === firstCell) ||
            ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].includes(firstCell) ||
            custom.some(h => String(h).trim().toUpperCase() === firstCell);

        const isSecondEmpty = !row[1] || String(row[1]).trim() === "";
        return isKnown && isSecondEmpty;
    };


    const parseTSV = (text) => {
        return text.split(/\r?\n/).map(row => row.split('\t'));
    };

    // --- LOGIC ---
    const getTargetDocId = (sheetId) => {
        return activeMonth === 'March' ? sheetId : `${sheetId}_${activeMonth}`;
    };

    const saveToFirestore = async (sheetId, newData) => {
        setIsSaving(true);
        try {
            const targetDocId = getTargetDocId(sheetId);
            await setDoc(doc(db, 'forest_nursery_data', targetDocId), { rows: JSON.stringify(newData) });
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (e) {
            console.error("Failed to save to Firestore", e);
            alert("Failed to sync to Cloud. Please check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCellBlur = (rowIndex, colIndex, value) => {
        try {
            if (!isEditMode) return;
            setSheetData(prev => {
                const targetDocId = getTargetDocId(activeSheet);
                const activeData = prev[targetDocId];
                if (!activeData) return prev;
                const currentData = Array.isArray(activeData) ? activeData : Object.values(activeData);
                if (!currentData[rowIndex]) return prev;

                const trimmedValue = (value || "").trim();
                if (currentData[rowIndex][colIndex] === trimmedValue) return prev;

                const newData = currentData.map((row, i) => i === rowIndex ? [...row] : row);
                newData[rowIndex][colIndex] = trimmedValue;

                setTimeout(() => saveToFirestore(activeSheet, newData), 0);
                return { ...prev, [targetDocId]: newData };
            });
        } catch (err) {
            console.error("Cell Blur Crash Mitigated: ", err);
        }
    };

    const handlePaste = async (e) => {
        if (!isEditMode) return;
        const activeEl = document.activeElement;
        if (!activeEl || activeEl.tagName !== 'TD') return;

        const tr = activeEl.parentElement;
        const startRowIdx = parseInt(tr.getAttribute('data-row-index'));
        const startColIdx = activeEl.cellIndex - 1; // Subtract 1 for row number td

        if (isNaN(startRowIdx) || startRowIdx === -1) {
            alert("Please click a valid data cell to start pasting.");
            return;
        }

        e.preventDefault();
        const clipboardText = (e.clipboardData || window.clipboardData).getData('text');
        if (!clipboardText) return;

        const rows = parseTSV(clipboardText);
        // Remove trailing empty rows from the paste payload
        while (rows.length > 0 && rows[rows.length - 1].every(cell => !cell || cell.trim() === '')) { rows.pop(); }
        if (rows.length === 0) return;

        const targetDocId = getTargetDocId(activeSheet);
        let data = [...(sheetData[targetDocId] || [])];
        let custom = customHeaders[activeSheet] || [];

        // Find next header boundary (just like original code) to calculate safe space
        let nextHeaderIdx = data.length;
        for (let k = startRowIdx + 1; k < data.length; k++) {
            let r = data[k];
            let val = (r && r[0]) ? r[0].toUpperCase() : "";
            if (val && (NURSERY_CATEGORIES.some(c => c.toUpperCase() === val) || custom.map(c => c.toUpperCase()).includes(val)) && (!r[1] || r[1].trim() === "")) {
                nextHeaderIdx = k;
                break;
            }
        }

        let availableSpace = nextHeaderIdx - startRowIdx;
        if (rows.length > availableSpace) {
            setPasteWarning({ needed: rows.length, available: availableSpace });
            return;
        }

        for (let r = 0; r < rows.length; r++) {
            const rowData = rows[r];
            const targetRowIdx = startRowIdx + r;
            if (!data[targetRowIdx]) data[targetRowIdx] = Array(getFlatHeaderCount()).fill("");

            for (let c = 0; c < rowData.length; c++) {
                const targetColIdx = startColIdx + c;
                if (targetColIdx < getFlatHeaderCount()) {
                    data[targetRowIdx][targetColIdx] = rowData[c].trim();
                }
            }
        }

        setSheetData(prev => ({ ...prev, [targetDocId]: data }));
        await saveToFirestore(activeSheet, data);
    };

    // --- RENDER HELPERS ---
    const aggregatedStats = useMemo(() => {
        const targetDocId = getTargetDocId(activeSheet);
        const rawData = sheetData[targetDocId] || [];
        const data = Array.isArray(rawData) ? rawData : Object.values(rawData);
        
        const totals = { beginning: 0, produced: 0, stock: 0, distributed: 0, mortality: 0 };
        const categoryData = {
            beginning: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            produced: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            stock: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            distributed: NURSERY_CATEGORIES.map(name => ({ name, value: 0 })),
            mortality: NURSERY_CATEGORIES.map(name => ({ name, value: 0 }))
        };
        const detailedRows = { beginning: {}, produced: {}, stock: {}, distributed: {}, mortality: {} };

        let currentCat = null;
        data.forEach(row => {
            if (isHeaderRow(row, activeSheet)) {
                currentCat = NURSERY_CATEGORIES.find(c => c.toUpperCase() === String(row[0] || "").trim().toUpperCase());
            } else if (currentCat) {
                const metrics = { 
                    beginning: parseNumber(row[3]), produced: parseNumber(row[4]), 
                    stock: parseNumber(row[6]), mortality: parseNumber(row[7]), 
                    distributed: parseNumber(row[8]) 
                };

                Object.entries(metrics).forEach(([key, val]) => {
                    if (val > 0) {
                        totals[key] += val;
                        const catIdx = NURSERY_CATEGORIES.indexOf(currentCat);
                        if (catIdx !== -1) categoryData[key][catIdx].value += val;

                        if (!detailedRows[key][currentCat]) detailedRows[key][currentCat] = [];
                        detailedRows[key][currentCat].push({
                            species: row[1] || '---',
                            cenro: activeSheet,
                            loc: row[0],
                            month: row[5],
                            value: val
                        });
                    }
                });
            }
        });
        return { totals, categoryData, detailedRows };
    }, [sheetData, activeSheet]);

    const stats = aggregatedStats.totals;

    // Compute produced total from raw rows (col index 4)
    const computeProduced = (rows) => {
        if (!rows || !Array.isArray(rows)) return 0;
        return rows.reduce((sum, row) => {
            if (!Array.isArray(row)) return sum;
            const fc = String(row[0] || '').trim().toUpperCase();
            const isHdr = fc && (!row[1] || String(row[1]).trim() === '');
            if (isHdr) return sum;
            return sum + parseNumber(row[4]);
        }, 0);
    };



    const handleExportCSV = async () => {
        const targetDocId = getTargetDocId(activeSheet);
        if (!activeSheet || !sheetData[targetDocId]) return;
        const rawData = sheetData[targetDocId];
        const data = Array.isArray(rawData) ? rawData : Object.values(rawData);
        const now = new Date();
        const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });

        // ── Build premium CSV ─────────────────────────────────────────────
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const SEP = `"${'─'.repeat(120)}"`;
        const lines = [];
        lines.push('\uFEFF'); // UTF-8 BOM
        lines.push(q('DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN'));
        lines.push(q(`FOREST NURSERY 2026 | CENRO: ${activeSheet.toUpperCase()}`));
        lines.push(q(`Generated: ${dateStr}`));
        lines.push('');
        lines.push(SEP);

        // Header rows (match table structure)
        const headerRow1 = ['#'];
        const headerRow2 = [''];
        headers.forEach(h => {
            if (h.sub && h.sub.length > 0) {
                h.sub.forEach((sh, idx) => {
                    headerRow1.push(idx === 0 ? h.name : '');
                    headerRow2.push(sh);
                });
            } else {
                headerRow1.push(h.name);
                headerRow2.push('');
            }
        });
        lines.push(headerRow1.map(q).join(','));
        lines.push(headerRow2.map(q).join(','));
        lines.push(SEP);

        // ── Totals Row ────────────────────────────────────────────────────
        const totals = Array(headerRow1.length).fill('');
        totals[0] = 'TOTAL';
        data.forEach(row => {
            const rowArr = Array.isArray(row) ? row : Object.values(row || {});
            [3, 4, 6, 7, 8].forEach(idx => {
                const val = parseFloat(String(rowArr[idx] || '').replace(/,/g, ''));
                if (!isNaN(val)) {
                    const colInCSV = idx + 1;
                    totals[colInCSV] = (parseFloat(totals[colInCSV] || 0) + val).toLocaleString();
                }
            });
        });
        lines.push(SEP);
        lines.push(totals.map(q).join(','));
        lines.push(SEP);

        const csvContent = lines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `DENR_Forest_Nursery_${activeSheet}_2026_${now.toISOString().split('T')[0]}.csv`;

        // ── Save As dialog (primary) ──────────────────────────────────────
        if (window.showSaveFilePicker) {
            try {
                const fh = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'CSV Spreadsheet', accept: { 'text/csv': ['.csv'] } }],
                });
                const writable = await fh.createWritable();
                await writable.write(blob);
                await writable.close();
                alert("Export Success! Check your saved file.");
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        // ── Fallback: auto-download ───────────────────────────────────────
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    };

    if (loading && !activeSheet) {
        return (
            <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px' }}>
                <RefreshCcw className="animate-spin" size={40} color="var(--denr-green-light)" />
                <p className="text-muted">Loading Nursery Data...</p>
            </div>
        );
    }

    return (
        <div className="forest-nursery-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5rem', background: 'var(--bg-surface)', padding: '2rem', borderRadius: '24px', minWidth: 0, minHeight: 0 }}>
            {/* Header / Stats Section */}
            <div className="flex-between" style={{ flexShrink: 0 }}>
                <div>
                    <h3 className="section-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: 'var(--text-primary)' }}>
                        <Trees size={32} color="var(--denr-green-light)" />
                        FOREST NURSERY 2026
                    </h3>
                    <p className="text-muted text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Real-time inventory and distribution monitoring.</p>
                </div>
                <div className="flex-center gap-3">
                    <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.8rem', color: '#fff', background: 'var(--denr-green)', borderColor: 'var(--denr-green)' }} onClick={handleExportCSV} title="Export Database to CSV">
                        <Database size={16} /> Export CSV
                    </button>
                    {(isAdmin || userRole === 'admin') && (
                        <>
                            <div className="flex-center gap-2" style={{ background: 'var(--bg-input)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <span className="text-xs font-bold" style={{ color: isEditMode ? 'var(--denr-green-light)' : 'var(--text-tertiary)' }}>EDIT MODE</span>
                                <div
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    style={{
                                        width: '40px', height: '20px', background: isEditMode ? 'var(--denr-green-glow)' : 'var(--bg-active)',
                                        borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{
                                        width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: isEditMode ? '22px' : '2px', transition: 'all 0.3s'
                                    }} />
                                </div>
                            </div>

                            {/* Cloud Sync Notifications */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.3s ease', opacity: (isSaving || syncSuccess) ? 1 : 0, width: (isSaving || syncSuccess) ? 'auto' : '0px', overflow: 'hidden' }}>
                                {isSaving && <><RefreshCcw size={14} className="animate-spin" color="#10b981" /> <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>Syncing...</span></>}
                                {syncSuccess && <><CheckCircle size={14} color="#10b981" /> <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>Saved</span></>}
                            </div>

                            <button className="btn btn-glass" onClick={() => setShowSettings(true)}>
                                <Settings size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Cards - Using responsive grid class */}
            <div className="stats-grid-premium" style={{ display: 'grid', gap: '1.25rem' }}>
                {[
                    { label: 'Beginning Stock', key: 'beginning', val: stats.beginning, icon: CalendarPlus, color: '#8b5cf6', formula: 'Initial Seedling Count' },
                    { label: 'Produced', key: 'produced', val: stats.produced, icon: PlusCircle, color: '#10b981', formula: 'Current No. of Seedlings Produced' },
                    { label: 'Stock', key: 'stock', val: stats.stock, icon: Database, color: '#3b82f6', formula: 'Total Available Seedling Stock' },
                    { label: 'Distributed', key: 'distributed', val: stats.distributed, icon: LayoutDashboard, color: '#f59e0b', formula: 'No. of Seedlings Disposed / Planted' },
                    { label: 'Mortality', key: 'mortality', val: stats.mortality, icon: AlertCircle, color: '#ef4444', formula: 'Total Mortality to Date' }
                ].map((s, i) => (
                    <div
                        key={i}
                        onClick={() => { setAnalyticsMetric(s.key); setIsAnalyticsOpen(true); }}
                        className="surface-glass stat-card-premium"
                        style={{
                            padding: '1.25rem 1.5rem', borderRadius: '24px',
                            border: `1px solid ${analyticsMetric === s.key ? s.color : 'rgba(255,255,255,0.06)'}`,
                            background: analyticsMetric === s.key ? `${s.color}15` : 'rgba(15, 23, 42, 0.4)',
                            cursor: 'pointer', position: 'relative', overflow: 'hidden',
                            boxShadow: analyticsMetric === s.key ? `0 0 30px ${s.color}22` : '0 10px 30px rgba(0,0,0,0.2)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle at center, ${s.color}15 0%, transparent 70%)`, opacity: 0.8, pointerEvents: 'none' }} />
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem', position: 'relative', zIndex: 2 }}>
                            <div className="flex-center" style={{ background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`, padding: '0.6rem', borderRadius: '14px', color: s.color, border: `1px solid ${s.color}40`, boxShadow: `0 0 15px ${s.color}20` }}>
                                <s.icon size={22} color={s.color} style={{ filter: analyticsMetric === s.key ? `drop-shadow(0 0 8px ${s.color})` : 'none' }} />
                            </div>
                        </div>
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ letterSpacing: '2px', fontSize: '0.65rem', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', color: '#fff' }}>{s.label}</div>
                            <div style={{ color: analyticsMetric === s.key ? '#fff' : 'rgba(255,255,255,0.55)', marginTop: '0.2rem', fontWeight: 900, fontSize: '1.6rem', textAlign: 'center' }}>{s.val.toLocaleString()}</div>
                        </div>
                    </div>
                ))}
            </div>


            {/* Months Tab Bar */}
            <div className="custom-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', flexShrink: 0, overflowX: 'auto' }}>
                {MONTHS.map(month => (
                    <div
                        key={month}
                        onClick={() => setActiveMonth(month)}
                        className={`tab-premium hover-glow ${activeMonth === month ? 'active' : ''}`}
                        style={{
                            padding: '0.6rem 1.25rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
                            color: activeMonth === month ? 'var(--denr-green-light)' : 'var(--text-tertiary)',
                            background: activeMonth === month ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: activeMonth === month ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
                        }}
                    >
                        {activeMonth === month && <Trees size={14} />}
                        {month}
                    </div>
                ))}
            </div>

            {/* Tabs Bar (CENRO) */}
            <div className="tabs-bar-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', padding: '0 0.5rem', flexShrink: 0 }}>
                {sheets.map(sheet => (
                    <div
                        key={sheet}
                        onClick={() => setActiveSheet(sheet)}
                        className={`tab-premium ${activeSheet === sheet ? 'active' : ''}`}
                        style={{
                            padding: '0.75rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                            color: activeSheet === sheet ? 'var(--denr-green-light)' : 'var(--text-tertiary)',
                            borderBottom: activeSheet === sheet ? '3px solid var(--denr-green-light)' : '3px solid transparent',
                            marginTop: '3px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Trees size={14} opacity={activeSheet === sheet ? 1 : 0.5} />
                        {sheet}
                    </div>
                ))}
                {isEditMode && isAdmin && (
                    <button className="btn btn-glass" style={{ padding: '0.4rem', border: 'none' }} onClick={() => setShowAddTab(true)}>
                        <Plus size={16} color="var(--denr-green-light)" />
                    </button>
                )}
            </div>

            {/* Main Spreadsheet Container */}
            <div
                ref={pasteZoneRef}
                className="sheet-container-premium"
                onPaste={handlePaste}
                style={{
                    flex: 1, overflow: 'auto', borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-core)', position: 'relative',
                    minWidth: 0, minHeight: 0
                }}
            >
                {isEditMode && (
                    <div className="paste-mode-indicator flex-center gap-2" style={{ position: 'sticky', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800, border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
                        <Database size={14} /> PASTE MODE ACTIVE: CLICK A CELL & CTRL+V
                    </div>
                )}

                <style>{`
                    .stat-card-premium {
                        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    .stat-card-premium:hover {
                        transform: translateY(-8px) scale(1.02);
                        border-color: rgba(255,255,255,0.3) !important;
                        background: rgba(30, 41, 59, 0.6) !important;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.05) !important;
                    }
                    .btn-glass {
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    }
                    .btn-glass:hover:not(.active) {
                        background: rgba(255,255,255,0.08) !important;
                        color: #fff !important;
                        transform: scale(1.05);
                    }
                    .nursery-table-premium th,
                    .nursery-table-premium td {
                        border-right: 1px solid rgba(136, 136, 136, 0.6) !important;
                        border-bottom: 1px solid rgba(136, 136, 136, 0.6) !important;
                    }
                    .nursery-table-premium {
                        border-top: 1px solid rgba(136, 136, 136, 0.6) !important;
                        border-left: 1px solid rgba(136, 136, 136, 0.6) !important;
                    }
                `}</style>
                <table className="nursery-table-premium" style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-surface)' }}>
                        <tr>
                            <th rowSpan={2} className="sticky-col-header" style={{ width: '50px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>#</th>
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    style={{
                                        padding: '0.75rem 1rem', borderRight: '1px solid var(--border-color)', borderBottom: h.sub?.length > 0 ? '1px solid var(--border-color)' : '2px solid var(--border-color)',
                                        fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center'
                                    }}
                                    colSpan={h.sub?.length > 0 ? h.sub.length : 1}
                                    rowSpan={h.sub?.length > 0 ? 1 : 2}
                                >
                                    {h.name}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {headers.filter(h => h.sub?.length > 0).map(h =>
                                h.sub.map((sh, idx) => (
                                    <th key={`${h.name}-${idx}`} style={{ padding: '0.5rem 1rem', borderRight: '1px solid var(--border-color)', borderBottom: '2px solid var(--border-color)', fontSize: '0.65rem', color: 'var(--text-tertiary)', background: 'var(--bg-input)' }}>
                                        {sh}
                                    </th>
                                 )))}
                        </tr>
                    </thead>
                    <tbody>
                        {(Array.isArray(sheetData[getTargetDocId(activeSheet)]) ? sheetData[getTargetDocId(activeSheet)] : Object.values(sheetData[getTargetDocId(activeSheet)] || {})).map((row, rIdx) => {
                            const isHeader = isHeaderRow(row, activeSheet);
                            if (isHeader) {
                                const isCategory = NURSERY_CATEGORIES.some(c => c.toUpperCase() === String(row[0] || '').trim().toUpperCase());
                                return (
                                    <tr key={rIdx} className="period-header-row">
                                        <td
                                            colSpan={getFlatHeaderCount() + 1}
                                            style={{
                                                background: isCategory ? 'var(--bg-active)' : 'var(--denr-green-glow)',
                                                padding: '0.5rem 1.5rem',
                                                borderBottom: '1px solid var(--border-color)',
                                                color: isCategory ? 'var(--text-primary)' : 'var(--denr-green-light)',
                                                fontWeight: 800, fontSize: '0.8rem',
                                                letterSpacing: '0.05em'
                                            }}
                                        >
                                            <div className="flex-between">
                                                <div className="flex-center gap-2">
                                                    {!isCategory && <CalendarPlus size={14} />}
                                                    {isCategory && <Trees size={14} color="var(--denr-green-light)" />}
                                                    <span
                                                        contentEditable={isEditMode}
                                                        onBlur={(e) => handleCellBlur(rIdx, 0, e.target.innerText)}
                                                        style={{ outline: 'none' }}
                                                    >
                                                        {row[0]}
                                                    </span>
                                                </div>
                                                {isEditMode && (
                                                    <div className="flex-center gap-2">
                                                        <div
                                                            className="flex-center gap-1 hover-glow"
                                                            style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem' }}
                                                            onClick={e => {
                                                                e.preventDefault();
                                                                setSheetData(prev => {
                                                                    const targetDocId = getTargetDocId(activeSheet);
                                                                    const activeData = prev[targetDocId];
                                                                    const currentData = Array.isArray(activeData) ? [...activeData] : Object.values(activeData || {});
                                                                    currentData.splice(rIdx + 1, 0, Array(getFlatHeaderCount()).fill(""));
                                                                    setTimeout(() => saveToFirestore(activeSheet, currentData), 0);
                                                                    return { ...prev, [targetDocId]: currentData };
                                                                });
                                                            }}
                                                        >
                                                            <PlusCircle size={12} /> ADD ROW
                                                        </div>
                                                        {!isCategory && (
                                                            <div
                                                                className="flex-center gap-1 hover-glow"
                                                                style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem' }}
                                                                onClick={() => setShowAddTab(true)}
                                                            >
                                                                <CalendarPlus size={12} /> ADD TAB/BLOCK
                                                            </div>
                                                        )}
                                                        <Trash2 size={16} className="hover-red" style={{ cursor: 'pointer', color: '#ff4d4f', marginLeft: '1rem' }} onClick={e => {
                                                            e.preventDefault();
                                                            if (window.confirm("Remove this whole block?")) {
                                                                setSheetData(prev => {
                                                                    const targetDocId = getTargetDocId(activeSheet);
                                                                    const activeData = prev[targetDocId];
                                                                    const currentData = Array.isArray(activeData) ? activeData : Object.values(activeData || {});
                                                                    const newData = currentData.filter((_, i) => i !== rIdx);
                                                                    setTimeout(() => saveToFirestore(activeSheet, newData), 0);
                                                                    return { ...prev, [targetDocId]: newData };
                                                                });
                                                            }
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={rIdx} data-row-index={rIdx} className="nursery-data-row">
                                    <td style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                        {isEditMode ? <Trash2 size={12} className="hover-red" color="#ff4d4f" style={{ cursor: 'pointer' }} onClick={e => {
                                            e.preventDefault();
                                            setSheetData(prev => {
                                                const targetDocId = getTargetDocId(activeSheet);
                                                const activeData = prev[targetDocId];
                                                const currentData = Array.isArray(activeData) ? activeData : Object.values(activeData || {});
                                                const newData = currentData.filter((_, i) => i !== rIdx);
                                                setTimeout(() => saveToFirestore(activeSheet, newData), 0);
                                                return { ...prev, [targetDocId]: newData };
                                            });
                                        }} /> : rIdx + 1}
                                    </td>
                                    {(Array.isArray(row) ? row : Object.values(row || {})).map((cell, cIdx) => (
                                        <td
                                            key={cIdx}
                                            contentEditable={isEditMode}
                                            onBlur={(e) => handleCellBlur(rIdx, cIdx, e.target.innerText)}
                                            suppressContentEditableWarning={true}
                                            className="spreadsheet-cell"
                                            style={{
                                                padding: '0.5rem 0.75rem', borderRight: '1px solid var(--border-color)',
                                                borderBottom: '1px solid var(--border-color)',
                                                fontSize: '0.8rem', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                minWidth: '100px', maxWidth: '300px'
                                            }}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Analytics Modal - CENRO Ranking removed; now lives in Supervise Modal */}
            {false && (
                <div>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ border: '1px solid #f59e0b', boxShadow: '0 25px 50px rgba(0,0,0,0.7)', maxWidth: '860px' }}>
                        <div className="premium-modal-header" style={{ background: 'rgba(245,158,11,0.04)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-between">
                                <div className="flex-center gap-3">
                                    <Trophy size={28} color="#f59e0b" />
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>CENRO PRODUCTION RANKING</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>All Months Combined · Target: 15,000 seedlings by June</p>
                                    </div>
                                </div>
                                <button className="btn-glass" onClick={() => { setShowCenroRanking(false); setSelectedCenroBreakdown(null); }} style={{ padding: '0.5rem' }}><X size={20} /></button>
                            </div>
                        </div>

                        <div className="premium-modal-body" style={{ padding: '2rem', minHeight: '300px', position: 'relative' }}>
                            {cenroRankLoading ? (
                                <div className="flex-center" style={{ height: '250px', flexDirection: 'column', gap: '1rem' }}>
                                    <RefreshCcw size={32} className="animate-spin" color="#f59e0b" />
                                    <span style={{ color: '#888', fontSize: '0.85rem', fontWeight: 600 }}>Loading CENRO data across all months...</span>
                                </div>
                            ) : selectedCenroBreakdown ? (
                                /* Monthly Breakdown View */
                                <div>
                                    <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                        <div className="flex-center gap-3">
                                            <button onClick={() => setSelectedCenroBreakdown(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '0.5rem 0.75rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                                <ArrowLeft size={16} /> Back
                                            </button>
                                            <div>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{selectedCenroBreakdown.cenro}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Monthly Production Breakdown</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{selectedCenroBreakdown.total.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '0.2rem' }}>Total Produced</div>
                                        </div>
                                    </div>
                                    {(() => {
                                        const TARGET = 15000;
                                        const visibleMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                                        const maxVal = Math.max(...visibleMonths.map(m => selectedCenroBreakdown.byMonth[m] || 0), 500);
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                {visibleMonths.map(month => {
                                                    const val = selectedCenroBreakdown.byMonth[month] || 0;
                                                    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                                    const isJune = month === 'June';
                                                    return (
                                                        <div key={month} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '88px', fontSize: '0.72rem', color: isJune ? '#10b981' : 'rgba(255,255,255,0.45)', fontWeight: isJune ? 900 : 600, textAlign: 'right', flexShrink: 0 }}>{month}</div>
                                                            <div style={{ flex: 1, height: '30px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${pct}%`, background: isJune ? 'linear-gradient(90deg,#059669,#10b981)' : 'linear-gradient(90deg,#1d4ed8,#3b82f6)', borderRadius: '8px', transition: 'width 0.7s ease', display: 'flex', alignItems: 'center', paddingLeft: '0.6rem', minWidth: val > 0 ? '32px' : '0' }}>
                                                                    {val > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{val.toLocaleString()}</span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ width: '55px', fontSize: '0.78rem', fontWeight: 800, color: val > 0 ? '#10b981' : 'rgba(255,255,255,0.15)', textAlign: 'right', flexShrink: 0 }}>{val > 0 ? val.toLocaleString() : '—'}</div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'rgba(16,185,129,0.06)', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                    <div className="flex-between" style={{ marginBottom: '0.6rem' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Progress to 15,000 June Target</span>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: selectedCenroBreakdown.total >= TARGET ? '#10b981' : '#f59e0b' }}>{Math.round((selectedCenroBreakdown.total / TARGET) * 100)}%</span>
                                                    </div>
                                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.min((selectedCenroBreakdown.total / TARGET) * 100, 100)}%`, background: selectedCenroBreakdown.total >= TARGET ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: '10px', transition: 'width 0.8s ease' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
                                                        <span>0</span><span style={{ color: '#10b981' }}>Target: 15,000</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                /* Main Ranking View */
                                <div>
                                    {(() => {
                                        const grandTotal = cenroRankData.reduce((s, c) => s + c.total, 0);
                                        const grandTarget = 15000 * (cenroRankData.length || 1);
                                        const grandPct = Math.min((grandTotal / grandTarget) * 100, 100);
                                        return (
                                            <div style={{ marginBottom: '1.75rem', padding: '1.1rem 1.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.12)' }}>
                                                <div className="flex-between" style={{ marginBottom: '0.6rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>System-Wide Total Production</div>
                                                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>{grandTotal.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>/ {grandTarget.toLocaleString()} combined target</span></div>
                                                    </div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{Math.round(grandPct)}%</div>
                                                </div>
                                                <div style={{ height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${grandPct}%`, background: 'linear-gradient(90deg,#059669,#34d399)', borderRadius: '10px', transition: 'width 1s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {cenroRankData.length === 0 ? (
                                        <div className="flex-center" style={{ height: '150px', opacity: 0.3, flexDirection: 'column', gap: '0.5rem' }}>
                                            <BarChart2 size={32} />
                                            <span style={{ fontSize: '0.85rem' }}>No production data available</span>
                                        </div>
                                    ) : (() => {
                                        const TARGET = 15000;
                                        const maxVal = Math.max(...cenroRankData.map(c => c.total), TARGET);
                                        const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                                {/* Target line legend */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '160px', marginBottom: '0.25rem' }}>
                                                    <div style={{ width: '14px', height: '2px', background: '#ef4444', borderRadius: '2px' }} />
                                                    <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800 }}>TARGET: 15,000</span>
                                                </div>
                                                {cenroRankData.map((cenro, idx) => {
                                                    const pct = maxVal > 0 ? (cenro.total / maxVal) * 100 : 0;
                                                    const targetPct = (TARGET / maxVal) * 100;
                                                    const reached = cenro.total >= TARGET;
                                                    const rankColor = RANK_COLORS[idx] || 'rgba(255,255,255,0.15)';
                                                    return (
                                                        <div
                                                            key={cenro.cenro}
                                                            onClick={() => setSelectedCenroBreakdown(cenro)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: '12px', transition: 'background 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: idx < 3 ? rankColor : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900, color: idx < 3 ? '#000' : '#666', flexShrink: 0 }}>#{idx+1}</div>
                                                            <div style={{ width: '110px', fontSize: '0.78rem', fontWeight: 700, color: '#fff', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cenro.cenro}</div>
                                                            <div style={{ flex: 1, height: '34px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                                                <div style={{ height: '100%', width: `${pct}%`, background: reached ? 'linear-gradient(90deg,#059669,#34d399)' : `linear-gradient(90deg,${rankColor}66,${rankColor})`, borderRadius: '10px', transition: 'width 0.8s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.6rem' }}>
                                                                    {pct > 18 && <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{cenro.total.toLocaleString()}</span>}
                                                                </div>
                                                                <div style={{ position: 'absolute', left: `${targetPct}%`, top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.5)', pointerEvents: 'none' }} />
                                                            </div>
                                                            <div style={{ width: '64px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 900, color: reached ? '#10b981' : '#f59e0b', flexShrink: 0 }}>{cenro.total > 0 ? cenro.total.toLocaleString() : '—'}</div>
                                                            <div style={{ width: '52px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: reached ? '#10b981' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{reached ? '✓ MET' : `${Math.round((cenro.total/TARGET)*100)}%`}</div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontWeight: 600 }}>Click any row to see monthly breakdown</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {isAnalyticsOpen && (
                <div className="modal-overlay" onClick={() => { setIsAnalyticsOpen(false); setSelectedCategoryLabel(null); }}>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ border: '1px solid var(--denr-green-light)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>
                        <div className="premium-modal-header" style={{ background: 'rgba(5, 150, 105, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-between">
                                <div className="flex-center gap-3">
                                    <PieChartIcon size={28} color="var(--denr-green-light)" />
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>NURSERY ANALYTICS</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.1em' }}>Data Tracker Visualization</p>
                                    </div>
                                </div>
                                <div className="flex-center gap-4">
                                    <div className="flex-center" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {[
                                            { k: 'beginning', l: 'Beginning' },
                                            { k: 'produced', l: 'Produced' },
                                            { k: 'distributed', l: 'Distributed' },
                                            { k: 'stock', l: 'Stock' },
                                            { k: 'mortality', l: 'Mortality' }
                                        ].map(m => (
                                            <button
                                                key={m.k}
                                                onClick={() => setAnalyticsMetric(m.k)}
                                                className={`btn-glass ${analyticsMetric === m.k ? 'active' : ''}`}
                                                style={{
                                                    padding: '0.55rem 1.25rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                    background: analyticsMetric === m.k ? 'var(--denr-green-light)' : 'transparent',
                                                    color: analyticsMetric === m.k ? '#000' : 'rgba(255,255,255,0.4)',
                                                    border: 'none',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                {m.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2.5rem', position: 'relative' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <NurseryPieChart
                                    data={aggregatedStats.categoryData[analyticsMetric] || []}
                                    metricLabel={analyticsMetric.toUpperCase()}
                                    onSelectCategory={(cat) => setSelectedCategoryLabel(cat.name)}
                                />
                            </div>

                            {selectedCategoryLabel && (
                                <div style={{ 
                                    position: 'absolute', inset: 0, background: '#020617', zIndex: 10, borderRadius: '32px', 
                                    display: 'flex', flexDirection: 'column', animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                                    padding: '2.5rem'
                                }}>
                                    <div className="flex-between mb-20">
                                        <div className="flex-center gap-4">
                                            <button 
                                                onClick={() => setSelectedCategoryLabel(null)} 
                                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', padding: '0.6rem', color: '#fff', cursor: 'pointer' }}
                                            >
                                                <ArrowLeft size={20} />
                                            </button>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 950, color: '#fff' }}>{selectedCategoryLabel}</h3>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--denr-green-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Species Distribution Tracker</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '2.2rem', fontWeight: 950, color: 'var(--denr-green-light)', lineHeight: 1 }}>
                                                {(aggregatedStats.categoryData[analyticsMetric]?.find(c => c.name === selectedCategoryLabel)?.value || 0).toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.4rem' }}>TOTAL CONSOLIDATED UNITS</div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                                        {(() => {
                                            const rows = aggregatedStats.detailedRows[analyticsMetric]?.[selectedCategoryLabel] || [];
                                            if (rows.length === 0) return <div className="flex-center" style={{ height: '200px', opacity: 0.2 }}>No detailed tracking data available for this category</div>;

                                            return (
                                                <div className="surface-glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>Species (Common Name)</th>
                                                                <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>CENRO Origin</th>
                                                                {analyticsMetric === 'beginning' && <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>Site Location</th>}
                                                                {analyticsMetric === 'produced' && <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>Tracking Month</th>}
                                                                <th style={{ textAlign: 'right', padding: '1.25rem 1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 900 }}>Unit Count</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {rows.map((r, i) => (
                                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                                    <td style={{ padding: '1.1rem 1.5rem', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{r.species}</td>
                                                                    <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', fontWeight: 600 }}>{r.cenro}</td>
                                                                    {analyticsMetric === 'beginning' && <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>{r.loc || '---'}</td>}
                                                                    {analyticsMetric === 'produced' && <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{r.month || '---'}</td>}
                                                                    <td style={{ padding: '1.1rem 1.5rem', color: 'var(--denr-green-light)', fontWeight: 950, textAlign: 'right', fontSize: '1.1rem' }}>{r.value.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Tab Modal */}
            {showAddTab && (
                <div className="modal-overlay" onClick={() => setShowAddTab(false)}>
                    <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', padding: '2.5rem', border: '1px solid var(--denr-green-light)', boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)' }}>
                        <h4 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                            <PlusCircle size={20} color="var(--denr-green-light)" />
                            NEW NURSERY SHEET
                        </h4>
                        <input
                            type="text"
                            className="input-modern"
                            placeholder="Sheet Name (e.g. Quezon 2)..."
                            value={newSheetName}
                            onChange={(e) => setNewSheetName(e.target.value.toUpperCase())}
                            style={{ width: '100%', marginBottom: '1.5rem', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}
                            autoFocus
                        />
                        <div className="flex-center gap-3">
                            <button className="btn btn-glass" style={{ flex: 1, color: 'var(--text-primary)' }} onClick={() => setShowAddTab(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--denr-green-light)' }} onClick={async () => {
                                if (!newSheetName.trim()) return;
                                if (sheets.includes(newSheetName.trim())) {
                                    alert("Sheet name already exists!");
                                    return;
                                }
                                const updatedSheets = [...sheets, newSheetName.trim()];
                                setSheets(updatedSheets);
                                setActiveSheet(newSheetName.trim());
                                setShowAddTab(false);
                                setNewSheetName('');
                            }}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', height: '80vh' }}>
                        <div className="premium-modal-header">
                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                <Settings size={22} color="var(--denr-green-light)" />
                                NURSERY SETTINGS
                            </h4>
                        </div>
                        <div className="premium-modal-body">
                            <section>
                                <label className="text-xs font-bold" style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>ACTIVE SHEETS MANAGEMENT</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {sheets.map(s => (
                                        <div key={s} style={{ padding: '0.5rem 1rem', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{s}</span>
                                            <Trash2 size={12} className="hover-red" color="#ff4d4f" style={{ cursor: 'pointer' }} onClick={async () => {
                                                if (window.confirm(`Delete ALL data for ${s}? This cannot be undone.`)) {
                                                    const updated = sheets.filter(x => x !== s);
                                                    setSheets(updated);
                                                    if (activeSheet === s) setActiveSheet(updated[0] || null);
                                                }
                                            }} />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="text-xs font-bold" style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>TARGET MANAGEMENT (Available Stock)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {sheets.map(s => (
                                        <div key={s} className="flex-between" style={{ background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{s}</span>
                                            <input
                                                type="number"
                                                className="input-modern"
                                                style={{ width: '80px', padding: '0.2rem 0.5rem', textAlign: 'right', background: 'var(--bg-active)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                                value={targets[s] || 0}
                                                onChange={async (e) => {
                                                    const newTargets = { ...targets, [s]: parseInt(e.target.value) || 0 };
                                                    setTargets(newTargets);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="text-xs font-bold" style={{ display: 'block', marginBottom: '1rem', color: 'var(--text-tertiary)' }}>ADD MONTH / PERIOD BLOCK</label>
                                <div className="flex-center gap-3">
                                    <input
                                        type="text"
                                        className="input-modern"
                                        placeholder="Month Name..."
                                        value={newMonthName}
                                        onChange={(e) => setNewMonthName(e.target.value.toUpperCase())}
                                        style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}
                                    />
                                    <button className="btn btn-primary" style={{ background: 'var(--denr-green-light)' }} onClick={async () => {
                                        if (!newMonthName.trim() || !activeSheet) return;
                                        const newData = [...sheetData[activeSheet]];
                                        newData.push([newMonthName.trim()]);
                                        for (let i = 0; i < 5; i++) newData.push(Array(getFlatHeaderCount()).fill(""));

                                        setSheetData(prev => ({ ...prev, [activeSheet]: newData }));
                                        saveToFirestore(activeSheet, newData);
                                        setNewMonthName('');
                                    }}>Add Block</button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste Warning Modal */}
            {pasteWarning && (
                <div className="modal-overlay" onClick={() => setPasteWarning(null)}>
                    <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', background: 'rgba(15, 23, 42, 0.85)', padding: '2.5rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.75rem 0' }}>Paste Failed</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                            You are trying to paste <strong style={{ color: '#fff' }}>{pasteWarning.needed}</strong> rows, but there are only <strong style={{ color: '#ef4444' }}>{pasteWarning.available}</strong> empty rows left in this period block.
                        </p>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '16px', textAlign: 'left', marginBottom: '1.5rem', width: '100%', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--denr-green-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How to fix:</div>
                            <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                <li>Click <strong style={{ color: '#fff' }}>OK</strong> to close this message.</li>
                                <li>Click the <strong style={{ color: 'var(--denr-green-light)' }}>[+ ADD ROW]</strong> button to insert more empty space.</li>
                                <li>Paste your data again.</li>
                            </ol>
                        </div>
                        <button
                            className="btn w-100 hover-glow"
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                            onClick={() => setPasteWarning(null)}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Formula Info Modal */}
            {formulaInfo && (
                <div className="modal-overlay" onClick={() => setFormulaInfo(null)}>
                    <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', background: 'rgba(15, 23, 42, 0.85)', padding: '2.5rem', border: `1px solid ${formulaInfo.color}40`, boxShadow: `0 25px 50px rgba(0,0,0,0.5), 0 0 40px ${formulaInfo.color}15` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ background: `${formulaInfo.color}15`, width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: formulaInfo.color, border: `1px solid ${formulaInfo.color}30` }}>
                                <formulaInfo.icon size={36} strokeWidth={2} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{formulaInfo.label}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 2rem 0' }}>Metric Computation Details</p>

                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '16px', width: '100%', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: formulaInfo.color, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mathematical Formula</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    {formulaInfo.formula}
                                </div>
                                <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'left' }}>
                                    {formulaInfo.label === 'Produced' && "Calculates the sum of your initial backlog stock and the newly propagated seedlings for the given period. Automatically disregards strings/text."}
                                    {formulaInfo.label === 'Stock' && "Determines the exact inventory remaining by taking your total production and explicitly deducting everything that has already been disposed or planted."}
                                    {formulaInfo.label === 'Distributed' && "Aggregates all seedlings that have successfully left the nursery facility for distribution or turnover."}
                                    {formulaInfo.label === 'Mortality' && "Tracks the total quantity of seedlings that did not survive propagation, extracted directly from reported mortality fields."}
                                </div>
                            </div>

                            <button
                                className="btn w-100 hover-glow"
                                style={{ background: formulaInfo.color, color: '#fff', border: 'none', padding: '1rem', borderRadius: '16px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                onClick={() => setFormulaInfo(null)}
                            >
                                UNDERSTOOD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForestNursery;

