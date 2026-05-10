"""
Main FastAPI application for Crime-Connect backend.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_driver, close_driver, verify_neo4j_connection
from app.api.routes import auth, ingest, graph, chat, cases, timeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------ WebSocket Manager ------------------

class WebSocketManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> bool:
        # Limit to 1 connection per user to prevent loops and memory leaks
        if user_id in self.active_connections and self.active_connections[user_id]:
            logger.warning(f"WebSocket already active for user {user_id}. Refusing new connection.")
            try:
                # To reject cleanly with a code, we must accept first in some environments, 
                # but let's try just closing with a code directly which is the standard rejection.
                await websocket.accept() 
                await websocket.close(code=1008) # Policy Violation
            except Exception:
                pass
            return False

        try:
            await websocket.accept()
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            logger.info(f"WebSocket connected: user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to accept websocket: {e}")
            return False

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: user {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast(self, message: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

ws_manager = WebSocketManager()


# ------------------ Lifespan ------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("Crime-Connect Backend Starting")
    logger.info("=" * 50)

    try:
        # Initialize PostgreSQL
        from app.core.pg_database import engine, Base
        import app.models.user  # Ensure models are loaded
        import app.models.case
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL tables created successfully")

        # Initialize Neo4j
        init_driver()

        # Verify connection
        is_connected = await verify_neo4j_connection()

        if not is_connected:
            logger.warning("Neo4j not fully verified (continuing...)")

        logger.info("Startup complete")

    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down...")

    try:
        close_driver()
        logger.info("Shutdown complete")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


# ------------------ FastAPI App ------------------

app = FastAPI(
    title="Crime-Connect AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)


# ------------------ CORS ------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔥 Change to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ Routes ------------------

app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(graph.router)
app.include_router(chat.router)
app.include_router(cases.router)
app.include_router(timeline.router)
from app.api.routes import dashboard, investigate
app.include_router(dashboard.router)
app.include_router(investigate.router)


# ------------------ Endpoints ------------------

@app.get("/")
async def root():
    return {
        "status": "running",
        "app": "Crime-Connect",
    }


@app.get("/health")
async def health_check():
    try:
        is_connected = await verify_neo4j_connection()

        return {
            "status": "healthy" if is_connected else "degraded",
            "neo4j": "connected" if is_connected else "disconnected",
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }


# ------------------ WebSocket ------------------

@app.websocket("/ws/{user_id}")
async def websocket_logs(websocket: WebSocket, user_id: str):
    # Connect and check success
    success = await ws_manager.connect(websocket, user_id)
    if not success:
        return # Terminate if rejected

    try:
        while True:
            # We don't really expect clients to send messages, but if they do:
            data = await websocket.receive_text()
            # await websocket.send_json({"message": data})

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)

    except Exception as e:
        # Avoid logging common context close/disconnect errors as noise
        if "connection closed" not in str(e).lower() and "websocket is not connected" not in str(e).lower():
            logger.error(f"WebSocket error: {str(e)}")
        ws_manager.disconnect(websocket, user_id)

@app.post("/api/internal/ws_notify")
async def internal_ws_notify(message: dict):
    """Internal endpoint for celery tasks to push websocket notifications."""
    user_id = message.get("user_id")
    text = message.get("text")
    if user_id and text:
        # Note: the message sent is expected to be a JSON object, let's keep it as text inside message key
        await ws_manager.send_personal_message({"message": text}, str(user_id))
    return {"status": "ok"}



# ------------------ Global Error Handler ------------------

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ------------------ Run Server ------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
    # Trigger reload for Gemini separation