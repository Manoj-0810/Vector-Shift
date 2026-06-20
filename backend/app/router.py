"""API routes for pipeline validation."""

from fastapi import APIRouter, HTTPException
from app.models import PipelineRequest, PipelineResponse, PipelineRunResponse, HealthResponse
from app.services import validate_pipeline, execute_pipeline

router = APIRouter()


@router.post(
    "/pipelines/validate",
    response_model=PipelineResponse,
    summary="Validate a pipeline",
    description="Validates a pipeline as a DAG and returns validation results.",
)
async def validate_pipeline_endpoint(pipeline: PipelineRequest):
    """
    Validate a pipeline as a Directed Acyclic Graph.

    - **nodes**: List of nodes with id, type, position, and data
    - **edges**: List of edges connecting nodes

    Returns validation results including whether the pipeline is a valid DAG,
    node/edge counts, and cycle information if invalid.
    """
    try:
        result = validate_pipeline(pipeline)
        return PipelineResponse(
            num_nodes=result["num_nodes"],
            num_edges=result["num_edges"],
            is_dag=result["is_dag"],
            cycle_nodes=result["cycle_nodes"],
            message=result["message"],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




@router.post(
    "/pipelines/run",
    response_model=PipelineRunResponse,
    summary="Run a pipeline",
    description="Runs a pipeline topologically and returns output updates for each node.",
)
async def run_pipeline_endpoint(pipeline: PipelineRequest):
    """
    Execute all nodes in the DAG topologically and return output states.
    """
    try:
        result = await execute_pipeline(pipeline)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the service is running.",
)
async def health_check():
    """Return service health status."""
    return HealthResponse(status="healthy", version="1.0.0")

