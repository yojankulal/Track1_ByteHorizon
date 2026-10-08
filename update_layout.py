import os

frontend_dir = r"c:\Users\User\OneDrive\Desktop\Singularity\floodtwin\frontend"

files = {
    "src/components/layout/AppShell.tsx": """import React from 'react';
import { Activity, Wind, Waves, CheckCircle } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#040B14] text-text-primary font-sans">
      {/* Topbar */}
      <header className="h-16 flex items-center justify-between px-6 bg-[#081220] border-b border-[#1A2C46] z-10 shrink-0">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3 w-64">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Waves size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-white">FloodTwin</h1>
            <p className="text-xs text-[#5C85C5]">Coastal Flood Intelligence</p>
          </div>
        </div>

        <div className="h-10 w-px bg-[#1A2C46] mx-4"></div>

        {/* Time */}
        <div className="flex flex-col justify-center">
          <div className="text-xl font-bold text-white tracking-wide">2:18 PM</div>
          <div className="text-xs text-[#8A9EB8]">12 Sep 2026</div>
        </div>

        <div className="h-10 w-px bg-[#1A2C46] mx-6"></div>

        {/* Cyclone Status */}
        <div className="flex items-center gap-3">
          <Wind size={32} className="text-orange-500" />
          <div className="flex flex-col">
            <div className="text-xs text-[#8A9EB8]">Cyclone Status</div>
            <div className="text-sm font-bold text-orange-500">ACTIVE (Moderate)</div>
            <div className="text-[10px] text-[#8A9EB8]">Cyclone 'Midhili' - 320 km W of Mangaluru</div>
          </div>
        </div>

        <div className="h-10 w-px bg-[#1A2C46] mx-6"></div>

        {/* Tide Level */}
        <div className="flex-1 max-w-xs">
           <div className="flex justify-between items-end mb-1">
             <div className="flex items-center gap-2">
               <Waves size={20} className="text-blue-400" />
               <span className="text-xs text-[#8A9EB8]">Tide Level</span>
             </div>
             <div className="text-sm font-bold text-white">2.8 m <span className="text-blue-400 text-xs font-normal">(Rising)</span></div>
           </div>
           <div className="flex items-center gap-2 text-[10px] text-[#8A9EB8]">
             <span>0 m</span>
             <div className="flex-1 h-1.5 bg-[#1A2C46] rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 w-[60%]"></div>
             </div>
             <span>5 m</span>
           </div>
        </div>

        <div className="h-10 w-px bg-[#1A2C46] mx-6"></div>

        {/* System Status */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            System Online
          </div>
          <div className="text-[10px] text-[#8A9EB8] text-right">
            Live Data • AI Models •<br/>Operational
          </div>
        </div>

      </header>

      {/* Main Content */}
      <main className="flex-1 relative p-2 overflow-hidden flex gap-2">
        {children}
      </main>
    </div>
  );
}
""",
    "src/pages/DashboardPage.tsx": """import React, { useState } from 'react';
import { MapPin, AlertTriangle, ChevronDown, Hospital, Navigation2, Activity, Info } from 'lucide-react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import { AreaChart, Area, XAxis, ResponsiveContainer } from 'recharts';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';

// Data
const rainfallData = [{time: 'Now', val: 50}, {time: '+1h', val: 120}, {time: '+2h', val: 150}, {time: '+3h', val: 80}, {time: '+4h', val: 30}];
const tideData = [{time: 'Now', val: 2.8}, {time: '+1h', val: 3.1}, {time: '+2h', val: 3.5}, {time: '+3h', val: 3.2}, {time: '+4h', val: 2.5}];

const zonesGeoJSON = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { id: 'Z1', severity: 4 }, geometry: { type: 'Polygon', coordinates: [[[74.820, 12.845], [74.832, 12.845], [74.832, 12.865], [74.820, 12.865], [74.820, 12.845]]] } },
    { type: 'Feature', properties: { id: 'Z2', severity: 3 }, geometry: { type: 'Polygon', coordinates: [[[74.795, 12.925], [74.815, 12.925], [74.815, 12.945], [74.795, 12.945], [74.795, 12.925]]] } },
    { type: 'Feature', properties: { id: 'Z3', severity: 4 }, geometry: { type: 'Polygon', coordinates: [[[74.825, 12.853], [74.845, 12.853], [74.845, 12.873], [74.825, 12.873], [74.825, 12.853]]] } },
  ]
};

export default function DashboardPage() {
  const mapStyle = {
    version: 8,
    sources: {
      osm: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri' }
    },
    layers: [ { id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 } ]
  };

  return (
    <>
      {/* Left Column: Map & Timeline */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        {/* Map Container */}
        <div className="flex-1 bg-[#091524] rounded-lg border border-[#1A2C46] relative overflow-hidden">
          <Map
            initialViewState={{ longitude: 74.84, latitude: 12.87, zoom: 12 }}
            mapStyle={mapStyle as any}
          >
            <Source id="zones" type="geojson" data={zonesGeoJSON as any}>
              <Layer id="zone-heat" type="fill" paint={{ 'fill-color': ['match', ['get', 'severity'], 3, '#FB923C', 4, '#EF4444', '#64748B'], 'fill-opacity': 0.6 }} />
            </Source>
          </Map>

          {/* Map Overlays (Legend) */}
          <div className="absolute bottom-4 left-4 bg-[#0A1628]/90 backdrop-blur border border-[#1A2C46] rounded-lg p-3 w-64 shadow-xl text-white">
            <h4 className="text-xs font-bold mb-2">Flood Risk Level</h4>
            <div className="h-3 w-full rounded bg-gradient-to-r from-blue-500 via-green-500 via-yellow-400 via-orange-500 to-red-600 mb-1"></div>
            <div className="flex justify-between text-[10px] text-[#8A9EB8] mb-3">
              <span>Safe</span>
              <span>Highest Risk</span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5"><Hospital size={12}/> Hospital</div>
              <div className="flex items-center gap-1.5"><Navigation2 size={12}/> Shelter</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-orange-400"></div> Critical Road</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-blue-500"></div> River / Drainage</div>
            </div>
          </div>
        </div>

        {/* Bottom Timeline & Charts */}
        <div className="h-44 bg-[#0A1628] rounded-lg border border-[#1A2C46] flex p-3 gap-4">
          
          <div className="flex-1 flex flex-col">
             <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2"><Activity size={14}/> Forecast Timeline</h4>
             <div className="flex gap-2 items-center justify-between flex-1">
               {['NOW', '+30 min', '+1 hr', '+2 hr', '+4 hr'].map((time, i) => (
                 <React.Fragment key={time}>
                   <div className="flex flex-col items-center gap-2 flex-1">
                     <div className={clsx("w-full aspect-video rounded border overflow-hidden", i === 0 ? "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "border-[#1A2C46] opacity-60")}>
                        {/* Mock map thumbnail */}
                        <div className="w-full h-full bg-[#1A2C46] bg-[url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1912/2927')] bg-cover opacity-80"></div>
                     </div>
                     <span className={clsx("text-xs font-bold", i === 0 ? "text-blue-400" : "text-[#8A9EB8]")}>{time}</span>
                   </div>
                   {i < 4 && <ChevronRight size={14} className="text-[#3A5276]" />}
                 </React.Fragment>
               ))}
             </div>
          </div>

          <div className="w-px bg-[#1A2C46] mx-2"></div>

          <div className="w-64 flex flex-col gap-2">
             <div className="flex-1 flex flex-col">
               <div className="flex justify-between text-xs text-white mb-1">
                 <span className="flex items-center gap-1 text-blue-400"><Waves size={12}/> Rainfall (mm)</span>
                 <span>85 mm</span>
               </div>
               <div className="flex-1 relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={rainfallData}>
                     <XAxis dataKey="time" hide />
                     <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
             
             <div className="flex-1 flex flex-col">
               <div className="flex justify-between text-xs text-white mb-1">
                 <span className="flex items-center gap-1 text-blue-400"><Waves size={12}/> Tide Level (m)</span>
                 <span>3.2 m</span>
               </div>
               <div className="flex-1 relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={tideData}>
                     <XAxis dataKey="time" hide />
                     <Area type="monotone" dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

        </div>
      </div>

      {/* Right Column: Details & Priority */}
      <div className="w-[420px] flex flex-col gap-2 shrink-0">
        
        {/* Zone Detail */}
        <div className="bg-[#0A1628] rounded-lg border border-[#1A2C46] p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin size={16}/> Zone Detail</h3>
            <select className="bg-[#112136] border border-[#1A2C46] text-white text-xs px-2 py-1 rounded">
              <option>Zone A</option>
            </select>
          </div>
          
          <h2 className="text-lg font-bold text-white mb-4">Zone A – Kankanady <span className="text-[#8A9EB8] font-normal">(Coastal)</span></h2>
          
          <div className="flex gap-6 items-center mb-6">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="48" cy="48" r="42" fill="none" stroke="#1A2C46" strokeWidth="8" />
                 <circle cx="48" cy="48" r="42" fill="none" stroke="#EF4444" strokeWidth="8" strokeDasharray="264" strokeDashoffset="37" className="transition-all duration-1000" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-2xl font-bold text-white leading-none">86%</span>
                 <span className="text-[9px] text-[#8A9EB8] uppercase text-center mt-1">Flood<br/>Probability</span>
               </div>
            </div>

            <div className="flex-1 flex flex-col gap-3">
               <div className="bg-[#EF4444] text-white text-xs font-bold px-3 py-1 rounded tracking-widest w-fit">SEVERE</div>
               <div className="flex items-center gap-2 text-white">
                 <div className="w-6 h-6 rounded-full bg-[#112136] flex items-center justify-center"><Activity size={12} className="text-blue-400"/></div>
                 <div className="flex flex-col"><span className="text-[10px] text-[#8A9EB8]">Onset in</span><span className="font-mono text-sm">3h 20m</span></div>
               </div>
               <div className="flex items-center gap-2 text-white">
                 <div className="w-6 h-6 rounded-full bg-[#112136] flex items-center justify-center"><AlertTriangle size={12} className="text-blue-400"/></div>
                 <div className="flex flex-col"><span className="text-[10px] text-[#8A9EB8]">Peak at</span><span className="font-mono text-sm">4:35 PM</span></div>
               </div>
            </div>
          </div>
          
          <div className="flex gap-2 text-xs text-[#8A9EB8] pb-4 border-b border-[#1A2C46]">
            <span>• Low-lying coastal area</span>
            <span>• High exposure</span>
          </div>

          <div className="pt-4">
             <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1"><Activity size={16}/> Main Drivers <span className="text-[#8A9EB8] font-normal">(Top 5)</span></h3>
             <p className="text-[10px] text-[#8A9EB8] mb-3">SHAP Feature Importance</p>
             
             <div className="space-y-2">
               {[
                 {label: 'Storm Surge', val: 32, color: 'bg-red-500'},
                 {label: 'Rainfall 3h', val: 24, color: 'bg-orange-500'},
                 {label: 'High Tide', val: 18, color: 'bg-orange-400'},
                 {label: 'Low Elevation', val: 15, color: 'bg-yellow-500'},
                 {label: 'Poor Drainage', val: 11, color: 'bg-yellow-400'}
               ].map(d => (
                 <div key={d.label} className="flex items-center gap-3 text-xs text-[#8A9EB8]">
                   <div className="w-24 shrink-0 truncate flex items-center gap-1"><Info size={10}/> {d.label}</div>
                   <div className="flex-1 h-2 bg-[#1A2C46] rounded-full overflow-hidden">
                     <div className={`h-full ${d.color}`} style={{width: `${d.val * 3}%`}}></div>
                   </div>
                   <div className="w-8 text-right font-mono">{d.val}%</div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Priority List */}
        <div className="bg-[#0A1628] rounded-lg border border-[#1A2C46] p-4 flex-1 overflow-y-auto">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle size={16}/> Emergency Priority List</h3>
             <span className="text-[10px] text-[#8A9EB8] hover:text-white cursor-pointer">View All →</span>
           </div>
           
           <div className="space-y-2">
             {[
               {rank: 1, name: 'Zone A – Kankanady (Coastal)', desc: 'Hospital • High Population', severity: 'SEVERE', color: 'text-red-500', bg: 'bg-[#EF4444]/10', border: 'border-[#EF4444]', icon: Hospital},
               {rank: 2, name: 'Zone C – Bejai', desc: 'High Population • Residential', severity: 'HIGH', color: 'text-orange-500', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]', icon: Activity},
               {rank: 3, name: 'Zone F – Ullal', desc: 'Critical Road • Low Elevation', severity: 'HIGH', color: 'text-orange-500', bg: 'bg-[#F97316]/10', border: 'border-[#F97316]', icon: Navigation2},
             ].map(z => (
               <div key={z.rank} className="flex gap-3 bg-[#112136] border border-[#1A2C46] rounded-lg p-3 items-center">
                 <div className={`font-mono font-bold text-lg ${z.color}`}>#{z.rank}</div>
                 <div className="w-1 h-8 bg-current rounded-full" style={{color: z.border.replace('border-[', '').replace(']', '')}}></div>
                 <div className="w-8 h-8 rounded-full bg-[#1A2C46] flex items-center justify-center shrink-0">
                   <z.icon size={14} className="text-white" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <h4 className="text-sm font-bold text-white truncate">{z.name}</h4>
                   <p className="text-[10px] text-[#8A9EB8] truncate">{z.desc}</p>
                 </div>
                 <div className={`px-2 py-0.5 rounded border ${z.border} ${z.color} text-[10px] font-bold tracking-wider`}>
                   {z.severity}
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* AI Briefing */}
        <div className="bg-[#0A1628] rounded-lg border border-blue-500/50 p-4 shrink-0 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.1)]">
           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity size={16} className="text-blue-400"/> AI Briefing</h3>
             <span className="text-[10px] text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div> Live</span>
           </div>
           <ol className="text-xs text-[#B4C6DF] space-y-2 list-decimal pl-4 pr-2">
             <li>High risk of coastal flooding in Zone A within 3 hours due to rising tide and heavy rainfall.</li>
             <li>Prioritise evacuation for ground floor residents and people in low-lying areas.</li>
             <li>Focus response teams on Zones A, C and F first.</li>
           </ol>
        </div>

      </div>
    </>
  );
}
"""
}

for path, content in files.items():
    full_path = os.path.join(frontend_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated Layout.")
