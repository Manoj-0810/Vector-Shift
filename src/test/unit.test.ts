import { describe, it, expect } from "vitest";
import { extractVariables } from "../utils/variableParser";
import { validateDag, getTopologicalOrder } from "../utils/dagValidation";

describe("variableParser unit tests", () => {
  it("should extract variables from text", () => {
    expect(extractVariables("Hello {{name}}")).toEqual(["name"]);
    expect(extractVariables("Hello {{ name }} and {{age}}")).toEqual(["name", "age"]);
    expect(extractVariables("Hello {{_var}} and {{$var}}")).toEqual(["_var", "$var"]);
    expect(extractVariables("Hello {{var1}} and {{var1}}")).toEqual(["var1"]); // Deduplication
    expect(extractVariables("Hello world without vars")).toEqual([]);
  });
});

describe("dagValidation unit tests", () => {
  it("should validate a simple DAG", () => {
    const nodes = [{ id: "n1" }, { id: "n2" }, { id: "n3" }];
    const edges = [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ];
    const result = validateDag(nodes, edges);
    expect(result.isDag).toBe(true);
    expect(result.cycleNodes).toEqual([]);
  });

  it("should detect a simple cycle", () => {
    const nodes = [{ id: "n1" }, { id: "n2" }];
    const edges = [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n1" },
    ];
    const result = validateDag(nodes, edges);
    expect(result.isDag).toBe(false);
    expect(result.cycleNodes).toContain("n1");
    expect(result.cycleNodes).toContain("n2");
  });

  it("should detect a self loop", () => {
    const nodes = [{ id: "n1" }];
    const edges = [{ id: "e1", source: "n1", target: "n1" }];
    const result = validateDag(nodes, edges);
    expect(result.isDag).toBe(false);
    expect(result.cycleNodes).toEqual(["n1"]);
  });

  it("should return correct topological order", () => {
    const nodes = [{ id: "n1" }, { id: "n2" }, { id: "n3" }];
    const edges = [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ];
    const order = getTopologicalOrder(nodes, edges);
    expect(order).toEqual(["n1", "n2", "n3"]);
  });
});
