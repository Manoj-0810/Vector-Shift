"""Pydantic models for pipeline validation API."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PipelineNode(BaseModel):
    """A node in the pipeline graph."""

    id: str = Field(..., description="Unique node identifier")
    type: str = Field(..., description="Node type (input, output, llm, text, etc.)")
    position: Dict[str, float] = Field(
        ..., description="Node position on the canvas {x, y}"
    )
    data: Dict[str, Any] = Field(default_factory=dict, description="Node configuration data")


class PipelineEdge(BaseModel):
    """An edge connecting two nodes in the pipeline graph."""

    id: str = Field(..., description="Unique edge identifier")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    sourceHandle: Optional[str] = Field(
        None, description="Source handle identifier"
    )
    targetHandle: Optional[str] = Field(
        None, description="Target handle identifier"
    )


class PipelineRequest(BaseModel):
    """Request model for pipeline validation."""

    nodes: List[PipelineNode] = Field(..., description="List of pipeline nodes")
    edges: List[PipelineEdge] = Field(..., description="List of pipeline edges")


class PipelineResponse(BaseModel):
    """Response model for pipeline validation results."""

    num_nodes: int = Field(..., description="Total number of nodes")
    num_edges: int = Field(..., description="Total number of edges")
    is_dag: bool = Field(..., description="Whether the pipeline is a valid DAG")
    cycle_nodes: List[str] = Field(
        default_factory=list, description="Nodes involved in cycles if not DAG"
    )
    message: str = Field(..., description="Human-readable validation message")


class PipelineRunResponse(BaseModel):
    """Response model for pipeline execution results."""

    success: bool = Field(..., description="Whether execution was successful")
    node_updates: Dict[str, Dict[str, Any]] = Field(
        ..., description="Output updates for each node ID mapped to a dict of properties"
    )


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
