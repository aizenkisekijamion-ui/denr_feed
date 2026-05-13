import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, Zap, Shield, Loader2 } from 'lucide-react';

const FactFakeController = ({ sessionId, playerId }) => {
    const [gameState, setGameState] = useState(null);
    const [swiped, setSwiped] = useState(null); // 'fact' or 'fake'
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!sessionId || !playerId) return;

        const sessionRef = doc(db, 'game_sessions', sessionId.toUpperCase());
        const unsub = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setGameState(data);
                if (data.status === 'fact_fake_start') {
                    setSwiped(null);
                }
            }
        });

        const playerRef = doc(db, 'players', playerId);
        const unsubPlayer = onSnapshot(playerRef, (snap) => {
            if (snap.exists()) setScore(snap.data().score || 0);
        });

        return () => { unsub(); unsubPlayer(); };
    }, [sessionId, playerId]);

    const handleSwipe = async (dir) => {
        if (swiped || gameState?.status !== 'fact_fake_active') return;
        
        setSwiped(dir);
        const isCorrect = (dir === 'fact' && gameState.currentQuestion.isFact) || 
                          (dir === 'fake' && !gameState.currentQuestion.isFact);

        await updateDoc(doc(db, 'players', playerId), {
            lastSwipe: dir
        });
    };

    if (!gameState) return <div className="flex-center" style={{ height: '100vh', background: '#020617' }}><Loader2 className="animate-spin" /></div>;

    const isActive = gameState.status === 'fact_fake_active';
    const isResult = gameState.status === 'fact_fake_result';

    return (
        <div className="gamepad-mode" style={{ 
            height: '100vh', display: 'flex', flexDirection: 'column', 
            background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)',
            color: '#fff', fontFamily: "'Inter', sans-serif", padding: '1.5rem', overflow: 'hidden'
        }}>
            {/* HUD */}
            <div className="flex-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', marginBottom: 'auto' }}>
                <div className="flex-center gap-3">
                    <div style={{ background: '#3b82f6', padding: '0.6rem', borderRadius: '10px' }}><Zap size={18} /></div>
                    <div>
                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>MY SCORE</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{score}</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>SWIPE WAR</div>
                    <div style={{ color: '#3b82f6', fontWeight: 900 }}>READY</div>
                </div>
            </div>

            {/* Interaction Area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {gameState.status === 'fact_fake_start' ? (
                    <div style={{ textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={48} color="#3b82f6" />
                        <h2 style={{ marginTop: '1rem', fontWeight: 900 }}>GET READY!</h2>
                    </div>
                ) : isResult ? (
                    <div className="animate-fade-up" style={{ textAlign: 'center' }}>
                        { (swiped === 'fact' && gameState.currentQuestion.isFact) || (swiped === 'fake' && !gameState.currentQuestion.isFact) ? (
                            <>
                                <div style={{ background: 'rgba(16,185,129,0.1)', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #10b981' }}>
                                    <CheckCircle2 size={60} color="#10b981" />
                                </div>
                                <h1 style={{ color: '#10b981', fontWeight: 900 }}>CORRECT!</h1>
                            </>
                        ) : (
                            <>
                                <div style={{ background: 'rgba(239,68,68,0.1)', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid #ef4444' }}>
                                    <XCircle size={60} color="#ef4444" />
                                </div>
                                <h1 style={{ color: '#ef4444', fontWeight: 900 }}>INCORRECT</h1>
                            </>
                        )}
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button 
                            onPointerDown={() => handleSwipe('fake')}
                            style={{ 
                                background: swiped === 'fake' ? '#ef4444' : 'rgba(239,68,68,0.05)',
                                border: '2px solid rgba(239,68,68,0.3)', borderRadius: '30px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                                transition: 'all 0.2s', opacity: swiped === 'fact' ? 0.2 : 1
                            }}
                        >
                            <XCircle size={60} color={swiped === 'fake' ? '#fff' : '#ef4444'} />
                            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: swiped === 'fake' ? '#fff' : '#ef4444' }}>FAKE</span>
                        </button>
                        <button 
                            onPointerDown={() => handleSwipe('fact')}
                            style={{ 
                                background: swiped === 'fact' ? '#10b981' : 'rgba(16,185,129,0.05)',
                                border: '2px solid rgba(16,185,129,0.3)', borderRadius: '30px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                                transition: 'all 0.2s', opacity: swiped === 'fake' ? 0.2 : 1
                            }}
                        >
                            <CheckCircle2 size={60} color={swiped === 'fact' ? '#fff' : '#10b981'} />
                            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: swiped === 'fact' ? '#fff' : '#10b981' }}>FACT</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem', opacity: 0.3, fontSize: '0.7rem' }}>
                POWERED BY DENR IEC | SWIPE WAR V1.0
            </div>
        </div>
    );
};

export default FactFakeController;
