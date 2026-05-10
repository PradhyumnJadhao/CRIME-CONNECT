"""
Extraction Agent for Crime-Connect backend.
Extracts criminal entities from raw FIR documents using the LLM.
Returns structured JSON with suspects, victims, locations, weapons, dates, and organizations.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from app.services.llm_service import extract_entities_from_fir as llm_extract_entities

logger = logging.getLogger(__name__)


# Type definitions for extracted entities
class EntitySet:
    """Container for extracted entities from a FIR document."""

    def __init__(
        self,
        suspects: List[Dict[str, str]] = None,
        victims: List[Dict[str, str]] = None,
        locations: List[Dict[str, str]] = None,
        weapons: List[Dict[str, str]] = None,
        dates: List[Dict[str, str]] = None,
        organizations: List[Dict[str, str]] = None,
    ):
        self.suspects = suspects or []
        self.victims = victims or []
        self.locations = locations or []
        self.weapons = weapons or []
        self.dates = dates or []
        self.organizations = organizations or []

    def to_dict(self) -> Dict[str, List[Dict[str, str]]]:
        """Convert to dictionary representation."""
        return {
            "suspects": self.suspects,
            "victims": self.victims,
            "locations": self.locations,
            "weapons": self.weapons,
            "dates": self.dates,
            "organizations": self.organizations,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EntitySet":
        """Create EntitySet from dictionary."""
        return cls(
            suspects=data.get("suspects", []),
            victims=data.get("victims", []),
            locations=data.get("locations", []),
            weapons=data.get("weapons", []),
            dates=data.get("dates", []),
            organizations=data.get("organizations", []),
        )


async def extract_entities_from_fir(fir_text: str) -> EntitySet:
    """
    Extract criminal entities from a raw FIR document.

    Args:
        fir_text: Raw text of the FIR document

    Returns:
        EntitySet containing extracted criminal entities

    Raises:
        RuntimeError: If extraction fails and fallback cannot be used
    """
    try:
        logger.info("Starting entity extraction from FIR document")

        # Use the new Groq-based extraction
        raw_response = llm_extract_entities(fir_text)

        # Parse JSON response
        extracted_data = _parse_json_response(raw_response)

        logger.info(f"Extracted entities: {len(extracted_data.get('suspects', []))} suspects, "
                   f"{len(extracted_data.get('victims', []))} victims, "
                   f"{len(extracted_data.get('locations', []))} locations")

        return EntitySet.from_dict(extracted_data)

    except Exception as e:
        logger.error(f"Entity extraction failed: {str(e)}")
        # Return empty EntitySet as fallback
        logger.warning("Returning empty entity set as fallback")
        return EntitySet()


def _parse_json_response(response: str) -> Dict[str, List[Dict[str, str]]]:
    """
    Parse JSON from LLM response, handling common formatting issues.

    Args:
        response: Raw response from LLM

    Returns:
        Parsed JSON dictionary with entity structure

    Raises:
        ValueError: If JSON cannot be parsed
    """
    # Try direct JSON parsing first
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass

    # Try removing markdown code blocks
    if "```json" in response:
        response = response.replace("```json", "").replace("```", "")
    elif "```" in response:
        response = response.replace("```", "")

    # Try again after cleanup
    try:
        return json.loads(response.strip())
    except json.JSONDecodeError:
        logger.error(f"Failed to parse JSON response: {response[:200]}")
        # Return empty structure
        return {
            "suspects": [],
            "victims": [],
            "locations": [],
            "weapons": [],
            "dates": [],
            "organizations": [],
        }


async def extract_entities_batch(fir_texts: List[str]) -> List[EntitySet]:
    """
    Extract entities from multiple FIR documents.

    Args:
        fir_texts: List of FIR document texts

    Returns:
        List of EntitySets, one per document
    """
    logger.info(f"Extracting entities from batch of {len(fir_texts)} documents")

    results = []
    for i, text in enumerate(fir_texts):
        logger.debug(f"Processing document {i+1}/{len(fir_texts)}")
        try:
            entity_set = await extract_entities_from_fir(text)
            results.append(entity_set)
        except Exception as e:
            logger.error(f"Failed to extract from document {i+1}: {str(e)}")
            results.append(EntitySet())  # Add empty set on failure

    return results


async def run_extraction_agent(text: str) -> Dict[str, List[Dict[str, str]]]:
    """
    Wrapper for extraction to return dict format as expected by Gemini pipeline.
    """
    entity_set = await extract_entities_from_fir(text)
    return entity_set.to_dict()
