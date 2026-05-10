"""
ChromaDB Service for Crime-Connect backend.
Handles semantic vector search for criminal entities.
"""

import logging
from typing import List, Optional, Dict, Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.core.config import settings

logger = logging.getLogger(__name__)


class ChromaDBService:
    """Service for vector search using ChromaDB."""

    def __init__(self):
        """Initialize ChromaDB client."""
        try:
            # ✅ Fix ChromaDB telemetry error and improve performance
            self.client = chromadb.PersistentClient(
                path=settings.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.collection = None
            logger.info(f"ChromaDB initialized at {settings.chroma_persist_dir} (Telemetry: Disabled)")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            self.client = None
            self.collection = None

    def _get_collection(self, name: str = "criminal_entities"):
        """Get or create a collection."""
        if self.client is None:
            logger.warning("ChromaDB not initialized")
            return None

        try:
            if self.collection is None:
                self.collection = self.client.get_or_create_collection(
                    name=name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.debug(f"Collection initialized: {name}")
            return self.collection
        except Exception as e:
            logger.error(f"Failed to get collection: {str(e)}")
            return None

    async def add_document(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        doc_id: Optional[str] = None,
    ) -> bool:
        """
        Add a document/text chunk to the vector database.

        Args:
            text: Text content to embed and store
            metadata: Optional metadata to attach
            doc_id: Optional document ID (auto-generated if None)

        Returns:
            True if successful
        """
        try:
            collection = self._get_collection()
            if collection is None:
                return False

            metadata = metadata or {}

            import uuid as _uuid
            effective_id = doc_id if doc_id else str(_uuid.uuid4())
            collection.add(
                documents=[text],
                metadatas=[metadata],
                ids=[effective_id],
            )

            logger.debug(f"Added document to ChromaDB (length: {len(text)})")
            return True

        except Exception as e:
            logger.error(f"Error adding document: {str(e)}")
            return False

    async def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity.

        Args:
            query: Search query text
            n_results: Number of results to return
            where: Optional filter conditions

        Returns:
            List of similar documents with distances
        """
        try:
            collection = self._get_collection()
            if collection is None:
                return []

            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
            )

            # Format results
            formatted_results = []
            if results and results["documents"] and len(results["documents"]) > 0:
                for i, doc in enumerate(results["documents"][0]):
                    formatted_results.append({
                        "text": doc,
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "id": results["ids"][0][i] if results["ids"] else None,
                    })

            logger.debug(f"Search returned {len(formatted_results)} results")
            return formatted_results

        except Exception as e:
            logger.error(f"Error searching: {str(e)}")
            return []

    async def delete_document(self, doc_id: str) -> bool:
        """
        Delete a document from the vector database.

        Args:
            doc_id: ID of document to delete

        Returns:
            True if successful
        """
        try:
            collection = self._get_collection()
            if collection is None:
                return False

            collection.delete(ids=[doc_id])
            logger.debug(f"Deleted document: {doc_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return False

    async def clear_collection(self) -> bool:
        """Clear all documents from the collection."""
        try:
            collection = self._get_collection()
            if collection is None:
                return False

            # Get all IDs and delete
            all_items = collection.get()
            if all_items and all_items["ids"]:
                collection.delete(ids=all_items["ids"])
                logger.info("Cleared ChromaDB collection")
            return True

        except Exception as e:
            logger.error(f"Error clearing collection: {str(e)}")
            return False


# Global instance
_chroma_service: Optional[ChromaDBService] = None


def get_chroma_service() -> ChromaDBService:
    """Get or create the ChromaDB service singleton."""
    global _chroma_service
    if _chroma_service is None:
        _chroma_service = ChromaDBService()
    return _chroma_service


async def add_to_vector_store(text: str, metadata: Dict[str, Any]) -> bool:
    """
    Module-level wrapper to store a document in ChromaDB.
    """
    service = get_chroma_service()
    return await service.add_document(text, metadata)
