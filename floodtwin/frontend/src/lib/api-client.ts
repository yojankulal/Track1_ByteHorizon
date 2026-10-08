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

export async function predictFlood(
    data: FloodPredictionRequest
): Promise<FloodPredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/predict/flood`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Flood prediction failed (${response.status}): ${errorText}`
        );
    }

    return response.json();
}

export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);

        if (!response.ok) {
            return false;
        }

        const data = await response.json();

        return data.status === "ok";
    } catch {
        return false;
    }
}