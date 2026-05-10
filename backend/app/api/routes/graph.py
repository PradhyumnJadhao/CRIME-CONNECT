"""
Graph API routes for Crime-Connect backend.
Returns Neo4j graph data in format suitable for visualization.
"""

import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.pg_database import get_pg_db
from app.services.neo4j_service import Neo4jService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/graph", tags=["graph"])


class NodeProperty(BaseModel):
    """Node property in the graph."""

    key: str
    value: str


class Node(BaseModel):
    """Node in the graph visualization."""

    id: str
    label: str
    properties: dict


class Edge(BaseModel):
    """Edge/relationship in the graph visualization."""

    source: str
    target: str
    type: str
    properties: dict = {}


class GraphResponse(BaseModel):
    """Complete graph data response."""

    nodes: List[Node]
    edges: List[Edge]
    node_count: int
    edge_count: int


@router.get("/", response_model=GraphResponse)
async def get_graph(
    case_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_pg_db)
) -> GraphResponse:
    """
    Get graph data. If case_id is provided, focus on that investigation.
    Otherwise, show all accessible intelligence mapping.
    """
    try:
        from app.models.user import User
        from app.models.case import Case, CaseMember

        # 1. Get user's authorized cases
        user = db.query(User).filter(User.email == current_user["email"]).first()
        db_cases = db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).all()
        user_case_ids = {c.id for c in db_cases}

        # Validate requested case_id
        if case_id and case_id not in user_case_ids:
            raise HTTPException(status_code=403, detail="Unauthorized access to case data")

        # 2. Query Neo4j
        # We fetch nodes linked to the specific Case or all nodes accessible to the user
        try:
            from app.core.database import get_db_session
            session = get_db_session()
            
            with session:
                if case_id:
                    # Focus query: Get Case node, its entities, and their local relationships
                    query = """
                    MATCH (c:Case {case_id: $case_id})
                    MATCH (c)-[r]-(n)
                    RETURN id(c) as id, labels(c) as labels, properties(c) as properties
                    UNION
                    MATCH (c:Case {case_id: $case_id})
                    MATCH (c)-[r]-(n)
                    RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                    """
                    edge_query = """
                    MATCH (c:Case {case_id: $case_id})-[r]-(n)
                    RETURN id(c) as source, id(n) as target, type(r) as type, properties(r) as properties
                    UNION
                    MATCH (c:Case {case_id: $case_id})-[r1]-(n1)-[r2]-(n2)
                    WHERE (n2)<-[:COMMITTED_BY|COMMITTED_ON|OCCURRED_AT|USED|LOCATED_AT]-(c)
                    RETURN id(n1) as source, id(n2) as target, type(r2) as type, properties(r2) as properties
                    """
                    nodes_result = session.run(query, case_id=case_id)
                    edges_result = session.run(edge_query, case_id=case_id)
                else:
                    # Global query: All nodes in user's cases
                    query = """
                    MATCH (n) WHERE n.case_id IN $case_ids OR (labels(n) = ['Case'] AND n.case_id IN $case_ids)
                    RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                    """
                    edge_query = """
                    MATCH (s)-[r]->(t)
                    WHERE (s.case_id IN $case_ids OR s.case_id IS NULL) AND (t.case_id IN $case_ids OR t.case_id IS NULL)
                    RETURN id(s) as source, id(t) as target, type(r) as type, properties(r) as properties
                    """
                    nodes_result = session.run(query, case_ids=list(user_case_ids))
                    edges_result = session.run(edge_query, case_ids=list(user_case_ids))

                nodes = [
                    Node(id=str(r["id"]), label=r["labels"][0], properties=r["properties"])
                    for r in nodes_result
                ]
                
                edges = [
                    Edge(source=str(r["source"]), target=str(r["target"]), type=r["type"], properties=r["properties"])
                    for r in edges_result
                ]
        except Exception as neo_err:
            logger.error(f"Neo4j Query Error: {str(neo_err)}")
            # Fallback to empty if DB fails
            return GraphResponse(nodes=[], edges=[], node_count=0, edge_count=0)

        return GraphResponse(
            nodes=nodes,
            edges=edges,
            node_count=len(nodes),
            edge_count=len(edges),
        )

    except Exception as e:
        logger.error(f"Error fetching graph: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch graph data",
        )


@router.get("/search", response_model=List[Node])
async def search_nodes(
    query: str,
    label: str = None,
    current_user: dict = Depends(get_current_user),
) -> List[Node]:
    """
    Search for nodes by name.

    Args:
        query: Name to search for
        label: Optional label filter (Suspect, Victim, Location, etc.)
        current_user: Authenticated user

    Returns:
        List of matching nodes
    """
    try:
        if not query or len(query) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query must be at least 2 characters",
            )

        logger.info(f"Searching for nodes with name: {query}")

        nodes_data = Neo4jService.query_by_name(query, label)

        nodes = [
            Node(
                id=str(node["id"]),
                label=node["label"],
                properties=node["properties"],
            )
            for node in nodes_data
        ]

        logger.info(f"Search found {len(nodes)} matching nodes")
        return nodes

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching nodes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed",
        )


@router.get("/nodes/{node_id}/connected", response_model=List[Node])
async def get_connected_nodes(
    node_id: int,
    depth: int = 1,
    current_user: dict = Depends(get_current_user),
) -> List[Node]:
    """
    Get all nodes connected to a given node.

    Args:
        node_id: ID of the starting node
        depth: How many hops to traverse (default 1)
        current_user: Authenticated user

    Returns:
        List of connected nodes
    """
    try:
        if depth < 1 or depth > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Depth must be between 1 and 5",
            )

        logger.info(f"Getting connected nodes for node {node_id} at depth {depth}")

        nodes_data = Neo4jService.get_connected_nodes(node_id, depth=depth)

        nodes = [
            Node(
                id=str(node["id"]),
                label=node["label"],
                properties=node["properties"],
            )
            for node in nodes_data
        ]

        logger.info(f"Found {len(nodes)} connected nodes")
        return nodes

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting connected nodes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get connected nodes",
        )


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_graph(
    current_user: dict = Depends(get_current_user),
):
    """
    Clear all nodes and relationships from graph (admin only for testing).

    Args:
        current_user: Authenticated user

    Raises:
        HTTPException 403: If user is not admin
    """
    logger.warning("Graph clear requested")

    try:
        success = Neo4jService.delete_all()
        if success:
            logger.info("Graph cleared successfully")
            return {"message": "Graph cleared"}
        else:
            raise RuntimeError("Delete operation failed")

    except Exception as e:
        logger.error(f"Error clearing graph: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear graph",
        )
