import { number, path, string } from "@micro-router/core";
import { describe, expect, it } from "vitest";
import { Link } from "./link";
import { renderWithNavigator } from "./test-helpers";
import { userEvent } from "vitest/browser";

describe("Link", () => {
  describe("with string path", () => {
    it("renders an anchor with the correct href", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/about">About</Link>,
      );
      const link = page.getByRole("link", { name: "About" });
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAttribute("href", "/about");
    });

    it("renders complex string paths correctly", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/users/42/posts/hello-world">Post</Link>,
      );
      const link = page.getByRole("link", { name: "Post" });
      await expect
        .element(link)
        .toHaveAttribute("href", "/users/42/posts/hello-world");
    });
  });

  describe("with Path object", () => {
    const UserPath = path("users", number("userId"));

    it("renders an anchor with href built from path and inline data", async () => {
      const { page } = await renderWithNavigator(
        <Link to={UserPath} userId={42}>
          User 42
        </Link>,
      );
      const link = page.getByRole("link", { name: "User 42" });
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAttribute("href", "/users/42");
    });

    it("works with multiple path parameters", async () => {
      const PostPath = path("users", number("userId"), "posts", string("slug"));

      const { page } = await renderWithNavigator(
        <Link to={PostPath} userId={5} slug="hello-world">
          Post Link
        </Link>,
      );

      const link = page.getByRole("link", { name: "Post Link" });
      await expect
        .element(link)
        .toHaveAttribute("href", "/users/5/posts/hello-world");
    });

    it("works with string-typed path parameters", async () => {
      const ArticlePath = path("articles", string("category"), string("slug"));

      const { page } = await renderWithNavigator(
        <Link to={ArticlePath} category="tech" slug="new-features">
          Article
        </Link>,
      );

      const link = page.getByRole("link", { name: "Article" });
      await expect
        .element(link)
        .toHaveAttribute("href", "/articles/tech/new-features");
    });

    it("accepts path data as an object instead of inline props", async () => {
      const ArticlePath = path("articles", string("category"), string("slug"));

      const { page } = await renderWithNavigator(
        <Link
          to={ArticlePath}
          data={{
            category: "claude",
            slug: "makes-interesting-test-data",
          }}
        >
          Article
        </Link>,
      );

      const link = page.getByRole("link", { name: "Article" });
      await expect
        .element(link)
        .toHaveAttribute(
          "href",
          "/articles/claude/makes-interesting-test-data",
        );
    });

    it("handles numeric zero as a parameter", async () => {
      const { page } = await renderWithNavigator(
        <Link to={UserPath} userId={0}>
          User Zero
        </Link>,
      );
      const link = page.getByRole("link", { name: "User Zero" });
      await expect.element(link).toHaveAttribute("href", "/users/0");
    });
  });

  describe("forwarded props", () => {
    it("forwards className to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" className="my-link-class">
          Styled Link
        </Link>,
      );
      const link = page.getByRole("link", { name: "Styled Link" });
      await expect.element(link).toHaveClass("my-link-class");
    });

    it("forwards tabIndex to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" tabIndex={-1}>
          Tab Link
        </Link>,
      );
      const link = page.getByRole("link", { name: "Tab Link" });
      await expect.element(link).toHaveAttribute("tabindex", "-1");
    });

    it("forwards multiple props together", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" className="nav-link" tabIndex={0}>
          Multi Props
        </Link>,
      );
      const link = page.getByRole("link", { name: "Multi Props" });
      await expect.element(link).toHaveClass("nav-link");
      await expect.element(link).toHaveAttribute("tabindex", "0");
    });

    it("forwards aria-label to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" aria-label="Accessible link">
          Link
        </Link>,
      );
      const link = page.getByRole("link", { name: "Accessible link" });
      await expect.element(link).toBeVisible();
    });

    it("forwards aria-current to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" aria-current="page">
          Current Page
        </Link>,
      );
      const link = page.getByRole("link", { name: "Current Page" });
      await expect.element(link).toHaveAttribute("aria-current", "page");
    });

    it("forwards aria-describedby to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" aria-describedby="description-id">
          Described Link
        </Link>,
      );
      const link = page.getByRole("link", { name: "Described Link" });
      await expect
        .element(link)
        .toHaveAttribute("aria-describedby", "description-id");
    });

    it("forwards data-* attributes to the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test" data-testid="my-link" data-custom="value">
          Data Link
        </Link>,
      );
      const link = page.getByTestId("my-link");
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAttribute("data-custom", "value");
    });

    it("does not forward path data props to the anchor", async () => {
      const UserPath = path("users", number("userId"));
      const { page } = await renderWithNavigator(
        <Link to={UserPath} userId={42} aria-label="User link">
          User
        </Link>,
      );
      const link = page.getByRole("link", { name: "User link" });
      await expect.element(link).toHaveAttribute("href", "/users/42");
      await expect.element(link).not.toHaveAttribute("userId");
    });
  });

  describe("children", () => {
    it("renders children inside the anchor", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test">
          <span data-testid="child">Child Content</span>
        </Link>,
      );
      const child = page.getByTestId("child");
      await expect.element(child).toBeVisible();
      await expect.element(child).toHaveTextContent("Child Content");
    });

    it("renders multiple children", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test">
          <span data-testid="icon">🏠</span>
          <span data-testid="text">Home</span>
        </Link>,
      );
      await expect.element(page.getByTestId("icon")).toHaveTextContent("🏠");
      await expect.element(page.getByTestId("text")).toHaveTextContent("Home");
    });

    it("renders text children", async () => {
      const { page } = await renderWithNavigator(
        <Link to="/test">Simple Text</Link>,
      );
      const link = page.getByRole("link", { name: "Simple Text" });
      await expect.element(link).toBeVisible();
    });
  });

  describe("interactions", () => {
    it("clicks trigger client-side navigations", async () => {
      const { page, navigator } = await renderWithNavigator(
        <Link to="/somewhere">Click me</Link>,
      );

      await userEvent.click(page.getByRole("link", { name: "Click me" }));
      expect(navigator.location.pathname).toEqual("/somewhere");
    });
  });
});
