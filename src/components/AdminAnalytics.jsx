import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart3, Tablet, Monitor, MousePointer2, Clock, X, TrendingUp } from 'lucide-react';

function AdminAnalytics({ onClose }) {
    const [stats, setStats] = useState({
        totalViews: 0,
        mobile: 0,
        desktop: 0,
        clicks: {},
        recentEvents: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(500));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => doc.data());

            const newStats = events.reduce((acc, curr) => {
                if (curr.eventType === 'page_view') acc.totalViews++;

                if (curr.deviceType === 'Mobile') acc.mobile++;
                else acc.desktop++;

                if (curr.eventType.startsWith('click_')) {
                    const label = curr.eventType.replace('click_', '').replace(/_/g, ' ');
                    acc.clicks[label] = (acc.clicks[label] || 0) + 1;
                }

                return acc;
            }, { totalViews: 0, mobile: 0, desktop: 0, clicks: {}, recentEvents: events.slice(0, 10) });

            setStats(newStats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const clickEntries = Object.entries(stats.clicks).sort((a, b) => b[1] - a[1]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content surface-glass" style={{ maxWidth: '800px', padding: 0 }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5, 150, 105, 0.1)' }}>
                    <div className="flex-center gap-3">
                        <BarChart3 color="var(--denr-green-light)" />
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Admin Insights & Analytics</h2>
                    </div>
                    <button className="btn btn-glass" onClick={onClose} style={{ padding: '0.5rem' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="flex-center" style={{ height: '200px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div className="stat-card surface-glass" style={{ padding: '1rem' }}>
                                <TrendingUp className="text-muted" size={18} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.totalViews}</div>
                                <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>Total Views</div>
                            </div>
                            <div className="stat-card surface-glass" style={{ padding: '1rem' }}>
                                <Monitor className="text-muted" size={18} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.desktop}</div>
                                <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>Desktop</div>
                            </div>
                            <div className="stat-card surface-glass" style={{ padding: '1rem' }}>
                                <Tablet className="text-muted" size={18} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0' }}>{stats.mobile}</div>
                                <div className="text-sm text-muted" style={{ fontSize: '0.75rem' }}>Mobile</div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="surface-glass" style={{ padding: '1.5rem', border: '1px solid var(--border-light)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <MousePointer2 size={18} color="var(--denr-green-light)" /> Interactions
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {clickEntries.length === 0 ? <p className="text-muted text-sm">No clicks tracked.</p> :
                                    clickEntries.map(([label, count]) => (
                                        <div key={label} className="flex-between" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.75rem', borderRadius: '10px' }}>
                                            <span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{label}</span>
                                            <span style={{ fontWeight: 700, color: 'var(--denr-green-light)', fontSize: '0.85rem' }}>{count}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        <div className="surface-glass" style={{ padding: '1.5rem', border: '1px solid var(--border-light)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24' }}>
                                <Clock size={18} /> Live Logs
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '400px', overflowY: 'auto' }} className="custom-scrollbar">
                                {stats.recentEvents.map((ev, i) => (
                                    <div key={i} style={{ fontSize: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="flex-between" style={{ marginBottom: '0.4rem' }}>
                                            <span style={{ color: '#fbbf24', fontWeight: 800 }}>{ev.user || ev.email || 'Public User'}</span>
                                            <span style={{ opacity: 0.5 }}>{ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleString() : 'Just now'}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span style={{ color: 'var(--denr-green-light)', fontWeight: 600 }}>{ev.eventType.toUpperCase().replace(/_/g, ' ')}</span>
                                            <span style={{ opacity: 0.5 }}>• {ev.deviceType}</span>
                                            {ev.ip && <span style={{ opacity: 0.3, fontSize: '0.65rem' }}>• {ev.ip}</span>}
                                        </div>
                                        {ev.title && <div style={{ marginTop: '0.2rem', color: '#aaa', fontStyle: 'italic' }}>"{ev.title}"</div>}
                                        {ev.error && <div style={{ marginTop: '0.2rem', color: '#f87171', fontSize: '0.7rem' }}>Error: {ev.error}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminAnalytics;
