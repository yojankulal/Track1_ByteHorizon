import os

frontend_dir = r"c:\Users\User\OneDrive\Desktop\Singularity\floodtwin\frontend"

files = {
    "src/pages/DashboardPage.tsx": """import React, { useState } from 'react';
import { Play, Pause, AlertCircle, Info, ChevronRight, Layers } from 'lucide-react';
import Map, { NavigationControl } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';

// Mock Data
const zones = [
  { id: 'Z1', name: 'Coastal Ward 7', risk: 86, severity: 4, onset: '3:20 PM', peak: '4:35 PM', description: 'Hospital access threatened', lat: 8.5241, lng: 76.9366 },
  { id: 'Z2', name: 'Marina District', risk: 65, severity: 3, onset: '4:15 PM', peak: '5:00 PM', description: 'High population density', lat: 8.5300, lng: 76.9400 },
  { id: 'Z3', name: 'Port Authority', risk: 42, severity: 2, onset: '5:30 PM', peak: '6:15 PM', description: 'Commercial assets', lat: 8.5100, lng: 76.9200 },
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
  const [timeOffset, setTimeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mapStyle = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap Contributors',
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        minzoom: 0,
        maxzoom: 22
      }
    ]
  };

  return (
    <div className="absolute inset-0 flex">
      {/* Map Area */}
      <div className="flex-1 bg-[#0a101d] relative overflow-hidden">
        <Map
          initialViewState={{
            longitude: 76.9366,
            latitude: 8.5241,
            zoom: 12
          }}
          mapStyle={mapStyle as any}
        >
          <NavigationControl position="top-right" />
        </Map>

        {/* Timeline Overlay */}
        <div className="absolute bottom-6 left-6 right-6 lg:right-[440px] bg-surface/90 backdrop-blur border border-border rounded-xl p-4 shadow-xl z-10">
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
""",
    "src/pages/AlertsPage.tsx": """import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import clsx from 'clsx';

const alerts = [
  { id: 'A1', zone: 'Coastal Ward 7', risk: 86, severity: 4, onset: '3:20 PM', peak: '4:35 PM', description: 'Hospital access threatened' },
  { id: 'A2', zone: 'Marina District', risk: 65, severity: 3, onset: '4:15 PM', peak: '5:00 PM', description: 'High population density' },
  { id: 'A3', zone: 'Port Authority', risk: 42, severity: 2, onset: '5:30 PM', peak: '6:15 PM', description: 'Commercial assets' },
];

const severityColors = {
  2: 'bg-orange-500 text-orange-900',
  3: 'bg-red-500 text-red-100',
  4: 'bg-fuchsia-600 text-fuchsia-100',
};

const severityLabels = {
  2: 'Moderate', 3: 'Severe', 4: 'Critical'
};

export default function AlertsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <AlertTriangle size={28} className="text-warning" />
        <h1 className="text-2xl font-bold">Active Alerts</h1>
      </div>

      <div className="space-y-4">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 hover:border-text-secondary transition-colors cursor-pointer">
            <div className={clsx("w-1.5 rounded-full", severityColors[alert.severity as keyof typeof severityColors].split(' ')[0])}></div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase", severityColors[alert.severity as keyof typeof severityColors])}>
                  {severityLabels[alert.severity as keyof typeof severityLabels]}
                </span>
                <h3 className="text-lg font-bold">{alert.zone}</h3>
                <span className="text-sm font-mono text-text-secondary ml-auto bg-surface-raised px-2 py-1 rounded">Risk: {alert.risk}%</span>
              </div>
              <p className="text-text-secondary mb-4">{alert.description}</p>
              
              <div className="grid grid-cols-2 md:flex md:gap-8 bg-surface-raised rounded-lg p-3 border border-border w-fit">
                <div>
                  <div className="text-xs text-text-secondary flex items-center gap-1"><Clock size={12}/> Onset</div>
                  <div className="font-mono text-sm font-bold">{alert.onset}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary flex items-center gap-1"><Clock size={12}/> Peak</div>
                  <div className="font-mono text-sm font-bold">{alert.peak}</div>
                </div>
              </div>
            </div>
            
            <div className="md:w-64 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
               <div className="text-xs text-text-secondary uppercase mb-2">Main Drivers</div>
               <div className="space-y-2">
                 <div className="flex justify-between text-xs"><span>Rainfall</span><span className="font-mono text-error">+42%</span></div>
                 <div className="flex justify-between text-xs"><span>Tide</span><span className="font-mono text-error">+28%</span></div>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
""",
    "src/pages/PriorityPage.tsx": """import React from 'react';
import { Activity, Users, Building, Truck } from 'lucide-react';
import clsx from 'clsx';

const zones = [
  { id: 'Z1', name: 'Coastal Ward 7', risk: 86, severity: 4, reason: 'Hospital access threatened; ground-floor flooding.', pop: '1.2k', facilities: ['Hospital', 'Shelter'] },
  { id: 'Z2', name: 'Marina District', risk: 65, severity: 3, reason: 'High population density; evacuation routes closing.', pop: '4.5k', facilities: ['School'] },
  { id: 'Z3', name: 'Port Authority', risk: 42, severity: 2, reason: 'Commercial assets; industrial runoff risk.', pop: '200', facilities: ['Port'] },
];

const severityColors = {
  2: 'bg-orange-500 text-orange-900',
  3: 'bg-red-500 text-red-100',
  4: 'bg-fuchsia-600 text-fuchsia-100',
};

const severityLabels = {
  2: 'Moderate', 3: 'Severe', 4: 'Critical'
};

export default function PriorityPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Activity size={28} className="text-primary" />
        <h1 className="text-2xl font-bold">Emergency Priority Ranking</h1>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 p-4 bg-surface-raised border-b border-border text-xs font-semibold text-text-secondary uppercase">
           <div className="col-span-1 text-center">Rank</div>
           <div className="col-span-3">Zone</div>
           <div className="col-span-2">Severity</div>
           <div className="col-span-4">Critical Context</div>
           <div className="col-span-2 text-right">Assets</div>
        </div>
        
        {zones.map((z, idx) => (
          <div key={z.id} className="grid grid-cols-12 p-4 border-b border-border hover:bg-surface-raised transition-colors items-center">
            <div className="col-span-1 text-center font-mono text-xl font-black text-text-secondary">
              {idx + 1}
            </div>
            <div className="col-span-3">
               <h3 className="font-bold">{z.name}</h3>
               <span className="text-xs text-text-secondary font-mono">{z.id}</span>
            </div>
            <div className="col-span-2">
               <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold uppercase", severityColors[z.severity as keyof typeof severityColors])}>
                 {severityLabels[z.severity as keyof typeof severityLabels]}
               </span>
               <div className="text-xs font-mono mt-1 text-text-secondary ml-1">{z.risk}% risk</div>
            </div>
            <div className="col-span-4 text-sm text-text-secondary">
               {z.reason}
            </div>
            <div className="col-span-2 text-right flex flex-col items-end gap-1">
               <div className="flex items-center gap-1 text-xs text-text-secondary bg-[#0a101d] px-2 py-1 rounded border border-border">
                 <Users size={12} /> {z.pop}
               </div>
               <div className="flex gap-1">
                 {z.facilities.includes('Hospital') && <Building size={14} className="text-error" title="Hospital" />}
                 {z.facilities.includes('Port') && <Truck size={14} className="text-warning" title="Port" />}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
""",
    "src/pages/WhatIfPage.tsx": """import React, { useState } from 'react';
import { Layers, RefreshCw, Sliders, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function WhatIfPage() {
  const [rainfall, setRainfall] = useState(50);
  const [tide, setTide] = useState(1.5);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  const handleRecalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      setHasCalculated(true);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto flex gap-8">
      
      {/* Controls */}
      <div className="w-80 flex-shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <Layers size={24} className="text-primary-accent" />
          <h1 className="text-xl font-bold">What-If Simulator</h1>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 space-y-6">
           <div>
             <div className="flex justify-between mb-2 text-sm">
               <span className="font-semibold flex items-center gap-2"><Sliders size={14} /> Rainfall (mm/hr)</span>
               <span className="font-mono text-primary-accent">{rainfall}</span>
             </div>
             <input type="range" min="0" max="200" step="5" value={rainfall} onChange={e => setRainfall(Number(e.target.value))} className="w-full accent-primary-accent h-2 bg-surface-raised rounded-full appearance-none" />
           </div>

           <div>
             <div className="flex justify-between mb-2 text-sm">
               <span className="font-semibold flex items-center gap-2"><Sliders size={14} /> Tide Anomaly (m)</span>
               <span className="font-mono text-primary-accent">+{tide}</span>
             </div>
             <input type="range" min="0" max="3" step="0.1" value={tide} onChange={e => setTide(Number(e.target.value))} className="w-full accent-primary-accent h-2 bg-surface-raised rounded-full appearance-none" />
           </div>

           <button 
             onClick={handleRecalculate}
             disabled={isCalculating}
             className="w-full mt-4 bg-primary-accent text-[#0a101d] font-bold py-2 rounded-lg hover:bg-cyan-300 transition flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {isCalculating ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
             {isCalculating ? "Recalculating..." : "Recalculate Scenario"}
           </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1">
        <h2 className="text-lg font-bold mb-6">Simulation Impact</h2>
        
        {!hasCalculated ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-12 text-center text-text-secondary">
             Adjust the parameters on the left and click Recalculate to see how the flood risk changes.
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                <h3 className="font-bold w-40">Coastal Ward 7</h3>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500 text-red-100">Severe</span>
                  <ArrowRight size={14} className="text-text-secondary" />
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-fuchsia-600 text-fuchsia-100">Critical</span>
                </div>
                <div className="ml-auto text-sm text-error font-mono">+14% Risk</div>
             </div>
             
             <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                <h3 className="font-bold w-40">Marina District</h3>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-orange-500 text-orange-900">Moderate</span>
                  <ArrowRight size={14} className="text-text-secondary" />
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-red-500 text-red-100">Severe</span>
                </div>
                <div className="ml-auto text-sm text-error font-mono">+21% Risk</div>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
""",
    "src/App.tsx": """import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import AlertsPage from './pages/AlertsPage';
import PriorityPage from './pages/PriorityPage';
import WhatIfPage from './pages/WhatIfPage';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/priority" element={<PriorityPage />} />
          <Route path="/whatif" element={<WhatIfPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
"""
}

for path, content in files.items():
    full_path = os.path.join(frontend_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Pages generated.")
