"""
LLM Service for Crime-Connect backend.
Uses Groq AI for LLM interactions.
All calls are asynchronous.
"""

import logging
from typing import Optional
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with Groq LLM."""

    def __init__(self):
        """Initialize the LLM service with Groq API key."""
        self.client = Groq(api_key=settings.groq_api_key)
        logger.info("LLM initialized with Groq")

    async def run_prompt(self, prompt: str) -> str:
        """
        Run a prompt against the Groq LLM.

        Args:
            prompt: The prompt to send to the LLM

        Returns:
            The LLM's response as a string

        Raises:
            RuntimeError: If LLM call fails
        """
        try:
            logger.debug(f"Running prompt (first 100 chars): {prompt[:100]}")

            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a forensic AI assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )

            content = response.choices[0].message.content

            logger.debug(f"LLM response (first 100 chars): {str(content)[:100]}")
            return content

        except Exception as e:
            logger.error(f"LLM prompt failed: {str(e)}")
            raise RuntimeError(f"LLM call failed: {str(e)}")

    async def run_json_extraction(self, text: str) -> str:
        """
        Run a specialized prompt for JSON extraction.
        Used for extracting entities from FIR documents.

        Args:
            text: The FIR document text to extract from

        Returns:
            JSON-formatted string with extracted entities
        """
        extraction_prompt = f"""You are a criminal intelligence analyst. Extract all entities from the following FIR document.
Return ONLY a valid JSON object with these keys:
- suspects: list of {{name, description}}
- victims: list of {{name, description}}
- locations: list of {{name, type}}
- weapons: list of {{name, type}}
- dates: list of {{date, event}}
- organizations: list of {{name, role}}

FIR TEXT:
{text}"""

        try:
            logger.info("Running JSON extraction prompt")
            result = await self.run_prompt(extraction_prompt)
            return result
        except Exception as e:
            logger.error(f"JSON extraction failed: {str(e)}")
            raise


# Create a singleton instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


def extract_entities_from_fir(text: str) -> str:
    """
    Extract structured information from FIR text using Groq.

    Args:
        text: The FIR document text

    Returns:
        JSON string with extracted entities
    """
    client = Groq(api_key=settings.groq_api_key)

    prompt = f"""
Extract entities and return ONLY valid JSON.

Format:
{{
  "suspects": [],
  "victims": [],
  "locations": [],
  "weapons": [],
  "dates": [],
  "organizations": []
}}

FIR:
{text}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a forensic AI assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return response.choices[0].message.content
