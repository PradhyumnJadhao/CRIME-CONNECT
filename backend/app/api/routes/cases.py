"""
Cases API routes for Crime-Connect backend.
Handles case management and case history retrieval.
"""

import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.pg_database import get_pg_db
from app.services.neo4j_service import Neo4jService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cases", tags=["cases"])

# Simple in-memory case store (use database in production)
cases_db: dict = {}


class EntityCount(BaseModel):
    """Count of each entity type."""

    suspects: int = 0
    victims: int = 0
    locations: int = 0
    weapons: int = 0
    dates: int = 0
    organizations: int = 0


class CaseMetadata(BaseModel):
    """Metadata for a case."""

    case_id: str
    filename: str
    ingestion_timestamp: str
    entity_counts: EntityCount
    status: str


class CaseDetail(BaseModel):
    """Detailed information about a case."""

    case_id: str
    filename: str
    ingestion_timestamp: str
    entity_counts: EntityCount
    status: str
    entities: dict = {}


@router.get("/", response_model=List[CaseMetadata])
async def list_cases(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db),
    skip: int = 0,
    limit: int = 50,
) -> List[CaseMetadata]:
    """
    Get list of all ingested FIR cases belonging to the user.
    """
    try:
        from app.models.user import User
        from app.models.case import Case, CaseMember
        
        user = db.query(User).filter(User.email == current_user["email"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).order_by(Case.created_at.desc()).all()
        
        # Build metadata list with real filenames from Document table
        cases_list = []
        for c in db_cases:
            # Get filename from linked Document if exists
            from app.models.case import Document
            doc = db.query(Document).filter(Document.case_id == c.id).first()
            if doc and doc.file_path:
                import os
                raw_name = os.path.basename(doc.file_path)
                # Strip the UUID prefix (format: uuid8_filename.ext)
                parts = raw_name.split('_', 1)
                display_name = parts[1] if len(parts) > 1 else raw_name
            else:
                display_name = f"Report_{c.id[-6:]}"
            
            # Fetch real entity counts from Neo4j
            case_nodes = Neo4jService.get_case_entities(c.id)
            
            real_counts = EntityCount(
                suspects=len([n for n in case_nodes if n["label"] in ["Suspect", "Accused"]]),
                victims=len([n for n in case_nodes if n["label"] == "Victim"]),
                locations=len([n for n in case_nodes if n["label"] == "Location"]),
                weapons=len([n for n in case_nodes if n["label"] == "Weapon"]),
                dates=len([n for n in case_nodes if n["label"] == "Date"]),
                organizations=len([n for n in case_nodes if n["label"] == "Organization"])
            )
            
            # Determine status based on age (simulate processing time)
            # If created within the last 60 seconds, show pending
            try:
                now = datetime.now(c.created_at.tzinfo) if c.created_at.tzinfo else datetime.now()
                is_new = (now - c.created_at).total_seconds() < 60
            except Exception:
                is_new = False
                
            status_str = "pending" if is_new else "completed"
            
            meta = CaseMetadata(
                case_id=c.id,
                filename=display_name,
                ingestion_timestamp=c.created_at.isoformat(),
                entity_counts=real_counts,
                status=status_str
            )
            cases_list.append(meta)

        return cases_list[skip: skip + limit]

    except Exception as e:
        logger.error(f"Error listing cases: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list cases",
        )


@router.get("/{case_id}", response_model=CaseDetail)
async def get_case(
    case_id: str,
    current_user: dict = Depends(get_current_user),
) -> CaseDetail:
    """
    Get full details for a specific case.

    Args:
        case_id: ID of the case
        current_user: Authenticated user

    Returns:
        Complete case details including all entities

    Raises:
        HTTPException 404: If case not found
    """
    try:
        logger.info(f"Fetching case details: {case_id}")

        # Get all nodes for this case
        all_nodes = Neo4jService.get_all_nodes()

        case_nodes = [
            n for n in all_nodes
            if n.get("properties", {}).get("case_id") == case_id
        ]

        if not case_nodes:
            logger.warning(f"Case not found: {case_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case {case_id} not found",
            )

        # Build case details
        case_metadata = cases_db.get(case_id, {})
        entity_counts = EntityCount()
        entities = {
            "suspects": [],
            "victims": [],
            "locations": [],
            "weapons": [],
            "dates": [],
            "organizations": [],
        }

        for node in case_nodes:
            label = node["label"]
            props = node["properties"]

            # Count
            if label == "Suspect":
                entity_counts.suspects += 1
                entities["suspects"].append(props)
            elif label == "Victim":
                entity_counts.victims += 1
                entities["victims"].append(props)
            elif label == "Location":
                entity_counts.locations += 1
                entities["locations"].append(props)
            elif label == "Weapon":
                entity_counts.weapons += 1
                entities["weapons"].append(props)
            elif label == "Date":
                entity_counts.dates += 1
                entities["dates"].append(props)
            elif label == "Organization":
                entity_counts.organizations += 1
                entities["organizations"].append(props)

        return CaseDetail(
            case_id=case_id,
            filename=case_metadata.get("filename", "Unknown"),
            ingestion_timestamp=case_metadata.get("timestamp", ""),
            entity_counts=entity_counts,
            status="completed",
            entities=entities,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching case: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch case details",
        )


@router.post("/{case_id}/metadata")
async def store_case_metadata(
    case_id: str,
    filename: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Store case metadata after successful ingestion.

    Args:
        case_id: ID of the case
        filename: Original filename
        current_user: Authenticated user

    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing metadata for case {case_id}")

        cases_db[case_id] = {
            "case_id": case_id,
            "filename": filename,
            "timestamp": datetime.utcnow().isoformat(),
        }

        return {"message": "Case metadata stored", "case_id": case_id}

    except Exception as e:
        logger.error(f"Error storing case metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store case metadata",
        )

@router.post("/{case_id}/join")
async def join_case(
    case_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
):
    """
    Join an existing case.
    """
    from app.models.user import User
    from app.models.case import Case, CaseMember

    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    existing_member = db.query(CaseMember).filter(CaseMember.case_id == case_id, CaseMember.user_id == user.id).first()
    if existing_member:
        return {"message": "Already a member of this case", "case_id": case_id}
        
    new_member = CaseMember(user_id=user.id, case_id=case_id, role="investigator")
    db.add(new_member)
    db.commit()
    return {"message": "Successfully joined the case", "case_id": case_id}
