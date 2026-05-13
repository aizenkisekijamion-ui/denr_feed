import React, { useState, useEffect } from 'react';
import { X, Users, QrCode, Play, LogIn, ChevronRight, Loader2, Sparkles, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../firebase';
import { collection, doc, setDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';

const GameLobby = ({ isOpen, onClose, gameId, games, onStartGame }) => {
    const [session, setSession] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const game = games.find(g => g.id === gameId);

    // Create session on mount
    useEffect(() => {
        if (!isOpen || !gameId) return;

        const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const sessionRef = doc(db, 'game_sessions', sessionId);
        
        const createSession = async () => {
            setLoading(true);
            try {
                await setDoc(sessionRef, {
                    gameId,
                    status: 'waiting',
                    createdAt: Date.now(),
                    hostId: 'host', // Main PC
                    maxPlayers: 10
                });
                setSession({ id: sessionId });
            } catch (err) {
                console.error("Failed to create session:", err);
            } finally {
                setLoading(false);
            }
        };

        createSession();

        // Listen for players
        const playersQuery = query(collection(db, 'players'), where('sessionId', '==', sessionId));
        const unsubscribe = onSnapshot(playersQuery, (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlayers(playersList);
        });

        // Cleanup on unmount or close
        return () => {
            unsubscribe();
            // Optional: delete session if host leaves before starting
            // deleteDoc(sessionRef); 
        };
    }, [isOpen, gameId]);

    if (!isOpen || !game) return null;

    // Join URL for mobile (mocking for local dev, usually points to a specific route)
    const joinUrl = `${window.location.origin}/join/${session?.id}`;

    const canStart = players.length >= game.minPlayers;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div 
                className="surface-glass modal-pop" 
                onClick={e => e.stopPropagation()}
                style={{
                    width: '95%',
                    maxWidth: '900px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateColumns: '400px 1fr',
                    maxHeight: '85vh',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                {/* Left: QR & Session Info */}
                <div style={{ 
                    padding: '2.5rem', 
                    background: 'rgba(0,0,0,0.3)', 
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ background: game.color, width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: `0 0 20px ${game.glow}` }}>
                            <QrCode size={32} color="#fff" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>SCAN TO JOIN</h2>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>USE YOUR PHONE AS A CONTROLLER</p>
                    </div>

                    <div className="qr-container" style={{ 
                        background: '#fff', 
                        padding: '1.5rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }}>
                        {loading ? (
                            <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Loader2 className="animate-spin" size={40} color={game.color} />
                            </div>
                        ) : (
                            <QRCodeSVG value={joinUrl} size={200} level="H" includeMargin={false} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, border: `4px solid ${game.color}`, borderRadius: '20px', pointerEvents: 'none', opacity: 0.3 }}></div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>SESSION ID</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {session?.id || '------'}
                        </div>
                    </div>
                </div>

                {/* Right: Player List & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Game Preview Header */}
                    <div style={{ 
                        padding: '1.5rem 2rem', 
                        background: `linear-gradient(to right, ${game.color}22, transparent)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div className="flex-center gap-3">
                            <img src={game.thumbnail} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {game.title}
                                    <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)' }}>HOST MODE</span>
                                </h3>
                            </div>
                        </div>
                        <button className="btn btn-glass" style={{ padding: '0.5rem' }} onClick={onClose}><X size={20} /></button>
                    </div>

                    {/* Players Content */}
                    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <div className="flex-center gap-2">
                                <Users size={18} color={game.color} />
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>CONNECTED PLAYERS</span>
                                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem', color: game.color, fontWeight: 800 }}>
                                    {players.length} / 10
                                </span>
                            </div>
                            {!canStart && (
                                <div className="flex-center gap-2" style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>
                                    <Loader2 size={14} className="animate-spin" />
                                    NEED {game.minPlayers - players.length} MORE TO START
                                </div>
                            )}
                        </div>

                        {players.length === 0 ? (
                            <div style={{ height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', background: 'rgba(0,0,0,0.1)' }}>
                                <div className="pulse-slow" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '50%' }}>
                                    <Users size={40} color="rgba(255,255,255,0.1)" />
                                </div>
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Waiting for players to scan the code...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {players.map((p, i) => (
                                    <div 
                                        key={p.id}
                                        className="player-item"
                                        style={{ 
                                            background: 'rgba(255,255,255,0.03)', 
                                            padding: '1rem', 
                                            borderRadius: '16px', 
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            animation: 'slideIn 0.3s ease-out'
                                        }}
                                    >
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `hsl(${i * 137.5}deg, 70%, 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '1.1rem' }}>
                                            {p.name?.[0]?.toUpperCase() || 'P'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>{p.name || `Player ${i + 1}`}</div>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Sparkles size={10} color={game.color} />
                                                READY TO PLAY
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                        <button 
                            className={`btn btn-primary ${!canStart ? 'disabled' : ''}`}
                            disabled={!canStart}
                            onClick={() => onStartGame(session.id, gameId)}
                            style={{ 
                                width: '100%', 
                                height: '64px',
                                fontSize: '1.25rem',
                                fontWeight: 900,
                                background: canStart ? game.color : 'rgba(255,255,255,0.05)',
                                color: canStart ? '#fff' : '#444',
                                borderColor: 'transparent',
                                gap: '1rem',
                                boxShadow: canStart ? `0 10px 30px ${game.glow}` : 'none',
                                animation: canStart ? 'pulse-button 2s infinite' : 'none'
                            }}
                        >
                            <Play size={24} fill="currentColor" />
                            START {game.title.toUpperCase()}
                        </button>
                    </div>
                </div>

                <style>{`
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateX(20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes pulse-button {
                        0% { box-shadow: 0 0 0 0 ${game.color}66; }
                        70% { box-shadow: 0 0 0 15px ${game.color}00; }
                        100% { box-shadow: 0 0 0 0 ${game.color}00; }
                    }
                    .player-item { transition: all 0.2s; }
                    .player-item:hover { background: rgba(255,255,255,0.08) !important; transform: scale(1.05); }
                `}</style>
            </div>
        </div>
    );
};

export default GameLobby;
