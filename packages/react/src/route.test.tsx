import { number, path, string } from "@micro-router/core";
import { describe, expect, it } from "vitest";
import { match, route, routeSwitch } from "./route";
import { renderWithNavigator } from "./test-helpers";

describe("route", () => {
  const UserPath = path("users", number("userId"));

  it("renders when the path is an exact match", async () => {
    const UserPage = route(UserPath, ({ userId }) => {
      return <h1>User {userId}</h1>;
    });

    const { page } = await renderWithNavigator(<UserPage />, "/users/42");
    await expect.element(page.getByText("User 42")).toBeVisible();
  });

  it("does not render when the path is only a partial match", async () => {
    const UserPage = route(UserPath, ({ userId }) => {
      return <h1>User {userId}</h1>;
    });

    const { page } = await renderWithNavigator(
      <UserPage />,
      "/users/42/settings",
    );
    await expect
      .element(page.getByText("User 42").query())
      .not.toBeInTheDocument();
  });

  it("does not render when the path does not match", async () => {
    const UserPage = route(UserPath, ({ userId }) => {
      return <h1>User {userId}</h1>;
    });

    const { page } = await renderWithNavigator(<UserPage />, "/other/path");
    await expect
      .element(page.getByText(/User/).query())
      .not.toBeInTheDocument();
  });

  it("passes captured params to the render function", async () => {
    const PostPath = path("posts", string("slug"), number("commentId"));
    const PostPage = route(PostPath, ({ slug, commentId }) => {
      return (
        <div>
          <span data-testid="slug">{slug}</span>
          <span data-testid="commentId">{commentId}</span>
        </div>
      );
    });

    const { page } = await renderWithNavigator(
      <PostPage />,
      "/posts/hello-world/99",
    );
    await expect
      .element(page.getByTestId("slug"))
      .toHaveTextContent("hello-world");
    await expect.element(page.getByTestId("commentId")).toHaveTextContent("99");
  });

  it("updates when navigation changes", async () => {
    const UserPage = route(UserPath, ({ userId }) => {
      return <h1>User {userId}</h1>;
    });

    const { page, navigator } = await renderWithNavigator(
      <UserPage />,
      "/users/1",
    );
    await expect.element(page.getByText("User 1")).toBeVisible();

    navigator.push("/users/999");
    await expect.element(page.getByText("User 999")).toBeVisible();
    await expect
      .element(page.getByText("User 1").query())
      .not.toBeInTheDocument();
  });

  it("has correct properties", () => {
    const UserPage = route(UserPath, ({ userId }) => {
      return <h1>User {userId}</h1>;
    });

    expect(UserPage.path).toBe(UserPath);
    expect(UserPage.exact).toBe(true);
    expect(UserPage.Matched).toBeDefined();
  });
});

describe("match", () => {
  const BasePath = path("app", string("section"));

  it("renders when the path is an exact match", async () => {
    const Section = match(BasePath, ({ section }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(<Section />, "/app/dashboard");
    await expect.element(page.getByText("Section: dashboard")).toBeVisible();
  });

  it("renders when the path is a partial match", async () => {
    const Section = match(BasePath, ({ section }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(
      <Section />,
      "/app/dashboard/nested/path",
    );
    await expect.element(page.getByText("Section: dashboard")).toBeVisible();
  });

  it("does not render when the path does not match", async () => {
    const Section = match(BasePath, ({ section }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(<Section />, "/other/path");
    await expect
      .element(page.getByText(/Section/).query())
      .not.toBeInTheDocument();
  });

  it("has correct properties", () => {
    const Section = match(BasePath, ({ section }) => {
      return <h1>Section: {section}</h1>;
    });

    expect(Section.path).toBe(BasePath);
    expect(Section.exact).toBe(false);
    expect(Section.Matched).toBeDefined();
  });
});

describe("routeSwitch", () => {
  const MessageByIdPath = path("message", number("messageId"));
  const EditMessagePath = path(MessageByIdPath, "edit");
  const OtherPath = path(MessageByIdPath, "something-else");

  const MessagePage = route(MessageByIdPath, ({ messageId }) => {
    return <h1>Viewing message {messageId}</h1>;
  });
  const EditMessagePage = match(EditMessagePath, ({ messageId }) => {
    return <h1>Editing message {messageId}</h1>;
  });
  const OtherPage = route(OtherPath, () => {
    return <h1>Something else</h1>;
  });

  const Routes = routeSwitch({
    routes: [MessagePage, EditMessagePage, OtherPage],
    fallback: <p>not found</p>,
  });

  const App = () => {
    return (
      <div>
        <Routes />
      </div>
    );
  };

  it("renders only the page that matches", async () => {
    const { page, navigator } = await renderWithNavigator(
      <App />,
      "/message/123",
    );
    await expect.element(page.getByText("Viewing message 123")).toBeVisible();
    await expect
      .element(page.getByText("Something else").query())
      .not.toBeInTheDocument();
    await expect
      .element(page.getByText("Editing message").query())
      .not.toBeInTheDocument();

    navigator.push(EditMessagePath.make({ messageId: 456 }));
    await expect.element(page.getByText("Editing message 456")).toBeVisible();
    await expect
      .element(page.getByText("Viewing message").query())
      .not.toBeInTheDocument();
  });

  it("renders the fallback when no routes match", async () => {
    const { page } = await renderWithNavigator(<App />, "/unknown/path");
    await expect.element(page.getByText("not found")).toBeVisible();
  });

  it("renders undefined when no routes match and no fallback is provided", async () => {
    const RoutesNoFallback = routeSwitch({
      routes: [MessagePage],
    });

    const { page } = await renderWithNavigator(
      <RoutesNoFallback />,
      "/unknown",
    );
    await expect
      .element(page.getByText(/message/).query())
      .not.toBeInTheDocument();
  });

  it("selects the most specific route when multiple could match", async () => {
    // Both MessagePage and EditMessagePage could match /message/123/edit
    // but EditMessagePage is more specific
    const { page } = await renderWithNavigator(<App />, "/message/789/edit");
    await expect.element(page.getByText("Editing message 789")).toBeVisible();
    await expect
      .element(page.getByText("Viewing message").query())
      .not.toBeInTheDocument();
  });

  it("respects route (exact) vs match (partial) behavior within switch", async () => {
    // MessagePage is a route (exact), so /message/123/extra should not match it
    // EditMessagePage is a match (partial), so /message/123/edit/extra should match it
    const { page } = await renderWithNavigator(
      <App />,
      "/message/123/edit/extra",
    );
    await expect.element(page.getByText("Editing message 123")).toBeVisible();
  });

  it("shows fallback when route requires exact match but path has extra segments", async () => {
    // OtherPage is a route (exact) for /message/:id/something-else
    // Adding extra segments should not match
    const { page } = await renderWithNavigator(
      <App />,
      "/message/123/something-else/extra",
    );
    // None of the routes should match, fallback should be shown
    await expect.element(page.getByText("not found")).toBeVisible();
  });

  it("updates when navigation changes", async () => {
    const { page, navigator } = await renderWithNavigator(
      <App />,
      "/message/1",
    );
    await expect.element(page.getByText("Viewing message 1")).toBeVisible();

    navigator.push("/message/2/something-else");
    await expect.element(page.getByText("Something else")).toBeVisible();

    navigator.push("/nowhere");
    await expect.element(page.getByText("not found")).toBeVisible();
  });

  it("works with an empty routes array", async () => {
    const EmptyRoutes = routeSwitch({
      routes: [],
      fallback: <p>empty</p>,
    });

    const { page } = await renderWithNavigator(<EmptyRoutes />, "/any/path");
    await expect.element(page.getByText("empty")).toBeVisible();
  });

  it("selects best match when specific route registered after general", async () => {
    const GeneralPath = path("items", string("id"));
    const SpecificPath = path("items", "special");

    const GeneralPage = match(GeneralPath, ({ id }) => <h1>Item: {id}</h1>);
    const SpecialPage = route(SpecificPath, () => <h1>Special Item</h1>);

    // General registered first, specific second
    const Routes = routeSwitch({
      routes: [GeneralPage, SpecialPage],
    });

    const { page } = await renderWithNavigator(<Routes />, "/items/special");
    await expect.element(page.getByText("Special Item")).toBeVisible();
  });

  it("selects best match when specific route registered before general", async () => {
    const GeneralPath = path("items", string("id"));
    const SpecificPath = path("items", "special");

    const GeneralPage = match(GeneralPath, ({ id }) => <h1>Item: {id}</h1>);
    const SpecialPage = route(SpecificPath, () => <h1>Special Item</h1>);

    // Specific registered first, general second
    const Routes = routeSwitch({
      routes: [SpecialPage, GeneralPage],
    });

    const { page } = await renderWithNavigator(<Routes />, "/items/special");
    await expect.element(page.getByText("Special Item")).toBeVisible();
  });

  it("prefers static segments over dynamic captures", async () => {
    const DynamicPath = path("api", string("version"));
    const StaticPath = path("api", "v1");

    const DynamicRoute = route(DynamicPath, ({ version }) => (
      <h1>Dynamic: {version}</h1>
    ));
    const StaticRoute = route(StaticPath, () => <h1>Static v1</h1>);

    const Routes = routeSwitch({
      routes: [DynamicRoute, StaticRoute],
    });

    const { page } = await renderWithNavigator(<Routes />, "/api/v1");
    // Static route should be preferred because it has fewer captures
    await expect.element(page.getByText("Static v1")).toBeVisible();
  });

  it("renders dynamic route when static route does not match", async () => {
    const DynamicPath = path("api", string("version"));
    const StaticPath = path("api", "v1");

    const DynamicRoute = match(DynamicPath, ({ version }) => (
      <h1>Dynamic: {version}</h1>
    ));
    const StaticRoute = route(StaticPath, () => <h1>Static v1</h1>);

    const Routes = routeSwitch({
      routes: [DynamicRoute, StaticRoute],
    });

    const { page } = await renderWithNavigator(<Routes />, "/api/v2");
    await expect.element(page.getByText("Dynamic: v2")).toBeVisible();
  });
});
