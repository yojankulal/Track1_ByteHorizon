from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import httpx
import os
import json
import logging
from google import genai
from google.genai import types

try:
    from floodtwin.backend.app.schemas import AlertIncident
except ImportError:
    from backend.app.schemas import AlertIncident

router = APIRouter(prefix="/alerts", tags=["alerts"])
logger = logging.getLogger("llm_service")

# Candidate models in order of preference
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
]

class DispatchIncidentRequest(BaseModel):
    incident: AlertIncident

@router.post("/dispatch-incident")
async def dispatch_incident_alert(req: DispatchIncidentRequest):
    incident = req.incident
    
    # 1. Synthesize Telegram Message using LLM
    api_key = os.getenv("GEMINI_API_KEY", "")
    message_text = ""
    
    prompt = f"""You are an emergency responder AI for the FloodTwin system.
Please write a short, urgent Telegram alert message based on the following flood incident:

Incident Name: {incident.name}
Severity State: {incident.state} ({incident.trend})
Peak Risk: {incident.peak_probability_percent}%
Onset Time: {incident.onset}
Peak Time: {incident.peak}
Action Line: {incident.action_line}
Top Drivers: {', '.join(incident.top_drivers)}

Format the message with emojis (🚨, ⚠️, ⏰, etc.) to make it easy to read on mobile.
Include the Action Line as a clear instruction.
Do not use markdown wrappers like ``` in your response, just return the text.
"""
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            for model_name in GEMINI_MODELS:
                try:
                    res = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.3,
                            max_output_tokens=500,
                        )
                    )
                    if res and res.text:
                        message_text = res.text.strip()
                        break
                except Exception as model_err:
                    logger.warning(f"Failed LLM call with {model_name}: {model_err}")
                    continue
        except Exception as e:
            logger.error(f"Gemini client initialization error: {e}")
            
    if not message_text:
        # Fallback if LLM fails
        message_text = f"🚨 *{incident.name}*\n" \
                       f"State: {incident.state} ({incident.trend})\n" \
                       f"Peak Risk: {incident.peak_probability_percent}%\n" \
                       f"Onset: {incident.onset} | Peak: {incident.peak}\n\n" \
                       f"⚠️ Action Required:\n{incident.action_line}"

    # 2. Dispatch to Telegram
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "8723527283:AAF28UPkKfRzKfd3Hz0kTtLyXd8t24oHB5M")
    chat_ids = ["5180890453", "5738811956"]
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    
    success_count = 0
    errors = []
    
    async with httpx.AsyncClient() as client:
        for chat_id in chat_ids:
            try:
                response = await client.post(url, json={
                    "chat_id": chat_id,
                    "text": message_text
                })
                if response.status_code == 200:
                    success_count += 1
                else:
                    errors.append(f"Failed for {chat_id}: {response.text}")
            except Exception as e:
                errors.append(f"Error for {chat_id}: {str(e)}")
                
    if success_count == 0 and errors:
        raise HTTPException(status_code=500, detail={"error": "Failed to send alerts", "details": errors})
        
    return {"message": f"Successfully dispatched to {success_count} chats", "errors": errors, "dispatched_text": message_text}
