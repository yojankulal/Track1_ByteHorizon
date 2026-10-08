import React, { useState, useEffect } from 'react';
import { Waves, LayoutDashboard, Bell, ListOrdered, Sun, Moon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { checkApiHealth } from '../../lib/api-client';
import clsx from 'clsx';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/priority', label: 'Priority', icon: ListOrdered },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [apiOnline, setApiOnline] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Apply persisted theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('floodtwin-theme');
    const dark = saved ? saved === 'dark' : true;
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('floodtwin-theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
    const interval = setInterval(() => {
      checkApiHealth().then(setApiOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      {/* Topbar Header */}
      <header
        className="h-14 flex items-center justify-between px-6 z-20 shrink-0 shadow-lg border-b transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.4)]">
            <Waves size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight tracking-wide" style={{ color: 'var(--text-primary)' }}>FloodTwin</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Coastal Flood Intelligence</div>
          </div>
        </div>

        <div className="h-8 w-px mx-2 hidden md:block" style={{ backgroundColor: 'var(--border)' }} />

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]' : 'hover:bg-slate-100/50'
                )
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--text-muted)' }}
            >
              <Icon size={15} />
              <span>{label}</span>
              {label === 'Alerts' && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  393
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">

        {/* ── Theme Toggle Button ── */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 select-none"
          style={{
            backgroundColor: isDark ? 'var(--bg-input)' : '#FFFBEB',
            borderColor: isDark ? 'var(--border)' : '#FDE047',
            color: isDark ? 'var(--text-muted)' : '#92400E',
          }}
        >
          {isDark
            ? <Moon size={14} className="text-blue-400 transition-transform duration-300" />
            : <Sun  size={14} className="text-yellow-500 transition-transform duration-300" />
          }
          <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
        </button>

        <div className="h-8 w-px mx-2 hidden md:block" style={{ backgroundColor: 'var(--border)' }} />

        {/* Model Status Badge */}
        <div
          className={clsx(
            'flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm',
            apiOnline
              ? (isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-300')
              : (isDark ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-red-700 bg-red-50 border-red-300')
          )}
        >
          <div className={clsx('w-2 h-2 rounded-full', apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
          {apiOnline ? 'Online' : 'Offline'}
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 overflow-hidden flex gap-2 min-h-0">
        {children}
      </main>
    </div>
  );
}
