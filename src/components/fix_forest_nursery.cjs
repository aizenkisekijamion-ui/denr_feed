const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ForestNursery.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Keep lines up to 804 (index 0 to 803)
const newLines = lines.slice(0, 804);

const correctModals = `            {/* Analytics Modal */}
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
                                                className={\`btn-glass \${analyticsMetric === m.k ? 'active' : ''}\`}
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
                                    <button onClick={() => { setIsAnalyticsOpen(false); setSelectedCategoryLabel(null); }} className="btn-close-premium">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="premium-modal-body" style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
                                <div className="surface-glass" style={{ flex: 1, borderRadius: '32px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <NurseryPieChart
                                        data={aggregatedStats.categoryData[analyticsMetric] || []}
                                        metricLabel={analyticsMetric.toUpperCase()}
                                        onSelectCategory={(cat) => setSelectedCategoryLabel(cat.name)}
                                    />
                                </div>
                            </div>

                            {selectedCategoryLabel && (
                                <div className="surface-glass" style={{ flex: 1.2, borderRadius: '32px', padding: '2.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', animation: 'slideInRight 0.4s ease', minHeight: 0 }}>
                                    <div className="flex-between mb-20">
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: '#fff' }}>{selectedCategoryLabel}</h3>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--denr-green-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Species Distribution Table</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--denr-green-light)' }}>
                                                {(aggregatedStats.categoryData[analyticsMetric]?.find(c => c.name === selectedCategoryLabel)?.value || 0).toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.4, fontWeight: 900 }}>TOTAL UNITS</div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
                                        {(() => {
                                            const rows = aggregatedStats.detailedRows[analyticsMetric]?.[selectedCategoryLabel] || [];
                                            if (rows.length === 0) return <div className="flex-center" style={{ height: '100px', opacity: 0.2 }}>No detailed data available</div>;

                                            return (
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Species (Common Name)</th>
                                                            <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>CENRO</th>
                                                            {analyticsMetric === 'beginning' && <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Location</th>}
                                                            {analyticsMetric === 'produced' && <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Month</th>}
                                                            <th style={{ textAlign: 'right', padding: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((r, i) => (
                                                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                                <td style={{ padding: '1rem', fontWeight: 800, fontSize: '0.9rem' }}>{r.species}</td>
                                                                <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.cenro}</td>
                                                                {analyticsMetric === 'beginning' && <td style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{r.loc || '-'}</td>}
                                                                {analyticsMetric === 'produced' && <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{r.month || '-'}</td>}
                                                                <td style={{ padding: '1rem', color: 'var(--denr-green-light)', fontWeight: 900, textAlign: 'right' }}>{r.value.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
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
                                                if (window.confirm(\`Delete ALL data for \${s}? This cannot be undone.\`)) {
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
                    <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ height: 'auto', background: 'rgba(15, 23, 42, 0.85)', padding: '2.5rem', border: \`1px solid \${formulaInfo.color}40\`, boxShadow: \`0 25px 50px rgba(0,0,0,0.5), 0 0 40px \${formulaInfo.color}15\` }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ background: \`\${formulaInfo.color}15\`, width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: formulaInfo.color, border: \`1px solid \${formulaInfo.color}30\` }}>
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
\n`;

newLines.push(correctModals);

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('SUCCESS: ForestNursery.jsx fixed with Node.js script');
