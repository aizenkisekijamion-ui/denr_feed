import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, X, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { trackEvent } from '../utils/track';

const THEME_COLOR = "#d97706";

function LoginModal({ onClose, onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isForgot, setIsForgot] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            trackEvent('login_success', { email });
            setSuccess(true);
            setTimeout(() => onSuccess(), 1500);
        } catch (err) {
            const CODE_MAP = {
                'auth/user-not-found':         'No account found with this email.',
                'auth/invalid-credential':     'Wrong email or password.',
                'auth/wrong-password':         'Incorrect password.',
                'auth/invalid-email':          'Invalid email address.',
                'auth/too-many-requests':      'Too many attempts. Please wait.',
                'auth/user-disabled':          'Account disabled.',
                'auth/network-request-failed': 'Network error.',
            };
            const errorMessage = CODE_MAP[err.code] || `Login failed: ${err.message}`;
            setError(errorMessage);
            trackEvent('login_failed', { email, error: err.code, message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!email) { setError('Enter your email first.'); return; }
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
            trackEvent('password_reset_request', { email });
        } catch (err) {
            setError(err.code === 'auth/user-not-found'
                ? 'No account found with this email.'
                : `Reset failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div 
                className="premium-modal-window" 
                onClick={(e) => e.stopPropagation()} 
                style={{ 
                    width: '90%', 
                    maxWidth: '420px', 
                    height: 'auto',
                    minHeight: '0',
                    maxHeight: '90vh',
                    background: '#020617', 
                    borderRadius: '32px', 
                    border: `1px solid ${THEME_COLOR}44`,
                    boxShadow: `0 0 80px ${THEME_COLOR}15, 0 25px 50px rgba(0,0,0,0.5)`,
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Top Ambient Glow */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', background: `radial-gradient(circle at 50% 0%, ${THEME_COLOR}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

                <div style={{ padding: '1.75rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: `${THEME_COLOR}22`, borderRadius: '10px', color: THEME_COLOR }}>
                                <ShieldCheck size={22} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 950, color: '#fff', letterSpacing: '-0.4px' }}>
                                    {isForgot ? 'Reset Access' : 'Admin Portal'}
                                </h2>
                                <div style={{ fontSize: '0.6rem', color: THEME_COLOR, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                    PENRO Palawan • Secure
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#fff', padding: '0.4rem', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', animation: 'modalPop 0.4s ease' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b98144', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                                <ShieldCheck size={32} color="#10b981" />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#fff', marginBottom: '0.4rem' }}>Access Granted</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Synchronizing secure session...</p>
                        </div>
                    ) : resetSent ? (
                        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f644', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                                <KeyRound size={32} color="#3b82f6" />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#fff', marginBottom: '0.5rem' }}>Check your email</h3>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Recovery link sent to<br/><strong style={{ color: '#fff' }}>{email}</strong>
                            </p>
                            <button onClick={() => { setIsForgot(false); setResetSent(false); }} style={{ width: '100%', padding: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>
                                Back to Login
                            </button>
                        </div>
                    ) : isForgot ? (
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                <input
                                    type="email"
                                    placeholder="Registered Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', transition: '0.3s', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                />
                            </div>
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: loading ? 'rgba(255,255,255,0.1)' : THEME_COLOR, border: 'none', borderRadius: '14px', color: '#000', fontWeight: 950, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 6px 20px ${THEME_COLOR}33` }}>
                                {loading ? 'Processing...' : 'Send Recovery Link'}
                            </button>
                            <button type="button" onClick={() => setIsForgot(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                Back to Login
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                <input
                                    type="email"
                                    placeholder="Account Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', transition: '0.3s', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                                <input
                                    type="password"
                                    placeholder="Secure Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: '#fff', outline: 'none', transition: '0.3s', boxSizing: 'border-box', fontSize: '0.9rem' }}
                                />
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <button type="button" onClick={() => setIsForgot(true)} style={{ background: 'none', border: 'none', color: THEME_COLOR, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>
                                    Forgot Password?
                                </button>
                            </div>
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${THEME_COLOR}, #b45309)`, border: 'none', borderRadius: '14px', color: '#000', fontWeight: 950, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: loading ? 'none' : `0 8px 25px ${THEME_COLOR}33` }}>
                                <span>{loading ? 'Verifying...' : 'Establish Connection'}</span>
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer Visual */}
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Authorized Access Only • Palawan Hub
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginModal;

