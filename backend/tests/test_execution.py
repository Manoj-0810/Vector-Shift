"""pytest tests for pipeline execution logic, SSRF/ReDoS protection, and API endpoints."""

import pytest
import time
from fastapi.testclient import TestClient
from main import app
from app.models import PipelineRequest, PipelineNode, PipelineEdge
from app.services import execute_pipeline, safe_regex_match, is_safe_url

client = TestClient(app)


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_execute_simple_chain():
    """Test execution of simple Input -> Output chain."""
    nodes = [
        PipelineNode(id="n1", type="input", position={"x": 0, "y": 0}, data={"inputValue": "hello world"}),
        PipelineNode(id="n2", type="output", position={"x": 100, "y": 0}, data={}),
    ]
    edges = [
        PipelineEdge(id="e1", source="n1", target="n2", sourceHandle="output-0", targetHandle="input-0"),
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = await execute_pipeline(pipeline)
    
    assert result["success"] is True
    assert result["node_updates"]["n2"]["outputValue"] == "hello world"


@pytest.mark.anyio
async def test_execute_text_variable_replacement():
    """Test dynamic variable replacement in TextNode."""
    nodes = [
        PipelineNode(id="n1", type="input", position={"x": 0, "y": 0}, data={"inputValue": "Alice"}),
        PipelineNode(id="n2", type="input", position={"x": 0, "y": 100}, data={"inputValue": "Bob"}),
        PipelineNode(id="n3", type="text", position={"x": 200, "y": 50}, data={"text": "Hello {{user1}} and {{user2}}!"}),
        PipelineNode(id="n4", type="output", position={"x": 400, "y": 50}, data={}),
    ]
    edges = [
        PipelineEdge(id="e1", source="n1", target="n3", sourceHandle="output-0", targetHandle="input-user1"),
        PipelineEdge(id="e2", source="n2", target="n3", sourceHandle="output-0", targetHandle="input-user2"),
        PipelineEdge(id="e3", source="n3", target="n4", sourceHandle="output-0", targetHandle="input-0"),
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = await execute_pipeline(pipeline)
    
    assert result["success"] is True
    assert result["node_updates"]["n3"]["outputValue"] == "Hello Alice and Bob!"
    assert result["node_updates"]["n4"]["outputValue"] == "Hello Alice and Bob!"


@pytest.mark.anyio
async def test_execute_transform_node():
    """Test TransformNode operations."""
    # Test uppercase
    nodes = [
        PipelineNode(id="n1", type="input", position={"x": 0, "y": 0}, data={"inputValue": "hello"}),
        PipelineNode(id="n2", type="transform", position={"x": 100, "y": 0}, data={"transformType": "uppercase"}),
    ]
    edges = [PipelineEdge(id="e1", source="n1", target="n2")]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n2"]["outputValue"] == "HELLO"

    # Test reverse
    nodes[1].data = {"transformType": "reverse"}
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n2"]["outputValue"] == "olleh"

    # Test slugify
    nodes[0].data = {"inputValue": "Hello World! @2026"}
    nodes[1].data = {"transformType": "slugify"}
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n2"]["outputValue"] == "hello-world-2026"


@pytest.mark.anyio
async def test_execute_merge_node():
    """Test MergeNode strategies."""
    nodes = [
        PipelineNode(id="n1", type="input", position={"x": 0, "y": 0}, data={"inputValue": "a"}),
        PipelineNode(id="n2", type="input", position={"x": 0, "y": 100}, data={"inputValue": "b"}),
        PipelineNode(id="n3", type="merge", position={"x": 200, "y": 50}, data={"strategy": "join_comma"}),
    ]
    edges = [
        PipelineEdge(id="e1", source="n1", target="n3", sourceHandle="output-0", targetHandle="input-0"),
        PipelineEdge(id="e2", source="n2", target="n3", sourceHandle="output-0", targetHandle="input-1"),
    ]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n3"]["outputValue"] == "a, b"


@pytest.mark.anyio
async def test_execute_filter_node():
    """Test FilterNode matching conditions."""
    nodes = [
        PipelineNode(id="n1", type="input", position={"x": 0, "y": 0}, data={"inputValue": "banana"}),
        PipelineNode(id="n2", type="filter", position={"x": 100, "y": 0}, data={"condition": "contains", "value": "an"}),
    ]
    edges = [PipelineEdge(id="e1", source="n1", target="n2")]
    pipeline = PipelineRequest(nodes=nodes, edges=edges)
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n2"]["outputValue"] == "banana"

    # Test mismatch -> empty output
    nodes[1].data = {"condition": "equals", "value": "apple"}
    result = await execute_pipeline(pipeline)
    assert result["node_updates"]["n2"]["outputValue"] == ""


def test_redos_protection():
    """Verify regex length limits and ReDoS detection."""
    # Pattern too long
    with pytest.raises(ValueError, match="Regex pattern too long"):
        safe_regex_match("a" * 101, "test")

    # Text too long
    with pytest.raises(ValueError, match="Input text too long"):
        safe_regex_match("a", "b" * 1001)

    # Catastrophic backtracking detection
    # (a+)+b against aaaaa...aaa (no 'b' at the end) is classic ReDoS
    # With a timeout, it should raise a ValueError indicating timeout
    backtracking_pattern = r"(a+)+b"
    target_text = "a" * 35
    
    with pytest.raises(ValueError, match="Regex matching timed out"):
        # Set a short timeout of 0.1s so it triggers quickly in tests
        safe_regex_match(backtracking_pattern, target_text, timeout=0.1)


def test_ssrf_protection():
    """Verify that private, loopback, and reserved addresses are blocked."""
    # Block local loopback
    assert is_safe_url("http://127.0.0.1") is False
    assert is_safe_url("http://localhost:8000") is False
    # Block private IP ranges
    assert is_safe_url("http://192.168.1.1") is False
    assert is_safe_url("https://10.0.0.1/path") is False
    assert is_safe_url("http://172.16.5.5") is False
    # Block link local
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False
    # Block invalid schemes
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("gopher://localhost") is False
    
    # Allow safe public URL (we check if it resolves, google.com is safe)
    assert is_safe_url("https://www.google.com") is True


def test_api_endpoints_with_test_client():
    """Test validation and run endpoints using FastAPI TestClient."""
    # 1. Parse endpoint
    parse_payload = {
        "nodes": [
            {"id": "1", "type": "input", "position": {"x": 0, "y": 0}, "data": {}},
            {"id": "2", "type": "output", "position": {"x": 100, "y": 0}, "data": {}}
        ],
        "edges": [
            {"id": "e1", "source": "1", "target": "2"}
        ]
    }
    resp = client.post("/pipelines/parse", json=parse_payload)
    assert resp.status_code == 200
    json_data = resp.json()
    assert json_data["num_nodes"] == 2
    assert json_data["num_edges"] == 1
    assert json_data["is_dag"] is True

    # 2. Validate endpoint
    resp = client.post("/api/pipelines/validate", json=parse_payload)
    assert resp.status_code == 200
    assert resp.json()["is_dag"] is True

    # 3. Run endpoint
    run_payload = {
        "nodes": [
            {"id": "1", "type": "input", "position": {"x": 0, "y": 0}, "data": {"inputValue": "ping"}},
            {"id": "2", "type": "output", "position": {"x": 100, "y": 0}, "data": {}}
        ],
        "edges": [
            {"id": "e1", "source": "1", "target": "2", "sourceHandle": "output-0", "targetHandle": "input-0"}
        ]
    }
    resp = client.post("/api/pipelines/run", json=run_payload)
    assert resp.status_code == 200
    run_data = resp.json()
    assert run_data["success"] is True
    assert run_data["node_updates"]["2"]["outputValue"] == "ping"
