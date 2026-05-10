"""
Entity Resolution Service for Crime-Connect backend.
Handles duplicate entity detection and merging using fuzzy matching.
"""

import logging
from typing import List, Dict, Tuple, Set
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class EntityResolution:
    """Service for resolving duplicate entities."""

    # Similarity threshold for matching (0-1)
    DEFAULT_THRESHOLD = 0.85

    # Common name variations and abbreviations
    NAME_NORMALIZATIONS = {
        " jr ": " junior ",
        " sr ": " senior ",
        " ph.d": " phd",
        " m.d": " md",
        " esq": "",
        " dr ": " doctor ",
    }

    @staticmethod
    def normalize_name(name: str) -> str:
        """
        Normalize a name for comparison.

        Args:
            name: Name to normalize

        Returns:
            Normalized name
        """
        if not name:
            return ""

        # Convert to lowercase
        normalized = name.lower().strip()

        # Apply common normalizations
        for pattern, replacement in EntityResolution.NAME_NORMALIZATIONS.items():
            normalized = normalized.replace(pattern, replacement)

        # Remove extra spaces
        normalized = " ".join(normalized.split())

        return normalized

    @staticmethod
    def similarity_score(str1: str, str2: str) -> float:
        """
        Calculate similarity between two strings (0-1).

        Args:
            str1: First string
            str2: Second string

        Returns:
            Similarity score
        """
        if not str1 or not str2:
            return 0.0

        # Normalize both strings
        s1 = EntityResolution.normalize_name(str1)
        s2 = EntityResolution.normalize_name(str2)

        # Use SequenceMatcher for similarity
        matcher = SequenceMatcher(None, s1, s2)
        return matcher.ratio()

    @staticmethod
    def find_duplicates(
        entities: List[Dict[str, str]],
        threshold: float = DEFAULT_THRESHOLD,
    ) -> List[List[int]]:
        """
        Find groups of duplicate entities.

        Args:
            entities: List of entity dictionaries with 'name' key
            threshold: Similarity threshold for considering duplicates

        Returns:
            List of lists containing indices of duplicate groups
        """
        if not entities:
            return []

        logger.debug(f"Finding duplicates in {len(entities)} entities with threshold {threshold}")

        duplicate_groups = []
        processed = set()

        for i, entity1 in enumerate(entities):
            if i in processed:
                continue

            group = [i]
            name1 = entity1.get("name", "")

            for j in range(i + 1, len(entities)):
                if j in processed:
                    continue

                entity2 = entities[j]
                name2 = entity2.get("name", "")

                score = EntityResolution.similarity_score(name1, name2)
                if score >= threshold:
                    group.append(j)
                    processed.add(j)

            if len(group) > 1:
                duplicate_groups.append(group)
                logger.debug(f"Found duplicate group: {[entities[i]['name'] for i in group]}")
                processed.update(group)

        return duplicate_groups

    @staticmethod
    def merge_entities(
        entities: List[Dict[str, str]],
        duplicate_group: List[int],
    ) -> Dict[str, str]:
        """
        Merge duplicate entities into a single canonical entity.

        Args:
            entities: List of entities
            duplicate_group: Indices of duplicate entities to merge

        Returns:
            Merged entity dictionary
        """
        if not duplicate_group:
            return {}

        logger.debug(f"Merging {len(duplicate_group)} entities")

        # Use the first (longest) name as canonical
        canonical = max(
            [entities[i] for i in duplicate_group],
            key=lambda e: len(e.get("name", ""))
        )

        # Merge descriptions from all
        descriptions = []
        for idx in duplicate_group:
            desc = entities[idx].get("description", "").strip()
            if desc and desc not in descriptions:
                descriptions.append(desc)

        merged = {
            **canonical,
            "description": "; ".join(descriptions) if descriptions else canonical.get("description", ""),
            "merged_from": len(duplicate_group),
            "aliases": [entities[i].get("name", "") for i in duplicate_group if i != duplicate_group[0]],
        }

        logger.debug(f"Merged entity: {merged['name']}")
        return merged

    @staticmethod
    def resolve_entities(
        entities: List[Dict[str, str]],
        threshold: float = DEFAULT_THRESHOLD,
    ) -> Tuple[List[Dict[str, str]], Dict[str, List[str]]]:
        """
        Resolve all duplicate entities in a list.

        Args:
            entities: List of entities
            threshold: Similarity threshold

        Returns:
            Tuple of (resolved entities, mapping of canonical to aliases)
        """
        logger.info(f"Resolving {len(entities)} entities")

        # Find duplicates
        duplicate_groups = EntityResolution.find_duplicates(entities, threshold)

        if not duplicate_groups:
            logger.info("No duplicates found")
            return entities, {}

        # Merge duplicates
        resolved = []
        alias_map = {}
        processed_indices = set()

        for i, entity in enumerate(entities):
            if i in processed_indices:
                continue

            # Check if this entity is part of a duplicate group
            for group in duplicate_groups:
                if i in group:
                    # Merge this group
                    merged = EntityResolution.merge_entities(entities, group)
                    resolved.append(merged)

                    # Record alias mapping
                    canonical_name = merged["name"]
                    aliases = merged.get("aliases", [])
                    alias_map[canonical_name] = aliases

                    processed_indices.update(group)
                    break
            else:
                # Not a duplicate, add as-is
                resolved.append(entity)
                processed_indices.add(i)

        logger.info(f"Resolution complete: {len(resolved)} entities (merged {len(duplicate_groups)} groups)")
        return resolved, alias_map

    @staticmethod
    def deduplicate_by_field(
        entities: List[Dict[str, str]],
        field: str = "name",
        keep_longest: bool = True,
    ) -> List[Dict[str, str]]:
        """
        Simple deduplication by exact field value.

        Args:
            entities: List of entities
            field: Field to check for duplicates
            keep_longest: Keep entity with longest description

        Returns:
            Deduplicated list
        """
        logger.debug(f"Deduplicating by {field}")

        seen = {}
        for entity in entities:
            value = entity.get(field, "").lower().strip()

            if value not in seen:
                seen[value] = entity
            else:
                # Keep entity with longer description
                existing = seen[value]
                existing_desc_len = len(existing.get("description", ""))
                new_desc_len = len(entity.get("description", ""))

                if keep_longest and new_desc_len > existing_desc_len:
                    seen[value] = entity

        return list(seen.values())
