import React from 'react';
import { X, Image as ImageIcon, Video, FileText, ArrowRight } from 'lucide-react';

// Helper: get a YouTube thumbnail
const getYTThumb = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[2].length === 11) ? match[2] : null;
    // Try maxresdefault, fallback to hqdefault
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
};

// Helper: type badge info
const typeMeta = (type) => {
    if (type === 'photo')  return { label: 'PHOTO',  icon: ImageIcon, color: '#10b981', bg: 'rgba(16,185,129,0.18)' };
    if (type === 'video')  return { label: 'VIDEO',  icon: Video,     color: '#3b82f6', bg: 'rgba(59,130,246,0.18)' };
    return                        { label: 'NEWS',   icon: FileText,  color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' };
};

const PostCard = ({ post, onClick }) => {
    const meta = typeMeta(post.type);
    const Icon = meta.icon;

    // Resolve thumbnail
    let thumb = null;
    if (post.type === 'photo' && post.mediaUrls?.length) thumb = post.mediaUrls[0];
    if (post.type === 'video') {
        if (post.isYoutube && post.mediaUrls?.length) {
            thumb = getYTThumb(post.mediaUrls[0]);
        } else if (post.youtubeUrl) {
            thumb = getYTThumb(post.youtubeUrl);
        } else if (post.mediaUrls?.length) {
            // Cloudinary video thumbnail trick: change extension to .jpg or use transform
            const url = post.mediaUrls[0];
            if (url.includes('cloudinary.com')) {
                thumb = url.replace(/\/video\/upload\//, '/video/upload/c_thumb,w_400,h_225,g_auto/').replace(/\.[^/.]+$/, ".jpg");
            } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
                thumb = null; // Let the icon placeholder show instead of broken image
            } else {
                thumb = url; // fallback for other images
            }
        }
    }

    return (
        <div
            onClick={onClick}
            style={{
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer',
                transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                display: 'flex',
                flexDirection: 'column',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 10px 28px rgba(0,0,0,0.4)`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Thumbnail / Placeholder */}
            <div style={{
                width: '100%', aspectRatio: '16/9',
                background: thumb ? 'transparent' : meta.bg,
                position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {thumb ? (
                    <img
                        src={thumb}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={e => { 
                            // Try hqdefault if maxres fails
                            if (e.target.src.includes('maxresdefault')) {
                                e.target.src = e.target.src.replace('maxresdefault', 'hqdefault');
                            } else {
                                e.target.style.display = 'none';
                            }
                        }}
                    />
                ) : (
                    <Icon size={32} color={meta.color} style={{ opacity: 0.6 }} />
                )}
                {/* Type badge */}
                <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: meta.bg,
                    border: `1px solid ${meta.color}40`,
                    borderRadius: '6px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: meta.color,
                    letterSpacing: '0.07em',
                    backdropFilter: 'blur(6px)',
                }}>
                    {meta.label}
                </div>
            </div>

            {/* Text */}
            <div style={{ padding: '0.75rem 0.9rem 0.85rem', flex: 1 }}>
                <div style={{
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}>
                    {post.title || '(No title)'}
                </div>
                {post.description && (
                    <div style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-tertiary)',
                        marginTop: '0.3rem',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {post.description}
                    </div>
                )}
            </div>
        </div>
    );
};

const WhatsNewModal = ({ show, onClose, posts, onViewPost }) => {
    if (!show) return null;

    // Latest 6 posts (already sorted by createdAt desc from Feed)
    const latest = posts.slice(0, 6);

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="premium-modal-window" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', height: '85vh' }}>
                {/* Header */}
                <div className="premium-modal-header" style={{ background: 'linear-gradient(90deg, var(--denr-green-glow) 0%, transparent 100%)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: '#10b981',
                                boxShadow: '0 0 8px #10b981',
                                animation: 'livePulse 2s ease-in-out infinite',
                            }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.12em' }}>
                                WHAT'S NEW
                            </span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                            Latest from DENR-ENGP
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            padding: '0.45rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                        }}
                    >
                        <X size={18} color="rgba(255,255,255,0.6)" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="premium-modal-body">
                    {latest.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                            No posts yet. Check back soon!
                        </div>
                    ) : (
                        <div className="whats-new-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                            gap: '0.9rem',
                        }}>
                            {latest.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onClick={() => {
                                        onClose();
                                        setTimeout(() => onViewPost && onViewPost(post), 200);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="whats-new-footer" style={{
                    padding: '0.9rem 1.5rem',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex', justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button
                        className="explore-btn"
                        onClick={onClose}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            background: 'linear-gradient(135deg, #059669, #10b981)',
                            color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                            border: 'none', borderRadius: '10px',
                            padding: '0.55rem 1.25rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 16px rgba(16,185,129,0.35)',
                            transition: 'transform 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Explore Feed <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes whatsNewPop {
                    0%  { opacity: 0; transform: scale(0.92) translateY(20px); }
                    100%{ opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.5; transform: scale(1.3); }
                }

                @media (max-width: 600px) {
                    .whats-new-grid {
                        grid-template-columns: 1fr !important;
                        gap: 0.75rem !important;
                    }
                    .mobile-close-btn {
                        display: block !important;
                    }
                    div[style*="maxWidth: 780px"] {
                        maxHeight: 96vh !important;
                        borderRadius: 16px !important;
                        width: 95vw !important;
                    }
                    .whats-new-footer {
                        padding: 1rem !important;
                    }
                    .explore-btn {
                        width: 100% !important;
                        padding: 0.8rem !important;
                    }
                }
            `}</style>
            </div>
        </>
    );
};

export default WhatsNewModal;
