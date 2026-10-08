import os

frontend_dir = r"c:\Users\User\OneDrive\Desktop\Singularity\floodtwin\frontend"

# We will populate some key files.
files = {
    "package.json": """{
  "name": "floodtwin-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.3",
    "maplibre-gl": "^4.1.0",
    "lucide-react": "^0.359.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.2",
    "recharts": "^2.12.3",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}
""",
    "vite.config.ts": """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
""",
    "tsconfig.json": """{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
""",
    "tsconfig.node.json": """{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
""",
    "tailwind.config.ts": """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B1220',
        surface: '#111A2E',
        'surface-raised': '#18243D',
        border: '#243352',
        primary: '#2F8CFF',
        'primary-accent': '#22D3EE',
        'text-primary': '#E8EEF9',
        'text-secondary': '#9FB0CC',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#2F8CFF',
        severity: {
          0: '#64748B', // None
          1: '#FACC15', // Minor
          2: '#FB923C', // Moderate
          3: '#EF4444', // Severe
          4: '#C026D3', // Critical
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
""",
    "postcss.config.js": """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
""",
    "index.html": """<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>FloodTwin - Coastal Flood Intelligence</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="bg-background text-text-primary antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""",
    "src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-text-primary;
  }
}
""",
    "src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""",
    "src/App.tsx": """import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          {/* Add more routes as needed */}
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
""",
    "src/components/layout/AppShell.tsx": """import React from 'react';
import { Activity, Map, AlertTriangle, Layers, Settings, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { icon: Map, label: 'Dashboard', path: '/' },
    { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
    { icon: Activity, label: 'Priority', path: '/priority' },
    { icon: Layers, label: 'What-If', path: '/whatif' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-16 flex-shrink-0 flex flex-col bg-surface border-r border-border">
        <div className="h-14 flex items-center justify-center border-b border-border text-primary font-bold">
          FT
        </div>
        <div className="flex-1 py-4 flex flex-col gap-4 items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  "p-3 rounded-xl transition-colors",
                  isActive ? "bg-primary/20 text-primary" : "text-text-secondary hover:text-text-primary hover:bg-surface-raised"
                )}
                title={item.label}
              >
                <item.icon size={20} />
              </Link>
            );
          })}
        </div>
        <div className="p-4 flex justify-center">
          <Settings size={20} className="text-text-secondary hover:text-text-primary cursor-pointer" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 bg-surface border-b border-border z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold tracking-wide">COASTAL FLOOD INTELLIGENCE</h1>
            <span className="px-2 py-1 rounded bg-error/20 text-error text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              LIVE
            </span>
            <span className="text-xs text-text-secondary ml-2">Updated just now</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-surface-raised rounded-full text-xs font-mono border border-border">
               Data: Simulated
             </div>
             <select className="bg-surface-raised border border-border text-sm rounded-md px-2 py-1 outline-none focus:border-primary">
               <option>Responder Mode</option>
               <option>Resident Mode</option>
             </select>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
""",
    "src/pages/DashboardPage.tsx": """import React, { useState } from 'react';
import { Play, Pause, AlertCircle, Info, ChevronRight, Map as MapIcon } from 'lucide-react';
import clsx from 'clsx';

// Mock Data
const zones = [
  { id: 'Z1', name: 'Coastal Ward 7', risk: 86, severity: 4, onset: '3:20 PM', peak: '4:35 PM', description: 'Hospital access threatened' },
  { id: 'Z2', name: 'Marina District', risk: 65, severity: 3, onset: '4:15 PM', peak: '5:00 PM', description: 'High population density' },
  { id: 'Z3', name: 'Port Authority', risk: 42, severity: 2, onset: '5:30 PM', peak: '6:15 PM', description: 'Commercial assets' },
];

const severityColors = {
  0: 'bg-slate-500 text-slate-100',
  1: 'bg-yellow-500 text-yellow-900',
  2: 'bg-orange-500 text-orange-900',
  3: 'bg-red-500 text-red-100',
  4: 'bg-fuchsia-600 text-fuchsia-100',
};

const severityLabels = {
  0: 'None', 1: 'Minor', 2: 'Moderate', 3: 'Severe', 4: 'Critical'
};

export default function DashboardPage() {
  const [selectedZone, setSelectedZone] = useState<typeof zones[0] | null>(zones[0]);
  const [timeOffset, setTimeOffset] = useState(0); // 0 = NOW, 30 = +30m, etc.
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="absolute inset-0 flex">
      {/* Map Area (Mock) */}
      <div className="flex-1 bg-[#0a101d] relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #2F8CFF 0%, transparent 60%)' }}></div>
        <div className="text-center z-10 text-text-secondary">
           <MapIcon size={48} className="mx-auto mb-4 opacity-50" />
           <p className="font-mono text-sm">MapLibre GL rendering area</p>
           <p className="text-xs mt-2 opacity-50">Interactive map with severity polygons</p>
        </div>

        {/* Timeline Overlay */}
        <div className="absolute bottom-6 left-6 right-6 lg:right-[440px] bg-surface/90 backdrop-blur border border-border rounded-xl p-4 shadow-xl">
           <div className="flex items-center gap-4">
             <button 
               className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-blue-600 transition"
               onClick={() => setIsPlaying(!isPlaying)}
             >
               {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
             </button>
             <div className="flex-1">
               <div className="flex justify-between text-xs font-mono text-text-secondary mb-2">
                 <span>NOW</span>
                 <span>+30m</span>
                 <span>+1h</span>
                 <span>+2h</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="120" step="30"
                 value={timeOffset}
                 onChange={(e) => setTimeOffset(Number(e.target.value))}
                 className="w-full accent-primary h-2 bg-surface-raised rounded-full appearance-none cursor-pointer"
               />
             </div>
           </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-[420px] bg-surface border-l border-border flex flex-col h-full z-20 shadow-2xl overflow-y-auto">
        {selectedZone ? (
          <div className="p-6 border-b border-border">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h2 className="text-xl font-bold">{selectedZone.name}</h2>
                 <p className="text-sm text-text-secondary">Zone ID: {selectedZone.id}</p>
               </div>
               <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", severityColors[selectedZone.severity as keyof typeof severityColors])}>
                 {severityLabels[selectedZone.severity as keyof typeof severityLabels]}
               </span>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-surface-raised p-4 rounded-lg border border-border">
                 <div className="text-xs text-text-secondary uppercase mb-1">Probability</div>
                 <div className="text-3xl font-bold font-mono">{selectedZone.risk}%</div>
                 <div className="w-full bg-surface h-1.5 mt-2 rounded-full overflow-hidden">
                   <div className="bg-primary h-full" style={{ width: `${selectedZone.risk}%` }}></div>
                 </div>
               </div>
               <div className="bg-surface-raised p-4 rounded-lg border border-border flex flex-col justify-center">
                 <div className="text-xs text-text-secondary uppercase mb-1">Timeline</div>
                 <div className="text-sm"><span className="text-text-secondary mr-2">Onset</span> <span className="font-mono">{selectedZone.onset}</span></div>
                 <div className="text-sm"><span className="text-text-secondary mr-2">Peak</span> <span className="font-mono">{selectedZone.peak}</span></div>
               </div>
             </div>

             <div className="mb-6">
               <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-primary"/> Why is this happening?</h3>
               <div className="bg-surface-raised p-4 rounded-lg border border-border text-sm leading-relaxed text-text-secondary">
                 Heavy rainfall is occurring while tide levels are elevated. The area is low-lying, so water is expected to accumulate rapidly.
               </div>
             </div>

             <div>
               <h3 className="text-sm font-semibold mb-3">Main Drivers</h3>
               <div className="space-y-3">
                 <div>
                   <div className="flex justify-between text-xs mb-1"><span>Heavy 3-hour rainfall</span> <span className="text-error font-mono">+42%</span></div>
                   <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden"><div className="h-full bg-error w-[80%]"></div></div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs mb-1"><span>High tide</span> <span className="text-error font-mono">+28%</span></div>
                   <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden"><div className="h-full bg-error w-[60%]"></div></div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs mb-1"><span>Low elevation</span> <span className="text-error font-mono">+16%</span></div>
                   <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden"><div className="h-full bg-error w-[40%]"></div></div>
                 </div>
               </div>
             </div>
          </div>
        ) : (
          <div className="p-6 text-center text-text-secondary border-b border-border">
            Select a zone on the map to see details.
          </div>
        )}

        {/* Priority List */}
        <div className="p-6 flex-1 bg-[#0d1526]">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold">Emergency Priority</h3>
             <button className="text-primary text-xs hover:underline">View All</button>
           </div>
           <div className="space-y-3">
             {zones.map((z, idx) => (
               <div 
                 key={z.id} 
                 className={clsx(
                   "p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-4",
                   selectedZone?.id === z.id ? "bg-surface-raised border-primary" : "bg-surface border-border hover:border-text-secondary"
                 )}
                 onClick={() => setSelectedZone(z)}
               >
                 <div className="text-xl font-black text-text-secondary font-mono w-6 text-center">
                   {idx + 1}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                     <span className={clsx("w-2 h-2 rounded-full", severityColors[z.severity as keyof typeof severityColors].split(' ')[0])}></span>
                     <h4 className="font-semibold truncate">{z.name}</h4>
                   </div>
                   <p className="text-xs text-text-secondary truncate">{z.description}</p>
                 </div>
                 <ChevronRight size={16} className="text-text-secondary" />
               </div>
             ))}
           </div>
           
           {/* Briefing */}
           <div className="mt-8 bg-surface-raised border border-border p-4 rounded-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-primary-accent"></div>
             <h3 className="text-xs font-bold uppercase tracking-wider text-primary-accent mb-2 flex items-center gap-2">
               <Info size={14} /> AI Flood Briefing
             </h3>
             <p className="text-sm text-text-secondary leading-relaxed">
               Significant flooding expected in Coastal Ward 7 and Marina District starting at 3:20 PM. Primary driver is concurrent high tide and heavy rainfall. Ground-level evacuations recommended in Zone Z1 before 3:00 PM to ensure safe routes remain passable.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
"""
}

for path, content in files.items():
    full_path = os.path.join(frontend_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Frontend files generated.")
