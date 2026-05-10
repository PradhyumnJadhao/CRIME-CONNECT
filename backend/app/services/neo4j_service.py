"""
Neo4j Service for Crime-Connect backend.
Handles all graph database operations with parameterized Cypher queries.
NEVER uses f-strings or string formatting for queries - prevents Cypher injection.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from neo4j import Session
from neo4j.exceptions import ServiceUnavailable
from app.core.database import get_db_session, reinitialize_driver

logger = logging.getLogger(__name__)


class Neo4jService:
    """Service for Neo4j graph database operations."""

    @staticmethod
    def _retry_if_connection_failure(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                msg = str(exc).lower()
                if isinstance(exc, ServiceUnavailable) or "failed to write data to connection" in msg:
                    logger.warning(
                        "Neo4j write failure detected; reinitializing driver and retrying once."
                    )
                    try:
                        reinitialize_driver()
                    except Exception as reconnect_exc:
                        logger.error(f"Neo4j reconnect failed: {reconnect_exc}")
                        raise
                    return func(*args, **kwargs)
                raise
        return wrapper

    @staticmethod
    @_retry_if_connection_failure
    def insert_entity(label: str, properties: Dict[str, Any]) -> str:
        """
        Merge an entity node into the graph.
        Nodes are merged based on 'name' to allow discovery of links across cases.
        """
        session = get_db_session()
        with session:
            # Standardize: Always use 'name' as the primary merge key if it exists
            # For 'Case' nodes, we merge on 'case_id'
            if label == "Case":
                merge_key = "case_id"
                merge_val = properties.get("case_id")
            else:
                merge_key = "name"
                merge_val = properties.get("name", properties.get("date", "Unknown"))

            # Remove merge key from set properties to avoid duplication
            set_props = {k: v for k, v in properties.items() if k != merge_key}
            set_clause = ", ".join([f"n.{k} = ${k}" for k in set_props.keys()])

            query = f"""
            MERGE (n:{label} {{{merge_key}: $merge_val}})
            """
            if set_clause:
                query += f" SET {set_clause}"
            query += " RETURN id(n) as node_id"

            result = session.run(query, merge_val=merge_val, **set_props)
            record = result.single()

            if record:
                node_id = record["node_id"]
                logger.debug(f"Merged {label} node ({merge_key}: {merge_val})")
                return str(node_id)
            raise RuntimeError(f"Failed to merge {label} node")

    @staticmethod
    @_retry_if_connection_failure
    def insert_relationship(
        source_label: str,
        source_property: Tuple[str, Any],
        target_label: str,
        target_property: Tuple[str, Any],
        rel_type: str,
        rel_properties: Dict[str, Any] = None,
    ) -> bool:
        """
        Create a relationship between two nodes using parameterized query.

        Args:
            source_label: Label of source node
            source_property: Tuple of (property_key, property_value) to match source
            target_label: Label of target node
            target_property: Tuple of (property_key, property_value) to match target
            rel_type: Relationship type
            rel_properties: Optional properties for the relationship

        Returns:
            True if relationship created successfully
        """
        try:
            session = get_db_session()
            with session:
                # Parameterized query to prevent Cypher injection
                source_key, source_val = source_property
                target_key, target_val = target_property

                rel_props = rel_properties or {}
                rel_str = (
                    f"[r:{rel_type} {{{', '.join([f'{k}: ${k}' for k in rel_props.keys()])}}}]"
                    if rel_props
                    else f"[r:{rel_type}]"
                )

                query = f"""
                MATCH (source:{source_label} {{{source_key}: $source_val}})
                MATCH (target:{target_label} {{{target_key}: $target_val}})
                CREATE (source)-{rel_str}->(target)
                """

                params = {
                    "source_val": source_val,
                    "target_val": target_val,
                    **rel_props,
                }

                session.run(query, **params)
                logger.debug(
                    f"Created {rel_type} relationship: {source_label}({source_key}={source_val}) "
                    f"-> {target_label}({target_key}={target_val})"
                )
                return True

        except Exception as e:
            logger.error(f"Error inserting relationship {rel_type}: {str(e)}")
            raise

    @staticmethod
    def get_all_nodes() -> List[Dict[str, Any]]:
        """
        Retrieve all nodes from the graph.

        Returns:
            List of node dictionaries with id, label, and properties
        """
        try:
            session = get_db_session()
            with session:
                query = """
                MATCH (n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                """
                result = session.run(query)
                nodes = [
                    {
                        "id": record["id"],
                        "label": record["labels"][0] if record["labels"] else "Unknown",
                        "properties": record["properties"],
                    }
                    for record in result
                ]
                logger.debug(f"Retrieved {len(nodes)} nodes from graph")
                return nodes

        except Exception as e:
            logger.error(f"Error retrieving nodes: {str(e)}")
            return []

    @staticmethod
    def get_case_entities(case_id: str) -> List[Dict[str, Any]]:
        """
        Retrieve all entities connected to a specific Case node.
        """
        try:
            session = get_db_session()
            with session:
                query = """
                MATCH (c:Case {case_id: $case_id})-[r]-(n)
                RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                """
                result = session.run(query, case_id=case_id)
                nodes = [
                    {
                        "id": record["id"],
                        "label": record["labels"][0] if record["labels"] else "Unknown",
                        "properties": record["properties"],
                    }
                    for record in result
                ]
                logger.debug(f"Retrieved {len(nodes)} entities for case {case_id}")
                return nodes
        except Exception as e:
            logger.error(f"Error retrieving case entities: {str(e)}")
            return []

    @staticmethod
    def get_all_edges() -> List[Dict[str, Any]]:
        """
        Retrieve all relationships from the graph.

        Returns:
            List of relationship dictionaries with source, target, type, and properties
        """
        try:
            session = get_db_session()
            with session:
                query = """
                MATCH (source)-[rel]->(target)
                RETURN id(source) as source_id, id(target) as target_id,
                       type(rel) as type, properties(rel) as properties
                """
                result = session.run(query)
                edges = [
                    {
                        "source": record["source_id"],
                        "target": record["target_id"],
                        "type": record["type"],
                        "properties": record["properties"],
                    }
                    for record in result
                ]
                logger.debug(f"Retrieved {len(edges)} edges from graph")
                return edges

        except Exception as e:
            logger.error(f"Error retrieving edges: {str(e)}")
            return []

    @staticmethod
    def query_by_name(name: str, label: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Query nodes by name property using parameterized query.

        Args:
            name: Name to search for
            label: Optional label filter

        Returns:
            List of matching nodes
        """
        try:
            session = get_db_session()
            with session:
                if label:
                    query = f"""
                    MATCH (n:{label})
                    WHERE n.name = $name
                    RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                    """
                else:
                    query = """
                    MATCH (n)
                    WHERE n.name = $name
                    RETURN id(n) as id, labels(n) as labels, properties(n) as properties
                    """

                result = session.run(query, name=name)
                nodes = [
                    {
                        "id": record["id"],
                        "label": record["labels"][0] if record["labels"] else "Unknown",
                        "properties": record["properties"],
                    }
                    for record in result
                ]
                logger.debug(f"Found {len(nodes)} nodes with name: {name}")
                return nodes

        except Exception as e:
            logger.error(f"Error querying by name: {str(e)}")
            return []

    @staticmethod
    def get_connected_nodes(
        node_id: int, relationship_type: Optional[str] = None, depth: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Get all nodes connected to a given node.

        Args:
            node_id: ID of the starting node
            relationship_type: Optional filter by relationship type
            depth: How many hops to traverse

        Returns:
            List of connected nodes
        """
        try:
            session = get_db_session()
            with session:
                if relationship_type:
                    rel_filter = f"-[:{relationship_type}*..{depth}]-"
                else:
                    rel_filter = f"-[*..{depth}]-"

                query = f"""
                MATCH (start) WHERE id(start) = $node_id
                MATCH (start){rel_filter}(connected)
                RETURN DISTINCT id(connected) as id, labels(connected) as labels,
                                 properties(connected) as properties
                """

                result = session.run(query, node_id=node_id)
                nodes = [
                    {
                        "id": record["id"],
                        "label": record["labels"][0] if record["labels"] else "Unknown",
                        "properties": record["properties"],
                    }
                    for record in result
                ]
                logger.debug(
                    f"Retrieved {len(nodes)} nodes connected to node {node_id} at depth {depth}"
                )
                return nodes

        except Exception as e:
            logger.error(f"Error retrieving connected nodes: {str(e)}")
            return []

    @staticmethod
    def delete_all() -> bool:
        """
        Delete all nodes and relationships (for testing/reset).

        Returns:
            True if successful
        """
        try:
            session = get_db_session()
            with session:
                query = "MATCH (n) DETACH DELETE n"
                session.run(query)
                logger.warning("Deleted all nodes and relationships from graph")
                return True

        except Exception as e:
            logger.error(f"Error deleting all data: {str(e)}")
            return False
