import { X, Trophy, PlayCircle, Users } from 'lucide-react';

const IecGameSelection = ({ isOpen, onClose, games, onSelectGame }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div 
                className="surface-glass modal-pop" 
                onClick={e => e.stopPropagation()}
                style={{
                    width: '95%',
                    maxWidth: '850px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh'
                }}
            >
                {/* Header */}
                <div className="flex-between" style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(to right, rgba(168, 85, 247, 0.1), transparent)' }}>
                    <div className="flex-center gap-3">
                        <Trophy size={24} color="#a855f7" />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>GAME SELECTION</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>CHOOSE AN INTERACTIVE IEC EXPERIENCE</p>
                        </div>
                    </div>
                    <button className="btn btn-glass" style={{ padding: '0.5rem' }} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Game Cards Grid */}
                <div style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', overflowY: 'auto' }}>
                    {games.map(game => {
                        const Icon = game.icon;
                        return (
                            <div 
                                key={game.id}
                                className="game-card"
                                onClick={() => onSelectGame(game.id)}
                            >
                                <div className="game-card-inner">
                                    <div className="game-thumb-container">
                                        <img src={game.thumbnail} alt={game.title} className="game-thumb" />
                                        <div className="game-overlay-gradient" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.9), transparent)` }} />
                                        <div className="game-badge" style={{ backgroundColor: game.color, boxShadow: `0 0 15px ${game.glow}` }}>
                                            <Icon size={16} color="#fff" />
                                            <span>MIN {game.minPlayers} PLAYERS</span>
                                        </div>
                                    </div>
                                    
                                    <div className="game-info">
                                        <h3 className="game-title">{game.title}</h3>
                                        <p className="game-description">{game.description}</p>
                                        
                                        <div className="game-instruction-box">
                                            <p className="instruction-label">HOW TO PLAY:</p>
                                            <p className="instruction-text">{game.instruction}</p>
                                        </div>

                                        <button 
                                            className="btn btn-primary game-play-btn"
                                            style={{ 
                                                width: '100%', 
                                                justifyContent: 'center', 
                                                gap: '0.75rem',
                                                backgroundColor: game.color,
                                                borderColor: 'transparent',
                                                boxShadow: `0 8px 20px -5px ${game.glow}`
                                            }}
                                        >
                                            <PlayCircle size={20} />
                                            OPEN GAME LOBBY
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Tip */}
                <div style={{ padding: '1.25rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex-center gap-2" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                        <Users size={14} />
                        CONNECT MULTIPLE DEVICES AS CONTROLLERS
                    </div>
                </div>

                <style>{`
                    .game-card {
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        overflow: hidden;
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        position: relative;
                    }

                    .game-card:hover {
                        transform: translateY(-8px) scale(1.02);
                        background: rgba(255, 255, 255, 0.06);
                        border-color: rgba(255, 255, 255, 0.2);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    }

                    .game-card:active {
                        transform: translateY(0) scale(0.98);
                    }

                    .game-thumb-container {
                        position: relative;
                        height: 180px;
                        overflow: hidden;
                    }

                    .game-thumb {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    }

                    .game-card:hover .game-thumb {
                        transform: scale(1.1);
                    }

                    .game-overlay-gradient {
                        position: absolute;
                        inset: 0;
                    }

                    .game-badge {
                        position: absolute;
                        top: 1rem;
                        right: 1rem;
                        padding: 0.4rem 0.75rem;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        font-size: 0.65rem;
                        font-weight: 800;
                        color: #fff;
                        letter-spacing: 0.05em;
                        backdrop-filter: blur(4px);
                    }

                    .game-info {
                        padding: 1.5rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }

                    .game-title {
                        margin: 0;
                        font-size: 1.4rem;
                        font-weight: 800;
                        color: #fff;
                        letter-spacing: -0.02em;
                    }

                    .game-description {
                        margin: 0;
                        font-size: 0.9rem;
                        color: rgba(255, 255, 255, 0.6);
                        line-height: 1.5;
                        min-height: 3rem;
                    }

                    .game-instruction-box {
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 12px;
                        padding: 1rem;
                        border: 1px dashed rgba(255, 255, 255, 0.1);
                    }

                    .instruction-label {
                        margin: 0 0 0.4rem 0;
                        font-size: 0.65rem;
                        font-weight: 900;
                        color: rgba(255, 255, 255, 0.4);
                        letter-spacing: 0.1em;
                    }

                    .instruction-text {
                        margin: 0;
                        font-size: 0.8rem;
                        color: #ddd;
                        line-height: 1.4;
                    }

                    .game-play-btn {
                        margin-top: 0.5rem;
                        transition: all 0.3s ease;
                    }

                    @keyframes modalPop {
                        from { opacity: 0; transform: scale(0.9) translateY(20px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }

                    .modal-pop {
                        animation: modalPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default IecGameSelection;
