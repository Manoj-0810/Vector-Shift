"""pytest tests for DAG validation logic."""

import pytest
from app.models import PipelineRequest, PipelineNode, PipelineEdge
from app.services import validate_pipeline


def test_empty_pipeline():
    """An empty pipeline with no nodes or edges is technically a valid DAG."""
    pipeline = PipelineRequest(nodes=[], edges=[])
    result = validate_pipeline(pipeline)
    assert result["num_nodes"] == 0
    assert result["num_edges"] == 0
    assert result["is_dag"] is True
    assert result["cycle_nodes"] == []


def test_linear_pipeline_is_dag():
    """A linear chain of nodes should be a valid DAG."""
    nodes = [
        PipelineNode(
            id=f"node_{i}", type="input" if i == 0 else "output" if i == 2 else "llm",
            position={"x": i * 100, "y": 0}, data={}
        )
        for i in range(3)
    ]
    edges = [
        PipelineEdge(id=f"edge_{i}", source=f"node_{i}", target=f"node_{i+1}")
        for i in range(2)
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = validate_pipeline(pipeline)
    assert result["is_dag"] is True
    assert result["num_nodes"] == 3
    assert result["num_edges"] == 2
    assert result["cycle_nodes"] == []


def test_cycle_detected():
    """A cycle between two nodes should be detected."""
    nodes = [
        PipelineNode(id="A", type="input", position={"x": 0, "y": 0}, data={}),
        PipelineNode(id="B", type="output", position={"x": 100, "y": 0}, data={}),
    ]
    edges = [
        PipelineEdge(id="e1", source="A", target="B"),
        PipelineEdge(id="e2", source="B", target="A"),
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = validate_pipeline(pipeline)
    assert result["is_dag"] is False
    assert "A" in result["cycle_nodes"] or "B" in result["cycle_nodes"]


def test_self_loop():
    """A self-loop (node connected to itself) should be detected as a cycle."""
    nodes = [PipelineNode(id="A", type="input", position={"x": 0, "y": 0}, data={})]
    edges = [PipelineEdge(id="e1", source="A", target="A")]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = validate_pipeline(pipeline)
    assert result["is_dag"] is False
    assert "A" in result["cycle_nodes"]


def test_complex_dag():
    """A more complex DAG with branching should be valid."""
    nodes = [
        PipelineNode(id="input", type="input", position={"x": 0, "y": 0}, data={}),
        PipelineNode(id="llm1", type="llm", position={"x": 100, "y": 0}, data={}),
        PipelineNode(id="llm2", type="llm", position={"x": 100, "y": 100}, data={}),
        PipelineNode(id="merge", type="merge", position={"x": 200, "y": 50}, data={}),
        PipelineNode(id="output", type="output", position={"x": 300, "y": 50}, data={}),
    ]
    edges = [
        PipelineEdge(id="e1", source="input", target="llm1"),
        PipelineEdge(id="e2", source="input", target="llm2"),
        PipelineEdge(id="e3", source="llm1", target="merge"),
        PipelineEdge(id="e4", source="llm2", target="merge"),
        PipelineEdge(id="e5", source="merge", target="output"),
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = validate_pipeline(pipeline)
    assert result["is_dag"] is True
    assert result["num_nodes"] == 5
    assert result["num_edges"] == 5


def test_complex_cycle():
    """A complex cycle involving multiple nodes should be detected."""
    nodes = [
        PipelineNode(id="A", type="input", position={"x": 0, "y": 0}, data={}),
        PipelineNode(id="B", type="llm", position={"x": 100, "y": 0}, data={}),
        PipelineNode(id="C", type="llm", position={"x": 200, "y": 0}, data={}),
        PipelineNode(id="D", type="output", position={"x": 300, "y": 0}, data={}),
    ]
    edges = [
        PipelineEdge(id="e1", source="A", target="B"),
        PipelineEdge(id="e2", source="B", target="C"),
        PipelineEdge(id="e3", source="C", target="D"),
        PipelineEdge(id="e4", source="D", target="B"),  # Creates cycle B -> C -> D -> B
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = validate_pipeline(pipeline)
    assert result["is_dag"] is False
    assert "B" in result["cycle_nodes"]
    assert "C" in result["cycle_nodes"]
    assert "D" in result["cycle_nodes"]
    assert "A" not in result["cycle_nodes"]
