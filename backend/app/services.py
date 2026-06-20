"""DAG validation and execution service using networkx."""

import os
import re
import html
import json
import socket
import logging
import asyncio
import urllib.parse
import ipaddress
import multiprocessing
from typing import Any, Dict
import httpx
import networkx as nx
from app.models import PipelineRequest

# Configure logger
logger = logging.getLogger("pipelines")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

def validate_pipeline(pipeline: PipelineRequest) -> dict:
    """
    Validate a pipeline as a Directed Acyclic Graph (DAG).

    Args:
        pipeline: PipelineRequest containing nodes and edges

    Returns:
        dict with validation results including is_dag, cycle info, and counts
    """
    G = nx.DiGraph()

    # Add all nodes to the graph
    for node in pipeline.nodes:
        G.add_node(node.id, type=node.type)

    # Add all edges to the graph
    for edge in pipeline.edges:
        G.add_edge(edge.source, edge.target)

    # Check if the graph is a DAG
    is_dag = nx.is_directed_acyclic_graph(G)

    # Find cycles if not a DAG
    cycle_nodes: list[str] = []
    if not is_dag:
        try:
            cycle = list(nx.find_cycle(G, orientation="original"))
            cycle_nodes = list(dict.fromkeys([n[0] for n in cycle]))
        except (nx.NetworkXNoCycle, nx.NetworkXError):
            cycle_nodes = []

    return {
        "num_nodes": G.number_of_nodes(),
        "num_edges": G.number_of_edges(),
        "is_dag": is_dag,
        "cycle_nodes": cycle_nodes,
        "message": (
            "Valid DAG pipeline!"
            if is_dag
            else f"Cycle detected involving: {cycle_nodes}"
        ),
    }


def _regex_worker(pattern: str, text: str, queue: multiprocessing.Queue) -> None:
    try:
        match = re.search(pattern, text) is not None
        queue.put((True, match))
    except Exception as e:
        queue.put((False, str(e)))


def safe_regex_match(pattern: str, text: str, timeout: float = 1.0) -> bool:
    """Run regex search in a separate process with a timeout and length limits to prevent ReDoS."""
    if len(pattern) > 100:
        raise ValueError("Regex pattern too long (maximum 100 characters)")
    if len(text) > 1000:
        raise ValueError("Input text too long for regex matching (maximum 1000 characters)")
    
    # Compile pattern to validate syntax before spawning
    re.compile(pattern)
    
    # We use spawn or fork depending on platform, multiprocessing defaults are fine
    ctx = multiprocessing.get_context()
    queue = ctx.Queue()
    process = ctx.Process(target=_regex_worker, args=(pattern, text, queue))
    process.start()
    process.join(timeout=timeout)
    
    if process.is_alive():
        process.terminate()
        process.join()  # Clean up zombie
        raise ValueError("Regex matching timed out")
    
    if queue.empty():
        raise ValueError("Regex matching failed without result")
        
    success, result = queue.get()
    if not success:
        raise ValueError(f"Regex error: {result}")
    return result



def is_safe_url(url: str) -> bool:
    """Validate URL to prevent SSRF (allow only http/https, block private/reserved IPs)."""
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            logger.warning(f"SSRF block: invalid URL scheme '{parsed.scheme}' for URL: {url}")
            return False
        if not parsed.hostname:
            logger.warning(f"SSRF block: missing hostname for URL: {url}")
            return False
        
        # Resolve hostname to check IPs
        addr_info = socket.getaddrinfo(parsed.hostname, None)
        for addr in addr_info:
            ip_str = addr[4][0]
            ip = ipaddress.ip_address(ip_str)
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified:
                logger.warning(f"SSRF block: private/local/reserved IP '{ip_str}' resolved for URL: {url}")
                return False
        return True
    except Exception as e:
        logger.error(f"Error validating URL safety for {url}: {str(e)}")
        return False


# Define handler functions for each node type

async def execute_input_node(node_data: dict, incoming_values: dict) -> str:
    return node_data.get("inputValue", "")


async def execute_output_node(node_data: dict, incoming_values: dict) -> str:
    return incoming_values.get("input-0", "")


async def execute_text_node(node_data: dict, incoming_values: dict) -> str:
    text_template = node_data.get("text", "")
    vars_in_template = re.findall(r"\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}", text_template)
    for v in vars_in_template:
        handle_name = f"input-{v}"
        val = incoming_values.get(handle_name, "")
        text_template = text_template.replace(f"{{{{{v}}}}}", str(val))
    return text_template


async def execute_llm_node(node_data: dict, incoming_values: dict) -> str:
    system_input = incoming_values.get("system", "")
    prompt_input = incoming_values.get("prompt", "")
    system_prompt = node_data.get("systemPrompt", "")

    if system_input:
        if system_prompt:
            system_prompt = f"{system_input}\n{system_prompt}"
        else:
            system_prompt = system_input

    user_prompt = prompt_input or "Hello"
    temperature = node_data.get("temperature", 0.7)

    # Gemini API Key loading
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if gemini_key and not gemini_key.startswith("your_") and not gemini_key.startswith("AIzaSyB_Mock"):
        try:
            # Move API key to header instead of query parameter
            url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": gemini_key
            }
            
            contents = []
            if system_prompt:
                contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_prompt}"}]})
                contents.append({"role": "model", "parts": [{"text": "Understood."}]})
            contents.append({"role": "user", "parts": [{"text": user_prompt}]})
            
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature
                },
                "tools": [
                    {
                        "googleSearchRetrieval": {}
                    }
                ]
            }
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=payload, headers=headers, timeout=30.0)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    return f"API Error {resp.status_code}: {resp.text}"
        except Exception as e:
            return f"Gemini Error: {str(e)}"
    else:
        # Dynamic web search scraping mode (no API key required)
        clean_titles = []
        clean_snippets = []
        
        try:
            clean_query = re.sub(r'[\r\n\t]+', ' ', user_prompt)
            clean_query = re.sub(r'\s+', ' ', clean_query).strip()
            
            quoted_query = urllib.parse.quote_plus(clean_query)
            search_url = f"https://html.duckduckgo.com/html/?q={quoted_query}"
            headers = {"User-Agent": "Mozilla/5.0"}
            
            async with httpx.AsyncClient() as client:
                resp = await client.get(search_url, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    titles_raw = re.findall(r'class="result__a"[^>]*>(.*?)</a>', resp.text, re.DOTALL)
                    snippets_raw = re.findall(r'class="result__snippet"[^>]*>(.*?)</a>', resp.text, re.DOTALL)
                    
                    for t in titles_raw:
                        t_clean = re.sub(r'<[^>]+>', '', t)
                        t_clean = html.unescape(t_clean).strip()
                        clean_titles.append(t_clean)
                        
                    for s in snippets_raw:
                        s_clean = re.sub(r'<[^>]+>', '', s)
                        s_clean = html.unescape(s_clean).strip()
                        clean_snippets.append(s_clean)
        except Exception as e:
            logger.error(f"Scraper error: {str(e)}")
        
        if clean_titles and clean_snippets:
            output_val = (
                f"According to live web search results:\n"
                f"{clean_snippets[0]}\n\n"
                f"Sources:\n"
                f"• {clean_titles[0]}\n"
            )
            if len(clean_titles) > 1:
                output_val += f"• {clean_titles[1]}\n"
            if len(clean_titles) > 2:
                output_val += f"• {clean_titles[2]}\n"
            return output_val
        else:
            # Dynamic mock response instead of hardcoded answers
            simulated_ans = f"This is a simulated answer for your query: \"{user_prompt}\"."
            return (
                f"According to simulated search results:\n"
                f"{simulated_ans}\n\n"
                f"💡 Note: You are running in Mock Mode. Please configure a real Google AI Studio API key in `app/backend/.env` and restart the backend to retrieve live Google Search results."
            )


async def execute_transform_node(node_data: dict, incoming_values: dict) -> str:
    val = incoming_values.get("input-0", "")
    transform_type = node_data.get("transformType", "uppercase")
    val_str = str(val)
    if transform_type == "uppercase":
        return val_str.upper()
    elif transform_type == "lowercase":
        return val_str.lower()
    elif transform_type == "trim":
        return val_str.strip()
    elif transform_type == "reverse":
        return val_str[::-1]
    elif transform_type == "slugify":
        return re.sub(r'[^a-zA-Z0-9]+', '-', val_str).strip('-').lower()
    elif transform_type == "json_parse":
        try:
            return json.loads(val_str)
        except Exception as e:
            return f"JSON Parse Error: {str(e)}"
    elif transform_type == "json_stringify":
        try:
            return json.dumps(val)
        except Exception as e:
            return f"JSON Stringify Error: {str(e)}"
    return val_str


async def execute_merge_node(node_data: dict, incoming_values: dict) -> str:
    vals = [incoming_values.get(f"input-{i}", "") for i in range(3)]
    vals = [str(v) for v in vals if v]
    strategy = node_data.get("strategy", "concat")
    if strategy == "join_comma":
        return ", ".join(vals)
    elif strategy == "join_newline":
        return "\n".join(vals)
    elif strategy == "object_merge":
        merged = {}
        for v in vals:
            try:
                parsed = json.loads(v)
                if isinstance(parsed, dict):
                    merged.update(parsed)
            except Exception:
                pass
        return json.dumps(merged)
    elif strategy == "array_merge":
        merged = []
        for v in vals:
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    merged.extend(parsed)
                else:
                    merged.append(parsed)
            except Exception:
                merged.append(v)
        return json.dumps(merged)
    return "".join(vals)


async def execute_filter_node(node_data: dict, incoming_values: dict) -> str:
    val = incoming_values.get("input-0", "")
    condition = node_data.get("condition", "contains")
    filter_val = node_data.get("value", "")
    val_str = str(val)
    match = False
    if condition == "contains":
        match = filter_val in val_str
    elif condition == "equals":
        match = val_str == filter_val
    elif condition == "starts_with":
        match = val_str.startswith(filter_val)
    elif condition == "ends_with":
        match = val_str.endswith(filter_val)
    elif condition == "greater_than":
        try:
            match = float(val_str) > float(filter_val)
        except ValueError:
            match = val_str > filter_val
    elif condition == "less_than":
        try:
            match = float(val_str) < float(filter_val)
        except ValueError:
            match = val_str < filter_val
    elif condition == "regex":
        try:
            match = safe_regex_match(filter_val, val_str)
        except Exception as e:
            logger.error(f"Regex matching error in filter node: {str(e)}")
            match = False
    return val_str if match else ""


async def execute_api_node(node_data: dict, incoming_values: dict) -> str:
    url = node_data.get("url", "")
    method = node_data.get("method", "GET")
    headers = node_data.get("headers", {})
    input_val = incoming_values.get("input-0", "")
    if url:
        if not is_safe_url(url):
            raise ValueError("URL security validation failed: Access to private/local/reserved address is prohibited.")
        try:
            payload = {"input": input_val} if method in ["POST", "PUT", "PATCH"] else None
            async with httpx.AsyncClient() as client:
                resp = await client.request(method, url, json=payload, headers=headers, timeout=10.0)
                return resp.text
        except Exception as e:
            return f"API Error: {str(e)}"
    return input_val


async def execute_delay_node(node_data: dict, incoming_values: dict) -> str:
    val = incoming_values.get("input-0", "")
    duration = float(node_data.get("duration", 1))
    unit = node_data.get("unit", "seconds")
    sleep_time = duration
    if unit == "ms":
        sleep_time = duration / 1000.0
    elif unit == "minutes":
        sleep_time = duration * 60.0
    sleep_time = min(sleep_time, 5.0)  # cap at 5 seconds for safety
    await asyncio.sleep(sleep_time)
    return val


# Handler Registry Map
NODE_HANDLERS = {
    "input": execute_input_node,
    "output": execute_output_node,
    "text": execute_text_node,
    "llm": execute_llm_node,
    "transform": execute_transform_node,
    "merge": execute_merge_node,
    "filter": execute_filter_node,
    "api": execute_api_node,
    "delay": execute_delay_node
}


async def execute_pipeline(pipeline: PipelineRequest) -> dict:
    """
    Execute a pipeline by running its nodes in topological order.
    """
    G = nx.DiGraph()
    node_map = {node.id: node for node in pipeline.nodes}

    # Add nodes and edges
    for node in pipeline.nodes:
        G.add_node(node.id)
    for edge in pipeline.edges:
        G.add_edge(edge.source, edge.target)

    if not nx.is_directed_acyclic_graph(G):
        raise ValueError("Cannot run pipeline containing cycles.")

    # Find topological sort
    execution_order = list(nx.topological_sort(G))

    # Tracks output handle values: (node_id, source_handle) -> value
    outputs = {}
    node_updates = {}

    for node_id in execution_order:
        node = node_map.get(node_id)
        if not node:
            continue

        node_type = node.type
        node_data = node.data or {}

        # Resolve inputs for this node from incoming edges
        incoming_values = {}
        for edge in pipeline.edges:
            if edge.target == node_id:
                source_handle = edge.sourceHandle or "output-0"
                target_handle = edge.targetHandle or "input-0"
                val = outputs.get((edge.source, source_handle), "")
                incoming_values[target_handle] = val

        handler = NODE_HANDLERS.get(node_type)
        if not handler:
            logger.warning(f"Unsupported node type: {node_type}")
            output_val = ""
        else:
            try:
                output_val = await handler(node_data, incoming_values)
            except Exception as e:
                logger.error(f"Error executing node {node_id} ({node_type}): {str(e)}")
                output_val = f"Execution Error: {str(e)}"

        # Save output value for subsequent nodes
        outputs[(node_id, "output-0")] = output_val

        # Update node output state
        if node_type != "input":
            node_updates[node_id] = {"outputValue": output_val}

    return {
        "success": True,
        "node_updates": node_updates
    }
