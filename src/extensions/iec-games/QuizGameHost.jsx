import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { Trophy, Timer, Brain, Award, Sparkles, CheckCircle2, ChevronRight, Users, XCircle, Volume2 } from 'lucide-react';
import { gameSound } from '../../utils/sound';

import { QUIZ_QUESTIONS } from './quizData';

// Helper to shuffle array
const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const QuizGameHost = ({ sessionId, onGameOver }) => {
    const [players, setPlayers] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [gameState, setGameState] = useState('starting'); // starting, questioning, reveal, final
    const [timeLeft, setTimeLeft] = useState(15);
    const [sessionStatus, setSessionStatus] = useState('waiting');
    const [questionStartTime, setQuestionStartTime] = useState(null);

    // Initialize game sounds and music
    useEffect(() => {
        gameSound.init();
        gameSound.playMusic('quiz');

        return () => {
            gameSound.stopAll();
        };
    }, []);

    useEffect(() => {
        const sid = sessionId ? sessionId.toUpperCase() : '';
        if (!sid) return;
        const q = query(collection(db, 'players'), where('sessionId', '==', sid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlayers(playersList);
        });
        return () => unsubscribe();
    }, [sessionId]);

    // Initialize and shuffle questions for this session
    useEffect(() => {
        const selected = shuffleArray(QUIZ_QUESTIONS).slice(0, 10); // Take 10 random questions
        setQuestions(selected);
    }, []);

    const startQuiz = async () => {
        if (questions.length === 0) return;
        gameSound.play('start');
        
        // Reset all player answers for the first round
        const resetPromises = players.map(p => 
            updateDoc(doc(db, 'players', p.id), { lastAnswer: null, lastAnswerTime: null })
        );
        await Promise.all(resetPromises);

        const startTime = Date.now();
        setQuestionStartTime(startTime);

        await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
            status: 'quiz_active',
            currentQuestionIdx: 0,
            questionStartTime: startTime,
            currentQuestion: questions[0]
        });
        setGameState('questioning');
        setTimeLeft(15);
    };

    const nextQuestion = async () => {
        gameSound.play('click');
        if (currentQuestionIdx < questions.length - 1) {
            setGameState('starting'); // Reset state immediately to hide answers
            const nextIdx = currentQuestionIdx + 1;
            setCurrentQuestionIdx(nextIdx);

            // Reset all player answers for the next round
            const resetPromises = players.map(p => 
                updateDoc(doc(db, 'players', p.id), { lastAnswer: null, lastAnswerTime: null })
            );
            await Promise.all(resetPromises);

            const startTime = Date.now();
            setQuestionStartTime(startTime);

            await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
                status: 'quiz_question_start',
                currentQuestionIdx: nextIdx,
                questionStartTime: startTime,
                currentQuestion: questions[nextIdx]
            });
            
            // Short delay to let players reset
            setTimeout(async () => {
                await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
                    status: 'quiz_question_active'
                });
                setGameState('questioning');
                setTimeLeft(15);
            }, 2000);
        } else {
            setGameState('final');
            gameSound.play('game_over');
            await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
                status: 'quiz_final'
            });
        }
    };

    const checkAnswer = async () => {
        if (!currentQuestion) return;
        
        // Find correct answer
        const isCorrect = players.some(p => p.lastAnswer === currentQuestion.correctAnswer);
        if (isCorrect) {
            gameSound.play('correct');
        } else {
            // Check if anyone answered at all
            if (players.some(p => p.lastAnswer)) {
                gameSound.play('wrong');
            }
        }
    };

    const processScores = async () => {
        const correctChoice = currentQuestion.correctAnswer;
        
        // Fetch absolute latest data to avoid sync lag
        const sid = sessionId ? sessionId.toUpperCase() : '';
        const q = query(collection(db, 'players'), where('sessionId', '==', sid));
        const snapshot = await getDocs(q);
        const latestPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const batchUpdates = latestPlayers.map(p => {
            if (p.lastAnswer === correctChoice) {
                const timeTaken = p.lastAnswerTime - questionStartTime;
                const points = Math.max(100 - timeTaken / 100, 50);
                return updateDoc(doc(db, 'players', p.id), {
                    score: (p.score || 0) + Math.floor(points)
                });
            }
            return null;
        }).filter(Boolean);
        
        await Promise.all(batchUpdates);
    };

    const revealAnswer = async () => {
        setGameState('reveal');
        checkAnswer(); // Play sound effect based on answers
        await updateDoc(doc(db, 'game_sessions', sessionId.toUpperCase()), {
            status: 'quiz_question_result'
        });
        
        // Award points during reveal
        await processScores();
    };

    // Initial session setup
    useEffect(() => {
        if (questions.length === 0 || !sessionId) return;

        const setupSession = async () => {
            const sid = sessionId.toUpperCase();
            setGameState('starting'); // Ensure we start in 'starting' state
            
            const startTime = Date.now();
            setQuestionStartTime(startTime);

            await updateDoc(doc(db, 'game_sessions', sid), {
                status: 'quiz_question_start',
                currentQuestion: questions[0],
                questionStartTime: startTime
            });
            setTimeout(async () => {
                await updateDoc(doc(db, 'game_sessions', sid), {
                    status: 'quiz_question_active'
                });
                setGameState('questioning');
            }, 2000);
        };
        setupSession();
    }, [sessionId, questions]);

    // Timer
    useEffect(() => {
        if (gameState === 'questioning' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameState === 'questioning') {
            gameSound.play('timeout');
            revealAnswer();
        }
    }, [timeLeft, gameState]);

    if (questions.length === 0) return <div className="flex-center" style={{ height: '100vh', background: '#020617' }}><div className="spinner"></div></div>;

    const currentQuestion = questions[currentQuestionIdx];

    return (
        <div className="quiz-host-container" style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%)',
            zIndex: 2000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div className="game-host-header" style={{ 
                padding: '2rem 4rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.3)', 
                backdropFilter: 'blur(10px)', 
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div className="flex-center gap-3">
                    <div style={{ background: '#f59e0b', padding: '0.75rem', borderRadius: '12px', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                        <Brain size={24} color="#000" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fbbf24' }}>QUIZ BEE</h1>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>BATTLE OF MINDS</span>
                    </div>
                </div>

                <div className="flex-center gap-4">
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{currentQuestionIdx + 1}<span style={{ fontSize: '0.8rem', opacity: 0.3 }}> / {questions.length}</span></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: timeLeft < 5 ? '#ef4444' : '#fff' }}>{timeLeft}s</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="game-stage-grid" style={{ 
                flex: 1, 
                display: 'grid', 
                gridTemplateColumns: '1fr 450px',
                gap: '2.5rem', 
                padding: '3rem 4rem', 
                overflow: 'hidden' 
            }}>
                
                {/* Question Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', paddingRight: '1rem' }} className="custom-scrollbar">
                    {gameState === 'final' ? (
                        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', textAlign: 'center' }}>
                            <Trophy size={120} color="#fbbf24" style={{ marginBottom: '2rem' }} className="pulse-slow" />
                            <h2 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '1rem' }}>GRAND FINALE</h2>
                            <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px' }}>The environmental challenge has concluded. Check the final leaderboard!</p>
                            <button className="btn btn-primary" onClick={onGameOver} style={{ marginTop: '3rem', height: '70px', padding: '0 3rem', fontSize: '1.5rem', fontWeight: 900 }}>EXIT GAME</button>
                        </div>
                    ) : (
                        <>
                            <div className="surface-glass" style={{ padding: '2rem 1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                                <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.3, margin: 0 }}>{currentQuestion.question}</h2>
                            </div>

                            <div className="choices-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
                                {Object.entries(currentQuestion.choices).map(([key, value]) => {
                                    const isCorrect = key === currentQuestion.correctAnswer;
                                    const showResult = gameState === 'reveal';
                                    return (
                                        <div 
                                            key={key}
                                            style={{
                                                padding: '2rem', 
                                                borderRadius: '20px', 
                                                background: showResult ? (isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(255,255,255,0.05)',
                                                border: `2px solid ${showResult ? (isCorrect ? '#10b981' : 'rgba(239,68,68,0.3)') : 'rgba(255,255,255,0.1)'}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            <div style={{ 
                                                width: '50px', height: '50px', borderRadius: '12px', 
                                                background: showResult ? (isCorrect ? '#10b981' : '#ef4444') : 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.5rem', fontWeight: 900, color: showResult ? '#fff' : 'rgba(255,255,255,0.5)'
                                            }}>
                                                {key}
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{value}</div>
                                            {showResult && isCorrect && <CheckCircle2 size={32} color="#10b981" style={{ marginLeft: 'auto' }} />}
                                        </div>
                                    );
                                })}
                            </div>

                            {gameState === 'reveal' && (
                                <div className="animate-fade-up" style={{ padding: '2rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                                    <div className="flex-center gap-2" style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                                        <Sparkles size={14} /> FACT CHECK
                                    </div>
                                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#fde68a' }}>{currentQuestion.explanation}</p>
                                    <button 
                                        onClick={nextQuestion}
                                        className="btn btn-primary" 
                                        style={{ marginTop: '1.5rem', width: '100%', background: '#fbbf24', color: '#000', fontWeight: 900, gap: '0.5rem' }}
                                    >
                                        NEXT QUESTION <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Real-time Leaderboard Sidebar */}
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
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{player.name || 'Anonymous'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>RANK {index + 1}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: index === 0 ? '#fbbf24' : '#fff' }}>
                                    {player.score || 0}
                                </div>
                            </div>
                        ))}
                        {players.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem 2rem', opacity: 0.3 }}>
                                <Users size={48} style={{ marginBottom: '1rem' }} />
                                <p>Waiting for players...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Final Results / Celebration */}
                {gameState === 'final' && (
                    <div className="overlay-msg flex-center" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2, 6, 23, 0.95)', backdropFilter: 'blur(30px)' }}>
                        <div className="confetti-container">
                            {[...Array(60)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="confetti-piece" 
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        background: ['#fbbf24', '#f59e0b', '#fff', '#10b981', '#3b82f6'][Math.floor(Math.random() * 5)],
                                        animationDelay: `${Math.random() * 4}s`,
                                        width: `${Math.random() * 8 + 6}px`,
                                        height: `${Math.random() * 12 + 10}px`
                                    }}
                                />
                            ))}
                        </div>
                        <div className="winner-card-bounce" style={{ textAlign: 'center' }}>
                            <div className="flex-center" style={{ marginBottom: '2rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <Award size={140} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.5))' }} />
                                    <Sparkles style={{ position: 'absolute', top: -20, right: -20, color: '#fff' }} className="animate-pulse" />
                                </div>
                            </div>
                            <div style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.6em', marginBottom: '1.5rem' }}>CONGRATULATIONS</div>
                            <div className="glow-text-gold" style={{ fontSize: '6rem', lineHeight: 1, marginBottom: '1rem' }}>
                                {[...players].sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.name || 'WINNER'}
                            </div>
                            <div style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 700, opacity: 0.8, marginBottom: '4rem' }}>
                                IEC QUIZ MASTER • {[...players].sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.score || 0} PTS
                            </div>
                            
                            <button 
                                onClick={onGameOver}
                                className="glass-button"
                                style={{ 
                                    padding: '1.5rem 5rem', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: '1.2rem',
                                    fontWeight: 900,
                                    letterSpacing: '0.1em'
                                }}
                            >
                                CLOSE SESSION
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .leaderboard-item { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up { animation: fade-up 0.5s ease-out forwards; }
                
                .confetti-container {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    overflow: hidden;
                    z-index: 1;
                }
                
                .confetti-piece {
                    position: absolute;
                    top: -20px;
                    opacity: 0.8;
                    animation: confettiFall 4s linear infinite;
                }
                
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
                
                .winner-card-bounce {
                    animation: cardBounce 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    position: relative;
                    z-index: 10;
                }
                
                @keyframes cardBounce {
                    0% { transform: scale(0.5); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .glow-text-gold {
                    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.4));
                    font-weight: 900;
                    text-transform: uppercase;
                }

                .glass-button {
                    border-radius: 20px;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .glass-button:hover {
                    background: rgba(255,255,255,0.1) !important;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                @keyframes slideInRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .leaderboard-item {
                    transition: transform 0.2s;
                }
                .leaderboard-item:hover {
                    transform: scale(1.02);
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
                @keyframes slideInRight {
                    from { transform: translateX(50px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .leaderboard-item {
                    transition: transform 0.2s;
                }
                .leaderboard-item:hover {
                    transform: scale(1.02);
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
                @media (max-width: 900px) {
                    .game-stage-grid {
                        grid-template-columns: 1fr !important;
                        overflow-y: auto !important;
                        padding: 1rem !important;
                    }
                    .choices-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .game-host-header {
                        padding: 1rem !important;
                        flex-direction: column !important;
                        align-items: flex-start !important;
                    }
                }
                .choices-grid {
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                }
            `}</style>
        </div>
    );
};

export default QuizGameHost;
