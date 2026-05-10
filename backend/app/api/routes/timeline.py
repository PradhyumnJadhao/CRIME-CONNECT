import json
import logging
import re
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import google.generativeai as genai

from app.api.deps import get_current_user
from app.core.pg_database import get_pg_db
from app.core.database import get_db_session
from app.models.user import User
from app.models.case import Case, CaseMember
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

# Configure Gemini AI
genai.configure(api_key=settings.gemini_api_key)

@router.get("")
async def get_timeline(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
):
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).all()
        case_ids = [c.id for c in db_cases]
        
        if not case_ids:
            return {"events": []}

        # Collect data from Neo4j to build prompt
        entities_summary = []
        try:
            with get_db_session() as session:
                # Get nodes related to these cases
                query = "MATCH (n) WHERE n.case_id IN $case_ids RETURN n LIMIT 100"
                result = session.run(query, case_ids=case_ids)
                nodes = [record["n"] for record in result]
                
                # Extract basic info
                for n in nodes:
                    label = list(n.labels)[0] if n.labels else "Unknown"
                    props = dict(n.items())
                    entities_summary.append({"label": label, "properties": props})
        except Exception as neo_e:
            logger.warning(f"Neo4j query failed for timeline: {neo_e}")
            
        # If neo4j fails or returns nothing, we must provide case data to Gemini
        if not entities_summary:
            for c in db_cases:
                entities_summary.append({
                    "label": "CaseDocument",
                    "properties": {"name": c.case_name, "created_at": str(c.created_at)}
                })
                
        # Prompt Gemini to create a timeline
        prompt = f"""
You are an advanced AI Forensic Analyst.
Generate a chronological timeline based on the following case data:
{json.dumps(entities_summary)[:15000]}

Return ONLY a valid JSON array of objects representing timeline events.
Each event object MUST have these exact keys:
- 'time': A timestamp string (e.g., '2026-04-03 14:30' or an estimated time based on data)
- 'title': A short, clear title for the event.
- 'desc': A detailed description. Include actionable intelligence or next steps for the investigator to make it advanced and helpful.
- 'type': One of ['alert', 'document', 'graph', 'intel', 'system']

Make the timeline logical, chronological, and professional. 
Ensure it reflects the uploaded FIRs and extracted intelligence. Provide 3 to 7 events that build a narrative of the investigation.
If data is limited, infer plausible next steps.
"""
        
        import google.generativeai as genai
        
        # Use the specific Timeline Gemini key if configured, otherwise fallback to default OCR key
        timeline_key = settings.gemini_timeline_api_key if settings.gemini_timeline_api_key else settings.gemini_api_key
        timeline_model = settings.gemini_timeline_model if settings.gemini_timeline_model else settings.gemini_model
        
        genai.configure(api_key=timeline_key)
        model = genai.GenerativeModel(timeline_model)
        response = model.generate_content(prompt)
        text_resp = response.text
        
        # Extract JSON array using regex if necessary
        match = re.search(r'\[.*\]', text_resp, re.DOTALL)
        if match:
            text_resp = match.group(0)
            
        events = []
        try:
            events = json.loads(text_resp)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {text_resp}")
                
        return {"events": events}
            
    except Exception as e:
        logger.error(f"Error generating timeline: {str(e)}")
        
        # Robust Fallback Mechanism: Generate basic timeline from ingested data if AI fails
        events = []
        if 'db_cases' in locals() and db_cases:
            for c in db_cases:
                events.append({
                    "time": str(c.created_at)[:16],
                    "title": f"FIR Ingested: {c.case_name}",
                    "desc": "Case document successfully uploaded and registered into the system. Pending full AI analysis.",
                    "type": "document"
                })
        
        return {"events": events}
