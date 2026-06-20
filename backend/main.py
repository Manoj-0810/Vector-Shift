"""FastAPI application entry point."""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from app.models import PipelineRequest
from app.services import validate_pipeline
from app.router import router

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="VectorShift Pipeline Validator",
    description="Backend API for validating pipeline DAGs",
    version="1.0.0",
)

# Get CORS origins from environment or use default development origins
cors_origins_env = os.getenv("CORS_ORIGINS")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Root route redirects to /docs for interactive Swagger documentation
@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/docs")

# Parse pipeline endpoint as requested by VectorShift technical assessment Part 4
@app.post("/pipelines/parse")
async def parse_pipeline(pipeline: PipelineRequest):
    """
    Parse a pipeline graph to calculate total node/edge count and check if it is a DAG.
    Returns: {num_nodes: int, num_edges: int, is_dag: bool}
    """
    result = validate_pipeline(pipeline)
    return {
        "num_nodes": result["num_nodes"],
        "num_edges": result["num_edges"],
        "is_dag": result["is_dag"]
    }

# Include API routes
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

