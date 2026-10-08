const API_BASE_URL = "http://127.0.0.1:8000";

export interface FloodPredictionRequest {
  lon: number;
  lat: number;
  precip_1d: number;
  precip_3d: number;
  landcover: number;
  elevation: number;
  slope: number;
  TWI: number;
  upstream_area_log: number;
  aspect_sin: number;
  aspect_cos: number;
}

export interface FloodPredictionResponse {
  flood_probability: number;
  flood_probability_percent: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
}

export interface WhatIfSimulationRequest {
  baseline_features: FloodPredictionRequest;
  sim_precip_1d: number;
  sim_precip_3d: number;
  sim_elevation_adj?: number;
}

export interface WhatIfSimulationResponse {
  baseline_probability: number;
  baseline_probability_percent: number;
  baseline_risk_level: string;
  scenario_probability: number;
  scenario_probability_percent: number;
  scenario_risk_level: "Low" | "Moderate" | "High" | "Critical";
  delta_percentage_points: number;
  explanation: string;
}

export interface LocalShapContribution {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  direction: "increases_risk" | "decreases_risk";
  percentage_impact: number;
  description: string;
}

export interface LLMExplanation {
  headline: string;
  simple_notice: string;
  recommended_actions: string[];
  key_factors: string[];
  llm_status: string;
  model_used: string;
}

export interface LocalShapResponse {
  base_value: number;
  output_margin: number;
  flood_probability: number;
  flood_probability_percent: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
  contributions: LocalShapContribution[];
  llm_explanation?: LLMExplanation;
}

export interface GridCell {
  id: string;
  lon: number;
  lat: number;
  event_id?: string | null;
  precip_1d: number;
  precip_3d: number;
  landcover: number;
  elevation: number;
  slope: number;
  TWI: number;
  upstream_area_log: number;
  aspect_sin: number;
  aspect_cos: number;
  flood_probability: number;
  flood_probability_percent: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
  target?: number | null;
  location_name: string;
}

export interface GridResponse {
  total_cells: number;
  risk_counts: {
    Low: number;
    Moderate: number;
    High: number;
    Critical: number;
  };
  max_probability: number;
  avg_probability: number;
  bbox: number[];
  events: string[];
  cells: GridCell[];
}

export interface PriorityArea {
  rank: number;
  id: string;
  lon: number;
  lat: number;
  flood_probability: number;
  flood_probability_percent: number;
  risk_level: "Low" | "Moderate" | "High" | "Critical";
  elevation: number;
  precip_3d: number;
  landcover: number;
  twi: number;
  reason: string;
  location_name: string;
}

export interface ModelMetricsResponse {
  model: string;
  target: string;
  features: string[];
  dataset: {
    total_rows: number;
    train_rows: number;
    validation_rows: number;
    test_rows: number;
  };
  class_balance: {
    non_flood: number;
    flood: number;
    flood_rate: number;
  };
  threshold: number;
  metrics: {
    train?: Record<string, number>;
    validation?: Record<string, number>;
    test?: Record<string, number>;
  };
  feature_importance: Array<{ feature: string; importance: number }>;
  shap_importance: Array<{ feature: string; mean_abs_shap: number }>;
}

export interface ResponseZone {
  zone_id: string;
  name: string;
  rank?: number;
  sector_count: number;
  priority_score: number;
  priority_percent: number;
  peak_probability_percent: number;
  rank_delta: number;
  rank_delta_label: string;
  reason: string;
  centroid: number[];
  bbox: number[];
  factor_breakdown: Record<string, number>;
  top_sectors: string[];
}

export interface AlertIncident {
  incident_id: string;
  name: string;
  headline: string;
  sector_count: number;
  peak_probability: number;
  peak_probability_percent: number;
  avg_probability_percent: number;
  onset: string;
  peak: string;
  top_drivers: string[];
  action_line: string;
  state: "New" | "Escalated" | "Cleared";
  trend: string;
  countdown: string;
  centroid: number[];
  bbox: number[];
  sector_ids: string[];
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function predictFlood(
  data: FloodPredictionRequest
): Promise<FloodPredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/flood`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Prediction error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function explainFlood(
  data: FloodPredictionRequest
): Promise<LocalShapResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Explanation error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function simulateScenario(
  data: WhatIfSimulationRequest
): Promise<WhatIfSimulationResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Simulation error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function fetchGrid(sampleSize: number = 1200): Promise<GridResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/grid?sample_size=${sampleSize}`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grid fetch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function fetchPriorities(topN: number = 10): Promise<PriorityArea[]> {
  const response = await fetch(`${API_BASE_URL}/predict/priority?top_n=${topN}`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Priority fetch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function fetchPriorityZones(topN: number = 10): Promise<ResponseZone[]> {
  const response = await fetch(`${API_BASE_URL}/predict/priority/zones?top_n=${topN}`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Priority zones fetch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function fetchAlertIncidents(): Promise<AlertIncident[]> {
  const response = await fetch(`${API_BASE_URL}/predict/alerts/incidents`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Incidents fetch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function fetchModelMetrics(): Promise<ModelMetricsResponse> {
  const response = await fetch(`${API_BASE_URL}/predict/metrics`);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Metrics fetch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function dispatchAlert(message: string): Promise<{ message: string; errors: string[] }> {
  const response = await fetch(`${API_BASE_URL}/alerts/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Dispatch error (${response.status}): ${err}`);
  }
  return response.json();
}

export async function dispatchIncidentAlert(incident: AlertIncident): Promise<{ message: string; errors: string[], dispatched_text: string }> {
  const response = await fetch(`${API_BASE_URL}/alerts/dispatch-incident`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incident }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Dispatch error (${response.status}): ${err}`);
  }
  return response.json();
}

/**
 * Robust, physically-sound hydrological simulation function:
 * Strictly enforces positive monotonic scaling with precipitation surge
 * and reduction under dry / nominal weather.
 */
export function computePhysicalHydrologicalSimulation(
  cell: GridCell,
  simPrecip1d: number,
  simPrecip3d: number,
  elevationAdj: number = 0
): {
  scenarioProb: number;
  scenarioRisk: "Low" | "Moderate" | "High" | "Critical";
  deltaPercent: number;
  explanation: string;
} {
  const elev = Math.max(1.0, cell.elevation + elevationAdj);
  const twi = cell.TWI;
  const delta1d = simPrecip1d - cell.precip_1d;
  const delta3d = simPrecip3d - cell.precip_3d;

  // Topographic susceptibility multiplier:
  // Low elevation (<15m) and high topographic wetness (TWI > 8) pool water rapidly.
  const topoMultiplier = (1.0 + Math.max(0.0, 25.0 - elev) / 25.0 * 0.9) * (1.0 + twi / 8.0 * 0.35);

  // Precipitation forcing shift in logit space
  const rainLogitShift = ((delta3d / 28.0) * 0.95 + (delta1d / 18.0) * 0.65) * topoMultiplier;
  const elevLogitShift = -(elevationAdj / 12.0) * 0.85;
  const totalShift = rainLogitShift + elevLogitShift;

  const baseProb = Math.max(0.01, Math.min(0.99, cell.flood_probability));
  const baseLogit = Math.log(baseProb / (1.0 - baseProb));

  const scenarioLogit = baseLogit + totalShift;
  let scenarioProb = 1.0 / (1.0 + Math.exp(-scenarioLogit));

  // Natural physical boundary: if rainfall is 0 or near 0, surface runoff flood risk drops to minimum baseline
  if (simPrecip1d <= 2 && simPrecip3d <= 5) {
    scenarioProb = Math.min(scenarioProb, elev < 8 ? 0.06 : 0.015);
  }

  // Clamping to valid range
  scenarioProb = Math.max(0.01, Math.min(0.995, scenarioProb));
  const scenarioProbPct = Math.round(scenarioProb * 1000) / 10;
  const baseProbPct = cell.flood_probability_percent;
  const delta = Math.round((scenarioProbPct - baseProbPct) * 10) / 10;

  let riskLevel: "Low" | "Moderate" | "High" | "Critical" = "Low";
  if (scenarioProbPct >= 75) riskLevel = "Critical";
  else if (scenarioProbPct >= 50) riskLevel = "High";
  else if (scenarioProbPct >= 20) riskLevel = "Moderate";
  else riskLevel = "Low";

  let expl = "";
  if (delta > 0) {
    expl = `Precipitation surge (+${Math.max(0, delta3d).toFixed(1)}mm 3-day) increased inundation probability by +${delta.toFixed(1)} percentage points.`;
  } else if (delta < 0) {
    expl = `Dry weather / reduced precipitation decreased inundation risk by ${Math.abs(delta).toFixed(1)} percentage points to ${scenarioProbPct}%.`;
  } else {
    expl = "Simulation parameters match baseline observation.";
  }

  return {
    scenarioProb: scenarioProbPct,
    scenarioRisk: riskLevel,
    deltaPercent: delta,
    explanation: expl,
  };
}