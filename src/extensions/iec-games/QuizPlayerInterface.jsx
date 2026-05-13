import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, Timer, Award, Brain, Loader2 } from 'lucide-react';
import { gameSound } from '../../utils/sound';

const QuizPlayerInterface = ({ sessionId, playerId }) => {
    const [gameState, setGameState] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [stats, setStats] = useState({ score: 0 });

    useEffect(() => {
        if (!sessionId || !playerId) return;

        // Listen for game state
        const sessionRef = doc(db, 'game_sessions', sessionId.toUpperCase());
        const unsubSession = onSnapshot(sessionRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setGameState(data);
                if (data.status === 'quiz_question_start') {
                    setHasAnswered(false);
                    setSelectedAnswer(null);
                }
            }
        });

        // Listen for player stats
        const playerRef = doc(db, 'players', playerId);
        const unsubPlayer = onSnapshot(playerRef, (snap) => {
            if (snap.exists()) setStats(snap.data());
        });

        return () => {
            unsubSession();
            unsubPlayer();
        };
    }, [sessionId, playerId]);

    const handleAnswer = async (answer) => {
        if (hasAnswered || gameState?.status !== 'quiz_question_active') return;

        setSelectedAnswer(answer);
        setHasAnswered(true);

        const isCorrect = answer === gameState.currentQuestion.correctAnswer;
        const points = isCorrect ? Math.max(100 - (Date.now() - gameState.questionStartTime) / 100, 50) : 0;

        try {
            await updateDoc(doc(db, 'players', playerId), {
                lastAnswer: answer,
                lastAnswerTime: Date.now()
            });
        } catch (err) {
            console.error("Failed to submit answer:", err);
        }
    };

    if (!gameState) return <div className="flex-center" style={{ height: '100vh', background: '#0a0a0a' }}><Loader2 className="animate-spin" /></div>;

    const showGetReady = gameState.status === 'quiz_question_start';
    const showChoices = gameState.status === 'quiz_question_active';
    const showFeedback = gameState.status === 'quiz_question_result';

    return (
        <div className="quiz-container gamepad-mode" style={{
            height: '100vh',
            background: 'radial-gradient(circle at center, #111 0%, #000 100%)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            touchAction: 'manipulation'
        }}>
            {/* Player Stats */}
            <div className="flex-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', marginBottom: '1.5rem' }}>
                <div className="flex-center gap-3">
                    <div style={{ background: '#f59e0b', padding: '0.5rem', borderRadius: '8px' }}>
                        <Award size={18} color="#000" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>MY SCORE</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{stats.score || 0}</div>
                    </div>
                </div>
                <div className="flex-center gap-2" style={{ color: '#f59e0b', fontSize: '1.25rem', fontWeight: 900 }}>
                    <Brain size={20} />
                    QUIZ BEE
                </div>
            </div>

            {/* Main Interaction Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
                {showGetReady ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '120px', height: '120px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #f59e0b' }}>
                            <Timer size={60} color="#f59e0b" className="pulse-slow" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', marginBottom: '0.5rem' }}>GET READY!</h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>Next question is loading...</p>
                        </div>
                    </div>
                ) : showChoices ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, letterSpacing: '0.1em' }}>SELECT THE CORRECT ANSWER</div>
                        </div>
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr', 
                            gap: '1rem', 
                            flex: 1, 
                            maxHeight: '400px',
                            minHeight: '200px'
                        }}>
                            {['A', 'B', 'C', 'D'].map((choice) => (
                                <button
                                    key={choice}
                                    onClick={() => handleAnswer(choice)}
                                    disabled={hasAnswered}
                                    style={{
                                        background: selectedAnswer === choice ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${selectedAnswer === choice ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '20px',
                                        fontSize: '1.8rem', // Reduced from 2.5rem
                                        fontWeight: 900,
                                        color: selectedAnswer === choice ? '#000' : '#fff',
                                        transition: 'all 0.2s',
                                        opacity: hasAnswered && selectedAnswer !== choice ? 0.3 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: selectedAnswer === choice ? '0 0 20px rgba(245,158,11,0.3)' : 'none'
                                    }}
                                >
                                    {choice}
                                </button>
                            ))}
                        </div>
                    </>
                ) : showFeedback ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                        {selectedAnswer === gameState.currentQuestion.correctAnswer ? (
                            <>
                                {gameSound.play('correct')}
                                <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #10b981' }}>
                                    <CheckCircle2 size={60} color="#10b981" />
                                </div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>CORRECT!</h2>
                                <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)' }}>You're as sharp as a narra tree!</p>
                            </>
                        ) : (
                            <>
                                {gameSound.play('wrong')}
                                <div style={{ background: 'rgba(239, 68, 68, 0.2)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #ef4444' }}>
                                    <XCircle size={60} color="#ef4444" />
                                </div>
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444' }}>INCORRECT</h2>
                                <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)' }}>Better luck on the next branch!</p>
                            </>
                        )}
                    </div>
                ) : gameState.status === 'quiz_final' ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
                        <div className="confetti-container" style={{ position: 'fixed' }}>
                            {[...Array(20)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="confetti-piece" 
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        background: ['#fbbf24', '#fff', '#10b981'][Math.floor(Math.random() * 3)],
                                        animationDelay: `${Math.random() * 2}s`
                                    }}
                                />
                            ))}
                        </div>
                        <Award size={100} color="#fbbf24" strokeWidth={3} style={{ filter: 'drop-shadow(0 0 15px rgba(251,191,36,0.5))' }} />
                        <div className="winner-card-bounce">
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fbbf24', marginBottom: '0.5rem' }}>CONGRATS!</h2>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.name || 'PLAYER'}</div>
                            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>FINAL SCORE: {stats.score || 0}</div>
                        </div>
                        <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Check the main screen for the leaderboard!</p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', opacity: 0.5 }}>
                        <Brain size={48} style={{ marginBottom: '1rem' }} />
                        <p>Waiting for the host to reveal the question...</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', fontWeight: 800 }}>
                    POWERED BY DENR IEC | SYSTEM V2.0
                </div>
            </div>
            <style>{`
                .confetti-container {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 100;
                }
                
                .confetti-piece {
                    position: absolute;
                    top: -20px;
                    width: 8px;
                    height: 12px;
                    opacity: 0.8;
                    animation: confettiFall 3s linear infinite;
                }
                
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                
                .winner-card-bounce {
                    animation: cardBounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                
                @keyframes cardBounce {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default QuizPlayerInterface;
