"""
Planner Agent for Crime-Connect backend.
Uses LangGraph for multi-step decision routing.
"""

import logging
from typing import TypedDict, Literal
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


class QueryState(TypedDict):
    """State for query processing."""

    query: str
    query_type: Literal["graph_lookup", "vector_search", "combined", "not_determined"]
    should_search_graph: bool
    should_search_vectors: bool
    messages: list


class PlannerAgent:
    """Agent for routing queries to appropriate handlers."""

    @staticmethod
    def route_query(query: str) -> dict:
        """
        Analyze a query and determine routing.

        Args:
            query: User's natural language query

        Returns:
            Routing instructions with handlers to use
        """
        logger.info(f"Planning query: {query[:50]}")

        # Simple heuristic routing based on keywords
        query_lower = query.lower()

        routing = {
            "query": query,
            "should_search_graph": True,  # Always search graph for criminal data
            "should_search_vectors": False,  # Optional semantic search
            "query_type": "graph_lookup",
        }

        # Keywords indicating need for vector search
        semantic_keywords = ["similar", "like", "related", "comparable", "connected"]
        if any(kw in query_lower for kw in semantic_keywords):
            routing["should_search_vectors"] = True
            routing["query_type"] = "combined"

        # Keywords for connection analysis
        connection_keywords = ["connected", "relationship", "related", "link"]
        if any(kw in query_lower for kw in connection_keywords):
            routing["should_search_vectors"] = True
            routing["query_type"] = "combined"

        logger.debug(f"Query routing: {routing['query_type']}")

        return routing


def create_planning_graph():
    """
    Create LangGraph workflow for query planning.

    Returns:
        Compiled graph for query processing
    """
    workflow = StateGraph(QueryState)

    # Define nodes
    def analyze_node(state: QueryState) -> QueryState:
        logger.Debug("Analyzing query...")
        routing = PlannerAgent.route_query(state["query"])
        state["query_type"] = routing["query_type"]
        state["should_search_graph"] = routing["should_search_graph"]
        state["should_search_vectors"] = routing["should_search_vectors"]
        return state

    def route_node(state: QueryState) -> str:
        logger.debug(f"Routing to: {state['query_type']}")
        if state["query_type"] == "combined":
            return "combined_search"
        elif state["query_type"] == "vector_search":
            return "vector_search"
        else:
            return "graph_search"

    # Add nodes
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("route", route_node)
    workflow.add_node("graph_search", lambda x: x)
    workflow.add_node("vector_search", lambda x: x)
    workflow.add_node("combined_search", lambda x: x)

    # Add edges
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "route")
    workflow.add_conditional_edges(
        "route",
        lambda x: x["query_type"],
        {
            "graph_lookup": "graph_search",
            "vector_search": "vector_search",
            "combined": "combined_search",
        },
    )

    workflow.add_edge("graph_search", END)
    workflow.add_edge("vector_search", END)
    workflow.add_edge("combined_search", END)

    return workflow.compile()


# Create global graph instance
_planning_graph = None


def get_planning_graph():
    """Get or create the planning graph."""
    global _planning_graph
    if _planning_graph is None:
        try:
            _planning_graph = create_planning_graph()
            logger.info("Planning graph created")
        except Exception as e:
            logger.error(f"Failed to create planning graph: {str(e)}")
    return _planning_graph
