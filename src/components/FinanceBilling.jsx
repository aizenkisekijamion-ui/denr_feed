import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Search, ChevronDown, ChevronRight, ChevronLeft, Download, Printer, 
    Edit3, Save, PlusCircle, Trash2, X, CheckCircle, RefreshCcw,
    Layers, DollarSign, Target, Activity, ShieldCheck, AlertCircle, Plus, Calendar, Sparkles,
    CheckCircle2, Globe, FileText
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query } from 'firebase/firestore';

const BILLING_GROUPS = [
    { label: "1ST BILLING", color: "#fca5a5", bg: "rgba(252, 165, 165, 0.15)" },
    { label: "2ND BILLING", color: "#7dd3fc", bg: "rgba(125, 211, 252, 0.15)" },
    { label: "3RD BILLING", color: "#86efac", bg: "rgba(134, 239, 172, 0.15)" },
    { label: "4TH BILLING", color: "#fde047", bg: "rgba(253, 224, 71, 0.15)" }
];

const CENROS = ["BROOKE'S POINT", "CORON", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"];

const FINANCE_DIVISIONS = [
    "ALL MAINTENANCE PERIODS",
    "2nd Year Maintenance and Protection of CY 2025",
    "3rd Year Maintenance and Protection of CY 2024",
    "3rd Year Maintenance and Protection of CY 2024 - Congressional"
];

const getCenroMatch = (name) => {
    if (!name) return "";
    const norm = name.replace("CENRO ", "").trim().toUpperCase();
    if (norm.includes("BROOKE") && norm.includes("POINT")) return "BROOKE'S POINT";
    if (norm === "PPC" || norm.includes("PUERTO") || norm.includes("PRINCESA")) return "PUERTO PRINCESA";
    return norm;
};

const FinanceBilling = ({ initialDivision, initialCenro, initialMetric }) => {
    const [activeDivision, setActiveDivision] = useState(initialDivision || FINANCE_DIVISIONS[0]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState(initialCenro || '');
    const [expandedCenros, setExpandedCenros] = useState(new Set(CENROS));
    const [cenroData, setCenroData] = useState({}); // Division -> { cenro: beneficiaries[] }
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [breakdownMetric, setBreakdownMetric] = useState(null);
    const [pasteWarning, setPasteWarning] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { div, cenro, idx }

    const [activeCenroFilter, setActiveCenroFilter] = useState(initialCenro || null);
    const [selectedCenroForBreakdown, setSelectedCenroForBreakdown] = useState(null);

    useEffect(() => {
        if (initialMetric) {
            setBreakdownMetric(initialMetric);
        }
    }, [initialMetric]);

    const allDivisions = useMemo(() => {
        const dbDivs = Object.keys(cenroData);
        const combined = Array.from(new Set([...FINANCE_DIVISIONS, ...dbDivs]));
        return combined.filter(d => d);
    }, [cenroData]);

    // Firebase Sync
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'finance_billing_divisions'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = {};
            snapshot.docs.forEach(doc => {
                const rawCenros = doc.data().cenros || {};
                const normalized = {};
                // Normalize keys to standard CENRO names to ensure visibility
                Object.entries(rawCenros).forEach(([key, list]) => {
                    const match = getCenroMatch(key);
                    if (!normalized[match]) normalized[match] = [];
                    normalized[match] = [...normalized[match], ...list];
                });
                data[doc.id] = normalized;
            });
            // Ensure all expected keys exist even if empty
            FINANCE_DIVISIONS.forEach(div => {
                if (!data[div]) data[div] = {};
                CENROS.forEach(c => {
                    if (!data[div][c]) data[div][c] = [];
                });
            });
            setCenroData(data);
            setLoading(false);
        }, (err) => {
            console.error("Finance Sync Error:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatValue = (val, isCurrency = true) => {
        if (val === undefined || val === null || val === '') return "";
        if (val === 0) return isCurrency ? "0.00" : "0";
        if (!isCurrency) return val;
        const num = parseFloat(val.toString().replace(/,/g, ''));
        if (isNaN(num)) return val;
        return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    };

    const stats = useMemo(() => {
        const totals = { area: 0, contract: 0, obligated: 0, disbursed: 0, balance: 0 };
        const breakdown = { 
            area: {}, contract: {}, obligated: {}, disbursed: {}, balance: {} 
        };
        const billingBreakdown = {
            disbursed: {}, // cenro -> { mobi: 0, billing1: 0, ... }
            balance: {}    // cenro -> { mobi: 0, billing1: 0, ... }
        };

        CENROS.forEach(c => {
            breakdown.area[c] = 0;
            breakdown.contract[c] = 0;
            breakdown.obligated[c] = 0;
            breakdown.disbursed[c] = 0;
            breakdown.balance[c] = 0;
            
            billingBreakdown.disbursed[c] = { mobi: 0, billing1: 0, billing2: 0, billing3: 0 };
            billingBreakdown.balance[c] = { mobi: 0, billing1: 0, billing2: 0, billing3: 0 };
        });

        const targetDivisions = activeDivision === "ALL MAINTENANCE PERIODS" 
            ? FINANCE_DIVISIONS.filter(d => d !== "ALL MAINTENANCE PERIODS") 
            : [activeDivision];

        targetDivisions.forEach(div => {
            const cenros = cenroData[div] || {};
            CENROS.forEach(c => {
                let list = cenros[c] || [];

                list.forEach(po => {
                    const clean = (val) => parseFloat(val?.toString().replace(/,/g, '')) || 0;
                    const a = parseFloat(po.area) || 0;
                    const cc = clean(po.contractCost);
                    const ob = clean(po.obligatedAmount);
                    
                    // Sum lessRf across all billings (mobi + billing1-3)
                    const dis = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.lessRf), 0);
                    // Sum net across all billings (mobi + billing1-3)
                    const bal = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.net), 0);

                    totals.area += a;
                    totals.contract += cc;
                    totals.obligated += ob;
                    totals.disbursed += dis;
                    totals.balance += bal;

                    breakdown.area[c] += a;
                    breakdown.contract[c] += cc;
                    breakdown.obligated[c] += ob;
                    breakdown.disbursed[c] += dis;
                    breakdown.balance[c] += bal;

                    // Billing level aggregation
                    ['mobi', 'billing1', 'billing2', 'billing3'].forEach(g => {
                        billingBreakdown.disbursed[c][g] += clean(po[g]?.lessRf);
                        billingBreakdown.balance[c][g] += clean(po[g]?.net);
                    });
                });
            });
        });
        return { totals, breakdown, billingBreakdown };
    }, [cenroData, activeDivision]);

    const saveToFirebase = async (div, updatedCenros) => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'finance_billing_divisions', div), {
                cenros: updatedCenros,
                lastUpdated: Date.now()
            }, { merge: true });
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err) { console.error(err); }
        finally { setIsSaving(false); }
    };

    const handleCellBlur = async (div, cenro, poIdx, field, subField, newValue) => {
        if (!isEditMode) return;
        const updatedCenros = { ...cenroData[div] };
        const currentPos = [...(updatedCenros[cenro] || [])];
        const po = { ...currentPos[poIdx] };
        
        if (subField) {
            if (!po[field]) po[field] = {};
            po[field][subField] = newValue.trim();
        } else {
            po[field] = newValue.trim();
        }

        currentPos[poIdx] = po;
        updatedCenros[cenro] = currentPos;
        setCenroData(prev => ({ ...prev, [div]: updatedCenros }));
        saveToFirebase(div, updatedCenros);
    };

    const handlePaste = async (e, div, cenro, startPoIdx, startField, startSubField) => {
        if (!isEditMode) return;
        const clipboardText = (e.clipboardData || window.clipboardData).getData('text');
        if (!clipboardText || (!clipboardText.includes('\t') && !clipboardText.includes('\n'))) return;
        
        e.preventDefault();
        const rows = clipboardText.split(/\r?\n/).map(row => row.split('\t'));
        while (rows.length > 0 && rows[rows.length - 1].every(cell => !cell || cell.trim() === '')) { rows.pop(); }
        if (rows.length === 0) return;

        const updatedCenros = { ...cenroData[div] };
        const currentData = [...(updatedCenros[cenro] || [])];
        
        const availableSpace = currentData.length - startPoIdx;
        if (rows.length > availableSpace) {
            setPasteWarning({ needed: rows.length, available: availableSpace, div, cenro });
            return;
        }

        const fields = [
            'name', 'area', 'landbank', 'location', 'orsNumber', 'orsDate', 
            'contractCost', 'obligatedAmount', 'totalDisbursement', 'retentionFee', 'balance', 'difference',
            'mobi.number', 'mobi.date', 'mobi.sr', 'mobi.gross', 'mobi.rf', 'mobi.lessRf', 'mobi.bir', 'mobi.net',
            'billing1.number', 'billing1.date', 'billing1.sr', 'billing1.gross', 'billing1.rf', 'billing1.lessRf', 'billing1.bir', 'billing1.net',
            'billing2.number', 'billing2.date', 'billing2.sr', 'billing2.gross', 'billing2.rf', 'billing2.lessRf', 'billing2.bir', 'billing2.net',
            'billing3.number', 'billing3.date', 'billing3.sr', 'billing3.gross', 'billing3.rf', 'billing3.lessRf', 'billing3.bir', 'billing3.net'
        ];

        const fullField = startSubField ? `${startField}.${startSubField}` : startField;
        const startColIdx = fields.indexOf(fullField);
        if (startColIdx === -1) return;

        rows.forEach((row, rOffset) => {
            const targetPoIdx = startPoIdx + rOffset;
            const po = { ...currentData[targetPoIdx] };
            row.forEach((value, cOffset) => {
                const targetColIdx = startColIdx + cOffset;
                if (targetColIdx >= fields.length) return;
                const fieldPath = fields[targetColIdx];
                if (fieldPath.includes('.')) {
                    const [f, s] = fieldPath.split('.');
                    if (!po[f]) po[f] = {};
                    po[f][s] = value.trim();
                } else { po[fieldPath] = value.trim(); }
            });
            currentData[targetPoIdx] = po;
        });

        updatedCenros[cenro] = currentData;
        setCenroData(prev => ({ ...prev, [div]: updatedCenros }));
        saveToFirebase(div, updatedCenros);
    };

    const addBeneficiary = async (div, cenro) => {
        const updatedCenros = { ...cenroData[div] };
        const currentPos = [...(updatedCenros[cenro] || [])];
        const newPo = { 
            no: currentPos.length + 1, 
            name: "New Partner Organization", 
            area: "", landbank: "", location: "", orsNumber: "", orsDate: "",
            contractCost: "", obligatedAmount: "", totalDisbursement: "", retentionFee: "", balance: "", difference: "",
            mobi: {}, billing1: {}, billing2: {}, billing3: {} 
        };
        const newData = [...currentPos, newPo];
        newData.forEach((item, i) => item.no = i + 1);
        updatedCenros[cenro] = newData;
        saveToFirebase(div, updatedCenros);
    };

    const deleteBeneficiary = async (div, cenro, idx) => {
        const updatedCenros = { ...cenroData[div] };
        const newData = (updatedCenros[cenro] || []).filter((_, i) => i !== idx);
        newData.forEach((item, i) => item.no = i + 1);
        updatedCenros[cenro] = newData;
        saveToFirebase(div, updatedCenros);
        setDeleteConfirm(null);
    };

    const handleExportProfessionalCSV = () => {
        const rows = [];
        // Header Rows
        const h1 = ["", "", "", "PARTNER ORGANIZATION & CONTRACT DETAILS", "", "", "", "", "", "", "", "", "", "", "1ST BILLING", "", "", "", "", "", "", "", "2ND BILLING", "", "", "", "", "", "", "", "3RD BILLING", "", "", "", "", "", "", "", "4TH BILLING"];
        const h2 = ["No.", "Partner Organization", "Area", "Landbank", "Location", "ORS Number", "ORS Date", "Contract", "Obligated", "Disbursed", "Retention", "Balance", "Difference"];
        for(let i=0; i<4; i++) h2.push("Number", "Date", "SR", "Gross", "RF", "Less RF", "BIR", "Net");
        
        rows.push(h1.join(','));
        rows.push(h2.join(','));

        const targetDivs = activeDivision === "ALL MAINTENANCE PERIODS" 
            ? FINANCE_DIVISIONS.filter(d => d !== "ALL MAINTENANCE PERIODS") 
            : [activeDivision];

        targetDivs.forEach(div => {
            rows.push(`,,,${div.toUpperCase()}`);
            CENROS.forEach(cenro => {
                const list = cenroData[div]?.[cenro] || [];
                if (list.length > 0) {
                    rows.push(`,,,--- ${cenro} ---`);
                    list.forEach(po => {
                        const row = [
                            po.no, 
                            `"${po.name || ''}"`, 
                            po.area || 0, 
                            `"${po.landbank || ''}"`, 
                            `"${po.location || ''}"`, 
                            `"${po.orsNumber || ''}"`, 
                            po.orsDate || '',
                            po.contractCost || 0,
                            po.obligatedAmount || 0,
                            po.totalDisbursement || 0,
                            po.retentionFee || 0,
                            po.balance || 0,
                            po.difference || 0
                        ];
                        ['mobi', 'billing1', 'billing2', 'billing3'].forEach(g => {
                            const b = po[g] || {};
                            row.push(b.number || '', b.date || '', b.sr || '', b.gross || 0, b.rf || 0, b.lessRf || 0, b.bir || 0, b.net || 0);
                        });
                        rows.push(row.join(','));
                    });
                }
            });
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `FINANCIAL_PORTAL_EXPORT_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const toggleCenro = (name) => {
        const newSet = new Set(expandedCenros);
        if (newSet.has(name)) newSet.delete(name);
        else newSet.add(name);
        setExpandedCenros(newSet);
    };

    const cellStyle = (isHeader = false) => ({
        borderRight: '1px solid #334155',
        borderBottom: '1px solid #334155',
        padding: '0.4rem',
        minHeight: '28px',
        background: isHeader ? '#1e293b' : 'transparent',
        color: isHeader ? '#94a3b8' : '#fff',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        outline: 'none'
    });

    return (
        <div className="finance-billing-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#020617' }}>
            {/* Clean Premium Header (No Logo) */}
            <div style={{ padding: '1.25rem 2rem 1.5rem 2rem', background: 'linear-gradient(to bottom, #0f172a, #020617)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex-between mb-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>Financial Portal</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Calendar size={12} color="#64748b" />
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Consolidated Division Summary</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div style={{ opacity: (isSaving || syncSuccess) ? 1 : 0, transition: 'opacity 0.3s', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            {isSaving ? <RefreshCcw size={14} className="animate-spin" color="#10b981" /> : <CheckCircle size={14} color="#10b981" />}
                            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 900, letterSpacing: '1px' }}>{isSaving ? "SAVING..." : "LIVE SYNC"}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button 
                                onClick={handleExportProfessionalCSV} 
                                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(59, 130, 246, 0.15)', border: 'none', color: '#60a5fa', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                className="export-hover-effect"
                            >
                                <Download size={16} /> DOWNLOAD CSV
                            </button>
                            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.05)', margin: '0 4px' }} />
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)} 
                                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.6rem', background: isEditMode ? 'rgba(16, 185, 129, 0.2)' : 'transparent', border: 'none', color: isEditMode ? '#10b981' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {isEditMode ? <Save size={16} /> : <Edit3 size={16} />} {isEditMode ? 'FINISH' : 'EDIT MODE'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Stat Card Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem' }}>
                    {[
                        { label: "Total Area Tracked", value: stats.totals.area.toFixed(2) + " Ha", icon: Layers, key: 'area', color: '#3b82f6', sub: 'Total Hectares' },
                        { label: "Contract Cost", value: "₱" + formatValue(stats.totals.contract), icon: DollarSign, key: 'contract', color: '#10b981', sub: 'Budget Allocation' },
                        { label: "Amount Obligated", value: "₱" + formatValue(stats.totals.obligated), icon: Target, key: 'obligated', color: '#f59e0b', sub: 'Verified Progress' },
                        { label: "DISBURSED", value: "₱" + formatValue(stats.totals.disbursed), icon: CheckCircle2, key: 'disbursed', color: '#8b5cf6', sub: 'Total Less RF' },
                        { label: "NET", value: "₱" + formatValue(stats.totals.balance), icon: Activity, key: 'balance', color: '#ec4899', sub: 'Net Payment' }
                    ].map((s, i) => (
                        <div 
                            key={i} 
                            onClick={() => !s.key.startsWith('p') && setBreakdownMetric({ label: s.label, key: s.key })} 
                            style={{ 
                                background: `linear-gradient(135deg, ${s.color}11 0%, rgba(255,255,255,0.02) 100%)`, 
                                padding: '1.5rem', 
                                borderRadius: '24px', 
                                border: `1px solid ${s.color}33`, 
                                cursor: s.key.startsWith('p') ? 'default' : 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }} 
                            className="stat-card-premium"
                        >
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: `${s.color}08`, borderRadius: '50%', filter: 'blur(15px)' }} />
                            <div className="flex-between mb-3">
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <s.icon size={18} color={s.color} />
                                </div>
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: s.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{s.sub}</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }}>{s.value}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.5rem' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Division & Search Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                    <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase' }}>Maintenance Period:</span>
                    <select 
                        value={activeDivision}
                        onChange={(e) => setActiveDivision(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', outline: 'none' }}
                    >
                        {allDivisions.map(div => <option key={div} value={div} style={{ background: '#0f172a' }}>{div}</option>)}
                    </select>
                </div>

                <div style={{ flex: 1 }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" placeholder="Search PO Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '220px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 1rem 0.4rem 2.2rem', borderRadius: '8px', color: '#fff', fontSize: '0.75rem' }}
                        />
                    </div>
                    {activeCenroFilter && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase' }}>Filtered: {activeCenroFilter}</span>
                            <button onClick={() => setActiveCenroFilter(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={14} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Maximized Table Content */}
            <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', background: '#020617' }}>
                <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.75rem', border: '1px solid #334155' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: '#020617' }}>
                            <th colSpan={isEditMode ? 14 : 13} style={{ ...cellStyle(true), borderBottom: '2px solid #475569', color: '#fff' }}>PARTNER ORGANIZATION & CONTRACT DETAILS</th>
                            {BILLING_GROUPS.map((g, i) => <th key={i} colSpan={8} style={{ ...cellStyle(true), background: g.bg, color: g.color, fontWeight: 900, borderBottom: `3px solid ${g.color}` }}>{g.label}</th>)}
                        </tr>
                        <tr style={{ background: '#0f172a' }}>
                            {isEditMode && <th style={{ ...cellStyle(true), width: '40px' }}></th>}
                            <th style={{ ...cellStyle(true), width: '40px' }}>No.</th>
                            <th style={{ ...cellStyle(true), width: '300px', textAlign: 'left' }}>Partner Organization (PO)</th>
                            <th style={{ ...cellStyle(true), width: '60px' }}>Area</th>
                            <th style={{ ...cellStyle(true), width: '150px' }}>Landbank</th>
                            <th style={{ ...cellStyle(true), width: '150px' }}>Location</th>
                            <th colSpan={2} style={cellStyle(true)}>ORS Details</th>
                            <th style={{ ...cellStyle(true), width: '100px' }}>Contract</th>
                            <th style={{ ...cellStyle(true), width: '100px' }}>Obligated</th>
                            <th style={{ ...cellStyle(true), width: '100px' }}>Disbursed</th>
                            <th style={{ ...cellStyle(true), width: '100px' }}>Retention</th>
                            <th style={{ ...cellStyle(true), width: '100px' }}>Balance</th>
                            <th style={{ ...cellStyle(true), width: '100px', borderRight: '2px solid #475569' }}>Diff</th>
                            {BILLING_GROUPS.map((_, i) => (
                                <React.Fragment key={i}>
                                    <th colSpan={2} style={cellStyle(true)}>LDDAP/CHECK</th>
                                    <th style={cellStyle(true)}>SR</th>
                                    <th colSpan={5} style={cellStyle(true)}>AMOUNT</th>
                                </React.Fragment>
                            ))}
                        </tr>
                        <tr style={{ background: '#0f172a' }}>
                            <th colSpan={isEditMode ? 6 : 5} style={cellStyle(true)}></th>
                            <th style={{ ...cellStyle(true), width: '90px' }}>Number</th>
                            <th style={{ ...cellStyle(true), width: '80px' }}>Date</th>
                            <th colSpan={6} style={{ ...cellStyle(true), borderRight: '2px solid #475569' }}></th>
                            {BILLING_GROUPS.map((_, i) => (
                                <React.Fragment key={i}>
                                    <th style={{ ...cellStyle(true), width: '90px' }}>Number</th>
                                    <th style={{ ...cellStyle(true), width: '80px' }}>Date</th>
                                    <th style={{ ...cellStyle(true), width: '60px' }}>SR</th>
                                    <th style={{ ...cellStyle(true), width: '90px' }}>Gross</th>
                                    <th style={{ ...cellStyle(true), width: '80px' }}>RF</th>
                                    <th style={{ ...cellStyle(true), width: '90px' }}>Less RF</th>
                                    <th style={{ ...cellStyle(true), width: '80px' }}>BIR</th>
                                    <th style={{ ...cellStyle(true), width: '100px', borderRight: '2px solid #475569' }}>Net</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {CENROS.filter(c => !activeCenroFilter || c.includes(activeCenroFilter)).map((cenro, cIdx) => (
                            <React.Fragment key={cIdx}>
                                    {(activeDivision === "ALL MAINTENANCE PERIODS" || cenroData[activeDivision]) && (
                                        <tr style={{ background: 'rgba(251, 191, 36, 0.05)' }}>
                                            <td colSpan={isEditMode ? 3 : 2} style={{ ...cellStyle(), textAlign: 'left', padding: '0.6rem 1rem' }}>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => toggleCenro(cenro)} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: 0 }}>
                                                        {expandedCenros.has(cenro) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                    <span style={{ fontWeight: 900, color: '#fbbf24' }}>{cenro}</span>
                                                    {isEditMode && activeDivision !== "ALL MAINTENANCE PERIODS" && <button onClick={() => addBeneficiary(activeDivision, cenro)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 0 }}><PlusCircle size={20} /></button>}
                                                </div>
                                            </td>
                                            <td style={{ ...cellStyle(), color: '#fbbf24', fontWeight: 900 }}>{stats.breakdown.area[cenro].toFixed(2)}</td>
                                            <td colSpan={4} style={cellStyle()}></td>
                                            <td style={{ ...cellStyle(), textAlign: 'right', color: '#fbbf24', fontWeight: 900 }}>{formatValue(stats.breakdown.contract[cenro])}</td>
                                            <td style={{ ...cellStyle(), textAlign: 'right', color: '#10b981', fontWeight: 900 }}>{formatValue(stats.breakdown.obligated[cenro])}</td>
                                            <td style={{ ...cellStyle(), textAlign: 'right', color: '#fff', fontWeight: 900 }}>{formatValue(stats.breakdown.disbursed[cenro])}</td>
                                            <td style={cellStyle()}></td>
                                            <td style={{ ...cellStyle(), textAlign: 'right', color: '#fbbf24', fontWeight: 900, borderRight: '2px solid #475569' }}>{formatValue(stats.breakdown.balance[cenro])}</td>
                                            <td style={{ ...cellStyle(), borderRight: '2px solid #475569' }}></td>
                                            {BILLING_GROUPS.map((_, i) => <td key={i} colSpan={8} style={{ ...cellStyle(), borderRight: '2px solid #475569' }}></td>)}
                                        </tr>
                                    )}
                                    {expandedCenros.has(cenro) && (
                                        activeDivision === "ALL MAINTENANCE PERIODS" 
                                             ? allDivisions.filter(d => d !== "ALL MAINTENANCE PERIODS").flatMap(div => {
                                                 const cenros = cenroData[div] || {};
                                                 return (cenros[cenro] || []).map(po => ({ ...po, _div: div }));
                                             })
                                             : (cenroData[activeDivision]?.[cenro] || [])
                                    )
                                    .filter(po => po.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((po, poIdx) => (
                                        <tr key={`${po._div || ''}-${poIdx}`} className="excel-row">
                                            {isEditMode && <td style={cellStyle()}>{activeDivision !== "ALL MAINTENANCE PERIODS" && <button onClick={() => setDeleteConfirm({ div: activeDivision, cenro, idx: poIdx, name: po.name })} style={{ border: 'none', background: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}><Trash2 size={14} /></button>}</td>}
                                            <td style={{ ...cellStyle(), color: 'rgba(255,255,255,0.2)' }}>{po.no}</td>
                                            <td style={{ ...cellStyle(), textAlign: 'left', fontWeight: 600 }} contentEditable={isEditMode && activeDivision !== "ALL MAINTENANCE PERIODS"} suppressContentEditableWarning onBlur={(e) => handleCellBlur(activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, 'name', null, e.target.innerText)} onPaste={(e) => handlePaste(e, activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, 'name')}>{po.name}</td>
                                            {['area', 'landbank', 'location', 'orsNumber', 'orsDate', 'contractCost', 'obligatedAmount', 'totalDisbursement', 'retentionFee', 'balance', 'difference'].map((f, i) => (
                                                <td key={i} style={{ ...cellStyle(), textAlign: i >= 5 ? 'right' : 'center', borderRight: i === 10 ? '2px solid #475569' : cellStyle().borderRight }} contentEditable={isEditMode && activeDivision !== "ALL MAINTENANCE PERIODS"} suppressContentEditableWarning onBlur={(e) => handleCellBlur(activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, f, null, e.target.innerText)} onPaste={(e) => handlePaste(e, activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, f)}>
                                                    {formatValue(po[f], i >= 5)}
                                                </td>
                                            ))}
                                            {['mobi', 'billing1', 'billing2', 'billing3'].map((g, i) => (
                                                <React.Fragment key={i}>
                                                    {['number', 'date', 'sr', 'gross', 'rf', 'lessRf', 'bir', 'net'].map((s, j) => (
                                                        <td key={j} style={{ ...cellStyle(), textAlign: j >= 3 ? 'right' : 'center', borderRight: j === 7 ? '2px solid #475569' : cellStyle().borderRight, color: j === 7 ? '#10b981' : '#fff', fontWeight: j === 7 ? 900 : 400, background: j === 7 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }} contentEditable={isEditMode && activeDivision !== "ALL MAINTENANCE PERIODS"} suppressContentEditableWarning onBlur={(e) => handleCellBlur(activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, g, s, e.target.innerText)} onPaste={(e) => handlePaste(e, activeDivision === "ALL MAINTENANCE PERIODS" ? po._div : activeDivision, cenro, poIdx, g, s)}>
                                                            {formatValue(po[g]?.[s], j >= 3)}
                                                        </td>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                </table>
            </div>

            {/* Overlays */}
            {pasteWarning && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="surface-glass animate-pop-in" style={{ width: '400px', background: '#0f172a', borderRadius: '24px', padding: '2rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: '#fff', fontWeight: 900, margin: '0 0 1rem' }}>Insufficient Space</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Paste requires {pasteWarning.needed} rows, but only {pasteWarning.available} available in this section.</p>
                        <button onClick={() => setPasteWarning(null)} style={{ marginTop: '2rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer' }}>OK</button>
                    </div>
                </div>
            )}

            {breakdownMetric && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div className="surface-glass animate-pop-in" style={{ width: '550px', background: '#0f172a', borderRadius: '40px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '2.5rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(40px)' }} />
                            <div className="flex-between">
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.75rem', fontWeight: 950, letterSpacing: '-0.5px' }}>{breakdownMetric.label} Breakdown</h3>
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 10px #3b82f6' }} />
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>Consolidated Regional Totals</span>
                                    </div>
                                </div>
                                <button onClick={() => { setBreakdownMetric(null); setSelectedCenroForBreakdown(null); }} className="flex-center" style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '15px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s', zIndex: 10, position: 'relative' }} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}><X size={20}/></button>
                            </div>
                        </div>
                        <div style={{ padding: '2rem', maxHeight: '65vh', overflowY: 'auto', display: 'grid', gap: '1rem' }} className="custom-scrollbar">
                            {selectedCenroForBreakdown ? (
                                <>
                                    <button 
                                        onClick={() => setSelectedCenroForBreakdown(null)}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#3b82f6', padding: '0.6rem 1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', marginBottom: '0.5rem' }}
                                    >
                                        <ChevronLeft size={14} /> BACK TO REGIONAL
                                    </button>
                                    <div style={{ padding: '1rem 1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {['area', 'contract', 'obligated', 'balance'].includes(breakdownMetric.key) ? 'Showing Partner Breakdown for' : 'Showing Billing Breakdown for'}
                                        </span>
                                        <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 950 }}>{selectedCenroForBreakdown}</div>
                                    </div>
                                    
                                    {['area', 'contract', 'obligated', 'balance'].includes(breakdownMetric.key) ? (
                                        (() => {
                                            const targetDivs = activeDivision === "ALL MAINTENANCE PERIODS" ? FINANCE_DIVISIONS.filter(d => d !== "ALL MAINTENANCE PERIODS") : [activeDivision];
                                            const allPos = [];
                                            targetDivs.forEach(div => {
                                                (cenroData[div]?.[selectedCenroForBreakdown] || []).forEach(po => allPos.push(po));
                                            });
                                            return allPos.map((po, idx) => {
                                                let val = 0;
                                                const clean = (v) => parseFloat(v?.toString().replace(/,/g, '')) || 0;
                                                if (breakdownMetric.key === 'area') val = parseFloat(po.area) || 0;
                                                else if (breakdownMetric.key === 'contract') val = clean(po.contractCost);
                                                else if (breakdownMetric.key === 'obligated') val = clean(po.obligatedAmount);
                                                else if (breakdownMetric.key === 'balance') {
                                                    val = ['mobi', 'billing1', 'billing2', 'billing3'].reduce((sum, g) => sum + clean(po[g]?.net), 0);
                                                }
                                                
                                                return (
                                                    <div key={idx} className="flex-between" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '0.75rem', animation: `fadeIn 0.4s ease ${idx * 0.05}s both` }}>
                                                        <div className="flex-center gap-4">
                                                            <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <FileText size={18} color="rgba(255,255,255,0.3)" />
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 800 }}>{po.name || 'Unnamed Partner'}</span>
                                                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase' }}>{po.location || 'No Location'}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
                                                                {breakdownMetric.key === 'area' ? val.toFixed(2) : formatValue(val)}
                                                            </div>
                                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase' }}>
                                                                {breakdownMetric.key === 'area' ? 'Hectares' : 'Philippine Peso'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()
                                    ) : (
                                        ['mobi', 'billing1', 'billing2', 'billing3'].map((g, idx) => {
                                            const groupLabels = { 'mobi': '1ST BILLING', 'billing1': '2ND BILLING', 'billing2': '3RD BILLING', 'billing3': '4TH BILLING' };
                                            const groupLabel = groupLabels[g];
                                            const mappingKey = breakdownMetric.key === 'balance' ? 'balance' : 'disbursed';
                                            const val = stats.billingBreakdown[mappingKey][selectedCenroForBreakdown][g];
                                            return (
                                                <div key={g} className="flex-between" style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '0.75rem', animation: `fadeIn 0.4s ease ${idx * 0.05}s both` }}>
                                                    <div className="flex-center gap-4">
                                                        <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                            <Activity size={18} color={BILLING_GROUPS[['mobi', 'billing1', 'billing2', 'billing3'].indexOf(g)].color} />
                                                        </div>
                                                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', fontWeight: 800 }}>{groupLabel}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{formatValue(val)}</div>
                                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Philippine Peso</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </>
                            ) : (
                                CENROS.map((c, idx) => (
                                    <div 
                                        key={c} 
                                        className="flex-between" 
                                        onClick={() => setSelectedCenroForBreakdown(c)}
                                        style={{ 
                                            padding: '1.25rem 1.5rem', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            borderRadius: '20px', 
                                            border: '1px solid rgba(255,255,255,0.03)', 
                                            transition: 'all 0.3s', 
                                            animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    >
                                        <div className="flex-center gap-4">
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <Globe size={18} color="rgba(255,255,255,0.3)" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', fontWeight: 800 }}>{c.replace("CENRO ", "")}</span>
                                                <span style={{ fontSize: '0.55rem', color: '#3b82f6', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    {['area', 'contract', 'obligated'].includes(breakdownMetric.key) ? 'Click for Partner Breakdown' : 'Click for Billing Breakdown'}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#fff', fontWeight: 950, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>{breakdownMetric.key === 'area' ? stats.breakdown.area[c].toFixed(2) : formatValue(stats.breakdown[breakdownMetric.key][c])}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{breakdownMetric.key === 'area' ? 'Hectares' : 'Philippine Peso'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>Live Data Feed Synchronized</p>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(15px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="surface-glass animate-pop-in" style={{ width: '450px', background: '#0f172a', borderRadius: '32px', padding: '3rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                            <AlertCircle size={40} color="#ef4444" />
                        </div>
                        <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 950, margin: '0 0 1rem', letterSpacing: '-0.5px' }}>Confirm Deletion</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                            Are you sure you want to remove <span style={{ color: '#fff', fontWeight: 900 }}>"{deleteConfirm.name}"</span>? This action is permanent and will be reflected across all regional dashboards.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s' }}>CANCEL</button>
                            <button onClick={() => deleteBeneficiary(deleteConfirm.div, deleteConfirm.cenro, deleteConfirm.idx)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px rgba(239, 68, 68, 0.2)' }}>DELETE PO</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .flex-center { display: flex; align-items: center; justify-content: center; }
                .flex-between { display: flex; align-items: center; justify-content: space-between; }
                .gap-4 { gap: 1rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-4 { margin-bottom: 1rem; }
                .excel-row:hover td { background: rgba(255, 255, 255, 0.04) !important; }
                .stat-card-premium { 
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .stat-card-premium:hover { 
                    transform: translateY(-8px) scale(1.02); 
                    background: rgba(255,255,255,0.06) !important; 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 15px rgba(59, 130, 246, 0.2);
                    border-color: rgba(255,255,255,0.1) !important;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                [contenteditable="true"]:focus { background: rgba(59, 130, 246, 0.2) !important; outline: 2px solid #3b82f6; border-radius: 2px; }
                @keyframes popIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
                .animate-pop-in { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                select option { background: #0f172a; color: #fff; padding: 10px; }
            `}</style>
        </div>
    );
};

export default FinanceBilling;
