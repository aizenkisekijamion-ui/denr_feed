import React from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="btn-glass-nav"
      style={{
        padding: '0.4rem',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        justifyContent: 'center',
        border: '1px solid var(--border-light)',
        background: 'var(--bg-input)',
        color: 'var(--denr-green-light)',
        boxShadow: theme === 'light' ? '0 0 15px rgba(0,0,0,0.05)' : '0 0 15px var(--denr-green-glow)',
        transition: 'var(--transition-theme)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={20} style={{ animation: 'fadeUp 0.3s ease' }} />
      ) : (
        <Moon size={20} style={{ animation: 'fadeUp 0.3s ease' }} />
      )}
    </button>
  );
};

export default ThemeToggle;
