"""
Reasoning Agent for Crime-Connect backend.
Answers investigator queries by combining graph data with LLM reasoning.
"""

import logging
from typing import Optional, Dict, List, Any
from app.services.llm_service import get_llm_service
from app.services.neo4j_service import Neo4jService

logger = logging.getLogger(__name__)


class ReasoningAgent:
    """Agent for answering questions using LLM reasoning over graph data."""

    @staticmethod
    async def reason_over_graph(
        user_question: str,
        graph_context: Optional[str] = None,
        max_context_chars: int = 5000,
    ) -> str:
        """
        Answer a user question using LLM reasoning over the knowledge graph.

        Args:
            user_question: The investigator's question
            graph_context: Optional pre-built graph context
            max_context_chars: Maximum characters of context to include

        Returns:
            AI-reasoned answer to the question
        """
        try:
            logger.info(f"Reasoning over query: {user_question[:50]}")

            # Build graph context if not provided
            if graph_context is None:
                all_nodes = Neo4jService.get_all_nodes()
                all_edges = Neo4jService.get_all_edges()
                graph_context = ReasoningAgent._format_graph_context(
                    all_nodes, all_edges, max_context_chars
                )

            # Create reasoning prompt
            reasoning_prompt = ReasoningAgent._build_reasoning_prompt(
                user_question, graph_context
            )

            # Run LLM
            llm_service = get_llm_service()
            answer = await llm_service.run_prompt(reasoning_prompt)

            logger.debug(f"Generated answer (first 100 chars): {answer[:100]}")

            return answer

        except Exception as e:
            logger.error(f"Reasoning failed: {str(e)}")
            raise RuntimeError(f"Failed to reason over graph: {str(e)}")

    @staticmethod
    def _build_reasoning_prompt(user_question: str, graph_context: str) -> str:
        """Build the reasoning prompt for the LLM."""

        prompt = f"""You are a forensic intelligence specialist assisting law enforcement investigators.
You have access to a knowledge graph of criminal entities extracted from First Information Reports (FIRs).

Your task: Answer the investigator's question based on the criminal knowledge graph below.

CRIMINAL KNOWLEDGE GRAPH:
{graph_context}

INVESTIGATOR QUESTION:
{user_question}

Please provide:
1. A direct answer to the question
2. Key entities and relationships that support your answer
3. Any connections between suspects, victims, locations, and weapons that are relevant
4. Confidence level in your analysis (high/medium/low)

Be thorough but concise. Focus on actionable intelligence."""

        return prompt

    @staticmethod
    def _format_graph_context(
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        max_chars: int = 5000,
    ) -> str:
        """
        Format graph data into readable context.

        Args:
            nodes: List of graph nodes
            edges: List of graph edges
            max_chars: Maximum context size

        Returns:
            Formatted graph context
        """
        lines = []

        # Group nodes by label
        nodes_by_label = {}
        for node in nodes:
            label = node.get("label", "Unknown")
            if label not in nodes_by_label:
                nodes_by_label[label] = []
            nodes_by_label[label].append(node)

        # Format entities section
        lines.append("ENTITIES:")

        label_order = ["Suspect", "Victim", "Location", "Weapon", "Organization", "Date"]
        for label in label_order:
            if label in nodes_by_label:
                lines.append(f"\n{label}s:")
                for node in nodes_by_label[label][:10]:  # Limit to 10 per type
                    props = node.get("properties", {})
                    name = props.get("name", "Unknown")
                    description = props.get("description", "") or props.get("type", "")
                    if description:
                        lines.append(f"  - {name}: {description}")
                    else:
                        lines.append(f"  - {name}")

        # Format relationships section
        if edges:
            lines.append("\nKEY RELATIONSHIPS:")
            rel_types = {}
            for edge in edges:
                rel_type = edge.get("type", "RELATED")
                if rel_type not in rel_types:
                    rel_types[rel_type] = []
                rel_types[rel_type].append(edge)

            for rel_type, rels in rel_types.items():
                lines.append(f"\n{rel_type} relationships:")
                for rel in rels[:10]:  # Limit to 10 per type
                    source = rel.get("source")
                    target = rel.get("target")
                    lines.append(f"  - Entity {source} {rel_type} Entity {target}")

        # Join and truncate to max_chars
        context = "\n".join(lines)
        if len(context) > max_chars:
            context = context[:max_chars] + "\n... (context truncated)"

        return context

    @staticmethod
    async def reason_with_chain(
        question: str,
        chain_of_thought: bool = True,
    ) -> Dict[str, Any]:
        """
        Advanced reasoning with chain-of-thought steps.

        Args:
            question: User question
            chain_of_thought: Whether to use chain-of-thought reasoning

        Returns:
            Dictionary with answer and reasoning steps
        """
        try:
            logger.info("Starting chain-of-thought reasoning")

            llm_service = get_llm_service()

            if chain_of_thought:
                # Step 1: Identify relevant entities
                cot_prompt = f"""Given this investigator question, identify the key entities we should look for:
Question: {question}

List the entity types and specific names/values you would search for."""

                entities_response = await llm_service.run_prompt(cot_prompt)
                logger.debug(f"Identified entities: {entities_response[:100]}")

                # Step 2: Reason over full graph
                full_answer = await ReasoningAgent.reason_over_graph(question)

                return {
                    "answer": full_answer,
                    "reasoning_steps": {
                        "entities_identified": entities_response,
                    },
                    "confidence": "high",
                }
            else:
                answer = await ReasoningAgent.reason_over_graph(question)
                return {
                    "answer": answer,
                    "reasoning_steps": {},
                    "confidence": "medium",
                }

        except Exception as e:
            logger.error(f"Chain-of-thought reasoning failed: {str(e)}")
            raise
