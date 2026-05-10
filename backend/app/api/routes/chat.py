"""
Chat API routes for Crime-Connect backend.
Handles conversational queries with AI reasoning over the knowledge graph.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.services.llm_service import get_llm_service
from app.services.neo4j_service import Neo4jService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request model for chat queries."""

    query: str
    include_sources: bool = True


class Source(BaseModel):
    """Source information for a response."""

    node_id: str
    label: str
    properties: dict


class ChatResponse(BaseModel):
    """Response model for chat queries."""

    answer: str
    sources: List[Source] = []
    confidence: str = "medium"


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> ChatResponse:
    """
    Process a chat query using LLM reasoning over the knowledge graph.

    Workflow:
    1. Query Neo4j to find relevant context from the graph
    2. Pass context and question to LLM for reasoning
    3. Return answer with source nodes

    Args:
        request: Chat query and options
        current_user: Authenticated user

    Returns:
        AI-generated answer with source nodes

    Raises:
        HTTPException 400: If query is empty
        HTTPException 500: If processing fails
    """
    try:
        if not request.query or len(request.query.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query must be at least 3 characters",
            )

        logger.info(f"Processing chat query: {request.query[:50]}")

        # 1. Get user's authorized cases
        from app.models.user import User
        from app.models.case import Case, CaseMember
        from app.core.pg_database import get_pg_db
        from sqlalchemy.orm import Session
        
        db = next(get_pg_db())
        user = db.query(User).filter(User.email == current_user["email"]).first()
        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).all()
        user_case_ids = {c.id for c in db_cases}

        # 2. Get graph data filtered by user cases
        try:
            from app.core.database import get_db_session
            session = get_db_session()
            with session:
                nodes_res = session.run(
                    "MATCH (n) WHERE n.case_id IN $case_ids OR (labels(n) = ['Case'] AND n.case_id IN $case_ids) RETURN properties(n) as properties, labels(n) as labels",
                    case_ids=list(user_case_ids)
                )
                edges_res = session.run(
                    "MATCH (s)-[r]->(t) WHERE s.case_id IN $case_ids AND t.case_id IN $case_ids RETURN properties(s).name as source, properties(t).name as target, type(r) as type",
                    case_ids=list(user_case_ids)
                )
                all_nodes = [r.data() for r in nodes_res]
                all_edges = [r.data() for r in edges_res]
        except Exception as e:
            logger.error(f"Chat graph context fetch error: {str(e)}")
            all_nodes, all_edges = [], []

        if not all_nodes:
            logger.warning("No data in graph for reasoning")
            return ChatResponse(
                answer="I don't have enough data in your neural memory yet. Please process at least one FIR report.",
                sources=[],
                confidence="low",
            )

        # Build graph context
        graph_context = _build_graph_context_v2(all_nodes, all_edges)

        # Create reasoning prompt
        reasoning_prompt = f"""You are a specialized Forensic Intelligence AI Assistant (CRIME-CONNECT CORE).
Your goal is to assist detectives by reasoning over a knowledge graph of criminal data.

CRIMINAL KNOWLEDGE GRAPH CONTEXT:
{graph_context}

INVESTIGATOR QUERY:
{request.query}

INSTRUCTIONS FOR RESPONSE:
1. Provide a professional, structured investigation report using Markdown.
2. Use clear headers: ### ANALYSIS SUMMARY, ### KEY FINDINGS, ### CONNECTION MAPPING.
3. Use bullet points and bold text for names, locations, and identifying marks.
4. If there is a suspected link between cases, highlight it in a section called "INTER-CASE LINKS".
5. Keep the tone analytical, precise, and detached.
6. If the data is fragmented, state what is missing for a full conclusion.

Format your response as a professional intelligence log."""

        # Run LLM reasoning
        llm_service = get_llm_service()
        answer = await llm_service.run_prompt(reasoning_prompt)

        logger.info("LLM reasoning completed")

        # Extract relevant sources (for MVP, return all nodes as potential sources)
        sources = []
        if request.include_sources:
            sources = []
            for node in all_nodes[:10]:  # Limit to 10 sources for response size
                properties = node.get("properties", {})
                labels = node.get("labels", ["Unknown"])
                node_label = labels[0] if isinstance(labels, list) and labels else "Unknown"
                node_id = str(properties.get("case_id") or properties.get("name") or "unknown")
                sources.append(
                    Source(
                        node_id=node_id,
                        label=node_label,
                        properties=properties,
                    )
                )

        return ChatResponse(
            answer=answer,
            sources=sources,
            confidence="high" if answer else "low",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat processing failed",
        )


def _build_graph_context_v2(nodes: List[dict], edges: List[dict]) -> str:
    """
    Build a text representation of the graph for LLM context.
    """
    context_lines = []

    # Add nodes
    context_lines.append("ENTITIES:")
    for node in nodes:
        props = node.get("properties", {})
        label = node.get("labels", ["Unknown"])[0]
        name = props.get("name", props.get("case_id", "Unknown"))
        details = ", ".join([f"{k}: {v}" for k, v in props.items() if k not in ["name", "case_id"]])
        context_lines.append(f"  [{label}] {name} ({details})")

    # Add edges
    if edges:
        context_lines.append("\nRELATIONSHIPS:")
        for edge in edges:
            context_lines.append(f"  {edge['source']} --[{edge['type']}]--> {edge['target']}")

    return "\n".join(context_lines)


@router.get("/health")
async def chat_health(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Health check for chat service.

    Args:
        current_user: Authenticated user

    Returns:
        Health status
    """
    try:
        llm_service = get_llm_service()
        if llm_service.llm is None:
            return {"status": "unhealthy", "message": "LLM not initialized"}

        # Try to count nodes
        all_nodes = Neo4jService.get_all_nodes()

        return {
            "status": "healthy",
            "graph_node_count": len(all_nodes),
            "llm_model": llm_service.model,
        }

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "message": str(e),
        }
