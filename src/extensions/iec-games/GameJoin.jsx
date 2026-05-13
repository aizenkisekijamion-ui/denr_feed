import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, Users, Gamepad2, Sparkles } from 'lucide-react';
import QuizPlayerInterface from './QuizPlayerInterface';
import FactFakeController from './FactFakeController';

const GameJoin = () => {
    const { sessionId } = useParams();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [joined, setJoined] = useState(false);
    const [gameId, setGameId] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [sessionStatus, setSessionStatus] = useState('waiting');

    // Check for existing session in localStorage
    useEffect(() => {
        const storedPid = localStorage.getItem('denr_game_player_id');
        const storedSid = localStorage.getItem('denr_game_session_id');
        
        if (storedPid && storedSid === sessionId?.toUpperCase()) {
            setPlayerId(storedPid);
            setJoined(true);
        }
    }, [sessionId]);

    // Listen for session status
    useEffect(() => {
        if (!sessionId) return;
        const sessionRef = doc(db, 'game_sessions', sessionId.toUpperCase());
        const unsubscribe = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setSessionStatus(data.status);
                setGameId(data.gameId);
            }
        });
        return () => unsubscribe();
    }, [sessionId]);

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');

        try {
            const sid = sessionId.toUpperCase();
            const sessionRef = doc(db, 'game_sessions', sid);
            const sessionSnap = await getDoc(sessionRef);

            if (!sessionSnap.exists()) {
                setError('Session not found. Please scan the QR code again.');
                setLoading(false);
                return;
            }

            const sessionData = sessionSnap.data();
            setGameId(sessionData.gameId);

            const pid = Math.random().toString(36).substring(2, 12);
            await setDoc(doc(db, 'players', pid), {
                name: name.trim(),
                sessionId: sid,
                gameId: sessionData.gameId,
                x: 0,
                progress: 0,
                score: 0,
                lastActive: Date.now()
            });

            localStorage.setItem('denr_game_player_id', pid);
            localStorage.setItem('denr_game_session_id', sid);
            
            setPlayerId(pid);
            setJoined(true);
        } catch (err) {
            console.error("Join error:", err);
            setError('Failed to join session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If joined and session is active, show the appropriate controller
    const isQuizActive = ['quiz_active', 'quiz_question_start', 'quiz_question_active', 'quiz_question_result', 'quiz_final'].includes(sessionStatus);

    const isFactFakeActive = ['fact_fake_start', 'fact_fake_active', 'fact_fake_result'].includes(sessionStatus);

    if (joined && isQuizActive) {
        return <QuizPlayerInterface sessionId={sessionId} playerId={playerId} />;
    }

    if (joined && isFactFakeActive) {
        return <FactFakeController sessionId={sessionId} playerId={playerId} />;
    }

    if (joined) {
        return (
            <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', padding: '2rem', background: '#0a0a0a', color: '#fff' }}>
                <Sparkles size={60} color="#fbbf24" style={{ marginBottom: '2rem' }} className="pulse-slow" />
                <h1 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>YOU'RE IN!</h1>
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: '2.5rem' }}>Wait for the host to start the game.</p>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', width: '100%', maxWidth: '300px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>STATUS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>WAITING FOR HOST</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', padding: '2rem', background: 'linear-gradient(to bottom, #111, #000)', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 20px rgba(16,185,129,0.3)' }}>
                        <Gamepad2 size={40} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>READY TO PLAY?</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Enter your nickname to join the game session</p>
                </div>

                <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>NICKNAME</label>
                        <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. EcoWarrior"
                            maxLength={12}
                            required
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '1rem 1.5rem',
                                color: '#fff',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                outline: 'none',
                                transition: 'all 0.3s'
                            }}
                        />
                    </div>

                    {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>{error}</div>}

                    <button 
                        type="submit"
                        disabled={loading || !name.trim()}
                        style={{
                            width: '100%',
                            height: '60px',
                            borderRadius: '12px',
                            background: name.trim() ? '#10b981' : 'rgba(255,255,255,0.05)',
                            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : (
                            <>
                                <Users size={20} />
                                JOIN SESSION {sessionId?.toUpperCase()}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GameJoin;
