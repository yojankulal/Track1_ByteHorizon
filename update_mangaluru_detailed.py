import os
import json

frontend_dir = r"c:\Users\User\OneDrive\Desktop\Singularity\floodtwin\frontend"

# We define 7 zones for Mangaluru and its surroundings.
zones_data = [
    { 'id': 'Z1', 'name': 'Bengre Sandpit', 'risk': 92, 'severity': 4, 'onset': '2:00 PM', 'peak': '3:30 PM', 'description': 'Complete isolation; extreme risk to life', 'lat': 12.855, 'lng': 74.825, 'reason': 'River and sea merging over sandpit; evacuation routes severed.', 'pop': '2.5k', 'facilities': ['School'] },
    { 'id': 'Z2', 'name': 'Panambur Port Area', 'risk': 86, 'severity': 4, 'onset': '3:20 PM', 'peak': '4:35 PM', 'description': 'Port operations threatened; hazard risk', 'lat': 12.935, 'lng': 74.805, 'reason': 'High tide + surge overwhelming breakwaters; chemical storage at risk.', 'pop': '1.2k', 'facilities': ['Port', 'Industrial'] },
    { 'id': 'Z3', 'name': 'Bunder (Old Port)', 'risk': 78, 'severity': 4, 'onset': '4:00 PM', 'peak': '5:30 PM', 'description': 'Wholesale market flooded; vessels at risk', 'lat': 12.863, 'lng': 74.835, 'reason': 'Estuary backflow causing severe waterlogging in dense commercial zones.', 'pop': '6.8k', 'facilities': ['Market', 'Fishing Harbour'] },
    { 'id': 'Z4', 'name': 'Ullal & Someshwara', 'risk': 65, 'severity': 3, 'onset': '4:15 PM', 'peak': '5:00 PM', 'description': 'Severe coastal erosion and residential flooding', 'lat': 12.805, 'lng': 74.850, 'reason': 'Wave overtopping sea walls; ground-floor flooding in coastal homes.', 'pop': '5.4k', 'facilities': ['Hospital', 'Shelter'] },
    { 'id': 'Z5', 'name': 'Netravati River Banks', 'risk': 58, 'severity': 3, 'onset': '5:00 PM', 'peak': '6:45 PM', 'description': 'Backwater flooding into low-lying homes', 'lat': 12.845, 'lng': 74.860, 'reason': 'River discharge meeting high tide, causing backwater inundation.', 'pop': '3.2k', 'facilities': ['Shelter'] },
    { 'id': 'Z6', 'name': 'Surathkal Coastal Belt', 'risk': 42, 'severity': 2, 'onset': '5:30 PM', 'peak': '6:15 PM', 'description': 'Access roads flooded; minor erosion', 'lat': 12.985, 'lng': 74.790, 'reason': 'Poor drainage combined with moderate surge affecting campus access.', 'pop': '4.1k', 'facilities': ['University'] },
    { 'id': 'Z7', 'name': 'Kulai & Hosabettu', 'risk': 25, 'severity': 1, 'onset': '6:30 PM', 'peak': '7:30 PM', 'description': 'Localised street flooding', 'lat': 12.955, 'lng': 74.795, 'reason': 'Minor pooling due to blocked storm drains during heavy rainfall.', 'pop': '2.8k', 'facilities': [] },
]

dashboard_zones_code = "const zones = " + json.dumps([
    {k:v for k,v in z.items() if k not in ['reason', 'pop', 'facilities']} for z in zones_data
], indent=2) + ";"

alerts_zones_code = "const alerts = " + json.dumps([
    {k:v for k,v in z.items() if k in ['id', 'name', 'risk', 'severity', 'onset', 'peak', 'description']} for z in zones_data
    if z['severity'] >= 2
], indent=2).replace('"name"', '"zone"') + ";"

priority_zones_code = "const zones = " + json.dumps([
    {k:v for k,v in z.items() if k in ['id', 'name', 'risk', 'severity', 'reason', 'pop', 'facilities']} for z in zones_data
], indent=2) + ";"

# Bounding box geometries for the 7 zones (approximate)
features = [
    { "type": "Feature", "properties": { "id": "Z1", "severity": 4 }, "geometry": { "type": "Polygon", "coordinates": [[[74.820, 12.845], [74.832, 12.845], [74.832, 12.865], [74.820, 12.865], [74.820, 12.845]]] } },
    { "type": "Feature", "properties": { "id": "Z2", "severity": 4 }, "geometry": { "type": "Polygon", "coordinates": [[[74.795, 12.925], [74.815, 12.925], [74.815, 12.945], [74.795, 12.945], [74.795, 12.925]]] } },
    { "type": "Feature", "properties": { "id": "Z3", "severity": 4 }, "geometry": { "type": "Polygon", "coordinates": [[[74.825, 12.853], [74.845, 12.853], [74.845, 12.873], [74.825, 12.873], [74.825, 12.853]]] } },
    { "type": "Feature", "properties": { "id": "Z4", "severity": 3 }, "geometry": { "type": "Polygon", "coordinates": [[[74.840, 12.795], [74.860, 12.795], [74.860, 12.815], [74.840, 12.815], [74.840, 12.795]]] } },
    { "type": "Feature", "properties": { "id": "Z5", "severity": 3 }, "geometry": { "type": "Polygon", "coordinates": [[[74.845, 12.835], [74.870, 12.835], [74.870, 12.850], [74.845, 12.850], [74.845, 12.835]]] } },
    { "type": "Feature", "properties": { "id": "Z6", "severity": 2 }, "geometry": { "type": "Polygon", "coordinates": [[[74.780, 12.975], [74.800, 12.975], [74.800, 12.995], [74.780, 12.995], [74.780, 12.975]]] } },
    { "type": "Feature", "properties": { "id": "Z7", "severity": 1 }, "geometry": { "type": "Polygon", "coordinates": [[[74.785, 12.950], [74.805, 12.950], [74.805, 12.965], [74.785, 12.965], [74.785, 12.950]]] } },
]
zonesGeoJSON_code = "const zonesGeoJSON = " + json.dumps({"type": "FeatureCollection", "features": features}, indent=2) + ";"

files = {
    "src/pages/DashboardPage.tsx": f"""import React, {{ useState }} from 'react';
import {{ Play, Pause, AlertCircle, Info, ChevronRight, ShieldAlert }} from 'lucide-react';
import Map, {{ NavigationControl, Source, Layer }} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import clsx from 'clsx';

{dashboard_zones_code}

const severityColors = {{
  0: 'bg-slate-500 text-slate-100',
  1: 'bg-yellow-500 text-yellow-900',
  2: 'bg-orange-500 text-orange-900',
  3: 'bg-red-500 text-red-100',
  4: 'bg-fuchsia-600 text-fuchsia-100',
}};

const severityLabels = {{
  0: 'None', 1: 'Minor', 2: 'Moderate', 3: 'Severe', 4: 'Critical'
}};

{zonesGeoJSON_code}

const zoneFillLayer = {{
  id: 'zone-fill',
  type: 'fill',
  source: 'zones',
  paint: {{
    'fill-color': ['match', ['get', 'severity'], 1, '#FACC15', 2, '#FB923C', 3, '#EF4444', 4, '#C026D3', '#64748B'],
    'fill-opacity': 0.5
  }}
}};

const zoneOutlineLayer = {{
  id: 'zone-outline',
  type: 'line',
  source: 'zones',
  paint: {{
    'line-color': ['match', ['get', 'severity'], 1, '#FACC15', 2, '#FB923C', 3, '#EF4444', 4, '#C026D3', '#64748B'],
    'line-width': 2
  }}
}};

const mitigationTasks: Record<string, string[]> = {{
  'Z1': ['Immediate boat evacuation', 'Deploy NDRF teams'],
  'Z2': ['Halt port cargo movement', 'Deploy sandbags at entrances'],
  'Z3': ['Evacuate ground-floor godowns', 'Secure fishing vessels'],
  'Z4': ['Evacuate to highland shelters', 'Reinforce sea walls temporarily'],
  'Z5': ['Open barrage gates', 'Prepare relief camps'],
  'Z6': ['Clear drainage channels', 'Issue early warnings to campus'],
  'Z7': ['Monitor tide levels', 'Keep storm drains clear']
}};

export default function DashboardPage() {{
  const [selectedZone, setSelectedZone] = useState<typeof zones[0] | null>(zones[0]);
  const [timeOffset, setTimeOffset] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);

  const mapStyle = {{
    version: 8,
    sources: {{ osm: {{ type: 'raster', tiles: ['https://tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap' }} }},
    layers: [ {{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 22 }} ]
  }};

  return (
    <div className="absolute inset-0 flex">
      <div className="flex-1 bg-[#0a101d] relative overflow-hidden">
        <Map
          initialViewState={{ longitude: 74.84, latitude: 12.87, zoom: 11 }}
          mapStyle={{mapStyle as any}}
          interactiveLayerIds={{['zone-fill']}}
          onClick={{(e) => {{
            if (e.features && e.features.length > 0) {{
              const featureId = e.features[0].properties.id;
              const zone = zones.find(z => z.id === featureId);
              if (zone) setSelectedZone(zone);
            }}
          }}}}
          cursor={{selectedZone ? "pointer" : "default"}}
        >
          <NavigationControl position="top-right" />
          <Source id="zones" type="geojson" data={{zonesGeoJSON as any}}>
            <Layer {{...zoneFillLayer as any}} />
            <Layer {{...zoneOutlineLayer as any}} />
          </Source>
        </Map>

        <div className="absolute bottom-6 left-6 right-6 lg:right-[440px] bg-surface/90 backdrop-blur border border-border rounded-xl p-4 shadow-xl z-10">
           <div className="flex items-center gap-4">
             <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-blue-600 transition" onClick={{() => setIsPlaying(!isPlaying)}}>
               {{isPlaying ? <Pause size={{20}} /> : <Play size={{20}} fill="currentColor" />}}
             </button>
             <div className="flex-1">
               <div className="flex justify-between text-xs font-mono text-text-secondary mb-2"><span>NOW</span><span>+30m</span><span>+1h</span><span>+2h</span></div>
               <input type="range" min="0" max="120" step="30" value={{timeOffset}} onChange={{(e) => setTimeOffset(Number(e.target.value))}} className="w-full accent-primary h-2 bg-surface-raised rounded-full appearance-none cursor-pointer" />
             </div>
           </div>
        </div>
      </div>

      <div className="w-[420px] bg-surface border-l border-border flex flex-col h-full z-20 shadow-2xl overflow-y-auto">
        {{selectedZone ? (
          <div className="p-6 border-b border-border">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <h2 className="text-xl font-bold">{{selectedZone.name}}</h2>
                 <p className="text-sm text-text-secondary">Zone ID: {{selectedZone.id}}</p>
               </div>
               <span className={{clsx("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", severityColors[selectedZone.severity as keyof typeof severityColors])}}>
                 {{severityLabels[selectedZone.severity as keyof typeof severityLabels]}}
               </span>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-surface-raised p-4 rounded-lg border border-border">
                 <div className="text-xs text-text-secondary uppercase mb-1">Probability</div>
                 <div className="text-3xl font-bold font-mono">{{selectedZone.risk}}%</div>
                 <div className="w-full bg-surface h-1.5 mt-2 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{{{ width: `${{selectedZone.risk}}%` }}}}></div></div>
               </div>
               <div className="bg-surface-raised p-4 rounded-lg border border-border flex flex-col justify-center">
                 <div className="text-xs text-text-secondary uppercase mb-1">Timeline</div>
                 <div className="text-sm"><span className="text-text-secondary mr-2">Onset</span> <span className="font-mono">{{selectedZone.onset}}</span></div>
                 <div className="text-sm"><span className="text-text-secondary mr-2">Peak</span> <span className="font-mono">{{selectedZone.peak}}</span></div>
               </div>
             </div>

             <div className="mb-4">
               <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertCircle size={{16}} className="text-primary"/> Predicted Effects</h3>
               <div className="bg-surface-raised p-3 rounded-lg border border-border text-sm leading-relaxed text-text-secondary">
                 {{selectedZone.description}}
               </div>
             </div>
             
             <div className="mb-6">
               <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldAlert size={{16}} className="text-success"/> Mitigation Tasks</h3>
               <ul className="bg-surface-raised p-3 rounded-lg border border-border text-sm leading-relaxed text-text-secondary list-disc pl-6">
                 {{mitigationTasks[selectedZone.id].map((task, i) => <li key={{i}}>{{task}}</li>)}}
               </ul>
             </div>
          </div>
        ) : (
          <div className="p-6 text-center text-text-secondary border-b border-border">Select a zone on the map to see details.</div>
        )}}

        <div className="p-6 flex-1 bg-[#0d1526]">
           <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">Emergency Priority</h3><button className="text-primary text-xs hover:underline">View All</button></div>
           <div className="space-y-3">
             {{zones.sort((a,b)=>b.risk - a.risk).map((z, idx) => (
               <div key={{z.id}} className={{clsx("p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-4", selectedZone?.id === z.id ? "bg-surface-raised border-primary" : "bg-surface border-border hover:border-text-secondary")}} onClick={{() => setSelectedZone(z)}}>
                 <div className="text-xl font-black text-text-secondary font-mono w-6 text-center">{{idx + 1}}</div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1"><span className={{clsx("w-2 h-2 rounded-full", severityColors[z.severity as keyof typeof severityColors].split(' ')[0])}}></span><h4 className="font-semibold truncate">{{z.name}}</h4></div>
                   <p className="text-xs text-text-secondary truncate">{{z.description}}</p>
                 </div>
                 <ChevronRight size={{16}} className="text-text-secondary" />
               </div>
             ))}}
           </div>
        </div>
      </div>
    </div>
  );
}}
""",
    "src/pages/AlertsPage.tsx": f"""import React from 'react';
import {{ AlertTriangle, Clock }} from 'lucide-react';
import clsx from 'clsx';

{alerts_zones_code}

const severityColors = {{ 1: 'bg-yellow-500 text-yellow-900', 2: 'bg-orange-500 text-orange-900', 3: 'bg-red-500 text-red-100', 4: 'bg-fuchsia-600 text-fuchsia-100' }};
const severityLabels = {{ 1: 'Minor', 2: 'Moderate', 3: 'Severe', 4: 'Critical' }};

export default function AlertsPage() {{
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8"><AlertTriangle size={{28}} className="text-warning" /><h1 className="text-2xl font-bold">Active Alerts</h1></div>
      <div className="space-y-4">
        {{alerts.map(alert => (
          <div key={{alert.id}} className="bg-surface border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 hover:border-text-secondary transition-colors cursor-pointer">
            <div className={{clsx("w-1.5 rounded-full", severityColors[alert.severity as keyof typeof severityColors].split(' ')[0])}}></div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={{clsx("px-2 py-0.5 rounded text-xs font-bold uppercase", severityColors[alert.severity as keyof typeof severityColors])}}>{{severityLabels[alert.severity as keyof typeof severityLabels]}}</span>
                <h3 className="text-lg font-bold">{{alert.zone}}</h3>
                <span className="text-sm font-mono text-text-secondary ml-auto bg-surface-raised px-2 py-1 rounded">Risk: {{alert.risk}}%</span>
              </div>
              <p className="text-text-secondary mb-4">{{alert.description}}</p>
              <div className="grid grid-cols-2 md:flex md:gap-8 bg-surface-raised rounded-lg p-3 border border-border w-fit">
                <div><div className="text-xs text-text-secondary flex items-center gap-1"><Clock size={{12}}/> Onset</div><div className="font-mono text-sm font-bold">{{alert.onset}}</div></div>
                <div><div className="text-xs text-text-secondary flex items-center gap-1"><Clock size={{12}}/> Peak</div><div className="font-mono text-sm font-bold">{{alert.peak}}</div></div>
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
        ))}}
      </div>
    </div>
  );
}}
""",
    "src/pages/PriorityPage.tsx": f"""import React from 'react';
import {{ Activity, Users, Building, Truck, Briefcase }} from 'lucide-react';
import clsx from 'clsx';

{priority_zones_code}

const severityColors = {{ 1: 'bg-yellow-500 text-yellow-900', 2: 'bg-orange-500 text-orange-900', 3: 'bg-red-500 text-red-100', 4: 'bg-fuchsia-600 text-fuchsia-100' }};
const severityLabels = {{ 1: 'Minor', 2: 'Moderate', 3: 'Severe', 4: 'Critical' }};

export default function PriorityPage() {{
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8"><Activity size={{28}} className="text-primary" /><h1 className="text-2xl font-bold">Emergency Priority Ranking</h1></div>
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-12 p-4 bg-surface-raised border-b border-border text-xs font-semibold text-text-secondary uppercase">
           <div className="col-span-1 text-center">Rank</div>
           <div className="col-span-3">Zone</div>
           <div className="col-span-2">Severity</div>
           <div className="col-span-4">Critical Context</div>
           <div className="col-span-2 text-right">Assets</div>
        </div>
        {{zones.sort((a,b)=>b.risk - a.risk).map((z, idx) => (
          <div key={{z.id}} className="grid grid-cols-12 p-4 border-b border-border hover:bg-surface-raised transition-colors items-center">
            <div className="col-span-1 text-center font-mono text-xl font-black text-text-secondary">{{idx + 1}}</div>
            <div className="col-span-3"><h3 className="font-bold">{{z.name}}</h3><span className="text-xs text-text-secondary font-mono">{{z.id}}</span></div>
            <div className="col-span-2">
               <span className={{clsx("px-2 py-0.5 rounded-full text-xs font-bold uppercase", severityColors[z.severity as keyof typeof severityColors])}}>{{severityLabels[z.severity as keyof typeof severityLabels]}}</span>
               <div className="text-xs font-mono mt-1 text-text-secondary ml-1">{{z.risk}}% risk</div>
            </div>
            <div className="col-span-4 text-sm text-text-secondary">{{z.reason}}</div>
            <div className="col-span-2 text-right flex flex-col items-end gap-1">
               <div className="flex items-center gap-1 text-xs text-text-secondary bg-[#0a101d] px-2 py-1 rounded border border-border"><Users size={{12}} /> {{z.pop}}</div>
               <div className="flex gap-1">
                 {{z.facilities.includes('Hospital') && <Building size={{14}} className="text-error" title="Hospital" />}}
                 {{z.facilities.includes('Port') && <Truck size={{14}} className="text-warning" title="Port" />}}
                 {{z.facilities.includes('Market') && <Briefcase size={{14}} className="text-info" title="Commercial Market" />}}
               </div>
            </div>
          </div>
        ))}}
      </div>
    </div>
  );
}}
"""
}

for path, content in files.items():
    full_path = os.path.join(frontend_dir, path.replace("/", "\\"))
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
print("Updated detailed zones for Mangaluru.")
