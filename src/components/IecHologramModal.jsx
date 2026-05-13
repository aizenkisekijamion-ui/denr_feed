import React from 'react';
import { Images, MonitorPlay, Newspaper, Gamepad2, X, GalleryHorizontal } from 'lucide-react';

const IEC_CARDS = [
    {
        key: 'photo',
        label: 'Photos',
        sublabel: 'Gallery',
        icon: Images,
        color: '#10b981',         // emerald green
        glow: 'rgba(16,185,129,0.35)',
        bg: 'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(5,150,105,0.08) 100%)',
        border: 'rgba(16,185,129,0.5)',
        filterType: 'photo',
    },
    {
        key: 'video',
        label: 'Videos',
        sublabel: 'Media',
        icon: MonitorPlay,
        color: '#3b82f6',         // blue
        glow: 'rgba(59,130,246,0.35)',
        bg: 'linear-gradient(135deg, rgba(59,130,246,0.22) 0%, rgba(37,99,235,0.08) 100%)',
        border: 'rgba(59,130,246,0.5)',
        filterType: 'video',
    },
    {
        key: 'text',
        label: 'News',
        sublabel: 'Announcements',
        icon: Newspaper,
        color: '#f59e0b',         // amber
        glow: 'rgba(245,158,11,0.35)',
        bg: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.08) 100%)',
        border: 'rgba(245,158,11,0.5)',
        filterType: 'text',
    },
    {
        key: 'games',
        label: 'Games',
        sublabel: 'Play & Learn',
        icon: Gamepad2,
        color: '#a855f7',         // purple
        glow: 'rgba(168,85,247,0.35)',
        bg: 'linear-gradient(135deg, rgba(168,85,247,0.22) 0%, rgba(126,34,206,0.08) 100%)',
        border: 'rgba(168,85,247,0.5)',
        filterType: 'games',
        comingSoon: false,
    },
];

const IecHologramModal = ({ showIecModal, setShowIecModal, setFilterType, stats, setShowGameSelection }) => {
    if (!showIecModal) return null;

    const handleCardClick = (card) => {
        if (card.comingSoon) return;
        
        if (card.key === 'games') {
            setShowIecModal(false);
            setShowGameSelection(true);
            return;
        }

        setFilterType(card.filterType);
        setShowIecModal(false);
        setTimeout(() => {
            document.querySelector('.feed-controls')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const getStat = (key) => {
        if (key === 'photo') return stats.photos ?? 0;
        if (key === 'video') return stats.videos ?? 0;
        if (key === 'text') return stats.text ?? 0;
        return null;
    };

    return (
        <>
            <div className="modal-overlay" onClick={() => setShowIecModal(false)}>
                <div className="premium-modal-window modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', height: 'auto' }}>
                    {/* Header */}
                    <div className="premium-modal-header" style={{ background: 'linear-gradient(90deg, var(--denr-green-glow) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 16px rgba(16,185,129,0.4)',
                            }}>
                                <GalleryHorizontal size={20} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                                    IEC Portal
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                                    Information, Education & Communication
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowIecModal(false)}
                            style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '0.4rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        >
                            <X size={18} color="rgba(255,255,255,0.6)" />
                        </button>
                    </div>

                <div className="premium-modal-body" style={{ padding: '0 0 2rem 0' }}>
                        {/* Card Grid */}
                        <div className="iec-hologram-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem',
                            padding: '1.25rem 1.5rem 0',
                        }}>
                            {IEC_CARDS.map((card) => {
                                const Icon = card.icon;
                                const stat = getStat(card.key);
                                return (
                                    <div
                                        key={card.key}
                                        className={`iec-card ${card.comingSoon ? 'iec-card--soon' : ''}`}
                                        onClick={() => handleCardClick(card)}
                                        style={{
                                            background: card.bg,
                                            border: `1px solid ${card.border}`,
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            cursor: card.comingSoon ? 'default' : 'pointer',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s',
                                            opacity: card.comingSoon ? 0.65 : 1,
                                        }}
                                        onMouseEnter={e => {
                                            if (card.comingSoon) return;
                                            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                                            e.currentTarget.style.boxShadow = `0 12px 32px ${card.glow}`;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        {/* Glow blob */}
                                        <div style={{
                                            position: 'absolute', top: '-20px', right: '-20px',
                                            width: '80px', height: '80px',
                                            borderRadius: '50%',
                                            background: card.glow,
                                            filter: 'blur(24px)',
                                            pointerEvents: 'none',
                                        }} />

                                        {/* Icon */}
                                        <div style={{
                                            width: '44px', height: '44px',
                                            borderRadius: '12px',
                                            background: `rgba(255,255,255,0.08)`,
                                            border: `1px solid ${card.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            marginBottom: '1rem',
                                            boxShadow: `0 0 14px ${card.glow}`,
                                        }}>
                                            <Icon size={22} color={card.color} />
                                        </div>

                                        {/* Label */}
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                            {card.label}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem' }}>
                                            {card.sublabel}
                                        </div>

                                        {/* Stat badge or Coming Soon */}
                                        {card.comingSoon ? (
                                            <div style={{
                                                display: 'inline-block',
                                                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                                                color: card.color,
                                                background: `rgba(255,255,255,0.06)`,
                                                border: `1px solid ${card.border}`,
                                                borderRadius: '6px',
                                                padding: '0.2rem 0.6rem',
                                            }}>
                                                COMING SOON
                                            </div>
                                        ) : card.key === 'games' ? (
                                            <div style={{
                                                display: 'inline-block',
                                                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                                                color: '#fff',
                                                background: card.color,
                                                boxShadow: `0 0 12px ${card.glow}`,
                                                borderRadius: '6px',
                                                padding: '0.2rem 0.6rem',
                                            }}>
                                                PLAY IEC GAME
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'baseline', gap: '0.3rem',
                                            }}>
                                                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: card.color, lineHeight: 1 }}>
                                                    {stat}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>items</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer hint */}
                        <div style={{
                            textAlign: 'center', marginTop: '1.5rem',
                            fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)',
                            letterSpacing: '0.05em',
                        }}>
                            TAP A CARD TO EXPLORE
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes iecModalPop {
                    0%  { opacity: 0; transform: scale(0.9) translateY(16px); }
                    100%{ opacity: 1; transform: scale(1) translateY(0); }
                }
                .iec-card:active:not(.iec-card--soon) {
                    transform: scale(0.97) !important;
                }
                @media (max-width: 550px) {
                    .iec-hologram-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        padding: 1rem !important;
                        gap: 0.75rem !important;
                    }
                    @media (max-width: 360px) {
                        .iec-hologram-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                    div[style*="maxWidth: 500px"] {
                        max-height: 92vh !important;
                        overflow-y: auto !important;
                        width: 95vw !important;
                        border-radius: 20px !important;
                        padding-bottom: 1.5rem !important;
                    }
                    div[style*="fontSize: '1.1rem'"] {
                        font-size: 0.95rem !important;
                    }
                }
            `}</style>
        </>
    );
};

export default IecHologramModal;
