import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { CheckCircle2, XCircle, Timer, Sparkles, Users, Award, Zap, Trophy } from 'lucide-react';
import { gameSound } from '../../utils/sound';
import { FACT_FAKE_DATA } from './factFakeData';

const FactFakeHost = ({ sessionId, onGameOver }) => {
    const [players, setPlayers] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [gameState, setGameState] = useState('starting'); // starting, questioning, reveal, final
    const [timeLeft, setTimeLeft] = useState(10);
    const [stats, setStats] = useState({ factCount: 0, fakeCount: 0 });

    useEffect(() => {
        gameSound.init();
        gameSound.playMusic('quiz'); // Reuse quiz music

        // Shuffle questions
        const shuffled = [...FACT_FAKE_DATA].sort(() => Math.random() - 0.5).slice(0, 10);
        setQuestions(shuffled);

        return () => gameSound.stopAll();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'players'), where('sessionId', '==', sessionId.toUpperCase()));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlayers(playersList);

            // Calculate live stats
            const fCount = playersList.filter(p => p.lastSwipe === 'fact').length;
            const kCount = playersList.filter(p => p.lastSwipe === 'fake').length;
            setStats({ factCount: fCount, fakeCount: kCount });
        });
        return () => unsubscribe();
    }, [sessionId]);

    const startRound = async (idx = 0) => {
        if (questions.length === 0) return;
        
        setGameState('starting');

        // Reset all player swipes for this round
        const resetPromises = players.map(p => 
            updateDoc(doc(db, 'players', p.id), { lastSwipe: null })
        );
        await Promise.all(resetPromises);

        await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
            status: 'fact_fake_start',
            currentQuestion: questions[idx],
            startTime: Date.now()
        });

        setTimeout(async () => {
            setGameState('questioning');
            setTimeLeft(10);
            await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
                status: 'fact_fake_active'
            });
            gameSound.play('start');
        }, 2000);
    };

    useEffect(() => {
        if (questions.length > 0 && currentIdx === 0 && gameState === 'starting') {
            startRound(0);
        }
    }, [questions]);

    const processScores = async () => {
        try {
            const currentQuestion = questions[currentIdx];
            if (!currentQuestion) return;
            const correct = currentQuestion.isFact ? 'fact' : 'fake';
            
            const q = query(collection(db, 'players'), where('sessionId', '==', sessionId.toUpperCase()));
            const snapshot = await getDocs(q);
            const latestPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const batchUpdates = latestPlayers.map(p => {
                if (p.lastSwipe === correct) {
                    return updateDoc(doc(db, 'players', p.id), {
                        score: (p.score || 0) + 100
                    });
                }
                return null;
            }).filter(Boolean);
            
            await Promise.all(batchUpdates);
        } catch (error) {
            console.error("Error processing scores:", error);
        }
    };

    const revealRound = async () => {
        setGameState('reveal');
        const correct = questions[currentIdx].isFact ? 'fact' : 'fake';
        
        // Sound effect
        const anyoneCorrect = players.some(p => p.lastSwipe === correct);
        gameSound.play(anyoneCorrect ? 'correct' : 'wrong');

        await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
            status: 'fact_fake_result'
        });

        // Award points during reveal
        await processScores();
    };

    const nextRound = () => {
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            startRound(nextIdx);
        } else {
            setGameState('final');
            gameSound.play('game_over');
            updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
                status: 'quiz_final' // Reuse final state
            });
        }
    };

    useEffect(() => {
        if (gameState === 'questioning' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameState === 'questioning') {
            revealRound();
        }
    }, [timeLeft, gameState]);

    if (questions.length === 0) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <Timer size={60} color="#3b82f6" className="animate-spin" />
                <h2 style={{ color: '#fff' }}>INITIALIZING STAGE...</h2>
            </div>
        );
    }

    const current = questions[currentIdx];
    if (!current) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
            color: '#fff', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div className="game-host-header" style={{ 
                padding: '2rem 3rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.3)', 
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div className="flex-center gap-3">
                    <div style={{ background: '#3b82f6', padding: '0.75rem', borderRadius: '12px', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}>
                        <Zap size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#60a5fa' }}>FACT/FAKE</h1>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>SWIPE WAR</span>
                    </div>
                </div>

                <div className="flex-center gap-4">
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>{currentIdx + 1}<span style={{ fontSize: '0.8rem', opacity: 0.3 }}> / 10</span></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: timeLeft < 3 ? '#ef4444' : '#fff' }}>{timeLeft}s</div>
                    </div>
                </div>
            </div>

            {/* Main Stage */}
            <div className="game-stage-grid" style={{ 
                flex: 1, 
                display: 'grid', 
                gridTemplateColumns: '1fr 400px',
                gap: '2rem', 
                padding: '2rem 3rem', 
                overflow: 'hidden'
            }}>
                
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '2.5rem', 
                    overflowY: 'auto', 
                    paddingRight: '1rem',
                    height: '100%', // Take full height of grid cell
                    minHeight: 0    // CRITICAL: Allows flex to shrink and scroll
                }} className="custom-scrollbar">
                    {gameState === 'starting' ? (
                        <div className="animate-pulse" style={{ textAlign: 'center' }}>
                            <Timer size={100} color="#3b82f6" style={{ marginBottom: '2rem' }} />
                            <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>GET READY TO SWIPE...</h2>
                        </div>
                    ) : (
                        <>
                            <div className="surface-glass" style={{ 
                                padding: '2rem 1.5rem', borderRadius: '24px', maxWidth: '1000px', width: '100%', 
                                textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.03)', position: 'relative'
                            }}>
                                <h2 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', fontWeight: 800, lineHeight: 1.2, margin: 0 }}>{current.statement}</h2>
                                
                                {gameState === 'reveal' && (
                                    <div className="animate-fade-up" style={{ marginTop: '3rem', padding: '2rem', borderRadius: '20px', background: current.isFact ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `2px solid ${current.isFact ? '#10b981' : '#ef4444'}` }}>
                                        <div style={{ fontSize: '3rem', fontWeight: 900, color: current.isFact ? '#10b981' : '#ef4444', marginBottom: '1rem' }}>
                                            {current.isFact ? 'FACT!' : 'FAKE!'}
                                        </div>
                                        <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{current.explanation}</p>
                                    </div>
                                )}
                            </div>

                            {/* Live Consensus */}
                            <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '800px', height: 'auto', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: '#ef4444', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s' }}>
                                    <XCircle size={24} /> <span style={{ marginLeft: '0.75rem', fontWeight: 900, fontSize: '1.1rem' }}>{stats.fakeCount} FAKE</span>
                                </div>
                                <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: '#10b981', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s' }}>
                                    <span style={{ marginRight: '0.75rem', fontWeight: 900, fontSize: '1.1rem' }}>{stats.factCount} FACT</span> <CheckCircle2 size={24} />
                                </div>
                            </div>

                            {gameState === 'reveal' && (
                                <div className="animate-fade-up" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={nextRound} 
                                        style={{ 
                                            height: '80px', 
                                            width: '100%',
                                            fontSize: '1.75rem', 
                                            background: '#3b82f6', 
                                            fontWeight: 900,
                                            borderRadius: '20px',
                                            boxShadow: '0 10px 40px rgba(59,130,246,0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1rem'
                                        }}
                                    >
                                        NEXT STATEMENT <Zap size={24} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Leaderboard Sidebar */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '40px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '2rem',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
                        <Trophy size={28} color="#f59e0b" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.1em' }}>LEADERBOARD</h2>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="custom-scrollbar">
                        {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((player, index) => (
                            <div 
                                key={player.id}
                                className="leaderboard-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1.25rem',
                                    borderRadius: '20px',
                                    background: index === 0 ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), transparent)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${index === 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                                    animation: 'slideInRight 0.3s ease-out forwards',
                                    animationDelay: `${index * 0.05}s`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'rgba(255, 255, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 900,
                                        color: index <= 2 ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                                        fontSize: '1.2rem'
                                    }}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{player.name || 'Anonymous'}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>{player.score || 0} PTS</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Final Celebration */}
            {gameState === 'final' && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(2, 6, 23, 0.98)', backdropFilter: 'blur(40px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-bounce-in" style={{ textAlign: 'center' }}>
                        <div className="flex-center" style={{ marginBottom: '2rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Award size={140} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.5))' }} />
                                <Sparkles style={{ position: 'absolute', top: -20, right: -20, color: '#fff' }} className="animate-pulse" />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.6em', marginBottom: '1.5rem' }}>CAMPAIGN COMPLETE</div>
                        <div style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, marginBottom: '1.5rem' }}>
                            {[...players].sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.name || 'WINNER'}
                        </div>
                        <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: '4rem' }}>
                            THE ULTIMATE ECO-WARRIOR • {[...players].sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.score || 0} PTS
                        </div>
                        <button className="btn btn-primary" onClick={onGameOver} style={{ padding: '1.5rem 5rem', borderRadius: '100px', fontSize: '1.5rem', fontWeight: 900, background: '#3b82f6' }}>EXIT CAMPAIGN</button>
                    </div>
                    {/* Confetti simulation with CSS */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                        {[...Array(50)].map((_, i) => (
                            <div key={i} className="confetti" style={{
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                background: ['#3b82f6', '#10b981', '#fbbf24', '#ef4444'][Math.floor(Math.random() * 4)],
                                width: '10px', height: '20px',
                                animation: `fall ${Math.random() * 3 + 2}s linear infinite`,
                                animationDelay: `${Math.random() * 5}s`
                            }} />
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fall {
                    to { transform: translateY(110vh) rotate(360deg); }
                }
                @keyframes slideInRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    borderRadius: 10px;
                }
                .animate-bounce-in {
                    animation: bounceIn 0.8s cubic-bezier(0.36, 0, 0.66, -0.56) forwards;
                }
                @keyframes bounceIn {
                    0% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 1; transform: scale(1.05); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                @media (max-width: 900px) {
                    .game-stage-grid {
                        grid-template-columns: 1fr !important;
                        overflow-y: auto !important;
                        padding: 1rem !important;
                    }
                    .game-host-header {
                        padding: 1rem !important;
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FactFakeHost;
