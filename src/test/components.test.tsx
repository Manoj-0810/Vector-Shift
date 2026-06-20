import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider, ReactFlow } from "@xyflow/react";
import BaseNode from "../components/nodes/BaseNode";
import TextNode from "../components/nodes/TextNode";

// Render helper wrapper to provide ReactFlow context
const renderWithReactFlow = (ui: React.ReactElement) => {
  return render(
    <ReactFlowProvider>
      <ReactFlow
        nodes={[
          {
            id: "node-1",
            type: "text",
            position: { x: 0, y: 0 },
            data: { label: "Test Label", text: "Hello {{name}}", variables: ["name"] },
          },
        ]}
      >
        {ui}
      </ReactFlow>
    </ReactFlowProvider>
  );
};

describe("BaseNode component tests", () => {
  it("should render the header and children", () => {
    const props = {
      id: "node-1",
      data: { label: "Custom Title" },
      selected: false,
      type: "input",
      zIndex: 1,
      isConnectable: true,
      dragging: false,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
      draggable: true,
      selectable: true,
      deletable: true,
    };

    renderWithReactFlow(
      <BaseNode {...props}>
        <div data-testid="child-content">Child Content</div>
      </BaseNode>
    );

    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});

describe("TextNode component tests", () => {
  it("should render TextNode with variables", () => {
    const props = {
      id: "node-1",
      data: { label: "Text Node", text: "Hello {{name}} and {{age}}", variables: ["name", "age"] },
      selected: false,
      type: "text",
      zIndex: 1,
      isConnectable: true,
      dragging: false,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
      draggable: true,
      selectable: true,
      deletable: true,
    };

    renderWithReactFlow(<TextNode {...props} />);

    // Textarea check
    const textarea = screen.getByPlaceholderText(/Enter text with/i) as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe("Hello {{name}} and {{age}}");

    // Variable pills check
    expect(screen.getByText("{{name}}")).toBeInTheDocument();
    expect(screen.getByText("{{age}}")).toBeInTheDocument();
  });
});
