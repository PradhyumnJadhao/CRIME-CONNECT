from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import io
import re
from app.api.deps import get_current_user
from app.services.neo4j_service import Neo4jService
from app.services.llm_service import get_llm_service
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

router = APIRouter(prefix="/api/investigate", tags=["investigation"])

class InvestigateResponse(BaseModel):
    report: str

def query_neo4j(case_id: str):
    nodes = Neo4jService.get_all_nodes()
    # Filter for case
    case_nodes = [n for n in nodes if n.get("properties", {}).get("case_id") == case_id]
    
    # We could also get relationships, but let's just group by label for simplicity
    summary = {"suspects": [], "locations": [], "weapons": []}
    for n in case_nodes:
        props = n.get("properties", {})
        if n["label"] == "Suspect":
            summary["suspects"].append(props.get("name", "Unknown"))
        elif n["label"] == "Location":
            summary["locations"].append(props.get("name", "Unknown"))
        elif n["label"] == "Weapon":
            summary["weapons"].append(props.get("name", "Unknown"))
    
    return summary

def draw_header_footer_qr(canvas, doc):
    canvas.saveState()
    # Draw QR code at bottom right corner
    qr_code = qr.QrCodeWidget("CRIME-CONNECT-" + getattr(doc, 'case_id', 'UNKNOWN'))
    bounds = qr_code.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    
    # Scale and draw QR
    d = Drawing(45, 45, transform=[45/width,0,0,45/height,0,0])
    d.add(qr_code)
    # Position bottom right (letter size is 8.5 x 11 inches -> 612 x 792 points)
    renderPDF.draw(d, canvas, 510, 30)
    
    # Add page number
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.gray)
    canvas.drawString(inch, 0.75 * inch, f"Page {doc.page}")
    canvas.restoreState()

def on_page(canvas, doc):
    draw_header_footer_qr(canvas, doc)

def clean_markdown_for_reportlab(text):
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    return text

def generate_pdf(case_id: str, report_text: str, data: dict, user_name: str, user_email: str):
    os.makedirs("./reports", exist_ok=True)
    file_path = f"./reports/Investigation_Report_{case_id}.pdf"
    
    doc = SimpleDocTemplate(file_path, pagesize=letter,
                            rightMargin=50, leftMargin=50,
                            topMargin=50, bottomMargin=50)
    doc.case_id = case_id
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=32,
        leading=40,
        textColor=colors.HexColor('#111827'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    logo_style = ParagraphStyle(
        'CoverLogo',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor('#00bcd4'),
        alignment=TA_CENTER,
        spaceAfter=5
    )
    
    prepared_style = ParagraphStyle(
        'PreparedBy',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        textColor=colors.HexColor('#4B5563'),
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle('ReportHeader', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, spaceAfter=8, textColor=colors.HexColor('#1F2937'), spaceBefore=15)
    body_style = ParagraphStyle('ReportBody', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=16, spaceAfter=8, alignment=TA_JUSTIFY)
    bullet_style = ParagraphStyle('ReportBullet', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=16, leftIndent=20, spaceAfter=4)
    
    Story = []
    
    # --- PAGE 1: COVER PAGE ---
    Story.append(Spacer(1, 120))
    Story.append(Paragraph("CRIME CONNECT", logo_style))
    Story.append(Paragraph("INTELLIGENCE SYSTEM", ParagraphStyle('SubLogo', parent=prepared_style, fontSize=12, spaceAfter=120)))
    
    Story.append(Paragraph("INVESTIGATION REPORT", title_style))
    Story.append(Paragraph(f"<b>Case Reference:</b> {case_id}", ParagraphStyle('Ref', parent=prepared_style, fontSize=16, spaceAfter=140)))
    
    Story.append(Paragraph(f"Prepared by: <b>{user_name}</b>", prepared_style))
    email_style = ParagraphStyle('EmailStyle', parent=prepared_style, fontSize=12, textColor=colors.HexColor('#6B7280'), spaceBefore=5)
    Story.append(Paragraph(f"user email id : {user_email}", email_style))
    Story.append(PageBreak())
    
    # --- PAGE 2: REPORT CONTENT ---
    Story.append(Paragraph(f"Investigation Summary", ParagraphStyle('DocTitle', parent=styles['Title'], fontName='Helvetica-Bold', textColor=colors.HexColor('#111827'), spaceAfter=20)))
    
    Story.append(Paragraph("Extracted Suspects:", header_style))
    if not data["suspects"]:
        Story.append(Paragraph("• No suspects identified.", bullet_style))
    else:
        for s in data["suspects"]:
            Story.append(Paragraph(f"• {s}", bullet_style))
    
    Story.append(Paragraph("Extracted Locations:", header_style))
    if not data["locations"]:
        Story.append(Paragraph("• No locations identified.", bullet_style))
    else:
        for l in data["locations"]:
            Story.append(Paragraph(f"• {l}", bullet_style))
            
    Story.append(Paragraph("AI Reasoning & Conclusion:", header_style))
    for p in report_text.split("\n"):
        if p.strip():
            clean_p = clean_markdown_for_reportlab(p)
            Story.append(Paragraph(clean_p, body_style))
            
    doc.build(Story, onFirstPage=on_page, onLaterPages=on_page)
    return file_path

import json

def get_cached_investigation(case_id: str):
    path = f"./reports/cached_{case_id}.json"
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def save_cached_investigation(case_id: str, report: str, data: dict):
    os.makedirs("./reports", exist_ok=True)
    with open(f"./reports/cached_{case_id}.json", "w") as f:
        json.dump({"report": report, "data": data}, f)


@router.post("/{case_id}", response_model=InvestigateResponse)
async def investigate(case_id: str, current_user: dict = Depends(get_current_user)):
    cached = get_cached_investigation(case_id)
    if cached:
        return {"report": cached["report"]}
        
    data = query_neo4j(case_id)
    if not data["suspects"] and not data["locations"]:
        # Soft fallback instead of crashing
        return {"report": "Historical case accessed. Graph data is currently archived or unavailable in the active Neo4j database. To view full forensic AI insights, please re-upload and process the original FIR document."}
    
    prompt = f"Analyze this crime case data. Give a brief, professional forensic conclusion. Do not use asterisks for bolding, just plain text. Data: {data}"
    
    llm = get_llm_service()
    try:
        result = await llm.run_prompt(prompt)
    except Exception as e:
        result = f"LLM error: {str(e)}"
        
    save_cached_investigation(case_id, result, data)
    return {"report": result}


@router.get("/{case_id}/pdf")
async def download_pdf(case_id: str, current_user: dict = Depends(get_current_user)):
    cached = get_cached_investigation(case_id)
    
    if cached:
        result = cached["report"]
        data = cached["data"]
    else:
        data = query_neo4j(case_id)
        if not data["suspects"] and not data["locations"]:
            result = "Historical case accessed. Graph data is currently archived or unavailable in the active Neo4j database. To view full forensic AI insights, please re-upload and process the original FIR document."
        else:
            prompt = f"Analyze this crime case data. Give a detailed, professional forensic conclusion. Data: {data}"
            llm = get_llm_service()
            try:
                result = await llm.run_prompt(prompt)
            except Exception as e:
                result = f"LLM error: {str(e)}"
            save_cached_investigation(case_id, result, data)
    
    payload = current_user.get("payload", {})
    user_name = payload.get("name", current_user.get("email", "Authorized Investigator"))
    user_email = current_user.get("email", "unknown@example.com")
    
    pdf_path = generate_pdf(case_id, result, data, user_name, user_email)
    return FileResponse(path=pdf_path, filename=f"Report_{case_id}.pdf", media_type="application/pdf")
