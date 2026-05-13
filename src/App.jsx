import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Feed from './components/Feed';
import LoginModal from './components/LoginModal';
import RdatsTracker from './components/RdatsTracker';
import { CheckCircle } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { trackEvent } from './utils/track';
import { useLocation } from 'react-router-dom';

import GameJoin from './extensions/iec-games/GameJoin';
import ThemeToggle from './components/ThemeToggle';

function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('public');
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Theme Management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('denr-theme-v2') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('denr-theme-v2', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from Firestore
        try {
          // Try 'Users' (plural) first as seen in screenshot
          let userDoc = await getDoc(doc(db, 'Users', user.uid));
          
          // Fallback to 'User' (singular) if not found, since user mentioned it
          if (!userDoc.exists()) {
            userDoc = await getDoc(doc(db, 'User', user.uid));
          }

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = (userData.Role || userData.role || 'public').toLowerCase();
            setUserRole(role);
            setUserName(user.email || 'Staff');
            trackEvent('login', { email: user.email, role });
            setShowLoginToast(true);
            setTimeout(() => setShowLoginToast(false), 3000);
          } else {
            console.warn("User document not found in 'Users' or 'User' collections for UID:", user.uid);
            setUserRole('public');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('public');
        }
        setIsLoginModalOpen(false);
      } else {
        setUserRole('public');
      }
    });
    return () => unsubscribe();
  }, []);

  const location = useLocation();
  useEffect(() => {
    trackEvent('page_view', { title: document.title });
  }, [location.pathname]);

  const handleOpenLogin = () => setIsLoginModalOpen(true);
  const handleCloseLogin = () => setIsLoginModalOpen(false);

  const handleLoginSuccess = async (user) => {
    // Role will be fetched via the onAuthStateChanged listener above
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      trackEvent('logout');
      await signOut(auth);
      setUserRole('public');
      setShowLogoutToast(true);
      setTimeout(() => setShowLogoutToast(false), 3000);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Feed
              userRole={userRole}
              userEmail={userName}
              onAdminClick={handleOpenLogin}
              onLogout={handleLogout}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          }
        />
        <Route path="/rdats" element={<RdatsTracker userRole={userRole} theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/join/:sessionId" element={<GameJoin />} />
      </Routes>

      {/* Render Login Modal dynamically over the app */}
      {isLoginModalOpen && (
        <LoginModal onClose={handleCloseLogin} onSuccess={handleLoginSuccess} />
      )}

      {/* Global Login Notification Toast */}
      {showLoginToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(5, 150, 105, 0.95)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 30px rgba(5, 150, 105, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          <CheckCircle size={20} />
          <span>Welcome, {userName}! Access Level: {userRole.toUpperCase()}</span>
        </div>
      )}

      {/* Global Logout Notification Toast */}
      {showLogoutToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(5, 150, 105, 0.95)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 10px 30px rgba(5, 150, 105, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontWeight: 600,
          fontSize: '1rem'
        }}>
          <CheckCircle size={20} />
          <span>Logged Out Successfully</span>
        </div>
      )}
    </>
  );
}

export default App;
