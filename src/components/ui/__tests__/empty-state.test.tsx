import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Rocket } from "lucide-react";
import { EmptyState } from "../empty-state";

describe("EmptyState component", () => {
  it("should render icon, title, and description", () => {
    render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
      />
    );

    expect(screen.getByText("No items yet")).toBeInTheDocument();
    expect(screen.getByText("Get started by creating your first item")).toBeInTheDocument();
  });

  it("should render without action button when action prop is not provided", () => {
    render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should render action button when action prop is provided", () => {
    const mockOnClick = vi.fn();

    render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
        action={{
          label: "Create Item",
          onClick: mockOnClick,
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Create Item" })).toBeInTheDocument();
  });

  it("should call onClick handler when action button is clicked", async () => {
    const mockOnClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
        action={{
          label: "Create Item",
          onClick: mockOnClick,
        }}
      />
    );

    const button = screen.getByRole("button", { name: "Create Item" });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
        className="custom-class"
      />
    );

    const emptyState = container.querySelector('[data-slot="empty-state"]');
    expect(emptyState).toHaveClass("custom-class");
  });

  it("should spread additional props to the container div", () => {
    render(
      <EmptyState
        icon={Rocket}
        title="No items yet"
        description="Get started by creating your first item"
        data-testid="empty-state-container"
      />
    );

    expect(screen.getByTestId("empty-state-container")).toBeInTheDocument();
  });
});
