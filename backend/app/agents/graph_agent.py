"""
Graph Agent for Crime-Connect backend.
Translates extracted entity JSON into Neo4j graph operations.
Creates nodes with appropriate labels and relationships between entities.
"""

import logging
from typing import Dict, List, Any
from app.agents.extraction_agent import EntitySet
from app.services.neo4j_service import Neo4jService

logger = logging.getLogger(__name__)


class GraphAgent:
    """Agent for translating extracted entities into graph structure."""

    # Mapping of entity types to Neo4j labels
    ENTITY_LABELS = {
        "suspects": "Suspect",
        "victims": "Victim",
        "locations": "Location",
        "weapons": "Weapon",
        "dates": "Date",
        "organizations": "Organization",
    }

    # Entity ID mappings for relationship creation
    _entity_ids: Dict[str, Dict[str, str]] = {}

    @classmethod
    async def store_entities_in_graph(cls, entity_set: EntitySet, case_id: str) -> bool:
        """
        Store extracted entities in Neo4j graph and link them to a central Case node.
        """
        logger.info(f"Storing entities in graph for case {case_id}")
        
        try:
            # 1. Ensure Case node exists
            Neo4jService.insert_entity("Case", {"case_id": case_id, "type": "FIR_Report"})
            
            # 2. Reset entity ID mappings for this case
            cls._entity_ids = {entity_type: {} for entity_type in cls.ENTITY_LABELS}

            # 3. Store all entities by type
            counts = {
                "suspects": await cls._store_suspects(entity_set.suspects, case_id),
                "victims": await cls._store_victims(entity_set.victims, case_id),
                "locations": await cls._store_locations(entity_set.locations, case_id),
                "weapons": await cls._store_weapons(entity_set.weapons, case_id),
                "dates": await cls._store_dates(entity_set.dates, case_id),
                "organizations": await cls._store_organizations(entity_set.organizations, case_id),
            }
            
            success_count = sum(c[0] for c in counts.values())
            
            # 4. Create explicit links between the Case and its entities
            # This follows the user's requested structure: [CASE] -> [SUSPECT], [CASE] -> [VICTIM]
            await cls._link_entities_to_case(case_id)

            # 5. Create inter-entity relationships
            if success_count > 0:
                await cls._create_relationships(entity_set, case_id)
                logger.info(f"Graph ingestion for {case_id} complete. Connected {success_count} entities.")
            
            return True

        except Exception as e:
            logger.error(f"Critical error in graph storage: {str(e)}")
            return False

    @classmethod
    async def _link_entities_to_case(cls, case_id: str):
        """Link all entities found in this process to the master Case node."""
        # Link Suspects: CASE -> COMMITTED_BY -> SUSPECT
        for suspect_name in cls._entity_ids["suspects"]:
             Neo4jService.insert_relationship(
                source_label="Case", source_property=("case_id", case_id),
                target_label="Suspect", target_property=("name", suspect_name),
                rel_type="COMMITTED_BY"
            )

        # Link Victims: CASE -> COMMITTED_ON -> VICTIM
        for victim_name in cls._entity_ids["victims"]:
            Neo4jService.insert_relationship(
                source_label="Case", source_property=("case_id", case_id),
                target_label="Victim", target_property=("name", victim_name),
                rel_type="COMMITTED_ON"
            )
            
        # Link Locations: CASE -> OCCURRED_AT -> LOCATION
        for loc_name in cls._entity_ids["locations"]:
            Neo4jService.insert_relationship(
                source_label="Case", source_property=("case_id", case_id),
                target_label="Location", target_property=("name", loc_name),
                rel_type="OCCURRED_AT"
            )

    @classmethod
    async def _store_suspects(
        cls, suspects: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store suspect entities. Returns (success_count, fail_count)."""
        logger.debug(f"Storing {len(suspects)} suspects")
        s, f = 0, 0
        for suspect in suspects:
            try:
                if isinstance(suspect, str):
                    suspect = {"name": suspect, "description": ""}
                properties = {
                    "name": suspect.get("name", "Unknown"),
                    "description": suspect.get("description", ""),
                    "case_id": case_id,
                    "type": "Suspect",
                }
                node_id = Neo4jService.insert_entity("Suspect", properties)
                cls._entity_ids["suspects"][suspect.get("name", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing suspect: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _store_victims(
        cls, victims: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store victim entities. Returns (success_count, fail_count)."""
        logger.debug(f"Storing {len(victims)} victims")
        s, f = 0, 0
        for victim in victims:
            try:
                if isinstance(victim, str):
                    victim = {"name": victim, "description": ""}
                properties = {
                    "name": victim.get("name", "Unknown"),
                    "description": victim.get("description", ""),
                    "case_id": case_id,
                    "type": "Victim",
                }
                node_id = Neo4jService.insert_entity("Victim", properties)
                cls._entity_ids["victims"][victim.get("name", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing victim: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _store_locations(
        cls, locations: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store location entities."""
        s, f = 0, 0
        for location in locations:
            try:
                if isinstance(location, str):
                    location = {"name": location, "type": "Location"}
                properties = {
                    "name": location.get("name", "Unknown"),
                    "type": location.get("type", "Location"),
                    "case_id": case_id,
                }
                node_id = Neo4jService.insert_entity("Location", properties)
                cls._entity_ids["locations"][location.get("name", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing location: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _store_weapons(
        cls, weapons: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store weapon entities."""
        s, f = 0, 0
        for weapon in weapons:
            try:
                if isinstance(weapon, str):
                    weapon = {"name": weapon, "type": "Weapon"}
                properties = {
                    "name": weapon.get("name", "Unknown"),
                    "type": weapon.get("type", "Weapon"),
                    "case_id": case_id,
                }
                node_id = Neo4jService.insert_entity("Weapon", properties)
                cls._entity_ids["weapons"][weapon.get("name", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing weapon: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _store_dates(
        cls, dates: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store date/event entities."""
        s, f = 0, 0
        for date_entry in dates:
            try:
                if isinstance(date_entry, str):
                    date_entry = {"date": date_entry, "event": ""}
                properties = {
                    "date": date_entry.get("date", "Unknown"),
                    "event": date_entry.get("event", ""),
                    "case_id": case_id,
                }
                node_id = Neo4jService.insert_entity("Date", properties)
                cls._entity_ids["dates"][date_entry.get("date", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing date: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _store_organizations(
        cls, organizations: List[Dict[str, str]], case_id: str
    ) -> (int, int):
        """Store organization entities."""
        s, f = 0, 0
        for org in organizations:
            try:
                if isinstance(org, str):
                    org = {"name": org, "role": ""}
                properties = {
                    "name": org.get("name", "Unknown"),
                    "role": org.get("role", ""),
                    "case_id": case_id,
                }
                node_id = Neo4jService.insert_entity("Organization", properties)
                cls._entity_ids["organizations"][org.get("name", "")] = str(node_id)
                s += 1
            except Exception as e:
                logger.error(f"Error storing organization: {str(e)}")
                f += 1
        return s, f

    @classmethod
    async def _create_relationships(
        cls, entity_set: EntitySet, case_id: str
    ) -> None:
        """
        Create relationships between entities.
        Heuristic-based: suspects use weapons, suspects located at locations, etc.
        """
        logger.debug("Creating inter-entity relationships")

        try:
            # Suspects used weapons
            for suspect_name in cls._entity_ids["suspects"]:
                for weapon_name in cls._entity_ids["weapons"]:
                    try:
                        Neo4jService.insert_relationship(
                            source_label="Suspect",
                            source_property=("name", suspect_name),
                            target_label="Weapon",
                            target_property=("name", weapon_name),
                            rel_type="USED",
                        )
                    except Exception as e:
                        logger.debug(f"Could not create USED relationship: {str(e)}")

            # Suspects located at locations
            for suspect_name in cls._entity_ids["suspects"]:
                for location_name in cls._entity_ids["locations"]:
                    try:
                        Neo4jService.insert_relationship(
                            source_label="Suspect",
                            source_property=("name", suspect_name),
                            target_label="Location",
                            target_property=("name", location_name),
                            rel_type="LOCATED_AT",
                        )
                    except Exception as e:
                        logger.debug(f"Could not create LOCATED_AT relationship: {str(e)}")

            # Victims at locations
            for victim_name in cls._entity_ids["victims"]:
                for location_name in cls._entity_ids["locations"]:
                    try:
                        Neo4jService.insert_relationship(
                            source_label="Victim",
                            source_property=("name", victim_name),
                            target_label="Location",
                            target_property=("name", location_name),
                            rel_type="AT_LOCATION",
                        )
                    except Exception as e:
                        logger.debug(f"Could not create AT_LOCATION relationship: {str(e)}")

            logger.info("Relationship creation completed")

        except Exception as e:
            logger.error(f"Error creating relationships: {str(e)}")


async def insert_to_graph(entities: Dict[str, Any], case_id: str) -> bool:
    """
    Module-level wrapper to store entities in Neo4j from a dictionary.
    """
    entity_set = EntitySet.from_dict(entities)
    return await GraphAgent.store_entities_in_graph(entity_set, case_id)
