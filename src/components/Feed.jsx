import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, doc, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Cloudinary config
const CLOUDINARY_CLOUD = 'danndwfdx';
const CLOUDINARY_PRESET = 'denr_feed';
import { 
    Image as ImageIcon, Video, FileText, Calendar, Leaf, ArrowRight, Shield, 
    ShieldClose, ShieldCheck, Type, CheckCircle, UploadCloud, Edit3, Trash2, 
    X, Save, Grid3x3, List, Target, TrendingUp, RefreshCcw, Bell,
    GalleryHorizontal, Activity, Compass, Trees, Boxes, Construction, 
    Inbox, Layers, CheckCircle2, Combine, PlusCircle, Images, MonitorPlay, 
    ChevronLeft, ChevronRight, Plus, ExternalLink, Globe, LayoutDashboard, BarChart3,
    Zap, Cpu, Newspaper, Gamepad2
} from 'lucide-react';
import { format } from 'date-fns';
import { trackEvent } from '../utils/track';
import AdminAnalytics from './AdminAnalytics';
import IecHologramModal from './IecHologramModal';
import WhatsNewModal from './WhatsNewModal';
import IecGameSelection from '../extensions/iec-games/IecGameSelection';
import GameLobby from '../extensions/iec-games/GameLobby';
import QuizGameHost from '../extensions/iec-games/QuizGameHost';
import FactFakeHost from '../extensions/iec-games/FactFakeHost';
import quizThumb from '../assets/quiz-thumb.png';
import factFakeThumb from '../assets/fact-fake-thumb.png';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ForestNursery from './ForestNursery';
import MaintenanceProtection from './MaintenanceProtection';
import SuperviseModal from './SuperviseModal';
import FeoShapefileMap from './FeoShapefileMap';
import FeoMapProducer from './FeoMapProducer';
import FinanceBilling from './FinanceBilling';

const GAMES = [
    {
        id: 'quiz',
        title: 'IEC Quiz Bee',
        description: 'The ultimate DENR knowledge challenge. Rapid-fire environmental trivia!',
        instruction: 'Join via mobile and tap the correct answer before the timer runs out.',
        thumbnail: quizThumb,
        icon: Newspaper, // Fallback icon
        color: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.4)',
        minPlayers: 1
    },
    {
        id: 'fact_fake',
        title: 'Fact or Fake',
        description: 'Swipe War! Distinguish environmental truth from fiction in this high-speed battle.',
        instruction: 'Swipe RIGHT for Fact, LEFT for Fake on your smartphone.',
        thumbnail: factFakeThumb,
        icon: Zap,
        color: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.4)',
        minPlayers: 1
    }
];

// --- OPTIMIZATION: SUB-COMPONENTS TO PREVENT LAG ---

const SEMES_MONTHS = {
    1: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"],
    2: ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
};
const CENRO_LIST = ["CORON", "BROOKE'S POINT", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"];
const TABLE1_KEYS = [
    { key: 'pnm2ndYear', label: 'PROTECTION AND MAINTENANCE 2nd YEAR' },
    { key: 'yr3WithinPA', label: 'Year 3 (Within PA)' },
    { key: 'yr3CongInitiative', label: 'Year 3 (Congressional Initiative)' },
    { key: 'forestNursery', label: 'FOREST NURSERY' },
    { key: 'elcac', label: 'ELCAC' },
    { key: 'treeReplacement', label: 'TREE REPLACEMENT' },
    { key: 'forestDisturbance', label: 'FOREST DISTURBANCE' },
    { key: 'loaMoa', label: 'LOA/MOA' },
    { key: 'hiringFeo', label: 'Hiring of FEO/TSS/DMO/FMO' },
    { key: 'ngpProduce', label: 'NGP with Produce/Harvest' },
    { key: 'survivalRates', label: 'Survival Rates' },
    { key: 'shapefiles', label: 'SHAPEFILES' },
    { key: 'ngpVisits', label: 'NGP Sites Visited by DENR Officials' },
    { key: 'siteVisit', label: 'SITE VISIT' },
];
const TABLE2_KEYS = [
    { key: 'geoPhotos', label: 'GEOTAGGED PHOTOS UPLOADING' },
    { key: 'ngpAdopted', label: 'NGP Sites Adopted by Other Partners' },
    { key: 'cbrp', label: 'CBRP' },
    { key: 'financialAccomplishment', label: 'Financial Accomplishment' },
    { key: 'treePlanting', label: 'Tree Planting' },
    { key: 'otherRefo', label: 'Other Refo Initiatives' },
    { key: 'certification', label: 'Certification/Supporting File' },
    { key: 'droneDatabase', label: 'DRONE DATA BASE' },
    { key: 'ppa', label: 'PPA' },
    { key: 'dpwhAffected', label: 'Sites Affected by DPWH' },
    { key: 'billingVouchers', label: 'Billing/Vouchers' },
    { key: 'turnedOver', label: 'TURNED OVER NGP SITES' },
];

// Helper to find RDATS document by checking both variations of Brooke's Point naming in IDs
const findRdatsInArray = (data, table, month, cenro) => {
    if (!cenro || !month || !table) return null;
    const idWith = `${table}_${month}_${cenro.includes("'") ? cenro : cenro.replace("BROOKE", "BROOKE'S")}`;
    const idWithout = `${table}_${month}_${cenro.replace("'", "")}`;
    return data.find(d => d.id === idWith || d.id === idWithout);
};

// Memoized Pie Chart to prevent re-renders when typing in form
const RdatsPieChart = React.memo(({ stats, onSelectCenro }) => {
    const [hoveredSlice, setHoveredSlice] = useState(null);
    const total = stats.total;
    const data = Object.entries(stats.byCenro).map(([name, value]) => ({ name, value }));
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const getCoord = (pct) => [Math.cos(2 * Math.PI * pct), Math.sin(2 * Math.PI * pct)];
    let cumPct = 0;

    // Each CENRO has 156 expected slots (26 columns * 6 months)
    const EXPECTED_PER_CENRO = 156;
    const TOTAL_EXPECTED = data.length * EXPECTED_PER_CENRO;

    const slices = data.map((item, i) => {
        const [sx, sy] = getCoord(cumPct);
        // Formula: Current Count / Total Expected for this CENRO
        const pct = item.value / EXPECTED_PER_CENRO;

        // For the visual pie rotation, we still need to calculate the proportional slice
        // but the user wants the label percentage to be "completion" percentage.
        // Actually, if we want the pie to represent completion, it won't be a full circle if incomplete.
        // However, the user asked for the label percentage change.
        const visualPct = total > 0 ? item.value / total : 0;
        cumPct += visualPct;

        const [ex, ey] = getCoord(cumPct);
        const flag = visualPct > 0.5 ? 1 : 0;
        return { ...item, sx, sy, ex, ey, flag, visualPct, pct, color: colors[i % colors.length], idx: i };
    });

    return (
        <div className="rdats-pie-container" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '4rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', aspectRatio: '1/1', margin: '0 auto' }}>
                <svg viewBox="-1.2 -1.2 2.4 2.4" style={{ width: '100%', height: '100%' }}>
                    {total === 0 ? (
                        <circle cx="0" cy="0" r="1" fill="rgba(255,255,255,0.05)" />
                    ) : (
                        slices.map((s) => {
                            const isHovered = hoveredSlice === s.idx;
                            const scale = isHovered ? 1.08 : 1;
                            return (
                                <g key={s.idx}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformOrigin: '0 0', transform: `rotate(-90deg) scale(${scale})` }}
                                    onMouseEnter={() => setHoveredSlice(s.idx)}
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    onClick={() => onSelectCenro(s)}
                                >
                                    <path
                                        d={`M ${s.sx} ${s.sy} A 1 1 0 ${s.flag} 1 ${s.ex} ${s.ey} L 0 0`}
                                        fill={s.color}
                                        opacity={hoveredSlice === null || isHovered ? 1 : 0.4}
                                        stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.2)'}
                                        strokeWidth={isHovered ? 0.05 : 0.01}
                                        filter={isHovered ? `drop-shadow(0 0 8px ${s.color})` : 'none'}
                                    />
                                </g>
                            );
                        })
                    )}
                    <circle cx="0" cy="0" r="0.45" fill="var(--bg-app)" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    {hoveredSlice !== null && slices[hoveredSlice] ? (
                        <>
                            <div style={{ fontSize: '3rem', fontWeight: 900, color: slices[hoveredSlice].color, lineHeight: 1 }}>{slices[hoveredSlice].value}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-tertiary)', maxWidth: '160px', marginTop: '0.5rem', textTransform: 'uppercase' }}>{slices[hoveredSlice].name}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: 'var(--text-primary)' }}>{total}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--denr-green-base)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TOTAL RDATS</div>
                        </>
                    )}
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '2rem', fontStyle: 'italic' }}>Click a slice to drill down into specifics</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxHeight: '500px', overflowY: 'auto', padding: '0.5rem' }} className="custom-scrollbar">
                {data.length === 0 ? (
                    <p className="text-muted" style={{ textAlign: 'center' }}>No RDATS codes found yet.</p>
                ) : (
                    slices.map((s) => (
                        <div
                            key={s.idx}
                            className="flex-between"
                            onClick={() => onSelectCenro(s)}
                            onMouseEnter={() => setHoveredSlice(s.idx)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            style={{ 
                                padding: '1rem 1.25rem', 
                                background: hoveredSlice === s.idx ? 'var(--bg-surface)' : 'var(--bg-input)', 
                                borderRadius: '12px', 
                                cursor: 'pointer', 
                                border: `1px solid ${hoveredSlice === s.idx ? s.color : 'var(--border-light)'}`, 
                                transition: 'all 0.2s',
                                transform: hoveredSlice === s.idx ? 'translateX(4px)' : 'none',
                                boxShadow: hoveredSlice === s.idx ? `0 4px 20px ${s.color}22` : 'var(--shadow-card)'
                            }}
                        >
                            <div className="flex-center gap-4">
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.color}`, flexShrink: 0 }}></div>
                                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</span>
                            </div>
                            <div className="flex-center gap-3">
                                <span style={{ fontWeight: 900, color: s.color, fontSize: '1.4rem' }}>{s.value}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{Math.round(s.pct * 100)}%</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

    );
});

// Isolated Form Component to prevent Modal/Chart re-renders while typing
const PublicRdatsForm = ({ rdatsData, onClose, onShowSuccess, semester }) => {
    const [cenro, setCenro] = useState('');
    const [month, setMonth] = useState('');
    const [column, setColumn] = useState('');
    const [val, setVal] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formStatus, setFormStatus] = useState({ type: '', msg: '' });

    const getAvailableColumns = () => {
        if (!cenro || !month) return [];
        const t1Data = findRdatsInArray(rdatsData, 't1', month, cenro) || {};
        const t2Data = findRdatsInArray(rdatsData, 't2', month, cenro) || {};
        let available = [];
        TABLE1_KEYS.forEach(k => { if (!t1Data[k.key] || !t1Data[k.key].trim()) available.push({ table: 't1', ...k }); });
        TABLE2_KEYS.forEach(k => { if (!t2Data[k.key] || !t2Data[k.key].trim()) available.push({ table: 't2', ...k }); });
        return available;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!cenro || !month || !column || !val.trim()) return;
        setSubmitting(true);
        setFormStatus({ type: '', msg: '' });
        try {
            const [table, key] = column.split('|');
            // NEW PLAN: Push to a pending collection instead of main database directly
            await addDoc(collection(db, 'rdats_pending'), {
                cenro,
                month,
                table,
                columnKey: key,
                value: `PAL ${val.trim()}`,
                status: 'pending',
                createdAt: Date.now()
            });

            setFormStatus({ type: 'success', msg: 'Successfully submitted for Admin Review!' });
            onShowSuccess();
            setTimeout(() => {
                onClose();
            }, 2500); // 2.5s delay to let user see "Admin Review" message
        } catch (err) {
            setFormStatus({ type: 'error', msg: "Failed to submit: " + err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', background: 'var(--bg-surface)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--denr-green-light)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <PlusCircle size={20} /> Submit RDATS Number
                </h3>
                <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={onClose}><X size={20} /></button>
            </div>
            <div style={{ padding: '2rem', overflowY: 'auto' }}>
                {formStatus.msg && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        borderRadius: '10px',
                        background: formStatus.type === 'success' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${formStatus.type === 'success' ? 'var(--denr-green-glow)' : 'rgba(239, 68, 68, 0.4)'}`,
                        color: formStatus.type === 'success' ? 'var(--denr-green-light)' : '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        animation: 'modalPop 0.3s ease'
                    }}>
                        <CheckCircle size={18} />
                        <span style={{ fontWeight: 600 }}>{formStatus.msg}</span>
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="mobile-stack-form">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>CENRO</label>
                            <select className="input-modern" value={cenro} onChange={e => { setCenro(e.target.value); setColumn(''); }} required style={{ width: '100%', background: '#111', color: '#fff' }}>
                                <option value="" disabled>Select CENRO...</option>
                                {CENRO_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Month</label>
                            <select className="input-modern" value={month} onChange={e => { setMonth(e.target.value); setColumn(''); }} required style={{ width: '100%', background: '#111', color: '#fff' }}>
                                <option value="" disabled>Select Month...</option>
                                {SEMES_MONTHS[semester].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Available Category</label>
                        <select className="input-modern" value={column} onChange={e => setColumn(e.target.value)} required disabled={!cenro || !month} style={{ width: '100%', background: '#111', color: '#fff' }}>
                            <option value="" disabled>{(!cenro || !month) ? "Select CENRO and Month first..." : "Select Category..."}</option>
                            {getAvailableColumns().map(c => <option key={`${c.table}|${c.key}`} value={`${c.table}|${c.key}`}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>RDATS Number</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa', fontWeight: 800 }}>PAL</span>
                            <input type="text" className="input-modern" value={val} onChange={e => setVal(e.target.value)} required placeholder="123456" style={{ paddingLeft: '3.5rem', width: '100%', fontSize: '1.2rem', fontWeight: 700 }} />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem' }} disabled={submitting || !column}>
                        {submitting ? "Submitting..." : "Submit to Database"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const RdatsModal = ({ showRdatsModal, setShowRdatsModal, rdatsData, rdatsStats, setSuccess, semester, setSemester, userEmail, userRole }) => {
    const isSuperAdmin = userEmail === 'aldreamjamion@gmail.com';
    const [editingRdats2, setEditingRdats2] = useState(null); // { id, key, label, currentVal, status }
    const [statusMgmtItem, setStatusMgmtItem] = useState(null); // { id, key, label, currentVal, status, entry }
    const [newRdats2Val, setNewRdats2Val] = useState('');
    const [selectedCenro, setSelectedCenro] = useState(null);
    const [showSubmitForm, setShowSubmitForm] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'month', direction: 'asc' });
    const [viewMode, setViewMode] = useState('encoded'); // 'encoded' or 'lacking'
    const [searchQuery, setSearchQuery] = useState('');

    const handleUpdateStatus = async () => {
        if (!statusMgmtItem || !newRdats2Val.trim()) return;
        try {
            const trackingVal = newRdats2Val.toUpperCase().startsWith('PAL') ? newRdats2Val.toUpperCase() : `PAL ${newRdats2Val}`.toUpperCase();
            const isConsolidated = statusMgmtItem.status === 'consolidated';
            
            if (isConsolidated) {
                const oldVal = statusMgmtItem.rdats2;
                const updates = [];
                rdatsData.forEach(d => {
                    Object.entries(d).forEach(([k, v]) => {
                        if (k.endsWith('_rdats2') && v === oldVal) {
                            const actKey = k.replace('_rdats2', '');
                            updates.push(updateDoc(doc(db, 'rdats', d.id), {
                                [k]: trackingVal,
                                [`${actKey}_updatedAt`]: Date.now()
                            }));
                        }
                    });
                });
                await Promise.all(updates);
            } else {
                await updateDoc(doc(db, 'rdats', statusMgmtItem.rawDocId), {
                    [`${statusMgmtItem.rawKey}_rdats2`]: trackingVal,
                    [`${statusMgmtItem.rawKey}_updatedAt`]: Date.now()
                });
            }
            setSuccess("RDATS Tracking Number Updated!");
            setStatusMgmtItem(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            console.error(e);
            alert("Error updating: " + e.message);
        }
    };

    const handleRevertStatus = async () => {
        if (!statusMgmtItem) return;
        if (!confirm("Are you sure you want to REVERT this endorsement? This will clear the tracking number and return the status to 'ongoing'.")) return;
        
        try {
            const isConsolidated = statusMgmtItem.status === 'consolidated';
            if (isConsolidated) {
                const oldVal = statusMgmtItem.rdats2;
                const updates = [];
                rdatsData.forEach(d => {
                    Object.entries(d).forEach(([k, v]) => {
                        if (k.endsWith('_rdats2') && v === oldVal) {
                            const actKey = k.replace('_rdats2', '');
                            updates.push(updateDoc(doc(db, 'rdats', d.id), {
                                [`${actKey}_status`]: 'ongoing',
                                [k]: '',
                                [`${actKey}_updatedAt`]: Date.now()
                            }));
                        }
                    });
                });
                await Promise.all(updates);
            } else {
                await updateDoc(doc(db, 'rdats', statusMgmtItem.rawDocId), {
                    [`${statusMgmtItem.rawKey}_status`]: 'ongoing',
                    [`${statusMgmtItem.rawKey}_rdats2`]: '',
                    [`${statusMgmtItem.rawKey}_updatedAt`]: Date.now()
                });
            }
            setSuccess("Endorsement Reverted!");
            setStatusMgmtItem(null);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            console.error(e);
            alert("Error reverting: " + e.message);
        }
    };

    const MONTH_LIST = SEMES_MONTHS[semester];

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span style={{ opacity: 0.3 }}>⇅</span>;
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const getCenroDetails = useCallback((cenroName) => {
        if (!cenroName) return [];
        const details = [];
        
        if (viewMode === 'encoded') {
            rdatsData.forEach(doc => {
                const parts = doc.id.split('_');
                const rawCenro = parts[parts.length - 1];
                const cenro = (rawCenro.includes("BROOKE") && rawCenro.includes("POINT")) ? "BROOKE'S POINT" : rawCenro;
                const table = parts[0];
                const month = parts[1];
                if (cenro === cenroName && MONTH_LIST.includes(month)) {
                    Object.entries(doc).forEach(([key, value]) => {
                        if (key !== 'id' && key !== 'updatedAt' && typeof value === 'string' && value.toUpperCase().includes('PAL')) {
                            const label = [...TABLE1_KEYS, ...TABLE2_KEYS].find(k => k.key === key)?.label || key;
                            details.push({ 
                                table: table.toUpperCase(), 
                                month, 
                                column: label, 
                                value, 
                                status: doc[`${key}_status`] || 'ongoing',
                                rdats2: doc[`${key}_rdats2`] || '',
                                updatedAt: doc[`${key}_updatedAt`] || doc.updatedAt,
                                source: doc[`${key}_source`] || 'admin',
                                rawDocId: doc.id,
                                rawKey: key
                            });
                        }
                    });
                }
            });
        } else {
            MONTH_LIST.forEach(month => {
                const t1Doc = findRdatsInArray(rdatsData, 't1', month, cenroName) || {};
                const t2Doc = findRdatsInArray(rdatsData, 't2', month, cenroName) || {};

                TABLE1_KEYS.forEach(k => {
                    const val = t1Doc[k.key];
                    if (!val || !val.trim().toUpperCase().includes('PAL')) {
                        details.push({ table: 'T1', month, column: k.label, value: 'MISSING', status: 'Lacking', updatedAt: 0, source: 'n/a' });
                    }
                });

                TABLE2_KEYS.forEach(k => {
                    const val = t2Doc[k.key];
                    if (!val || !val.trim().toUpperCase().includes('PAL')) {
                        details.push({ table: 'T2', month, column: k.label, value: 'MISSING', status: 'Lacking', updatedAt: 0, source: 'n/a' });
                    }
                });
            });
        }
        return details;
    }, [rdatsData, viewMode, semester, MONTH_LIST]);

    const cenroDetails = useMemo(() => {
        if (!selectedCenro || !showRdatsModal) return [];
        let details = getCenroDetails(selectedCenro.name);

        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            details = details.filter(d => 
                d.month.toLowerCase().includes(lowerQ) ||
                d.column.toLowerCase().includes(lowerQ) ||
                d.table.toLowerCase().includes(lowerQ)
            );
        }

        details.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'month') {
                aVal = MONTH_LIST.indexOf(aVal);
                bVal = MONTH_LIST.indexOf(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return details;
    }, [selectedCenro, getCenroDetails, showRdatsModal, sortConfig, searchQuery, MONTH_LIST]);

    const exportCenroCSV = async (exportMode) => {
        if (!selectedCenro) return;
        const cenroName = selectedCenro.name;
        const now = new Date();
        const dateStr = now.toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });

        let allDetails = [];
        MONTH_LIST.forEach(month => {
            const t1Doc = findRdatsInArray(rdatsData, 't1', month, cenroName) || {};
            const t2Doc = findRdatsInArray(rdatsData, 't2', month, cenroName) || {};
            TABLE1_KEYS.forEach(k => {
                const val = t1Doc[k.key];
                const isEncoded = val && val.trim().toUpperCase().includes('PAL');
                allDetails.push({ table: 'T1', month, column: k.label, value: isEncoded ? val : 'MISSING', status: isEncoded ? (t1Doc[`${k.key}_status`] || 'Encoded') : 'Lacking', rdats2: t1Doc[`${k.key}_rdats2`] || '' });
            });
            TABLE2_KEYS.forEach(k => {
                const val = t2Doc[k.key];
                const isEncoded = val && val.trim().toUpperCase().includes('PAL');
                allDetails.push({ table: 'T2', month, column: k.label, value: isEncoded ? val : 'MISSING', status: isEncoded ? (t2Doc[`${k.key}_status`] || 'Encoded') : 'Lacking', rdats2: t2Doc[`${k.key}_rdats2`] || '' });
            });
        });

        let filteredDetails = allDetails;
        if (exportMode === 'encoded') filteredDetails = allDetails.filter(d => d.value !== 'MISSING');
        if (exportMode === 'lacking') filteredDetails = allDetails.filter(d => d.value === 'MISSING');

        // ── Build premium CSV ──────────────────────────────────────────────
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const SEP = `"${'─'.repeat(100)}"`;
        const lines = [];
        lines.push('\uFEFF'); // UTF-8 BOM
        lines.push(q('DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES (DENR) — PALAWAN'));
        lines.push(q(`RDATS BREAKDOWN REPORT  |  CENRO: ${cenroName}  |  ${exportMode.toUpperCase()} ENTRIES`));
        lines.push(q(`Semester: ${semester === 1 ? '1st Semester (January – June)' : '2nd Semester (July – December)'}`));
        lines.push(q(`Generated: ${dateStr}`));
        lines.push('');
        lines.push(SEP);
        lines.push(q(`TOTAL RECORDS: ${filteredDetails.length}  |  VIEW MODE: ${exportMode.toUpperCase()}`));
        lines.push(SEP);
        lines.push('');
        lines.push([q('CENRO'), q('TABLE'), q('MONTH'), q('ACTIVITY / COLUMN'), q('STATUS'), q('RDATS VALUE'), q('LEVEL-2 RDATS')].join(','));
        filteredDetails.forEach(d => {
            lines.push([q(cenroName), q(d.table), q(d.month), q(d.column), q(d.status), q(d.value), q(d.rdats2 || '')].join(','));
        });

        const csvContent = lines.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `DENR_RDATS_${cenroName}_Sem${semester}_${exportMode.toUpperCase()}_${now.toISOString().split('T')[0]}.csv`;

        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }] });
                const writable = await fileHandle.createWritable();
                await writable.write(blob); await writable.close(); return;
            } catch (err) { if (err.name === 'AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url); link.setAttribute('download', filename); link.style.display = 'none';
        document.body.appendChild(link); link.click();
        setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 5000);
    };

    if (!showRdatsModal) return null;

    return (
        <div className="modal-overlay" onClick={() => { setShowRdatsModal(false); setSelectedCenro(null); setShowSubmitForm(false); }}>
            <div className="surface-glass" onClick={e => e.stopPropagation()} style={{ width: '92%', maxWidth: '1200px', height: '88vh', borderRadius: '32px', border: '1px solid var(--denr-green-glow)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', margin: 'auto', boxShadow: '0 0 60px rgba(5, 150, 105, 0.4)', animation: 'modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>

                <div style={{ padding: '1.5rem', background: 'rgba(5, 150, 105, 0.1)', borderBottom: '1px solid var(--denr-green-glow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex-center gap-3">
                        <Boxes size={28} color="var(--denr-green-light)" />
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>RDATS Breakdown</h2>
                        
                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.25rem', marginLeft: '2rem' }}>
                            <button 
                                onClick={() => setSemester(1)}
                                style={{ padding: '0.5rem 1rem', background: semester === 1 ? 'var(--denr-green-glow)' : 'transparent', color: semester === 1 ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                1st Semester (Jan-Jun)
                            </button>
                            <button 
                                onClick={() => setSemester(2)}
                                style={{ padding: '0.5rem 1rem', background: semester === 2 ? 'var(--denr-green-glow)' : 'transparent', color: semester === 2 ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                2nd Semester (Jul-Dec)
                            </button>
                        </div>
                    </div>
                    <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setShowRdatsModal(false)}><X size={24} /></button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '1rem 0' }}>
                    <RdatsPieChart stats={rdatsStats} onSelectCenro={setSelectedCenro} />
                </div>

                <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.5)', display: 'flex', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button className="btn btn-primary" onClick={() => window.open('/rdats', '_blank')} style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 0 15px var(--denr-green-glow)' }}>View Full Tracker</button>
                    <button className="btn btn-neon-green" onClick={() => setShowSubmitForm(true)} style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Submit RDATS Number</button>
                </div>

                {showSubmitForm && (
                    <PublicRdatsForm
                        rdatsData={rdatsData}
                        semester={semester}
                        onClose={() => setShowSubmitForm(false)}
                        onShowSuccess={() => {
                            setSuccess("Success! Your RDATS number has been submitted.");
                            setTimeout(() => setSuccess(''), 4000);
                        }}
                    />
                )}

                {selectedCenro && (
                    <div style={{ position: 'absolute', inset: 0, background: `var(--bg-app)`, display: 'flex', flexDirection: 'column', zIndex: 100, animation: 'fadeIn 0.3s ease' }} onClick={() => setSelectedCenro(null)}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${selectedCenro.color}33`, borderRadius: '24px', margin: '1rem', background: `linear-gradient(135deg, ${selectedCenro.color}0a 0%, var(--bg-surface) 100%)` }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '1.5rem 2rem', background: `${selectedCenro.color}1a`, borderBottom: `1px solid ${selectedCenro.color}33`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="flex-center gap-3">
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: selectedCenro.color, boxShadow: `0 0 15px ${selectedCenro.color}` }}></div>
                                    <div style={{ color: 'var(--text-primary)' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{selectedCenro.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{cenroDetails.length} entries ({viewMode})</div>
                                    </div>
                                </div>
                                
                                <div className="flex-center gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Search Activity or Month..." 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="input-modern"
                                        style={{ width: '250px', background: 'var(--bg-input)', border: `1px solid ${selectedCenro.color}55`, color: 'var(--text-primary)' }}
                                    />
                                    
                                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: `1px solid ${selectedCenro.color}55` }}>
                                        <button 
                                            onClick={() => setViewMode('encoded')}
                                            style={{ padding: '0.5rem 1rem', background: viewMode === 'encoded' ? selectedCenro.color : 'transparent', color: viewMode === 'encoded' ? 'var(--bg-app)' : 'var(--text-tertiary)', border: 'none', borderRadius: '6px 0 0 6px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}>
                                            Encoded
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('lacking')}
                                            style={{ padding: '0.5rem 1rem', background: viewMode === 'lacking' ? '#ef4444' : 'transparent', color: viewMode === 'lacking' ? '#fff' : 'var(--text-tertiary)', border: 'none', borderRadius: '0 6px 6px 0', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}>
                                            Lacking
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', boxShadow: `0 0 15px ${selectedCenro.color}33` }}>
                                        <button onClick={() => exportCenroCSV(viewMode)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: selectedCenro.color, color: '#000', borderRadius: '6px 0 0 6px', fontWeight: 800 }}>
                                            Export ({viewMode})
                                        </button>
                                        <button onClick={() => exportCenroCSV('all')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: `${selectedCenro.color}cc`, color: '#fff', borderRadius: '0 6px 66px 0', borderLeft: '1px solid rgba(0,0,0,0.2)', fontWeight: 800 }} title="Export both Encoded and Lacking items in one file">
                                            Export All (Both)
                                        </button>
                                    </div>

                                    <button className="btn btn-glass" style={{ padding: '0.3rem', marginLeft: '1rem', borderColor: `${selectedCenro.color}55`, color: selectedCenro.color }} onClick={() => setSelectedCenro(null)}><X size={18} /></button>
                                </div>
                            </div>
                            
                            <div style={{ padding: '0 1.5rem 1rem 1.5rem', overflowX: 'auto' }}>
                                {cenroDetails.length === 0 ? (
                                    <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No {viewMode} entries found for this CENRO.</p>
                                ) : (
                                    <div className="dbmo-scroll-list" style={{ flex: 1, padding: 0, overflowY: 'auto', background: 'transparent', border: 'none' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 5, borderBottom: '1px solid var(--border-light)' }}>
                                                <tr>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: selectedCenro.color, fontWeight: 800, background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>TABLE</th>
                                                    <th onClick={() => requestSort('month')} style={{ padding: '1rem', textAlign: 'left', color: selectedCenro.color, fontWeight: 800, cursor: 'pointer', background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>MONTH {getSortIcon('month')}</th>
                                                    <th onClick={() => requestSort('column')} style={{ padding: '1rem', textAlign: 'left', color: selectedCenro.color, fontWeight: 800, cursor: 'pointer', background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>COLUMN {getSortIcon('column')}</th>
                                                    <th onClick={() => requestSort('value')} style={{ padding: '1rem', textAlign: 'right', color: selectedCenro.color, fontWeight: 800, cursor: 'pointer', background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>RDATS VALUE {getSortIcon('value')}</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: selectedCenro.color, fontWeight: 800, background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>DATE / TIMESTAMP</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: selectedCenro.color, fontWeight: 800, background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>SOURCE</th>
                                                    {userRole && userRole !== 'public' && (
                                                        <th onClick={() => requestSort('status')} style={{ padding: '1rem', textAlign: 'center', color: selectedCenro.color, fontWeight: 800, cursor: 'pointer', background: `${selectedCenro.color}05`, textTransform: 'uppercase', letterSpacing: '1px' }}>STATUS {getSortIcon('status')}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cenroDetails.map((entry, idx) => {
                                                    const isEditing = editingRdats2 && editingRdats2.id === entry.rawDocId && editingRdats2.key === entry.rawKey;
                                                    const isEndorsed = entry.status === 'endorsed' || entry.status === 'consolidated and endorsed';
                                                    const isConsolidated = entry.status === 'consolidated';
                                                    const statusColor = isEndorsed ? '#34d399' : isConsolidated ? '#60a5fa' : '#888';
                                                    const statusBg = isEndorsed ? 'rgba(16, 185, 129, 0.1)' : isConsolidated ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)';
                                                    
                                                    return (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                                                            <td style={{ padding: '1rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>{entry.table}</td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{entry.month}</td>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.column}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                <div style={{ fontWeight: 900, color: entry.status === 'Encoded' || entry.status === 'ongoing' ? selectedCenro.color : '#ef4444' }}>{entry.value}</div>
                                                            </td>
                                                            <td style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                                                                {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: entry.source === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: entry.source === 'admin' ? '#60a5fa' : '#34d399', fontWeight: 800, textTransform: 'uppercase', border: `1px solid ${entry.source === 'admin' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                                                                    {entry.source}
                                                                </span>
                                                            </td>
                                                            {userRole && userRole !== 'public' && (
                                                                <td style={{ padding: '1rem' }}>
                                                                    <div 
                                                                        onClick={() => {
                                                                            const isEditable = entry.status === 'endorsed' || entry.status === 'consolidated and endorsed' || entry.status === 'consolidated';
                                                                            if (isSuperAdmin && isEditable) {
                                                                                setStatusMgmtItem(entry);
                                                                                setNewRdats2Val(entry.rdats2 || '');
                                                                            }
                                                                        }}
                                                                        className={isSuperAdmin && (entry.status === 'endorsed' || entry.status === 'consolidated and endorsed' || entry.status === 'consolidated') ? 'status-admin-clickable' : ''}
                                                                        style={{ 
                                                                            display: 'flex', 
                                                                            flexDirection: 'column', 
                                                                            alignItems: 'center', 
                                                                            gap: '0.4rem',
                                                                            cursor: isSuperAdmin && (entry.status === 'endorsed' || entry.status === 'consolidated and endorsed' || entry.status === 'consolidated') ? 'pointer' : 'default',
                                                                            padding: '0.5rem',
                                                                            borderRadius: '8px',
                                                                            transition: 'all 0.3s ease'
                                                                        }}
                                                                    >
                                                                        <span className="text-xs" style={{ 
                                                                            padding: '0.2rem 0.5rem', 
                                                                            borderRadius: '4px', 
                                                                            background: statusBg, 
                                                                            color: statusColor, 
                                                                            textTransform: 'uppercase', 
                                                                            fontWeight: 800,
                                                                            boxShadow: isSuperAdmin && (entry.status === 'endorsed' || entry.status === 'consolidated and endorsed' || entry.status === 'consolidated') ? `0 0 10px ${statusColor}33` : 'none'
                                                                        }}>
                                                                            {entry.status}
                                                                        </span>
                                                                        {entry.rdats2 && <span className="text-xs" style={{ color: '#fbbf24', fontWeight: 800 }}>{entry.rdats2}</span>}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {statusMgmtItem && (() => {
                                const isEndorsedFlag = statusMgmtItem.status === 'endorsed' || statusMgmtItem.status === 'consolidated and endorsed';
                                const isConsolidatedFlag = statusMgmtItem.status === 'consolidated';
                                const sColor = isEndorsedFlag ? '#34d399' : isConsolidatedFlag ? '#60a5fa' : '#888';
                                const sBg = isEndorsedFlag ? 'rgba(16, 185, 129, 0.1)' : isConsolidatedFlag ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)';
                                
                                return (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setStatusMgmtItem(null)}>
                                        <div className="surface-glass shadow-2xl" id="admin-status-modal" style={{ width: '90%', maxWidth: '450px', padding: '2rem', borderRadius: '24px', border: `2px solid ${sColor}44`, boxShadow: `0 0 30px ${sColor}22`, animation: 'modalPop 0.3s ease' }} onClick={e => e.stopPropagation()}>
                                            <div className="flex-between mb-6">
                                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                                                    <Edit3 size={20} color={sColor} />
                                                    Manage Status
                                                </h3>
                                                <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setStatusMgmtItem(null)}><X size={20} /></button>
                                            </div>
                                            
                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', borderLeft: `4px solid ${sColor}` }}>
                                                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>{statusMgmtItem.table} • {statusMgmtItem.month}</div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{statusMgmtItem.column}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.2rem' }}>Currently: <span style={{ fontWeight: 700, color: sColor }}>{statusMgmtItem.status}</span></div>
                                            </div>

                                            <div className="mb-6">
                                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem', fontWeight: 600 }}>Update RDATS Tracking Number</label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#666' }}>PAL</span>
                                                    <input 
                                                        type="text" 
                                                        className="input-modern" 
                                                        value={newRdats2Val.replace(/^PAL\s*/, '')} 
                                                        onChange={e => setNewRdats2Val(e.target.value.toUpperCase())}
                                                        style={{ width: '100%', paddingLeft: '3.5rem', fontSize: '1.1rem', fontWeight: 700 }}
                                                        placeholder="123456"
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <button className="btn btn-primary" onClick={handleUpdateStatus} style={{ padding: '1rem', fontWeight: 800, background: sColor, color: '#000' }}>Update Tracking Number</button>
                                                <button className="btn btn-glass" onClick={handleRevertStatus} style={{ padding: '1rem', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', fontWeight: 800 }}>
                                                    <Trash2 size={16} /> Revert Endorsement
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

class FeoErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("FEO Portal Crash:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <h3 style={{ margin: 0, marginBottom: '1rem' }}>FEO Component Error</h3>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{this.state.error && this.state.error.toString()}</p>
                    <button onClick={() => this.setState({ hasError: false })} className="btn-glass" style={{ marginTop: '1rem', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                        Dismiss & Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function Feed({ userRole, userEmail, onAdminClick, onLogout, theme, toggleTheme }) {
    const navigate = useNavigate();
    // Derived state for legacy compatibility or broad checks
    const isAdmin = userRole === 'admin' || userRole === 'supervisor';
    const isSpecialist = userRole === 'finance' || userRole === 'financial' || userRole === 'feo';
    const isIec = userRole === 'iec';
    const hasAnyAdminAccess = isAdmin || isSpecialist || isIec;
    const isSupervisor = userEmail === 'aldreamjamion@gmail.com' || userRole === 'supervisor';
    const isFinancialOrFeo = userRole === 'finance' || userRole === 'financial' || userRole === 'feo';

    const [semester, setSemester] = useState(1);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('feed');

    const [showIecModal, setShowIecModal] = useState(false);
    const [showCdsModal, setShowCdsModal] = useState(false);
    const [showDbmoModal, setShowDbmoModal] = useState(false);
    const [showFinanceModal, setShowFinanceModal] = useState(false);
    const [showFeoModal, setShowFeoModal] = useState(false);
    const [showForestNurseryModal, setShowForestNurseryModal] = useState(false);
    const [showSuperviseModal, setShowSuperviseModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showEngpHub, setShowEngpHub] = useState(false);
    const [showGameSelection, setShowGameSelection] = useState(false);
    const [activeGameId, setActiveGameId] = useState(null);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [showGameLobby, setShowGameLobby] = useState(false);
    const [isGameActive, setIsGameActive] = useState(false);

    // RBAC Security
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [accessDeniedMessage, setAccessDeniedMessage] = useState('');

    const handleProtectedAction = (allowedRoles, actionMessage, onProceed) => {
        if (allowedRoles.includes(userRole)) {
            onProceed();
        } else {
            setAccessDeniedMessage(actionMessage);
            setShowAccessDenied(true);
        }
    };

    // Admin Upload/Composer State
    const [activeTab, setActiveTab] = useState('photo');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Admin Edit/Delete Modal State
    const [editingPost, setEditingPost] = useState(null);
    const [deletingPost, setDeletingPost] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Impact Counter State
    const [stats, setStats] = useState({ photos: 0, videos: 0, text: 0 });
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [activeMediaIdx, setActiveMediaIdx] = useState(0);

    // IEC Game Handlers
    const handleSelectGame = (gameId) => {
        setActiveGameId(gameId);
        setShowGameSelection(false);
        setShowGameLobby(true);
    };

    const handleStartGame = async (sessionId, gameId) => {
        setActiveSessionId(sessionId);
        setActiveGameId(gameId);
        setShowGameLobby(false);
        setIsGameActive(true);
        trackEvent('game_start', { sessionId, gameId });

        // CRITICAL: Update Firestore so mobile controllers know to transition
        try {
            const sid = sessionId.toUpperCase();
            const sessionRef = doc(db, 'game_sessions', sid);
            await updateDoc(sessionRef, {
                status: gameId === 'racing' ? 'racing' : 'quiz_active',
                startedAt: Date.now()
            });
        } catch (err) {
            console.error("Failed to start session in Firestore:", err);
        }
    };

    const handleGameOver = () => {
        setIsGameActive(false);
        setActiveSessionId(null);
        setActiveGameId(null);
    };
    const [rdatsData, setRdatsData] = useState([]);
    const [rdatsStats, setRdatsStats] = useState({ total: 0, byCenro: {} });
    const [showRdatsModal, setShowRdatsModal] = useState(false);
    const [pendingSubmissions, setPendingSubmissions] = useState([]);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [selectedSubIds, setSelectedSubIds] = useState([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [imgOrientations, setImgOrientations] = useState({}); // postId -> 'portrait'|'landscape'
    
    // DBMO Workflow State
    const [endorseCenro, setEndorseCenro] = useState('');
    const [endorseMonth, setEndorseMonth] = useState('');
    const [endorseActivity, setEndorseActivity] = useState('');
    const [endorseRdats2, setEndorseRdats2] = useState('');
    
    const [consolidateCenros, setConsolidateCenros] = useState([]);
    const [consolidateMonths, setConsolidateMonths] = useState([]);
    const [consolidateActivities, setConsolidateActivities] = useState([]);
    const [consolidateRdats2, setConsolidateRdats2] = useState('');

    // Pagination State
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);

    useEffect(() => {
        // Stats derive from posts automatically. No animation needed.
    }, []);

    // Removed redundant initial fetch to allow full sync to take over.

    // Show What's New modal for public users on every load
    useEffect(() => {
        if (!isAdmin && posts.length > 0) {
            setShowWhatsNew(true);
        }
    }, [posts, isAdmin]);


    // Full Real-time Sync
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'posts'), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sorted = allPosts.sort((a, b) => {
                const timeA = a.createdAt || a.timestamp || 0;
                const timeB = b.createdAt || b.timestamp || 0;
                return Number(timeB) - Number(timeA);
            });
            setPosts(sorted);
            setLoading(false);
        }, (err) => {
            console.error("Feed Sync Error:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Dynamic Stats Calculation based on loaded posts (Aggregated)
    useEffect(() => {
        const counts = posts.reduce((acc, post) => {
            if (post.type === 'photo') acc.photos++;
            else if (post.type === 'video') acc.videos++;
            else if (post.type === 'text') acc.text++;
            return acc;
        }, { photos: 0, videos: 0, text: 0 });

        setStats(counts);
    }, [posts]);

    // Keyboard shortcuts for Modal
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setSelectedPost(null);
                setActiveMediaIdx(0);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // RDATS Data Sync
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'rdats'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRdatsData(data);
        });
        return () => unsubscribe();
    }, []);

    // RDATS Pending Submissions Sync (Admin only)
    useEffect(() => {
        if (!isAdmin) return;
        const unsubscribe = onSnapshot(collection(db, 'rdats_pending'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingSubmissions(data.sort((a,b) => b.createdAt - a.createdAt));
        });
        return () => unsubscribe();
    }, [isAdmin]);

    const handleApproveSubmission = async (sub) => {
        try {
            await setDoc(doc(db, 'rdats', `${sub.table}_${sub.month}_${sub.cenro}`), {
                [sub.columnKey]: sub.value,
                [`${sub.columnKey}_updatedAt`]: Date.now(),
                [`${sub.columnKey}_source`]: 'public',
                updatedAt: Date.now()
            }, { merge: true });
            await deleteDoc(doc(db, 'rdats_pending', sub.id));
            setSuccess("Submission approved and added to database!");
        } catch (err) {
            setError("Approval failed: " + err.message);
        }
    };

    const handleRejectSubmission = async (subId) => {
        try {
            await deleteDoc(doc(db, 'rdats_pending', subId));
            setSuccess("Submission rejected and removed.");
        } catch (err) {
            setError("Rejection failed: " + err.message);
        }
    };

    const handleBulkApprove = async () => {
        if (selectedSubIds.length === 0) return;
        setIsBulkProcessing(true);
        let successCount = 0;
        try {
            for (const subId of selectedSubIds) {
                const sub = pendingSubmissions.find(s => s.id === subId);
                if (sub) {
                    await setDoc(doc(db, 'rdats', `${sub.table}_${sub.month}_${sub.cenro}`), {
                        [sub.columnKey]: sub.value,
                        [`${sub.columnKey}_updatedAt`]: Date.now(),
                        [`${sub.columnKey}_source`]: 'public',
                        updatedAt: Date.now()
                    }, { merge: true });
                    await deleteDoc(doc(db, 'rdats_pending', sub.id));
                    successCount++;
                }
            }
            setSelectedSubIds([]);
            setSuccess(`Successfully approved ${successCount} records.`);
        } catch (err) {
            setError(`Bulk approval partially failed: ${err.message}`);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedSubIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to reject and delete ${selectedSubIds.length} submissions?`)) return;
        
        setIsBulkProcessing(true);
        try {
            for (const subId of selectedSubIds) {
                await deleteDoc(doc(db, 'rdats_pending', subId));
            }
            setSelectedSubIds([]);
            setSuccess(`Rejected ${selectedSubIds.length} records.`);
        } catch (err) {
            setError(`Bulk rejection partially failed: ${err.message}`);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // RDATS Stats Calculation (PAL codes)
    useEffect(() => {
        const stats = { total: 0, byCenro: {} };
        const EXPECTED_PER_CENRO = 156; // 6 months * 26 columns

        const normalizeCenroMatch = (c) => {
            if (!c) return "";
            const n = c.trim().toUpperCase();
            if (n.includes("BROOKE") && n.includes("POINT")) return "BROOKE'S POINT";
            return n;
        };

        rdatsData.forEach(doc => {
            // Find which CENRO this doc belongs to (docId: t1_JANUARY_CORON)
            const parts = doc.id.split('_');
            const month = parts[1];
            const rawCenro = parts[parts.length - 1];
            const cenro = normalizeCenroMatch(rawCenro);

            if (CENRO_LIST.includes(cenro) && SEMES_MONTHS[semester].includes(month)) {
                if (!stats.byCenro[cenro]) stats.byCenro[cenro] = 0;

                // Count "PAL" in all fields except metadata
                Object.entries(doc).forEach(([key, value]) => {
                    if (key !== 'id' && key !== 'updatedAt' && typeof value === 'string') {
                        if (value.toUpperCase().includes('PAL')) {
                            stats.byCenro[cenro]++;
                            stats.total++;
                        }
                    }
                });
            }
        });

        // Add expected totals for calculations
        stats.expectedPerCenro = EXPECTED_PER_CENRO;
        stats.totalExpected = CENRO_LIST.length * EXPECTED_PER_CENRO;

        setRdatsStats(stats);
    }, [rdatsData, semester]);

    const getColumnLabel = (table, key) => {
        const list = table === 't1' ? TABLE1_KEYS : TABLE2_KEYS;
        const found = list.find(k => k.key === key);
        return found ? found.label : key;
    };

    const fetchMorePosts = async () => {
        if (!lastVisible || loadingMore) return;
        setLoadingMore(true);

        try {
            const q = query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(6)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setHasMore(false);
            } else {
                const nextPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPosts(prev => [...prev, ...nextPosts]);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                if (snapshot.docs.length < 6) setHasMore(false);
            }
        } catch (e) {
            console.error("Load More Error:", e);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);

            // Create previews
            const newPreviews = selectedFiles.map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                url: URL.createObjectURL(f),
                type: f.type.startsWith('image') ? 'photo' : 'video'
            }));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (id, index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter(p => p.id !== id));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);
        setError('');
        setSuccess('');

        try {
            let finalMediaUrls = [];

            // Case 1: Direct File Uploads to Cloudinary
            if (files.length > 0 && activeTab !== 'text') {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setUploadStatus(`Uploading file ${i + 1} of ${files.length}: ${file.name}...`);
                    console.log(`[CLOUDINARY] Uploading: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

                    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('upload_preset', CLOUDINARY_PRESET);

                    let uploadResult;
                    try {
                        const response = await fetch(
                            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
                            { method: 'POST', body: formData }
                        );
                        if (!response.ok) {
                            const errData = await response.json();
                            throw new Error(errData.error?.message || `HTTP ${response.status}`);
                        }
                        uploadResult = await response.json();
                        console.log(`[CLOUDINARY] Done: ${uploadResult.secure_url}`);
                    } catch (uploadErr) {
                        throw new Error(`Upload failed for ${file.name}: ${uploadErr.message}`);
                    }

                    setUploadStatus(`Getting URL ${i + 1} of ${files.length}...`);
                    finalMediaUrls.push(uploadResult.secure_url);
                }
            }

            // Case 2: YouTube Link
            if (activeTab === 'youtube' && youtubeUrl) {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = youtubeUrl.match(regExp);
                const videoId = (match && match[2].length === 11) ? match[2] : null;

                if (videoId) {
                    finalMediaUrls = [`https://www.youtube.com/embed/${videoId}`];
                } else {
                    throw new Error('Invalid YouTube URL. Please copy-paste the full link.');
                }
            }

            // VALIDATION: For photo/video tabs, we must have media URLs
            if ((activeTab === 'photo' || activeTab === 'video') && finalMediaUrls.length === 0) {
                throw new Error('No files were uploaded. Please select a photo or video file before publishing.');
            }

            const postData = {
                type: activeTab === 'youtube' ? 'video' : activeTab,
                title,
                description,
                mediaUrls: finalMediaUrls,
                isYoutube: activeTab === 'youtube',
                createdAt: Date.now()
            };

            setUploadStatus('Saving to database...');
            await addDoc(collection(db, 'posts'), postData);
            trackEvent('create_post', { title: postData.title, type: postData.type });

            setSuccess('SUCCESS! Published to the ENGP/IEC Global Feed.');
            setUploadStatus('');
            setTitle('');
            setDescription('');
            setFiles([]);
            setPreviews([]);
            setYoutubeUrl('');
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';
            window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'smooth' });
            setTimeout(() => setSuccess(''), 5000);

        } catch (err) {
            console.error('[UPLOAD] Fatal Error:', err);
            setUploadStatus('');
            let userFriendlyError;

            if (err.code === 'permission-denied') {
                userFriendlyError = '❌ FIRESTORE BLOCKED: Go to Firebase Console → Firestore → Rules tab → set "allow read, write: if true;" → Publish.';
            } else if (err.message && err.message.toLowerCase().includes('permission-denied')) {
                userFriendlyError = '❌ FIRESTORE BLOCKED: Go to Firebase Console → Firestore → Rules tab → set "allow read, write: if true;" → Publish.';
            } else if (err.message && err.message.toLowerCase().includes('upload failed')) {
                userFriendlyError = `❌ CLOUDINARY UPLOAD BLOCKED: Check that your upload preset "denr_feed" is set to UNSIGNED mode in Cloudinary Console. (${err.message})`;
            } else if (err.message) {
                userFriendlyError = `❌ ${err.message}`;
            } else {
                userFriendlyError = '❌ Unknown error. Check internet and Firebase setup.';
            }

            setError(userFriendlyError);
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    const handleDelete = async () => {
        if (!deletingPost) return;
        try {
            await deleteDoc(doc(db, 'posts', deletingPost.id));

            // Optimistic Update: Remove from local state immediately
            setPosts(prev => prev.filter(p => p.id !== deletingPost.id));

            setDeletingPost(null);
            setSuccess("RESOURCE DELETED: Document has been removed from ENGP server.");
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setPosts(posts.filter(p => p.id !== deletingPost.id));
            setDeletingPost(null);
            setSuccess("Removed from local view.");
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const startEdit = (post) => {
        setEditingPost(post);
        setEditTitle(post.title || '');
        setEditDescription(post.description || '');
    };

    const closeEdit = () => {
        setEditingPost(null);
        setEditTitle('');
        setEditDescription('');
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        if (!editingPost) return;

        try {
            await updateDoc(doc(db, 'posts', editingPost.id), {
                title: editTitle,
                description: editDescription
            });

            // Optimistic Update: update local state immediately
            setPosts(prev => prev.map(p =>
                p.id === editingPost.id ? { ...p, title: editTitle, description: editDescription } : p
            ));

            setEditingPost(null);
            setSuccess("RESOURCE UPDATED: Changes synchronized successfully.");
            setTimeout(() => setSuccess(''), 3000);
        } catch (e) {
            setPosts(posts.map(p =>
                p.id === editingPost.id ? { ...p, title: editTitle, description: editDescription } : p
            ));
            setEditingPost(null);
            setSuccess("Updated local view.");
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const getYoutubeThumb = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        return id ? `https://img.youtube.com/vi/${id}/0.jpg` : '';
    };

    const MediaCollage = ({ mediaUrls, type, isYoutube, onMediaClick, size = 'feed' }) => {
        if (!mediaUrls || mediaUrls.length === 0) return null;

        const count = mediaUrls.length;
        const isModal = size === 'modal';

        if (type === 'video') {
            return (
                <div className="collage-grid" onClick={() => onMediaClick && onMediaClick(0)} style={{ gridTemplateColumns: '1fr' }}>
                    {isYoutube ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', background: '#000' }}>
                            <iframe
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                src={mediaUrls[0]}
                                title="YouTube video"
                                allowFullScreen
                            ></iframe>
                        </div>
                    ) : (
                        <video src={mediaUrls[0]} controls={isModal} className="post-media" style={{ borderRadius: '12px', width: '100%', maxHeight: isModal ? '70vh' : '420px', objectFit: isModal ? 'contain' : 'cover' }} />
                    )}
                </div>
            );
        }

        // FB Style Grids
        let gridTemplate = '1fr';
        let height = 'auto';
        let maxHeight = isModal ? '80vh' : '400px';

        if (count === 1) {
            return (
                <div style={{ position: 'relative', width: '100%', borderRadius: '14px', overflow: 'hidden', marginTop: '0.5rem', cursor: 'pointer', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)' }} onClick={() => onMediaClick && onMediaClick(0)}>
                    <img src={mediaUrls[0]} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px) brightness(0.3)', transform: 'scale(1.1)', zIndex: 0 }} />
                    <img src={mediaUrls[0]} alt="Post" loading="lazy" style={{ display: 'block', width: '100%', height: 'auto', position: 'relative', zIndex: 1, maxHeight: isModal ? '80vh' : '600px', objectFit: 'contain' }} />
                </div>
            );
        }

        if (count === 2) {
            gridTemplate = '1fr 1fr';
            height = isModal ? '60vh' : '320px';
        } else if (count === 3) {
            gridTemplate = '1.7fr 1fr';
            height = isModal ? '70vh' : '380px';
        } else if (count === 4) {
            gridTemplate = '1fr 1fr';
            height = isModal ? '75vh' : '480px';
        } else if (count >= 5) {
            gridTemplate = '1fr 1fr 1fr';
            height = isModal ? '80vh' : '580px';
        }

        return (
            <div className="collage-grid" style={{
                gridTemplateColumns: gridTemplate,
                gridTemplateRows: count === 3 ? '1fr 1fr' : (count === 4 ? '1fr 1fr' : (count >= 5 ? '1fr 1fr' : '1fr')),
                height: height,
                maxHeight: maxHeight,
                gap: '4px'
            }}>
                {mediaUrls.slice(0, 5).map((url, idx) => {
                    let gridArea = 'auto';
                    if (count === 3) {
                        if (idx === 0) gridArea = '1 / 1 / 3 / 2';
                    } else if (count === 4) {
                        gridArea = 'auto';
                    } else if (count === 5) {
                        if (idx === 0) gridArea = '1 / 1 / 2 / 3';
                        else if (idx === 1) gridArea = '1 / 3 / 2 / 4';
                    }

                    const isLast = idx === 4 && count > 5;

                    return (
                        <div key={idx} className="collage-item" style={{ gridArea }} onClick={() => onMediaClick && onMediaClick(idx)}>
                            <img src={url} alt="Collage" loading="lazy" style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block', transition: 'transform 0.5s ease' }} />
                            {isLast && (
                                <div className="collage-more-overlay">
                                    <Plus size={32} /> {count - 5}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };


    const formatDate = (date) => {
        if (!date) return 'Just now';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            return format(d, "MMMM d, yyyy 'at' h:mm a");
        } catch (e) {
            return 'Just now';
        }
    };

    return (
        <div style={{ paddingTop: '70px' }}> {/* Padding to account for fixed navbar */}
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes modalPop {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @media (max-width: 900px) {
                    .rdats-pie-container {
                        grid-template-columns: 1fr !important;
                        padding: 1rem !important;
                        gap: 2rem !important;
                    }
                }

                @media (max-width: 600px) {
                    .detail-modal-content {
                        width: 100% !important;
                        height: 100% !important;
                        max-width: 100% !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        overflow-y: auto !important;
                    }
                    .detail-body {
                        flex-direction: column !important;
                    }
                    .detail-media-container {
                        width: 100% !important;
                        max-height: 50vh !important;
                    }
                    .navbar-content {
                        flex-direction: column !important;
                        gap: 1rem !important;
                        padding: 1rem !important;
                    }
                    .glass-navbar {
                        height: auto !important;
                        padding: 0.5rem 0 !important;
                    }
                    .hero-content h1 {
                        font-size: 2rem !important;
                    }
                    .hero-section {
                        padding: 4rem 1rem !important;
                        min-height: auto !important;
                    }
                }
            `}</style>
            {/* Top Navigation Bar */}
            <nav className="glass-navbar">
                <div className="navbar-content">
                    <div className="flex-center gap-2" style={{ color: 'var(--denr-green-light)' }}>
                        <Leaf size={24} />
                        <span style={{ fontWeight: 800, letterSpacing: '0.05em', fontSize: '1.25rem' }}>DENR-ENGP <span style={{ fontWeight: 300, opacity: 0.7 }}>| IEC Portal</span></span>
                    </div>
                    {!hasAnyAdminAccess ? (
                        <div className="flex-center gap-3">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            <button className="btn-glass-nav" onClick={onAdminClick}>
                                <Shield size={16} /> Log-in
                            </button>
                        </div>
                    ) : (
                        <div className="flex-center gap-3">
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            {isAdmin && (
                                <button className="btn-glass-nav" onClick={() => setShowAnalytics(true)} style={{ borderColor: 'var(--denr-green-glow)', background: 'rgba(5, 150, 105, 0.1)' }}>
                                    <TrendingUp size={16} /> Insights
                                </button>
                            )}
                            {(isAdmin || userRole === 'feo') && (
                                <button className="btn-glass-nav" onClick={() => { console.log('[DIAG] Emergency FEO Trigger'); setShowFeoModal(true); setViewMode('feo-shapefile'); }} style={{ borderColor: '#60a5fa', color: '#93c5fd' }}>
                                    <Globe size={16} /> FEO
                                </button>
                            )}
                            <button className="btn-glass-nav" onClick={onLogout} style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                <ShieldClose size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-bg"></div>
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <div className="flex-center gap-3" style={{ marginBottom: '1.5rem' }}>
                        <Leaf color="var(--denr-green-light)" size={32} />
                        <span style={{ color: 'var(--denr-green-light)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.9rem' }}>ENGP • IEC • Conservation</span>
                    </div>
                    <h1 style={{ color: 'var(--text-primary)' }}>
                        Greening the Future <br />
                        <span className="title-gradient">Empowering the People.</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Official Digital Pulse of the Enhanced National Greening Program and Environmental Information, Education, and Communication campaigns.
                    </p>

                    <div className="flex-center gap-4" style={{ marginTop: '2.5rem' }}>
                        <button className="btn btn-primary" onClick={() => document.getElementById('impact-stats')?.scrollIntoView({ behavior: 'smooth' })}>
                            Explore Updates <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {/* IMPACT COUNTER SECTION - NOW CONSOLIDATED MODALS */}
            <section id="impact-stats" className="app-container" style={{ marginTop: '-4rem', position: 'relative', zIndex: 5, marginBottom: '4rem' }}>
                <div className="stats-grid main-modals-container">
                    
                    {/* NEW IEC HOLOGRAM CARD */}
                    <div
                        className="surface-glass stat-card"
                        style={{ cursor: 'pointer', border: '1px solid rgba(168, 85, 247, 0.4)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, var(--bg-app) 100%)' }}
                        onClick={() => setShowIecModal(true)}
                    >
                        <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                            <GalleryHorizontal size={24} />
                        </div>
                        <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>IEC</div>
                        <div className="stat-label" style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>GALLERY & MEDIA</div>
                    </div>

                    {/* NEW RDATS TRACKER CARD */}
                    <div
                        className="surface-glass stat-card"
                        style={{ cursor: 'pointer', border: '1px solid var(--denr-green-glow)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--bg-app) 100%)' }}
                        onClick={() => handleProtectedAction(['admin', 'supervisor', 'finance', 'financial', 'feo', 'public'], 'The IEC role is restricted specifically to media uploads and announcements. RDATS access is denied.', () => setShowRdatsModal(true))}
                    >
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--denr-green-light)', border: '1px solid var(--denr-green-glow)' }}>
                            <Activity size={24} />
                        </div>
                        <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>RDATS</div>
                        <div className="stat-label" style={{ color: 'var(--denr-green-light)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>TRACKER APP</div>
                    </div>

                    {/* SUPERVISE DASHBOARD (SUPERVISORS ONLY) */}
                    {!isFinancialOrFeo && userRole !== 'public' && isSupervisor && (
                        <div
                            className="surface-glass stat-card"
                            style={{ cursor: 'pointer', border: '1px solid rgba(217, 119, 6, 0.4)', background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, var(--bg-app) 100%)' }}
                            onClick={() => setShowSuperviseModal(true)}
                        >
                            <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                                <Boxes size={24} />
                            </div>
                            <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.5rem', letterSpacing: '0.05em', color: '#fff' }}>SUPERVISE</div>
                            <div className="stat-label" style={{ color: '#d97706', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>REGIONAL DASHBOARD</div>
                        </div>
                    )}

                    {/* NEW CDS CARD */}
                    <div
                        className="surface-glass stat-card"
                        style={{ cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, var(--bg-app) 100%)' }}
                        onClick={() => setShowCdsModal(true)}
                    >
                        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            <Compass size={24} />
                        </div>
                        <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>CDS</div>
                        <div className="stat-label" style={{ color: '#60a5fa', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>DISCOVERY SECTION</div>
                    </div>

                    {/* NEW eNGP HUB CARD (STAFF ONLY) */}
                    {hasAnyAdminAccess && (
                        <div
                            className="surface-glass stat-card"
                            style={{ position: 'relative', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, var(--bg-app) 100%)' }}
                            onClick={() => setShowEngpHub(true)}
                        >
                            {pendingSubmissions.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', top: '-10px', right: '-10px', 
                                    background: '#ef4444', color: '#fff', padding: '0.2rem 0.6rem', 
                                    borderRadius: '20px', fontSize: '0.8rem', fontWeight: 900, 
                                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)', 
                                    animation: 'pulse 2s infinite',
                                    zIndex: 10
                                }}>
                                    {pendingSubmissions.length}
                                </div>
                            )}
                            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '0.5rem', letterSpacing: '0.05em' }}>eNGP</div>
                            <div className="stat-label" style={{ color: '#f87171', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.1em' }}>MANAGEMENT HUB</div>
                        </div>
                    )}
                </div>
            </section>



            {/* Main Container */}
            <main className="app-container">

                {/* CREATE POST SECTION (REDESIGNED COMPOSER) */}
                {(isAdmin || isIec) && (
                    <div className="surface-glass" style={{ marginBottom: '3.5rem', border: '1px solid var(--denr-green-glow)' }}>
                        <div className="composer-header">
                            <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: 0 }}>
                                <UploadCloud size={22} color="var(--denr-green-light)" />
                                {isIec ? "IEC Media & Announcements" : "Create New IEC Resource"}
                            </h2>
                            <div className="text-muted text-sm">Drafting as <strong>{isIec ? "IEC Specialist" : "Admin"}</strong></div>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {success && (
                                <div style={{ background: 'rgba(5, 150, 105, 0.1)', color: 'var(--denr-green-light)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--denr-green-glow)', animation: 'modalPop 0.4s ease' }}>
                                    <CheckCircle size={24} />
                                    <span style={{ fontWeight: 600 }}>{success}</span>
                                </div>
                            )}

                            {error && (
                                <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#fca5a5', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(220,38,38,0.3)' }}>
                                    {error}
                                </div>
                            )}

                            <div className="composer-tabs">
                                {[
                                    { id: 'photo', icon: <Images size={18} />, label: 'Gallery' },
                                    { id: 'video', icon: <MonitorPlay size={18} />, label: 'Source File' },
                                    { id: 'youtube', icon: <Globe size={18} />, label: 'YouTube Link' },
                                    { id: 'text', icon: <Newspaper size={18} />, label: 'Announcement' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`composer-tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => { setActiveTab(tab.id); if (tab.id !== 'youtube') setYoutubeUrl(''); }}
                                    >
                                        {tab.icon} {tab.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <input
                                    type="text"
                                    className="input-modern"
                                    placeholder="Enter Post Title (e.g. Tree Planting Report)..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    style={{ fontSize: '1.1rem', fontWeight: 600 }}
                                />

                                <textarea
                                    className="input-modern"
                                    rows="4"
                                    placeholder="Tell the community about this ENGP/IEC update..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />

                                {activeTab === 'youtube' && (
                                    <div style={{ padding: '0.5rem 0' }}>
                                        <input
                                            type="url"
                                            className="input-modern"
                                            placeholder="Paste YouTube Video URL here..."
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            required={activeTab === 'youtube'}
                                            style={{ borderColor: youtubeUrl ? '#ef4444' : 'var(--border-light)' }}
                                        />
                                        {youtubeUrl && (
                                            <div className="youtube-preview-card">
                                                <Video size={20} color="#ef4444" />
                                                <span className="text-sm">Video will be embedded directly from YouTube.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(activeTab === 'photo' || activeTab === 'video') && (
                                    <div>
                                        <div style={{ border: '2px dashed var(--border-light)', borderRadius: 'var(--radius-md)', padding: '2.5rem', textAlign: 'center', background: 'var(--bg-input)' }}>
                                            <input
                                                type="file"
                                                id="file-upload"
                                                accept={activeTab === 'photo' ? "image/*" : "video/*"}
                                                multiple={true}
                                                style={{ display: 'none' }}
                                                onChange={handleFileChange}
                                            />
                                            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                                                    {activeTab === 'photo' ? <ImageIcon size={32} color="var(--denr-green-light)" /> : <Video size={32} color="var(--denr-green-light)" />}
                                                </div>
                                                <div>
                                                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Click to Browse Media</span>
                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Upload multiple ENGP materials instantly.</p>
                                                </div>
                                            </label>
                                        </div>

                                        {/* PREVIEW GRID */}
                                        {previews.length > 0 && (
                                            <div className="preview-grid">
                                                {previews.map((preview, idx) => (
                                                    <div key={preview.id} className="preview-item">
                                                        <button type="button" className="preview-remove" onClick={() => removeFile(preview.id, idx)}>
                                                            <X size={14} />
                                                        </button>
                                                        {preview.type === 'photo' ? (
                                                            <img src={preview.url} alt="Selection preview" />
                                                        ) : (
                                                            <video src={preview.url} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" style={{ padding: '1.1rem', fontSize: '1.1rem' }} disabled={uploading}>
                                    {uploading ? (uploadStatus || 'Processing Data...') : `Publish to ENGP Feed`}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* FEED CONTROLS & SEARCH */}
                <div className="feed-controls surface-glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
                    <div className="search-bar-container" style={{ width: '100%', maxWidth: 'none' }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search resources..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%' }}
                        />
                        <div className="search-icon"><ArrowRight size={20} /></div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', width: '100%' }}>
                        <div className="filter-group" style={{ margin: 0 }}>
                            {['all', 'photo', 'video', 'text'].map(type => (
                                <button
                                    key={type}
                                    className={`filter-btn ${filterType === type ? 'active' : ''}`}
                                    onClick={() => setFilterType(type)}
                                >
                                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                                </button>
                            ))}
                        </div>

                        <div className="view-toggle" style={{ margin: 0 }}>
                            <button className={`toggle-btn ${viewMode === 'feed' ? 'active' : ''}`} onClick={() => setViewMode('feed')}>
                                <List size={18} />
                            </button>
                            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                                <Grid3x3 size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-center text-muted" style={{ height: '200px' }}>Syncing with global network...</div>
                ) : (
                    <>
                        <div className={viewMode === 'feed' ? "feed-grid" : "gallery-grid"}>
                            {posts
                                .filter(post => {
                                    const matchesSearch = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        post.description?.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchesFilter = filterType === 'all' || post.type === filterType;
                                    return matchesSearch && matchesFilter;
                                })
                                .map((post) => (
                                    viewMode === 'feed' ? (
                                        <article key={post.id} className="surface-glass post-card" style={{ position: 'relative' }}>

                                            {/* Admin CRUD Controls Overlay */}
                                            {(isAdmin || isIec) && (
                                                <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', display: 'flex', gap: '0.75rem', zIndex: 10 }}>
                                                    <button onClick={() => startEdit(post)} className="btn btn-glass" style={{ padding: '0.6rem', minWidth: 'auto', background: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.3)' }} title="Edit IEC Resource">
                                                        <Edit3 size={18} color="#60a5fa" />
                                                    </button>
                                                    <button onClick={() => setDeletingPost(post)} className="btn btn-glass" style={{ padding: '0.6rem', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Delete from Feed">
                                                        <Trash2 size={18} color="#f87171" />
                                                    </button>
                                                </div>
                                            )}

                                            <header className="post-header" style={{ paddingRight: isAdmin ? '6rem' : '1.5rem' }}>
                                                <div className="flex-center gap-3">
                                                    <div className="icon-badge" style={{ padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--denr-green-light)', border: '1px solid var(--border-glow)' }}>
                                                        {post.type === 'photo' && <ImageIcon size={22} />}
                                                        {post.type === 'video' && <Video size={22} />}
                                                        {post.type === 'text' && <FileText size={22} />}
                                                    </div>

                                                    <div>
                                                        <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>{post.title}</h3>
                                                        <div className="flex-center gap-2 text-muted text-sm" style={{ justifyContent: 'flex-start' }}>
                                                            <Calendar size={14} />
                                                            <span>{formatDate(post.createdAt)}</span>
                                                            <span style={{ margin: '0 0.5rem' }}>•</span>
                                                            <span style={{ color: 'var(--denr-green-light)', fontWeight: 600 }}>Official IEC Entry</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </header>

                                            <div className="post-body" onClick={() => { setSelectedPost(post); trackEvent('view_post', { postId: post.id, title: post.title }); }} style={{ cursor: 'pointer' }}>
                                                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', fontSize: '1.05rem', lineHeight: 1.7, padding: '0 1.5rem 1rem 1.5rem' }}>
                                                    {post.description}
                                                </p>
                                                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                                    <MediaCollage
                                                        mediaUrls={post.mediaUrls}
                                                        type={post.type}
                                                        isYoutube={post.isYoutube}
                                                        onMediaClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                                                    />
                                                </div>
                                            </div>
                                        </article>
                                    ) : (
                                        <div key={post.id} onClick={() => setSelectedPost(post)} className="gallery-item surface-glass" style={{ position: 'relative', height: '240px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                                            <div className="grid-card-content">
                                                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                                                    post.type === 'photo' ? (
                                                        <img src={post.mediaUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={post.title} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                            {post.isYoutube ? (
                                                                <img src={getYoutubeThumb(post.mediaUrls[0])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={post.title} />
                                                            ) : (
                                                                <video src={post.mediaUrls[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                                            )}
                                                            <div className="video-thumb-overlay"><Video size={24} /></div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div style={{ background: 'var(--bg-input)', width: '100%', height: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                        <FileText size={24} style={{ marginBottom: '0.5rem', color: 'var(--denr-green-light)' }} />
                                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', padding: '1.5rem 1rem 1rem 1rem', color: '#fff' }}>
                                                {post.type === 'photo' && <ImageIcon size={14} style={{ float: 'left', marginRight: '0.5rem', color: 'var(--denr-green-light)' }} />}
                                                {post.type === 'video' && <Video size={14} style={{ float: 'left', marginRight: '0.5rem', color: 'var(--denr-green-light)' }} />}
                                                {post.type === 'text' && <FileText size={14} style={{ float: 'left', marginRight: '0.5rem', color: 'var(--denr-green-light)' }} />}
                                                <h4 style={{ fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{post.title}</h4>
                                            </div>
                                        </div>
                                    )
                                ))}
                        </div>

                        {posts.length > 0 && hasMore && (
                            <div className="flex-center" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
                                <button
                                    className="btn btn-glass-load"
                                    onClick={fetchMorePosts}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? 'Syncing Older Data...' : 'Show Older Resources'}
                                </button>
                            </div>
                        )}

                        {posts.length === 0 && !loading && (
                            <div className="flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1.5rem', opacity: 0.6 }}>
                                <div style={{ border: '1px solid var(--border-light)', padding: '2rem', borderRadius: '50%' }}>
                                    <Leaf size={48} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>The Feed is Clean</h3>
                                    <p className="text-sm">No official resources have been published yet.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* FULL POST DETAIL MODAL (Premium Lightroom View) */}
            {selectedPost && (
                <div className="modal-overlay" onClick={() => { setSelectedPost(null); setActiveMediaIdx(0); }}>
                    <div className="premium-modal-window" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="premium-modal-body" style={{ padding: 0, height: '100%', overflow: 'hidden' }}>
                            <div className="detail-body">
                            {/* Focus Area: Large Image/Video */}
                            <div className="detail-media-container">
                                <button className="btn btn-glass" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 60, borderRadius: '50%', padding: '0.5rem', background: 'rgba(0,0,0,0.5)' }} onClick={() => { setSelectedPost(null); setActiveMediaIdx(0); }}>
                                    <X size={24} />
                                </button>

                                {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 1 && (
                                    <>
                                        <button className="media-nav-btn media-nav-prev" onClick={() => setActiveMediaIdx(prev => (prev > 0 ? prev - 1 : selectedPost.mediaUrls.length - 1))}>
                                            <ChevronLeft size={30} />
                                        </button>
                                        <button className="media-nav-btn media-nav-next" onClick={() => setActiveMediaIdx(prev => (prev < selectedPost.mediaUrls.length - 1 ? prev + 1 : 0))}>
                                            <ChevronRight size={30} />
                                        </button>
                                        <div className="media-counter">
                                            {activeMediaIdx + 1} / {selectedPost.mediaUrls.length}
                                        </div>
                                    </>
                                )}

                                <div className="detail-media-inner">
                                    {selectedPost.type === 'video' ? (
                                        selectedPost.isYoutube ? (
                                            <iframe
                                                style={{ width: '100%', height: '100%', border: 0, borderRadius: '12px' }}
                                                src={selectedPost.mediaUrls[activeMediaIdx]}
                                                title="YouTube video"
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <video src={selectedPost.mediaUrls[activeMediaIdx]} controls className="post-media" style={{ borderRadius: '12px', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        )
                                    ) : (
                                        <img 
                                            src={selectedPost.mediaUrls[activeMediaIdx]} 
                                            alt="Focus" 
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} 
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Info Sidebar */}
                            <div className="detail-info">
                                <header style={{ marginBottom: '2rem' }}>
                                    <div className="flex-center gap-3" style={{ justifyContent: 'flex-start', marginBottom: '1.5rem', opacity: 0.6 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                                            {selectedPost.type === 'photo' ? <Images size={18} /> : <Video size={18} />}
                                        </div>
                                        <span className="text-xs font-bold uppercase letter-spacing-1">{selectedPost.type} Resource</span>
                                    </div>
                                    <h2 style={{ color: 'var(--text-primary)' }}>{selectedPost.title}</h2>
                                    <div className="flex-center gap-2 text-muted text-sm" style={{ justifyContent: 'flex-start', marginTop: '0.75rem' }}>
                                        <Calendar size={14} />
                                        <span>{formatDate(selectedPost.createdAt)}</span>
                                    </div>
                                </header>

                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem' }}>
                                    <p style={{ whiteSpace: 'pre-line', lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                                        {selectedPost.description}
                                    </p>
                                </div>

                                <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid var(--border-glow)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'relative', zIndex: 2 }}>
                                        <div className="flex-center gap-2" style={{ justifyContent: 'flex-start', color: 'var(--denr-green-light)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                            <CheckCircle2 size={16} />
                                            OFFICIAL ENGP CONTENT
                                        </div>
                                        <p className="text-xs text-muted">Verified by Provincial Information Office.</p>
                                    </div>
                                    <Shield size={60} style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.05, transform: 'rotate(-15deg)' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deletingPost && (
                <div className="modal-overlay" onClick={() => setDeletingPost(null)}>
                    <div className="premium-modal-window modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', height: 'auto' }}>
                        <div className="premium-modal-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fca5a5' }}>Confirm Deletion</h2>
                            <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setDeletingPost(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="premium-modal-body" style={{ padding: '2rem' }}>
                            <p className="modal-desc">Are you sure you want to permanently remove this resource? This action cannot be undone.</p>
                            <div className="danger-zone">
                                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.5rem' }}>{deletingPost.title}</strong>
                                <span className="text-sm text-muted">Posted on {formatDate(deletingPost.createdAt)}</span>
                            </div>
                            <div className="flex-center gap-3" style={{ marginTop: '2rem' }}>
                                <button className="btn btn-glass" style={{ flex: 1 }} onClick={() => setDeletingPost(null)}>Cancel</button>
                                <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', boxShadow: '0 8px 20px -6px rgba(239, 68, 68, 0.5)' }} onClick={handleDelete}>Delete Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT POST MODAL */}
            {editingPost && (
                <div className="modal-overlay" onClick={closeEdit}>
                    <div className="premium-modal-window modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto' }}>
                        <div className="premium-modal-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Edit3 size={20} color="var(--denr-green-light)" />
                                Edit IEC Resource
                            </h2>
                            <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={closeEdit}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="premium-modal-body" style={{ padding: '2rem' }}>
                            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="text-sm text-muted" style={{ marginBottom: '0.5rem', display: 'block' }}>Resource Title</label>
                                    <input
                                        type="text"
                                        className="input-modern"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted" style={{ marginBottom: '0.5rem', display: 'block' }}>Detailed Description</label>
                                    <textarea
                                        className="input-modern"
                                        value={editDescription}
                                        rows="6"
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex-center gap-3" style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={closeEdit}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Resource</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <RdatsModal
                showRdatsModal={showRdatsModal}
                setShowRdatsModal={setShowRdatsModal}
                rdatsData={rdatsData}
                rdatsStats={rdatsStats}
                setSuccess={setSuccess}
                semester={semester}
                setSemester={setSemester}
                userEmail={userEmail}
                userRole={userRole}
            />
            {showSuperviseModal && (
                <SuperviseModal 
                    userEmail={userEmail}
                    onClose={() => setShowSuperviseModal(false)}
                />
            )}
            {showCdsModal && (
                <div className="modal-overlay" onClick={() => setShowCdsModal(false)}>
                    <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', padding: '2rem', textAlign: 'center' }}>
                        <div className="premium-modal-header" style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.3)', paddingBottom: '1rem' }}>
                            <Compass size={28} color="#60a5fa" />
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#60a5fa' }}>CDS System</h2>
                            <button className="btn btn-glass" style={{ marginLeft: 'auto', padding: '0.3rem' }} onClick={() => setShowCdsModal(false)}><X size={20} /></button>
                        </div>
                        <div className="premium-modal-body" style={{ padding: '3rem 0', opacity: 0.6 }}>
                            <Construction size={48} style={{ marginBottom: '1rem' }} />
                            <p>This module is currently empty and pending further development.</p>
                        </div>
                    </div>
                </div>
            )}
            {showDbmoModal && isAdmin && (
                <div className="modal-overlay" onClick={() => setShowDbmoModal(false)}>
                    <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '1400px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="premium-modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)', background: 'linear-gradient(to right, rgba(239, 68, 68, 0.15), transparent)' }}>
                            <div className="flex-center gap-3">
                                <ShieldCheck size={22} color="#f87171" />
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fca5a5', fontWeight: 800, letterSpacing: '0.05em' }}>DBMO PORTAL <span style={{ opacity: 0.5, fontWeight: 300 }}>| Admin Console</span></h2>
                            </div>
                            <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setShowDbmoModal(false)}><X size={20} /></button>
                        </div>
                        
                        <div className="premium-modal-body" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', padding: 0 }}>
                            {/* Sidebar */}
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => setViewMode('dbmo-rdats')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-rdats' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-rdats' ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-rdats' ? '#fca5a5' : '#888'
                                    }}
                                >
                                    <Inbox size={18} /> RDATS Inbox
                                    {pendingSubmissions.length > 0 && <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{pendingSubmissions.length}</span>}
                                </button>
                                <button 
                                    onClick={() => { setShowForestNurseryModal(true); setShowDbmoModal(false); }}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: 'transparent',
                                        borderColor: 'transparent',
                                        color: '#888'
                                    }}
                                >
                                    <Trees size={18} /> Forest Nursery
                                </button>
                                <button 
                                    onClick={() => { setShowMaintenanceModal(true); setShowDbmoModal(false); }}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: 'transparent',
                                        borderColor: 'transparent',
                                        color: '#888'
                                    }}
                                >
                                    <ShieldCheck size={18} /> Maintenance & Protection
                                </button>
                                <button 
                                    className="btn-glass-nav" 
                                    disabled
                                    style={{ width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px', opacity: 0.4, cursor: 'not-allowed' }}
                                >
                                    <Globe size={18} /> Site Visit
                                </button>
                                <button 
                                    onClick={() => setViewMode('dbmo-contracts')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-contracts' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-contracts' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-contracts' ? '#60a5fa' : '#888'
                                    }}
                                >
                                    <Layers size={18} /> Contract Database
                                </button>
                                
                                <div style={{ height: '2rem' }}></div>
                                <div style={{ fontSize: '0.65rem', color: '#555', padding: '0 1rem', fontWeight: 800, letterSpacing: '0.1em' }}>RDATS WORKFLOW</div>
                                
                                <button 
                                    onClick={() => setViewMode('dbmo-endorse')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-endorse' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-endorse' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-endorse' ? 'var(--denr-green-light)' : '#888'
                                    }}
                                >
                                    <ShieldCheck size={18} /> Endorse Activity
                                </button>
                                <button 
                                    onClick={() => setViewMode('dbmo-consolidate')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-consolidate' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-consolidate' ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-consolidate' ? '#fbbf24' : '#888'
                                    }}
                                >
                                    <Combine size={18} /> Consolidate
                                </button>

                                <div style={{ height: '1rem' }}></div>
                                <div style={{ fontSize: '0.65rem', color: '#555', padding: '0 1rem', fontWeight: 800, letterSpacing: '0.1em' }}>RDATS ADVANCED</div>

                                <button 
                                    onClick={() => setViewMode('dbmo-level3')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-level3' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-level3' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-level3' ? '#60a5fa' : '#888'
                                    }}
                                >
                                    <LayoutDashboard size={18} /> Quarterly (L3)
                                </button>
                                <button 
                                    onClick={() => setViewMode('dbmo-level4')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'dbmo-level4' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'dbmo-level4' ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                                        color: viewMode === 'dbmo-level4' ? '#a78bfa' : '#888'
                                    }}
                                >
                                    <Zap size={18} /> Semestral (L4)
                                </button>
                            </div>

                            {/* Main Content Area */}
                            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                                {viewMode === 'dbmo-rdats' ? (
                                    <>
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>RDATS Approval Inbox</h3>
                                            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Review and verify public ENGP data before merging to the main database.</p>
                                        </div>

                                        {pendingSubmissions.length === 0 ? (
                                            <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', opacity: 0.6, padding: '4rem 0' }}>
                                                <CheckCircle size={56} color="#f87171" strokeWidth={1.5} />
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>No Pending Submissions</p>
                                                    <span className="text-sm">Great job! All records are currently reviewed.</span>
                                                </div>
                                            </div>
                                        ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Bulk Actions Bar */}
                                            <div style={{ 
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', 
                                                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                                                position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                                                        <input 
                                                            type="checkbox" 
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                            checked={selectedSubIds.length === pendingSubmissions.length && pendingSubmissions.length > 0}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSubIds(pendingSubmissions.map(s => s.id));
                                                                } else {
                                                                    setSelectedSubIds([]);
                                                                }
                                                            }}
                                                        />
                                                        Select All ({pendingSubmissions.length})
                                                    </label>
                                                    {selectedSubIds.length > 0 && (
                                                        <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                                                            {selectedSubIds.length} SELECTED
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <button 
                                                        disabled={selectedSubIds.length === 0 || isBulkProcessing}
                                                        onClick={handleBulkApprove}
                                                        className="btn btn-primary" 
                                                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', opacity: selectedSubIds.length === 0 ? 0.5 : 1 }}
                                                    >
                                                        {isBulkProcessing ? 'Processing...' : `Approve Selected`}
                                                    </button>
                                                    <button 
                                                        disabled={selectedSubIds.length === 0 || isBulkProcessing}
                                                        onClick={handleBulkReject}
                                                        className="btn btn-glass" 
                                                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', opacity: selectedSubIds.length === 0 ? 0.5 : 1 }}
                                                    >
                                                        Reject Selected
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Submission List */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {pendingSubmissions.map((sub) => (
                                                    <div 
                                                        key={sub.id} 
                                                        className="surface-glass" 
                                                        style={{ 
                                                            padding: '0.75rem 1.25rem', borderRadius: '12px', 
                                                            border: '1px solid rgba(255,255,255,0.06)', 
                                                            display: 'grid', gridTemplateColumns: 'auto 1fr auto', 
                                                            gap: '1.25rem', alignItems: 'center', 
                                                            background: selectedSubIds.includes(sub.id) ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.01)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <input 
                                                            type="checkbox" 
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                            checked={selectedSubIds.includes(sub.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSubIds(prev => [...prev, sub.id]);
                                                                } else {
                                                                    setSelectedSubIds(prev => prev.filter(id => id !== sub.id));
                                                                }
                                                            }}
                                                        />
                                                        <div>
                                                            <div className="flex-center gap-2" style={{ justifyContent: 'flex-start', marginBottom: '0.25rem' }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fca5a5' }}>{sub.cenro}</span>
                                                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                                                <span style={{ color: '#888', fontSize: '0.7rem' }}>{sub.month}</span>
                                                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                                                <span style={{ color: '#666', fontSize: '0.65rem' }}>{new Date(sub.createdAt).toLocaleTimeString()}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                                                                {getColumnLabel(sub.table, sub.columnKey)}: <span style={{ color: '#10b981', fontWeight: 800 }}>{sub.value}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button 
                                                                className="btn btn-glass" 
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
                                                                onClick={(e) => { e.stopPropagation(); handleApproveSubmission(sub); }}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                className="btn btn-glass" 
                                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}
                                                                onClick={(e) => { e.stopPropagation(); handleRejectSubmission(sub.id); }}
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        )}
                                    </>
                                ) : viewMode === 'dbmo-contracts' ? (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>Contract Database</h3>
                                            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Management system for ENGP reforestation contracts and NGO/PO agreements.</p>
                                        </div>
                                        
                                        <div className="surface-glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '4rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <FileText size={80} color="var(--denr-green-light)" style={{ opacity: 0.2 }} />
                                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(5, 150, 105, 0.2)', padding: '1rem', borderRadius: '50%', border: '1px solid var(--denr-green-glow)' }}>
                                                    <Target size={32} color="var(--denr-green-light)" />
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fff' }}>Module in Preparation</h4>
                                                <p className="text-sm text-muted" style={{ maxWidth: '400px' }}>
                                                    We are currently digitizing the contract archives. This module will soon allow you to track payment tranches, survival rate requirements, and agreement deadlines.
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                                                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>0</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>ACTIVE CONTRACTS</span>
                                                </div>
                                                <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', textAlign: 'center' }}>
                                                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>₱0.00</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>TOTAL OBLIGATION</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : viewMode === 'dbmo-endorse' ? (
                                    <div className="dbmo-form-card">
                                        <div style={{ flexShrink: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#fff', fontWeight: 800 }}>Endorse Activity</h3>
                                            <p className="text-muted" style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>Verify encoded Level-1 items and assign a regional Level-2 RDATS tracking number.</p>
                                        </div>
                                        
                                        <div className="dbmo-grid-layout">
                                            {/* Column 1: CENRO Select */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: 'var(--denr-green-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>1. Select CENRO</label>
                                                <div className="dbmo-scroll-list" style={{ flex: 1 }}>
                                                    {CENRO_LIST.map(c => (
                                                        <div 
                                                            key={c} 
                                                            onClick={() => { setEndorseCenro(c); setEndorseActivity(''); }}
                                                            className={`dbmo-selection-item ${endorseCenro === c ? 'selected' : ''}`}
                                                        >
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: endorseCenro === c ? 'var(--denr-green-light)' : 'rgba(255,255,255,0.2)' }}></div>
                                                            {c}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 2: Month Select */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: 'var(--denr-green-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>2. Select Month</label>
                                                <div className="dbmo-scroll-list" style={{ flex: 1 }}>
                                                    {SEMES_MONTHS[semester].map(m => (
                                                        <div 
                                                            key={m} 
                                                            onClick={() => { setEndorseMonth(m); setEndorseActivity(''); }}
                                                            className={`dbmo-selection-item ${endorseMonth === m ? 'selected' : ''}`}
                                                        >
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: endorseMonth === m ? 'var(--denr-green-light)' : 'rgba(255,255,255,0.2)' }}></div>
                                                            {m}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 3: Activity Select */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: 'var(--denr-green-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>3. Select Activity</label>
                                                <div className="dbmo-scroll-list" style={{ flex: 1 }}>
                                                    {(!endorseCenro || !endorseMonth) ? (
                                                        <div className="empty-state-dbmo" style={{ padding: '2rem 1rem' }}>
                                                            <Target size={32} />
                                                            <span style={{ fontSize: '0.8rem' }}>Select CENRO and Month to see available activities</span>
                                                        </div>
                                                    ) : (
                                                        [...TABLE1_KEYS.map(k => ({...k, t:'t1'})), ...TABLE2_KEYS.map(k => ({...k, t:'t2'}))]
                                                            .filter(k => {
                                                                const doc = findRdatsInArray(rdatsData, k.t, endorseMonth, endorseCenro) || {};
                                                                const val = doc[k.key];
                                                                const status = doc[`${k.key}_status`] || 'ongoing';
                                                                // ROBUST CHECK: Must have value and NOT be already processed
                                                                return val && typeof val === 'string' && val.toUpperCase().includes('PAL') && status !== 'endorsed' && status !== 'consolidated';
                                                            })
                                                            .map(k => (
                                                                <div 
                                                                    key={k.key} 
                                                                    onClick={() => setEndorseActivity(k.key)}
                                                                    className={`dbmo-selection-item ${endorseActivity === k.key ? 'selected' : ''}`}
                                                                >
                                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: endorseActivity === k.key ? 'var(--denr-green-light)' : 'rgba(255,255,255,0.2)' }}></div>
                                                                    {k.label}
                                                                </div>
                                                            ))
                                                    )}
                                                    {endorseCenro && endorseMonth && [...TABLE1_KEYS.map(k => ({...k, t:'t1'})), ...TABLE2_KEYS.map(k => ({...k, t:'t2'}))].filter(k => {
                                                        const d = findRdatsInArray(rdatsData, k.t, endorseMonth, endorseCenro) || {};
                                                        const val = d[k.key];
                                                        const status = d[`${k.key}_status`] || 'ongoing';
                                                        return val && typeof val === 'string' && val.toUpperCase().includes('PAL') && status !== 'endorsed' && status !== 'consolidated';
                                                    }).length === 0 && (
                                                        <div className="empty-state-dbmo" style={{ padding: '2rem 1rem' }}>
                                                            <Shield size={32} />
                                                            <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>No eligible (encoded but unprocessed) activities found.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="dbmo-input-group" style={{ flexShrink: 0 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '2rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="text-sm font-bold" style={{ color: '#aaa', marginBottom: '0.75rem', display: 'block' }}>ASSIGN NEW LEVEL-2 RDATS NUMBER</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--denr-green-light)', fontWeight: 900, fontSize: '1.1rem' }}>PAL</span>
                                                        <input 
                                                            type="text" 
                                                            className="input-modern" 
                                                            value={endorseRdats2} 
                                                            onChange={e => setEndorseRdats2(e.target.value)} 
                                                            placeholder="Enter new tracking number..."
                                                            style={{ paddingLeft: '4.5rem', width: '100%', fontSize: '1.25rem', fontWeight: 800, background: 'rgba(0,0,0,0.5)', borderColor: endorseRdats2 ? 'var(--denr-green-glow)' : 'rgba(255,255,255,0.1)' }}
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ height: '56px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #10b981, #059669)', width: '100%' }}
                                                    disabled={!endorseCenro || !endorseMonth || !endorseActivity || !endorseRdats2}
                                                    onClick={async () => {
                                                        try {
                                                            const activityKey = endorseActivity;
                                                            const isT1 = TABLE1_KEYS.some(k => k.key === activityKey);
                                                            const existingDoc = findRdatsInArray(rdatsData, isT1 ? 't1' : 't2', endorseMonth, endorseCenro);
                                                            const actualDocId = existingDoc ? existingDoc.id : `${isT1 ? 't1' : 't2'}_${endorseMonth}_${endorseCenro}`;
                                                            
                                                            await setDoc(doc(db, 'rdats', actualDocId), {
                                                                [`${activityKey}_status`]: 'endorsed',
                                                                [`${activityKey}_rdats2`]: `PAL ${endorseRdats2}`,
                                                                [`${activityKey}_updatedAt`]: Date.now()
                                                            }, { merge: true });
                                                            
                                                            setSuccess("Activity endorsed successfully!");
                                                            setEndorseActivity('');
                                                            setEndorseRdats2('');
                                                            setTimeout(() => setSuccess(''), 3000);
                                                        } catch (err) {
                                                            setError("Endorsement failed: " + err.message);
                                                        }
                                                    }}
                                                >
                                                    <ShieldCheck size={20} /> Endorse & Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : viewMode === 'dbmo-consolidate' ? (
                                    <div className="dbmo-form-card">
                                        <div style={{ flexShrink: 0 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#fff', fontWeight: 800 }}>Consolidate & Endorse</h3>
                                            <p className="text-muted" style={{ fontSize: '0.95rem', marginTop: '0.25rem' }}>Select multiple items to apply a single unified tracking number across CENROs and Months.</p>
                                        </div>
                                        
                                        <div className="dbmo-grid-layout">
                                            {/* Column 1: CENROs (Multiple) */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>1. Select CENROs</label>
                                                <div className="dbmo-scroll-list" style={{ height: '380px' }}>
                                                    {CENRO_LIST.map(c => (
                                                        <div 
                                                            key={c} 
                                                            onClick={() => {
                                                                if (consolidateCenros.includes(c)) setConsolidateCenros(consolidateCenros.filter(x => x !== c));
                                                                else setConsolidateCenros([...consolidateCenros, c]);
                                                            }}
                                                            className={`dbmo-selection-item ${consolidateCenros.includes(c) ? 'selected-orange' : ''}`}
                                                        >
                                                            <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {consolidateCenros.includes(c) && <div style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '2px' }}></div>}
                                                            </div>
                                                            {c}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 2: Months (Multiple) */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>2. Select Months</label>
                                                <div className="dbmo-scroll-list" style={{ height: '380px' }}>
                                                    {SEMES_MONTHS[semester].map(m => (
                                                        <div 
                                                            key={m} 
                                                            onClick={() => {
                                                                if (consolidateMonths.includes(m)) setConsolidateMonths(consolidateMonths.filter(x => x !== m));
                                                                else setConsolidateMonths([...consolidateMonths, m]);
                                                            }}
                                                            className={`dbmo-selection-item ${consolidateMonths.includes(m) ? 'selected-orange' : ''}`}
                                                        >
                                                            <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {consolidateMonths.includes(m) && <div style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '2px' }}></div>}
                                                            </div>
                                                            {m}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 3: Activities Multi */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="text-sm font-bold" style={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>3. Select Activities</label>
                                                <div className="dbmo-scroll-list" style={{ height: '380px' }}>
                                                    {(consolidateCenros.length === 0 || consolidateMonths.length === 0) ? (
                                                        <div className="empty-state-dbmo" style={{ padding: '2rem 1rem' }}>
                                                            <Target size={32} />
                                                            <span style={{ fontSize: '0.8rem' }}>Select Scope (CENROs/Months) to see available items</span>
                                                        </div>
                                                    ) : (
                                                        [...TABLE1_KEYS.map(k => ({...k, t:'t1'})), ...TABLE2_KEYS.map(k => ({...k, t:'t2'}))]
                                                            .filter(k => {
                                                                return consolidateCenros.some(c => {
                                                                    return consolidateMonths.some(m => {
                                                                        const doc = findRdatsInArray(rdatsData, k.t, m, c) || {};
                                                                        const val = doc[k.key];
                                                                        const status = doc[`${k.key}_status`] || 'ongoing';
                                                                        return val && typeof val === 'string' && val.toUpperCase().includes('PAL') && status !== 'endorsed' && status !== 'consolidated';
                                                                    });
                                                                });
                                                            })
                                                            .map(k => (
                                                                <div 
                                                                    key={k.key} 
                                                                    onClick={() => {
                                                                        if (consolidateActivities.includes(k.key)) setConsolidateActivities(consolidateActivities.filter(x => x !== k.key));
                                                                        else setConsolidateActivities([...consolidateActivities, k.key]);
                                                                    }}
                                                                    className={`dbmo-selection-item ${consolidateActivities.includes(k.key) ? 'selected-orange' : ''}`}
                                                                >
                                                                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {consolidateActivities.includes(k.key) && <div style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '2px' }}></div>}
                                                                    </div>
                                                                    {k.label}
                                                                </div>
                                                            ))
                                                    )}
                                                    {(consolidateCenros.length > 0 && consolidateMonths.length > 0) && [...TABLE1_KEYS.map(k => ({...k, t:'t1'})), ...TABLE2_KEYS.map(k => ({...k, t:'t2'}))].filter(k => {
                                                        return consolidateCenros.some(c => {
                                                            return consolidateMonths.some(m => {
                                                                const doc = findRdatsInArray(rdatsData, k.t, m, c) || {};
                                                                const val = doc[k.key];
                                                                const status = doc[`${k.key}_status`] || 'ongoing';
                                                                return val && typeof val === 'string' && val.toUpperCase().includes('PAL') && status !== 'endorsed' && status !== 'consolidated';
                                                            });
                                                        });
                                                    }).length === 0 && (
                                                        <div className="empty-state-dbmo" style={{ padding: '2rem 1rem' }}>
                                                            <Save size={32} />
                                                            <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>No eligible activities found in selected scope.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="dbmo-input-group" style={{ flexShrink: 0 }}>
                                            <div className="rdats-grid-mobile-fix" style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '2rem', alignItems: 'flex-end' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="text-sm font-bold" style={{ color: '#aaa', marginBottom: '0.75rem', display: 'block' }}>UNIFIED RDATS FOR CONSOLIDATION</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#fbbf24', fontWeight: 900, fontSize: '1.1rem' }}>PAL</span>
                                                        <input 
                                                            type="text" 
                                                            className="input-modern" 
                                                            value={consolidateRdats2} 
                                                            onChange={e => setConsolidateRdats2(e.target.value)} 
                                                            placeholder="Unified assignment for group..."
                                                            style={{ paddingLeft: '4.5rem', width: '100%', fontSize: '1.25rem', fontWeight: 800, background: 'rgba(0,0,0,0.5)', borderColor: consolidateRdats2 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.1)' }}
                                                        />
                                                    </div>
                                                </div>
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ height: '56px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#000', fontWeight: 800, width: '100%' }}
                                                    disabled={consolidateCenros.length === 0 || consolidateMonths.length === 0 || consolidateActivities.length === 0 || !consolidateRdats2 || isBulkProcessing}
                                                    onClick={async () => {
                                                        try {
                                                            setIsBulkProcessing(true);
                                                            for (const c of consolidateCenros) {
                                                                for (const m of consolidateMonths) {
                                                                    const t1Acts = consolidateActivities.filter(acc => TABLE1_KEYS.some(k => k.key === acc));
                                                                    const t2Acts = consolidateActivities.filter(acc => TABLE2_KEYS.some(k => k.key === acc));
                                                                    
                                                                    if (t1Acts.length > 0) {
                                                                        const updates = {};
                                                                        t1Acts.forEach(k => {
                                                                            updates[`${k}_status`] = 'consolidated';
                                                                            updates[`${k}_rdats2`] = `PAL ${consolidateRdats2}`;
                                                                            updates[`${k}_updatedAt`] = Date.now();
                                                                        });
                                                                        const existingDoc = findRdatsInArray(rdatsData, 't1', m, c);
                                                                        const actualId = existingDoc ? existingDoc.id : `t1_${m}_${c}`;
                                                                        await setDoc(doc(db, 'rdats', actualId), updates, { merge: true });
                                                                    }
                                                                    
                                                                    if (t2Acts.length > 0) {
                                                                        const updates = {};
                                                                        t2Acts.forEach(k => {
                                                                            updates[`${k}_status`] = 'consolidated';
                                                                            updates[`${k}_rdats2`] = `PAL ${consolidateRdats2}`;
                                                                            updates[`${k}_updatedAt`] = Date.now();
                                                                        });
                                                                        const existingDoc = findRdatsInArray(rdatsData, 't2', m, c);
                                                                        const actualId = existingDoc ? existingDoc.id : `t2_${m}_${c}`;
                                                                        await setDoc(doc(db, 'rdats', actualId), updates, { merge: true });
                                                                    }
                                                                }
                                                            }
                                                            trackEvent('bulk_consolidate', { cenros: consolidateCenros, activities: consolidateActivities });
                                                            setSuccess("Activities consolidated successfully!");
                                                            setConsolidateActivities([]);
                                                            setConsolidateRdats2('');
                                                            setTimeout(() => setSuccess(''), 3000);
                                                        } catch (err) {
                                                            setError("Consolidation failed: " + err.message);
                                                        } finally {
                                                            setIsBulkProcessing(false);
                                                        }
                                                    }}
                                                >
                                                    {isBulkProcessing ? 'Processing Group...' : 'Consolidate and Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : viewMode === 'dbmo-level3' || viewMode === 'dbmo-level4' ? (
                                    <div className="flex-center" style={{ height: '500px', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
                                        <div style={{ position: 'relative' }}>
                                            {viewMode === 'dbmo-level3' ? <Grid3x3 size={80} color="#60a5fa" style={{ opacity: 0.2 }} /> : <List size={80} color="#a78bfa" style={{ opacity: 0.2 }} />}
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <RefreshCcw size={40} className="animate-spin-slow" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>{viewMode === 'dbmo-level3' ? 'QUARTERLY' : 'SEMESTRAL'} RDATS</h3>
                                            <p className="text-muted" style={{ fontSize: '1.1rem', maxWidth: '500px' }}>
                                                This advanced level of RDATS tracking is currently under major update. Level 3 and Level 4 processing modules will be available in the next deployment.
                                            </p>
                                        </div>
                                        <div className="surface-glass" style={{ padding: '1rem 2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--denr-green-light)', fontWeight: 700 }}>
                                            STATUS: UNDER CONSTRUCTION
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1rem', opacity: 0.4 }}>
                                        <TrendingUp size={48} />
                                        <p>Module "{viewMode}" is coming soon.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* eNGP HUB MODAL (RED THEME) */}
            {showEngpHub && (
                <div className="modal-overlay" onClick={() => setShowEngpHub(false)}>
                    <div className="modal-content surface-glass" onClick={e => e.stopPropagation()} style={{ width: '95%', maxWidth: '900px', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                        <div className="flex-between" style={{ marginBottom: '2.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#fff', fontWeight: 800, letterSpacing: '0.05em' }}>eNGP <span style={{ color: '#fca5a5', fontWeight: 300 }}>MANAGEMENT HUB</span></h2>
                                <p className="text-muted" style={{ margin: '0.25rem 0 0 0' }}>Enhanced National Greening Program | Administrative Entry</p>
                            </div>
                            <button className="btn btn-glass" style={{ padding: '0.5rem' }} onClick={() => setShowEngpHub(false)}><X size={24} /></button>
                        </div>

                        <div className="rdats-grid-mobile-fix" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            {/* DBMO Card */}
                            <div 
                                onClick={() => handleProtectedAction(['admin', 'supervisor'], "DBMO Portal access is reserved for Admin and Supervisors only.", () => {
                                    setShowEngpHub(false); 
                                    setShowDbmoModal(true); 
                                    setViewMode('dbmo-rdats');
                                })}
                                className="surface-glass engp-hub-card" 
                                style={{ 
                                    padding: '2rem', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', 
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), transparent)'
                                }}
                            >
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#ef4444' }}>
                                    <Shield size={32} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.25rem' }}>DBMO</h3>
                                <p style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management & Dev.</p>
                            </div>

                            {/* FINANCIAL Card */}
                            <div 
                                onClick={() => handleProtectedAction(['admin', 'supervisor', 'finance', 'financial'], "The Financial Portal is restricted to Finance Officers and Admins.", () => {
                                    setShowEngpHub(false); 
                                    setShowFinanceModal(true); 
                                    setViewMode('finance-billing'); 
                                })}
                                className="surface-glass engp-hub-card" 
                                style={{ 
                                    padding: '2rem', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', 
                                    border: '1px solid rgba(251, 191, 36, 0.2)',
                                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05), transparent)'
                                }}
                            >
                                <div style={{ background: 'rgba(251, 191, 36, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#fbbf24' }}>
                                    <Target size={32} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.25rem' }}>FINANCIAL</h3>
                                <p style={{ fontSize: '0.75rem', color: '#fde68a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Billing & Finance</p>
                            </div>

                            {/* FEO Card */}
                            <div 
                                onClick={() => {
                                    handleProtectedAction(['admin', 'supervisor', 'feo'], "The FEO Portal is restricted to Forest Extension Officers and Admins.", () => {
                                        setSuccess('FEO PORTAL ACCESS GRANTED - LOADING GIS ENGINE...');
                                        setViewMode('feo-shapefile'); 
                                        setShowFeoModal(true); 
                                        setTimeout(() => {
                                            setShowEngpHub(false);
                                            setSuccess('');
                                        }, 100);
                                    });
                                }}
                                className="surface-glass engp-hub-card" 
                                style={{ 
                                    padding: '2rem', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', 
                                    border: '1px solid rgba(96, 165, 250, 0.2)',
                                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.05), transparent)'
                                }}
                            >
                                <div style={{ background: 'rgba(96, 165, 250, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#60a5fa' }}>
                                    <Leaf size={32} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.25rem' }}>FEO</h3>
                                <p style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Forest Extension</p>
                            </div>

                            {/* ADMIN INSIGHTS Card */}
                            <div 
                                onClick={() => handleProtectedAction(['admin', 'supervisor'], "Admin Insights are restricted to System Administrators.", () => {
                                    setShowEngpHub(false); 
                                    setShowAnalytics(true);
                                })}
                                className="surface-glass engp-hub-card" 
                                style={{ 
                                    padding: '2rem', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', 
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)'
                                }}
                            >
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#10b981' }}>
                                    <BarChart3 size={32} />
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.25rem' }}>INSIGHTS</h3>
                                <p style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Analytics</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FINANCIAL PORTAL (Yellow) */}
            {showFinanceModal && (isAdmin || userRole === 'finance' || userRole === 'financial') && (
                <div className="modal-overlay" onClick={() => setShowFinanceModal(false)}>
                    <div className="modal-content surface-glass" onClick={e => e.stopPropagation()} style={{ width: '98vw', height: '95vh', borderRadius: '24px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(251, 191, 36, 0.4)', boxShadow: '0 0 80px rgba(0,0,0,0.6)' }}>
                        <div className="flex-between" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', background: 'linear-gradient(to right, rgba(251, 191, 36, 0.1), transparent)', flexShrink: 0 }}>
                            <div className="flex-center gap-3">
                                <Target size={22} color="#fbbf24" />
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fde68a', fontWeight: 800, letterSpacing: '0.05em' }}>FINANCIAL PORTAL <span style={{ opacity: 0.5, fontWeight: 300 }}>| Admin Console</span></h2>
                            </div>
                            <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setShowFinanceModal(false)}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', flex: 1, overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => setViewMode('finance-billing')}
                                    className="btn-glass-nav" 
                                    style={{ 
                                        width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                        background: viewMode === 'finance-billing' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                        borderColor: viewMode === 'finance-billing' ? 'rgba(251, 191, 36, 0.3)' : 'transparent',
                                        color: viewMode === 'finance-billing' ? '#fde68a' : '#888'
                                    }}
                                >
                                    <FileText size={18} /> Billing
                                </button>
                            </div>

                            <div style={{ padding: '0', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {viewMode === 'finance-billing' && (
                                    <FinanceBilling />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FEO PORTAL (Blue) */}
            {showFeoModal && (
                <div className="modal-overlay" onClick={() => { console.log('[FEO] Overlay Clicked - Closing'); setShowFeoModal(false); }} style={{ zIndex: 10000 }}>
                    {console.log('[FEO] Rendering Modal Content. ViewMode:', viewMode)}
                    <div className="modal-content surface-glass" onClick={e => e.stopPropagation()} style={{ width: '95vw', height: '95vh', maxWidth: '1600px', borderRadius: '24px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(96, 165, 250, 0.3)', boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)' }}>
                        <div className="flex-between" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(96, 165, 250, 0.2)', background: 'linear-gradient(to right, rgba(96, 165, 250, 0.1), transparent)', flexShrink: 0 }}>
                            <div className="flex-center gap-3">
                                <Leaf size={22} color="#60a5fa" />
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#93c5fd', fontWeight: 800, letterSpacing: '0.05em' }}>FEO PORTAL <span style={{ opacity: 0.5, fontWeight: 300 }}>| Admin Console</span></h2>
                            </div>
                            <button className="btn btn-glass" style={{ padding: '0.4rem' }} onClick={() => setShowFeoModal(false)}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, overflow: 'hidden' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[
                                    { id: 'feo-shapefile', label: 'Shapefile', icon: ImageIcon },
                                    { id: 'feo-wfp', label: 'Map Producer', icon: Globe },
                                    { id: 'feo-moa', label: 'MOA', icon: FileText }
                                ].map(tab => {
                                    const Icon = tab.icon;
                                    return (
                                        <button 
                                            key={tab.id}
                                            onClick={() => setViewMode(tab.id)}
                                            className="btn-glass-nav" 
                                            style={{ 
                                                width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1rem', borderRadius: '12px',
                                                background: viewMode === tab.id ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
                                                borderColor: viewMode === tab.id ? 'rgba(96, 165, 250, 0.3)' : 'transparent',
                                                color: viewMode === tab.id ? '#93c5fd' : '#888'
                                            }}
                                        >
                                            <Icon size={18} /> {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div style={{ padding: '1rem', flex: 1, minHeight: 0 }}>
                                <FeoErrorBoundary>
                                    {viewMode === 'feo-shapefile' ? (
                                        <FeoShapefileMap onClose={() => setShowFeoModal(false)} />
                                    ) : viewMode === 'feo-wfp' ? (
                                        <FeoMapProducer />
                                    ) : (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ marginBottom: '2rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>{(viewMode || '').replace('feo-', '').toUpperCase()} Tracking</h3>
                                                <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Monitor forest extension operations and agreement compliance.</p>
                                            </div>
                                            <div className="surface-glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '4rem', opacity: 0.6 }}>
                                                <Leaf size={48} color="#60a5fa" />
                                                <p>Module "{(viewMode || '').replace('feo-', '')}" is pending future update.</p>
                                            </div>
                                        </div>
                                    )}
                                </FeoErrorBoundary>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ACCESS DENIED MODAL */}
            {showAccessDenied && (
                <div className="modal-overlay" onClick={() => setShowAccessDenied(false)} style={{ zIndex: 10000 }}>
                    <div className="modal-content surface-glass" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '3rem 2rem', textAlign: 'center', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 50px rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
                            <ShieldClose size={40} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#fff' }}>Access Restricted</h2>
                        <p style={{ color: '#aaa', lineHeight: '1.6', marginBottom: '2rem' }}>{accessDeniedMessage}</p>
                        <button className="btn btn-glass" style={{ width: '100%', padding: '1rem', borderRadius: '12px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }} onClick={() => setShowAccessDenied(false)}>Understood</button>
                    </div>
                </div>
            )}

            {/* IEC Hologram Modal */}
            <IecHologramModal 
                showIecModal={showIecModal} 
                setShowIecModal={setShowIecModal} 
                setFilterType={setFilterType}
                setShowGameSelection={setShowGameSelection}
                stats={stats}
            />

            {/* IEC Game Selection Modal */}
            <IecGameSelection 
                isOpen={showGameSelection}
                onClose={() => setShowGameSelection(false)}
                games={GAMES}
                onSelectGame={handleSelectGame}
            />

            {/* Game Lobby Modal */}
            <GameLobby 
                isOpen={showGameLobby}
                onClose={() => setShowGameLobby(false)}
                gameId={activeGameId}
                games={GAMES}
                onStartGame={handleStartGame}
            />

            {/* Active Game Host View Rendering */}
            {isGameActive && activeGameId === 'quiz' && (
                <QuizGameHost sessionId={activeSessionId} onGameOver={handleGameOver} />
            )}
            {isGameActive && activeGameId === 'fact_fake' && (
                <FactFakeHost sessionId={activeSessionId} onGameOver={handleGameOver} />
            )}

            {showAnalytics && <AdminAnalytics onClose={() => setShowAnalytics(false)} />}

            <WhatsNewModal
                show={showWhatsNew}
                onClose={() => setShowWhatsNew(false)}
                posts={posts}
                onViewPost={(post) => setSelectedPost(post)}
            />

            {/* Forest Nursery Standalone Modal Array */}
            {showForestNurseryModal && (
                <div className="modal-overlay" onClick={() => setShowForestNurseryModal(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="surface-glass" onClick={e => e.stopPropagation()} style={{ width: '95vw', height: '95vh', maxWidth: '1600px', borderRadius: '24px', position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                        <ForestNursery 
                            isAdmin={isAdmin} 
                            userRole={userRole} 
                            setSuccess={setSuccess} 
                            setError={setError} 
                            onCloseModal={() => setShowForestNurseryModal(false)}
                        />
                    </div>
                </div>
            )}

            {showMaintenanceModal && (
                <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="surface-glass" onClick={e => e.stopPropagation()} style={{ width: '95vw', height: '95vh', maxWidth: '1600px', borderRadius: '24px', position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                        <MaintenanceProtection 
                            isAdmin={isAdmin} 
                            userRole={userRole} 
                            userEmail={userEmail}
                            setSuccess={setSuccess} 
                            setError={setError} 
                            onCloseModal={() => setShowMaintenanceModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Feed;
