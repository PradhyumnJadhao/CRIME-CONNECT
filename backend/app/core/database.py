"""
Neo4j database connection and session management.
Handles driver initialization, session lifecycle, and error handling.
"""

import json
import logging
import os
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from neo4j import GraphDatabase, Session, Driver
from neo4j.exceptions import AuthError, ServiceUnavailable
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global driver instance
_driver: Optional[Driver] = None

SUPPORTED_SCHEMES = ("neo4j", "neo4j+s", "bolt", "bolt+s")


def _reload_dotenv() -> None:
    load_dotenv(dotenv_path=".env", override=True)


def _parse_neo4j_accounts() -> List[Dict[str, str]]:
    accounts: List[Dict[str, str]] = []

    neo4j_uri = os.getenv("NEO4J_URI") or getattr(settings, "neo4j_uri", None)
    neo4j_username = os.getenv("NEO4J_USERNAME") or getattr(settings, "neo4j_username", None)
    neo4j_password = os.getenv("NEO4J_PASSWORD") or getattr(settings, "neo4j_password", None)

    if neo4j_uri and neo4j_username and neo4j_password:
        accounts.append(
            {
                "uri": neo4j_uri,
                "username": neo4j_username,
                "password": neo4j_password,
            }
        )

    neo4j_accounts = os.getenv("NEO4J_ACCOUNTS") or getattr(settings, "neo4j_accounts", None)
    if neo4j_accounts:
        try:
            raw_accounts = json.loads(neo4j_accounts)
            if isinstance(raw_accounts, list):
                for account in raw_accounts:
                    if (
                        isinstance(account, dict)
                        and account.get("uri")
                        and account.get("user")
                        and account.get("pass")
                    ):
                        accounts.append(
                            {
                                "uri": account["uri"],
                                "username": account["user"],
                                "password": account["pass"],
                            }
                        )
                    else:
                        logger.warning("Ignoring invalid entry in NEO4J_ACCOUNTS.")
            else:
                logger.warning("NEO4J_ACCOUNTS must be a JSON array of credential objects.")
        except json.JSONDecodeError as exc:
            logger.warning(f"Unable to parse NEO4J_ACCOUNTS: {exc}")

    return accounts


def _validate_neo4j_config(uri: str, username: str, password: str) -> None:
    if not uri or not username or not password:
        raise ValueError("NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set.")

    parsed = urlparse(uri)
    if parsed.scheme not in SUPPORTED_SCHEMES:
        raise ValueError(
            "Neo4j URI must start with one of: " + ", ".join(SUPPORTED_SCHEMES)
        )

    if not parsed.hostname:
        raise ValueError("Neo4j URI must include a valid host name.")

    if re.search(r"\s", username):
        raise ValueError("Neo4j username must not contain whitespace.")

    if re.search(r"\s", password):
        raise ValueError("Neo4j password must not contain whitespace.")

    if len(password) < 8:
        logger.warning("Neo4j password appears short; verify it is correct.")


def _neo4j_error_hint(exc: Exception) -> Optional[str]:
    message = str(exc).lower()

    if isinstance(exc, AuthError) or "authentication" in message or "invalid credentials" in message:
        return (
            "Authentication failed. Verify your Aura credentials or reset the Neo4j password."
        )

    if any(keyword in message for keyword in ["quota", "storage", "limit", "capacity", "billing", "license"]):
        return (
            "Quota/storage limit reached. Clear the database, upgrade your Aura plan, or create a new Aura account."
        )

    if "resolve" in message or "dns" in message or "getaddrinfo" in message:
        return (
            "Cannot resolve Neo4j host. Check your network/DNS and confirm the Aura URI is correct."
        )

    if isinstance(exc, ServiceUnavailable) or "service unavailable" in message or "timed out" in message:
        return (
            "Neo4j service unavailable. Check network, firewall, and Aura instance status."
        )

    return None


def _log_database_status(driver: Driver) -> None:
    try:
        if settings.neo4j_database:
            session_kwargs = {"database": settings.neo4j_database}
        else:
            session_kwargs = {}

        with driver.session(**session_kwargs) as session:
            result = session.run(
                """
                CALL {
                    MATCH (n)
                    RETURN count(n) AS nodes
                }
                CALL {
                    MATCH ()-[r]-()
                    RETURN count(r) AS relationships
                }
                RETURN nodes, relationships
                """
            )
            record = result.single()
            if record:
                logger.info(
                    f"Neo4j status: {record['nodes']} nodes, {record['relationships']} relationships"
                )
    except Exception as exc:
        logger.warning(f"Could not fetch Neo4j node/relationship counts: {exc}")


def _build_driver(uri: str, username: str, password: str) -> Driver:
    return GraphDatabase.driver(uri, auth=(username, password))


def init_driver() -> Driver:
    """
    Initialize and return the Neo4j driver.
    Called once at application startup.
    """
    global _driver

    _reload_dotenv()

    if _driver is not None:
        try:
            _driver.verify_connectivity()
            return _driver
        except Exception as exc:
            logger.warning(f"Existing Neo4j driver verification failed: {exc}. Reinitializing.")
            close_driver()

    accounts = _parse_neo4j_accounts()
    if not accounts:
        raise RuntimeError(
            "No Neo4j configuration available. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD."
        )

    last_exception: Optional[Exception] = None
    for account_index, account in enumerate(accounts):
        uri = account["uri"]
        username = account["username"]
        password = account["password"]

        try:
            _validate_neo4j_config(uri, username, password)
        except Exception as exc:
            last_exception = exc
            logger.error(f"Invalid Neo4j configuration for {uri}: {exc}")
            continue

        for attempt in range(1, 3):
            driver = None
            try:
                driver = _build_driver(uri, username, password)
                driver.verify_connectivity()
                _driver = driver
                logger.info(f"Neo4j connected: {uri} as {username}")
                _log_database_status(driver)
                return _driver
            except Exception as exc:
                last_exception = exc
                hint = _neo4j_error_hint(exc)
                logger.error(f"Neo4j connection attempt {attempt} failed for {uri}: {exc}")
                if hint:
                    logger.error(f"Hint: {hint}")
                if attempt < 2:
                    logger.info("Retrying Neo4j connection once.")
                    if driver is not None:
                        try:
                            driver.close()
                        except Exception:
                            pass
                    continue
                close_driver()

        if account_index < len(accounts) - 1:
            logger.info("Trying next configured Neo4j account.")

    if last_exception is not None:
        raise last_exception

    raise RuntimeError("Failed to initialize Neo4j driver.")


def reinitialize_driver(
    uri: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    database: Optional[str] = None,
) -> Driver:
    if uri:
        os.environ["NEO4J_URI"] = uri
        setattr(settings, "neo4j_uri", uri)
    if username:
        os.environ["NEO4J_USERNAME"] = username
        setattr(settings, "neo4j_username", username)
    if password:
        os.environ["NEO4J_PASSWORD"] = password
        setattr(settings, "neo4j_password", password)
    if database:
        os.environ["NEO4J_DATABASE"] = database
        setattr(settings, "neo4j_database", database)

    close_driver()
    return init_driver()


def get_driver() -> Driver:
    """Get the global driver instance."""
    if _driver is None:
        raise RuntimeError("Neo4j driver not initialized. Call init_driver() first.")
    return _driver


def close_driver() -> None:
    """
    Close the Neo4j driver.
    Called during application shutdown.
    """
    global _driver

    if _driver is not None:
        try:
            _driver.close()
            logger.info("Neo4j driver closed")
        except Exception as e:
            logger.error(f"Error closing Neo4j driver: {str(e)}")
        finally:
            _driver = None


def get_db_session() -> Session:
    """
    Get a new Neo4j session.
    Use with context manager: with get_db_session() as session:
    """
    driver = get_driver()
    if settings.neo4j_database:
        return driver.session(database=settings.neo4j_database)
    return driver.session()


async def verify_neo4j_connection() -> bool:
    """
    Verify Neo4j connection is working.
    """
    try:
        driver = get_driver()
        if settings.neo4j_database:
            session_kwargs = {"database": settings.neo4j_database}
        else:
            session_kwargs = {}
        with driver.session(**session_kwargs) as session:
            result = session.run("RETURN 1 AS test")
            record = result.single()
            if record and record["test"] == 1:
                logger.info("Neo4j connection verified")
                return True
    except Exception as e:
        logger.error(f"Neo4j connection verification failed: {str(e)}")
        return False

    return False