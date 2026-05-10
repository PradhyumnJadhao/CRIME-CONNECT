from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.database import get_db_session
from app.core.pg_database import get_pg_db
from app.models.user import User
from app.models.case import Case, CaseMember

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
):
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).all()
        case_ids = [c.id for c in db_cases]
        
        with get_db_session() as session:
            # Stats for Neo4j filtered by case_id
            if not case_ids:
                return {
                    "total_cases": 0,
                    "suspects_count": 0,
                    "alerts": 0,
                    "live_connections": 0
                }

            # Neo4j query for suspects belonging to the user's cases
            suspects_query = "MATCH (n:Suspect) WHERE n.case_id IN $case_ids RETURN count(n) as suspects_count"
            suspects_count = session.run(suspects_query, case_ids=case_ids).single()["suspects_count"]

            alerts_query = "MATCH (n) WHERE n.flagged = true AND n.case_id IN $case_ids RETURN count(n) as alerts_count"
            try:
                alerts_count = session.run(alerts_query, case_ids=case_ids).single()["alerts_count"]
            except Exception:
                alerts_count = 0
                
            connections_query = "MATCH (a)-[r]->(b) WHERE a.case_id IN $case_ids AND b.case_id IN $case_ids RETURN count(r) as connections_count"
            connections_count = session.run(connections_query, case_ids=case_ids).single()["connections_count"]

        return {
            "total_cases": len(case_ids),
            "suspects_count": suspects_count,
            "alerts": alerts_count,
            "live_connections": connections_count
        }
    except Exception as e:
        return {
            "total_cases": 0,
            "suspects_count": 0,
            "alerts": 0,
            "live_connections": 0
        }

@router.get("/activity")
async def get_dashboard_activity(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
):
    try:
        user = db.query(User).filter(User.email == current_user["email"]).first()
        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).order_by(Case.created_at.desc()).limit(5).all()
        
        activities = []
        for c in db_cases:
            activities.append({"a": f"Started investigation for Case {c.id}", "t": c.created_at.strftime("%H:%M %p")})
            
        if not activities:
            activities.append({"a": "Account created. Awaiting case data.", "t": "recent"})
            
        return {
            "activities": activities
        }
    except Exception as e:
        return {"activities": []}
