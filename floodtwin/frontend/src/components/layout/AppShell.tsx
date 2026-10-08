import React, { useState, useEffect } from 'react';
import { Waves, LayoutDashboard, Bell, ListOrdered, Wind } from 'lucide-react';
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

  useEffect(() => {
    checkApiHealth().then(setApiOnline);
    const interval = setInterval(() => {
      checkApiHealth().then(setApiOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#040B14] text-white font-sans overflow-hidden">
      {/* Topbar Header matching design */}
      <header className="h-14 flex items-center justify-between px-6 bg-[#081220] border-b border-[#1A2C46] z-20 shrink-0 shadow-lg">
        {/* Brand & Digital Twin Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
            <Waves size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight tracking-wide text-white">FloodTwin</div>
            <div className="text-[10px] text-[#5C85C5]">Coastal Flood Intelligence</div>
          </div>
        </div>

        <div className="h-8 w-px bg-[#1A2C46] mx-3 hidden md:block" />

        {/* Navigation Tabs (Dashboard, Alerts, Priority - What-If removed from topbar) */}
        <nav className="flex items-center gap-1.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'text-[#8A9EB8] hover:text-white hover:bg-[#112136]'
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="h-8 w-px bg-[#1A2C46] mx-3 hidden md:block" />

        {/* Cyclone Status */}
        <div className="flex items-center gap-2">
          <Wind size={20} className="text-orange-500 shrink-0" />
          <div className="flex flex-col">
            <div className="text-[10px] text-[#8A9EB8]">Cyclone Status</div>
            <div className="text-xs font-bold text-orange-500">ACTIVE · 'Midhili' 320 km W</div>
          </div>
        </div>

        <div className="h-8 w-px bg-[#1A2C46] mx-3 hidden md:block" />

        {/* Tide Level Widget */}
        <div className="flex items-center gap-3 min-w-[160px]">
          <Waves size={18} className="text-blue-400 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-[#8A9EB8] mb-0.5">
              <span>Tide Level</span>
              <span className="text-white font-bold">2.8 m <span className="text-blue-400 font-normal">↑</span></span>
            </div>
            <div className="h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[56%]" />
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-[#1A2C46] mx-3 hidden md:block" />

        {/* Model Status Badge */}
        <div className={clsx(
          'flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm',
          apiOnline
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : 'text-red-400 bg-red-500/10 border-red-500/30'
        )}>
          <div className={clsx('w-2 h-2 rounded-full', apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
          {apiOnline ? 'Online' : 'Offline'}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 overflow-hidden flex gap-2 min-h-0">
        {children}
      </main>
    </div>
  );
}
