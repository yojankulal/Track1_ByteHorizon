import os
import logging
import json
from pathlib import Path
from typing import Dict, Any, List
from google import genai
from google.genai import types

logger = logging.getLogger("llm_service")

def _load_env_file():
    """Helper to auto-load .env file from workspace root if present."""
    root_env = Path(__file__).resolve().parents[3] / ".env"
    if root_env.exists():
        with open(root_env, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if not os.getenv(key.strip()):
                        os.environ[key.strip()] = val.strip().strip("'\"")

_load_env_file()

# Read API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Candidate models in order of preference
GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
]

def generate_llm_shap_explanation(shap_data: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes SHAP explanation data and raw input feature vector, and passes them to Gemini LLM
    to generate a simplified, human-friendly flood alert notice.
    """
    prob_pct = shap_data.get("flood_probability_percent", 0.0)
    risk_level = shap_data.get("risk_level", "Low")
    contributions = shap_data.get("contributions", [])
    
    # Extract top positive (increasing risk) and negative (decreasing risk) drivers
    risk_increasers = [c for c in contributions if c.get("direction") == "increases_risk"][:3]
    risk_decreasers = [c for c in contributions if c.get("direction") == "decreases_risk"][:2]

    # Format drivers for LLM prompt
    increasers_text = "\n".join([f"- {c['label']} (value: {c['value']}): increases risk (+{c['shap_value']})" for c in risk_increasers])
    decreasers_text = "\n".join([f"- {c['label']} (value: {c['value']}): reduces risk ({c['shap_value']})" for c in risk_decreasers])

    prompt = f"""You are an expert AI Coastal Flood & Disaster Response Specialist.
Synthesize the following technical machine learning prediction data and SHAP feature attributions into a simple, clear, non-technical public advisory notice or emergency alert.

### Technical Model Data:
- Location Coordinates: Lon {input_data.get('lon')}, Lat {input_data.get('lat')}
- Predicted Flood Risk Level: {risk_level} ({prob_pct}% probability)
- 1-Day Rainfall: {input_data.get('precip_1d')} mm
- 3-Day Rainfall: {input_data.get('precip_3d')} mm
- Elevation Above Sea Level: {input_data.get('elevation')} meters
- Slope: {input_data.get('slope')} degrees
- Topographic Wetness Index (TWI): {input_data.get('TWI')}

### Key SHAP Drivers:
Factors Increasing Risk:
{increasers_text if increasers_text else "None"}

Factors Reducing Risk:
{decreasers_text if decreasers_text else "None"}

Return a JSON object with EXACTLY these keys:
- "headline": A short, clear headline summarizing the alert (e.g. "🚨 CRITICAL FLOOD ALERT: Severe Rainfall in Low Elevation Sector").
- "simple_notice": A 2-3 sentence plain language explanation of why this area is at risk, converting technical factors like TWI or elevation into simple everyday terms.
- "recommended_actions": An array of 3 practical safety recommendations (e.g. ["Evacuate low-lying structures", "Clear local drainage channels", "Monitor emergency broadcasts"]).
- "key_factors": An array of 2-3 short bullet points summarizing the main physical drivers in plain language.
"""

    api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY)
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            
            for model_name in GEMINI_MODELS:
                try:
                    res = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.2,
                            max_output_tokens=1500,
                        )
                    )
                    if res and res.text:
                        raw_text = res.text.strip()
                        parsed = json.loads(raw_text)
                        return {
                            "headline": parsed.get("headline", f"{risk_level.upper()} FLOOD RISK ADVISORY"),
                            "simple_notice": parsed.get("simple_notice", ""),
                            "recommended_actions": parsed.get("recommended_actions", []),
                            "key_factors": parsed.get("key_factors", []),
                            "llm_status": "success",
                            "model_used": f"Gemini ({model_name})",
                        }
                except Exception as model_err:
                    logger.warning(f"Failed LLM call with {model_name}: {model_err}")
                    continue

        except Exception as e:
            logger.error(f"Gemini client initialization error: {e}")

    # Rule-based fallback if API key is not present or all model calls fail
    return _generate_fallback_explanation(prob_pct, risk_level, risk_increasers, input_data)


def _generate_fallback_explanation(prob_pct: float, risk_level: str, increasers: List[Dict[str, Any]], input_data: Dict[str, Any]) -> Dict[str, Any]:
    r1d = input_data.get("precip_1d", 0)
    r3d = input_data.get("precip_3d", 0)
    elev = input_data.get("elevation", 0)
    
    top_drivers = [c["label"] for c in increasers] if increasers else ["Rainfall Accumulation", "Elevation Profile"]

    if risk_level in ["Critical", "High"]:
        headline = f"🚨 {risk_level.upper()} FLOOD ALERT: Severe Risk Detected ({prob_pct}%)"
        simple_notice = (
            f"This zone is experiencing elevated flood risk ({prob_pct}%) driven by heavy 3-day rainfall "
            f"({r3d:.1f} mm) combined with low ground elevation ({elev:.1f}m). Water is likely to pool quickly in local depressions."
        )
        actions = [
            "Prepare emergency response assets and alert local community leadership.",
            "Clear near-by drainage bottlenecks and storm culverts.",
            "Move high-value assets and livestock to higher ground immediately."
        ]
    elif risk_level == "Moderate":
        headline = f"⚠️ MODERATE FLOOD WATCH: Heightened Water Retention ({prob_pct}%)"
        simple_notice = (
            f"Moderate flood risk ({prob_pct}%) calculated for this area. 1-day rainfall of {r1d:.1f} mm "
            f"and local terrain wetness indicate potential localized pooling."
        )
        actions = [
            "Monitor local stream gauges and precipitation forecasts.",
            "Verify drainage readiness in vulnerable sectors.",
            "Stay prepared for potential evacuation notices."
        ]
    else:
        headline = f"🟢 LOW FLOOD RISK: Normal Conditions ({prob_pct}%)"
        simple_notice = (
            f"Flood risk in this area remains low ({prob_pct}%). Elevation ({elev:.1f}m) "
            f"and current rainfall levels ({r3d:.1f} mm) are well within safe thresholds."
        )
        actions = [
            "No immediate safety intervention required.",
            "Continue standard hydrometeorological monitoring."
        ]

    return {
        "headline": headline,
        "simple_notice": simple_notice,
        "recommended_actions": actions,
        "key_factors": top_drivers,
        "llm_status": "rule_fallback",
        "model_used": "AI Rule Synthesis Engine",
    }
