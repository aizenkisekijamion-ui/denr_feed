import React, { useState, useEffect } from 'react';
import { CheckCircle, Save, Leaf, ArrowLeft, Target, Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { trackEvent } from '../utils/track';

const CENRO_LIST = ["CORON", "BROOKES POINT", "PUERTO PRINCESA", "QUEZON", "ROXAS", "TAYTAY"];
const SEMES_MONTHS = {
    1: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE"],
    2: ["JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
};

import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

function RdatsTracker({ userRole, theme, toggleTheme }) {
    const navigate = useNavigate();
    const isAdmin = userRole === 'admin' || userRole === 'supervisor';
    const [semester, setSemester] = useState(1);
    const MONTH_LIST = SEMES_MONTHS[semester];
    const [data, setData] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [undoStack, setUndoStack] = useState([]); // Array of { [docId]: { [field]: value } }

    // Table 1 Config
    const table1Headers = [
        "DATE", "CENRO", "PROTECTION AND MAINTENANCE 2nd YEAR", "Year 3 (Within PA)",
        "Year 3 (Congressional Initiative)", "FOREST NURSERY", "ELCAC", "TREE REPLACEMENT",
        "FOREST DISTURBANCE", "LOA/MOA", "Hiring of FEO/TSS/DMO/FMO", "NGP with Produce/Harvest",
        "Survival Rates", "SHAPEFILES", "NGP Sites Visited by DENR Officials", "SITE VISIT"
    ];
    const table1DataKeys = [
        "pnm2ndYear", "yr3WithinPA", "yr3CongInitiative", "forestNursery", "elcac",
        "treeReplacement", "forestDisturbance", "loaMoa", "hiringFeo", "ngpProduce",
        "survivalRates", "shapefiles", "ngpVisits", "siteVisit"
    ];

    // Table 2 Config
    const table2Headers = [
        "DATE", "CENRO", "GEOTAGGED PHOTOS UPLOADING", "NGP Sites Adopted by Other Partners",
        "CBRP", "Financial Accomplishment", "Tree Planting", "Other Refo Initiatives",
        "Certification/Supporting File", "DRONE DATA BASE", "PPA", "Sites Affected by DPWH",
        "Billing/Vouchers", "TURNED OVER NGP SITES"
    ];
    const table2DataKeys = [
        "geoPhotos", "ngpAdopted", "cbrp", "financialAccomplishment", "treePlanting",
        "otherRefo", "certification", "droneDatabase", "ppa", "dpwhAffected",
        "billingVouchers", "turnedOver"
    ];


    const getCellData = (tableId, month, cenro, field) => {
        const docId = `${tableId}_${month}_${cenro}`;
        return data[docId]?.[field] || '';
    };



    const handleBlur = async (tableId, month, cenro, field, value) => {
        const docId = `${tableId}_${month}_${cenro}`;

        setSaving(true);
        try {
            await setDoc(doc(db, 'rdats', docId), {
                [field]: value.trim(),
                [`${field}_updatedAt`]: Date.now(),
                [`${field}_source`]: 'admin',
                updatedAt: Date.now()
            }, { merge: true });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Save Error", error);
            alert("Failed to save: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const pushToUndoStack = (snapshot) => {
        setUndoStack(prev => {
            const newStack = [snapshot, ...prev];
            return newStack.slice(0, 10); // Keep last 10 actions
        });
    };

    const handleUndo = async () => {
        if (undoStack.length === 0) return;

        const lastBatch = undoStack[0];
        setUndoStack(prev => prev.slice(1));
        setSaving(true);

        try {
            // Restore each doc in the batch
            for (const docId of Object.keys(lastBatch)) {
                await setDoc(doc(db, 'rdats', docId), {
                    ...lastBatch[docId],
                    updatedAt: Date.now()
                }, { merge: true });
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Undo Error", error);
            alert("Failed to undo: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePaste = async (e, tableId, startMonth, startCenro, startField) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        if (!pastedData) return;

        // Capture current state for undo
        const snapshot = {};

        const rows = pastedData.split(/\r?\n/).map(row => row.split('\t'));
        const dataKeys = tableId === 't1' ? table1DataKeys : table2DataKeys;

        const startMonthIdx = MONTH_LIST.indexOf(startMonth);
        const startCenroIdx = CENRO_LIST.indexOf(startCenro);
        const startColIdx = dataKeys.indexOf(startField);

        const startGlobalRowIdx = startMonthIdx * CENRO_LIST.length + startCenroIdx;

        let updates = [];

        rows.forEach((row, rowOffset) => {
            if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) return;

            const targetGlobalRowIdx = startGlobalRowIdx + rowOffset;
            if (targetGlobalRowIdx >= MONTH_LIST.length * CENRO_LIST.length) return;

            const monthIdx = Math.floor(targetGlobalRowIdx / CENRO_LIST.length);
            const cenroIdx = targetGlobalRowIdx % CENRO_LIST.length;

            const month = MONTH_LIST[monthIdx];
            const cenro = CENRO_LIST[cenroIdx];
            const docId = `${tableId}_${month}_${cenro}`;

            row.forEach((cellValue, colOffset) => {
                let actualCellVal = cellValue;
                let actualColOffset = colOffset;

                const targetColIdx = startColIdx + actualColOffset;
                if (targetColIdx >= dataKeys.length) return;

                const field = dataKeys[targetColIdx];
                const currentValue = data[docId]?.[field] || '';
                const trimmedValue = actualCellVal.trim();

                if (trimmedValue !== currentValue) {
                    if (!snapshot[docId]) {
                        snapshot[docId] = { ...(data[docId] || {}) };
                    }
                    updates.push({ docId, field, value: trimmedValue });
                }
            });
        });

        if (updates.length > 0) {
            pushToUndoStack(snapshot);
            setSaving(true);
            try {
                const batchedWrites = {};
                updates.forEach(u => {
                    if (!batchedWrites[u.docId]) batchedWrites[u.docId] = {};
                    batchedWrites[u.docId][u.field] = u.value;
                    batchedWrites[u.docId][`${u.field}_updatedAt`] = Date.now();
                    batchedWrites[u.docId][`${u.field}_source`] = 'admin';
                    batchedWrites[u.docId].updatedAt = Date.now();
                });

                for (const docId of Object.keys(batchedWrites)) {
                    await setDoc(doc(db, 'rdats', docId), batchedWrites[docId], { merge: true });
                }

                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            } catch (error) {
                console.error("Paste Error", error);
                alert("Failed to paste data: " + error.message);
            } finally {
                setSaving(false);
            }
        }
    };

    const exportToCSV = async () => {
        let csvContent = "";

        // Table 1
        csvContent += "MAINTENANCE AND PROTECTION OF NGP PLANTATION\n";
        csvContent += table1Headers.join(",") + "\n";

        MONTH_LIST.forEach(month => {
            CENRO_LIST.forEach(cenro => {
                const row = [`"${cenro}"`, `"${month}"`];
                table1DataKeys.forEach(key => {
                    const val = (getCellData('t1', month, cenro, key) || "").replace(/"/g, '""');
                    row.push(`"${val}"`);
                });
                csvContent += row.join(",") + "\n";
            });
        });

        csvContent += "\n\n";

        // Table 2
        csvContent += "GEOTAGGED PHOTOS UPLOADING & OTHER INITIATIVES\n";
        const t2exportHeaders = ["CENRO", "DATE", ...table2Headers.slice(2)];
        csvContent += t2exportHeaders.join(",") + "\n";

        MONTH_LIST.forEach(month => {
            CENRO_LIST.forEach(cenro => {
                const row = [`"${cenro}"`, `"${month}"`];
                table2DataKeys.forEach(key => {
                    const val = (getCellData('t2', month, cenro, key) || "").replace(/"/g, '""');
                    row.push(`"${val}"`);
                });
                csvContent += row.join(",") + "\n";
            });
        });

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `RDATS_Tracker_${new Date().toISOString().split('T')[0]}.csv`;

        if (window.showSaveFilePicker) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 5000);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (isAdmin && undoStack.length > 0) {
                    e.preventDefault();
                    handleUndo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isAdmin, undoStack]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'rdats'), (snapshot) => {
            const fetchedData = {};
            snapshot.forEach(doc => {
                fetchedData[doc.id] = doc.data();
            });
            setData(fetchedData);
        });

        return () => unsubscribe();
    }, []);


    const renderEditableCell = (tableId, month, cenro, field) => {
        const value = getCellData(tableId, month, cenro, field);
        return (
            <td key={`${tableId}-${month}-${cenro}-${field}`} style={{ padding: 0 }}>
                {isAdmin ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <textarea
                            className="rdats-input"
                            value={value}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setData(prev => ({
                                    ...prev,
                                    [`${tableId}_${month}_${cenro}`]: {
                                        ...(prev[`${tableId}_${month}_${cenro}`] || {}),
                                        [field]: newValue
                                    }
                                }));
                            }}
                            onBlur={(e) => handleBlur(tableId, month, cenro, field, e.target.value)}
                            onPaste={(e) => handlePaste(e, tableId, month, cenro, field)}
                            style={{ height: '100%', minHeight: '44px', overflowY: 'hidden', padding: '0.6rem 0.5rem', fontSize: '0.75rem' }}
                        />
                    </div>
                ) : (
                    <div className="rdats-cell-view" style={{ fontSize: '0.75rem' }}>
                        {value || '-'}
                    </div>
                )}
            </td>
        );
    };


    return (
        <div style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }} className="rdats-page">

            {(saving || saveSuccess) && (
                <div style={{
                    position: 'fixed',
                    top: '85px',
                    right: '2rem',
                    zIndex: 1000,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${saveSuccess ? 'var(--denr-green-glow)' : '#60a5fa'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {saving ? (
                        <>
                            <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid #60a5fa', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing to Cloud...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={18} color="var(--denr-green-light)" />
                            <span style={{ color: 'var(--denr-green-light)', fontWeight: 600 }}>Changes Saved</span>
                        </>
                    )}
                </div>
            )}

            <nav className="glass-navbar">
                <div className="navbar-content">
                    <div className="flex-center gap-2" style={{ color: 'var(--denr-green-light)' }}>
                        <Leaf size={24} />
                        <span style={{ fontWeight: 800, letterSpacing: '0.05em', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                            DENR-ENGP <span style={{ fontWeight: 300, opacity: 0.7, color: 'var(--text-secondary)' }}>| IEC Portal</span>
                        </span>
                    </div>
                    <div className="flex-center gap-4">
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        {isAdmin && (
                            <div className="flex-center gap-2" style={{ background: 'rgba(5, 150, 105, 0.2)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--denr-green-glow)' }}>
                                <ShieldCheck size={16} color="var(--denr-green-light)" />
                                <span style={{ color: 'var(--denr-green-light)', fontSize: '0.8rem', fontWeight: 600 }}>ADMIN ACTIVE</span>
                            </div>
                        )}
                        {isAdmin && (
                            <button onClick={() => {
                                exportToCSV();
                                trackEvent('click_export_csv');
                            }} className="btn-glass-nav" style={{ borderColor: 'var(--denr-green-glow)', background: 'rgba(5, 150, 105, 0.2)' }}>
                                <Download size={16} /> Export to Sheet
                            </button>
                        )}
                        <Link to="/" className="btn-glass-nav" style={{ textDecoration: 'none' }} onClick={() => trackEvent('click_back_to_feed')}>
                            <ArrowLeft size={16} /> Back to Feed
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="app-container" style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }} className="rdats-header-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(5, 150, 105, 0.1)', borderRadius: '12px', color: 'var(--denr-green-light)' }}>
                            <Target size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', margin: 0, color: 'var(--text-primary)' }}>RDATS <span className="title-gradient">Data Tracker</span></h1>
                            <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Regional Data Analytics & Tracking System. {isAdmin ? "Click on any cell to edit. Changes save automatically." : "Read-Only Mode."}</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.25rem', width: 'fit-content' }}>
                        <button 
                            onClick={() => setSemester(1)}
                            style={{ padding: '0.6rem 1rem', background: semester === 1 ? 'var(--denr-green-glow)' : 'transparent', color: semester === 1 ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem' }}>
                            1st Sem (Jan-Jun)
                        </button>
                        <button 
                            onClick={() => setSemester(2)}
                            style={{ padding: '0.6rem 1rem', background: semester === 2 ? 'var(--denr-green-glow)' : 'transparent', color: semester === 2 ? 'var(--text-primary)' : 'var(--text-tertiary)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.8rem' }}>
                            2nd Sem (Jul-Dec)
                        </button>
                    </div>
                </div>

                <div className="surface-glass" style={{ marginBottom: '4rem', padding: 0, position: 'relative', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ background: 'rgba(5, 150, 105, 0.2)', padding: '1rem', borderBottom: '1px solid var(--denr-green-glow)', textAlign: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>RDATS TRACKER - I</h2>
                    </div>
                    <div className="rdats-table-container">
                        <table className="rdats-table">
                            <colgroup>
                                <col style={{ width: '50px' }} />
                                <col style={{ width: '80px' }} />
                                {table1DataKeys.map((_, i) => <col key={i} style={{ width: '55px' }} />)}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="rdats-th-sticky-1" style={{ verticalAlign: 'middle' }}>DATE</th>
                                    <th rowSpan={2} className="rdats-th-sticky-1" style={{ verticalAlign: 'middle' }}>CENRO</th>
                                    <th colSpan={3} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.2)', textAlign: 'center' }}>MAINTENANCE</th>
                                    <th colSpan={4} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.1)', textAlign: 'center' }}>FORESTRY</th>
                                    <th colSpan={2} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.2)', textAlign: 'center' }}>ADMIN/LEGAL</th>
                                    <th colSpan={5} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.1)', textAlign: 'center' }}>MONITORING</th>
                                </tr>
                                <tr>
                                    {table1Headers.slice(2).map((header, idx) => (
                                        <th key={idx} className="rdats-th-sticky-2" style={{
                                            textAlign: 'center',
                                            fontSize: '0.70rem'
                                        }}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MONTH_LIST.map((month) => (
                                    <React.Fragment key={`t1-${month}`}>
                                        {CENRO_LIST.map((cenro, idx) => (
                                            <tr key={`t1-${month}-${cenro}`}>
                                                {idx === 0 && (
                                                    <td rowSpan={CENRO_LIST.length} style={{ background: 'var(--bg-input)', width: '60px', verticalAlign: 'middle' }}>
                                                        <div className="vertical-text">{month}</div>
                                                    </td>
                                                )}

                                                <td style={{ fontWeight: 600, background: 'var(--bg-input)', width: '120px' }}>{cenro}</td>
                                                
                                                {table1DataKeys.map(key => renderEditableCell('t1', month, cenro, key))}
                                            </tr>
                                        ))}
                                        <tr><td colSpan={table1Headers.length} className="rdats-divider"></td></tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="surface-glass" style={{ marginBottom: '4rem', padding: 0, position: 'relative', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ background: 'rgba(5, 150, 105, 0.15)', padding: '1rem', borderBottom: '1px solid var(--denr-green-glow)', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>RDATS TRACKER - II</h2>
                    </div>
                    <div className="rdats-table-container">
                        <table className="rdats-table">
                            <colgroup>
                                <col style={{ width: '50px' }} />
                                <col style={{ width: '80px' }} />
                                {table2DataKeys.map((_, i) => <col key={i} style={{ width: '55px' }} />)}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="rdats-th-sticky-1" style={{ verticalAlign: 'middle' }}>DATE</th>
                                    <th rowSpan={2} className="rdats-th-sticky-1" style={{ verticalAlign: 'middle' }}>CENRO</th>
                                    <th colSpan={4} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.2)', textAlign: 'center' }}>GEOTAG DATA</th>
                                    <th colSpan={8} className="rdats-th-sticky-1" style={{ background: 'rgba(5, 150, 105, 0.1)', textAlign: 'center' }}>PROGRAM DETAILS</th>
                                </tr>
                                <tr>
                                    {table2Headers.slice(2).map((header, idx) => (
                                        <th key={idx} className="rdats-th-sticky-2" style={{ fontSize: '0.70rem' }}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MONTH_LIST.map((month) => (
                                    <React.Fragment key={`t2-${month}`}>
                                        {CENRO_LIST.map((cenro, idx) => (
                                            <tr key={`t2-${month}-${cenro}`}>
                                                {idx === 0 && (
                                                    <td rowSpan={CENRO_LIST.length} style={{ background: 'var(--bg-input)', width: '60px', verticalAlign: 'middle' }}>
                                                        <div className="vertical-text">{month}</div>
                                                    </td>
                                                )}

                                                <td style={{ fontWeight: 600, background: 'var(--bg-input)', width: '120px' }}>{cenro}</td>
                                                
                                                {table2DataKeys.map(key => renderEditableCell('t2', month, cenro, key))}
                                            </tr>
                                        ))}
                                        <tr><td colSpan={table2Headers.length} className="rdats-divider"></td></tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default RdatsTracker;
