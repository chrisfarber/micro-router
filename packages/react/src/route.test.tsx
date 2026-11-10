import { number, path, string } from "@micro-router/core";
import {
  Component,
  lazy,
  memo,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useEffect,
  useState,
} from "react";
import { describe, expect, it } from "vitest";
import { match, route, routeSwitch, type RouteProps } from "./route";
import { useLocation } from "./hooks";
import { renderWithNavigator } from "./test-helpers";

describe("route", () => {
  const UserPath = path("users", number("userId"));

  it("renders when the path is an exact match", async () => {
    const UserPage = route(UserPath, ({ data: { userId } }) => {
      return <h1>User {userId}</h1>;
    });

    const { page } = await renderWithNavigator(<UserPage />, "/users/42");
    await expect.element(page.getByText("User 42")).toBeVisible();
  });

  it("does not render when the path is only a partial match", async () => {
    const UserPage = route(UserPath, ({ data: { userId } }) => {
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
    const UserPage = route(UserPath, ({ data: { userId } }) => {
      return <h1>User {userId}</h1>;
    });

    const { page } = await renderWithNavigator(<UserPage />, "/other/path");
    await expect
      .element(page.getByText(/User/).query())
      .not.toBeInTheDocument();
  });

  it("passes captured params to the render function", async () => {
    const PostPath = path("posts", string("slug"), number("commentId"));
    const PostPage = route(PostPath, ({ data: { slug, commentId } }) => {
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
    const UserPage = route(UserPath, ({ data: { userId } }) => {
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
    const UserPage = route(UserPath, ({ data: { userId } }) => {
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
    const Section = match(BasePath, ({ data: { section } }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(<Section />, "/app/dashboard");
    await expect.element(page.getByText("Section: dashboard")).toBeVisible();
  });

  it("renders when the path is a partial match", async () => {
    const Section = match(BasePath, ({ data: { section } }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(
      <Section />,
      "/app/dashboard/nested/path",
    );
    await expect.element(page.getByText("Section: dashboard")).toBeVisible();
  });

  it("does not render when the path does not match", async () => {
    const Section = match(BasePath, ({ data: { section } }) => {
      return <h1>Section: {section}</h1>;
    });

    const { page } = await renderWithNavigator(<Section />, "/other/path");
    await expect
      .element(page.getByText(/Section/).query())
      .not.toBeInTheDocument();
  });

  it("has correct properties", () => {
    const Section = match(BasePath, ({ data: { section } }) => {
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

  const MessagePage = route(MessageByIdPath, ({ data: { messageId } }) => {
    return <h1>Viewing message {messageId}</h1>;
  });
  const EditMessagePage = match(EditMessagePath, ({ data: { messageId } }) => {
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

  it("falls back to a shorter match when an exact route has extra segments", async () => {
    const Section = match(path("docs"), () => <h1>Docs section</h1>);
    const Page = route(path("docs", "intro"), () => <h1>Intro</h1>);
    const Routes = routeSwitch({
      routes: [Section, Page],
      fallback: <p>not found</p>,
    });

    // The exact route consumes more input, but doesn't match it all
    const { page } = await renderWithNavigator(<Routes />, "/docs/intro/more");
    await expect.element(page.getByText("Docs section")).toBeVisible();
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

    const GeneralPage = match(GeneralPath, ({ data: { id } }) => (
      <h1>Item: {id}</h1>
    ));
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

    const GeneralPage = match(GeneralPath, ({ data: { id } }) => (
      <h1>Item: {id}</h1>
    ));
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

    const DynamicRoute = route(DynamicPath, ({ data: { version } }) => (
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

    const DynamicRoute = match(DynamicPath, ({ data: { version } }) => (
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

describe("route data", () => {
  const KeyPath = path("by-key", string("key"));
  const RefPath = path("by-ref", string("ref"));

  const KeyPage = route(KeyPath, ({ data: { key } }) => <h1>Key: {key}</h1>);
  const RefPage = route(RefPath, ({ data: { ref } }) => <h1>Ref: {ref}</h1>);

  it("passes data named after reserved props", async () => {
    const { page } = await renderWithNavigator(<KeyPage />, "/by-key/abc");
    await expect.element(page.getByText("Key: abc")).toBeVisible();

    const other = await renderWithNavigator(<RefPage />, "/by-ref/def");
    await expect.element(other.page.getByText("Ref: def")).toBeVisible();
  });

  it("passes data named after reserved props through a routeSwitch", async () => {
    const Routes = routeSwitch({ routes: [KeyPage, RefPage] });

    const { page, navigator } = await renderWithNavigator(
      <Routes />,
      "/by-key/abc",
    );
    await expect.element(page.getByText("Key: abc")).toBeVisible();

    navigator.push("/by-ref/def");
    await expect.element(page.getByText("Ref: def")).toBeVisible();
  });

  describe("for a path with no data", () => {
    const Page = route(path("empty"), ({ data }) => (
      <h1>Data: {JSON.stringify(data)}</h1>
    ));

    it("gives the component null", async () => {
      const { page } = await renderWithNavigator(<Page />, "/empty");
      await expect.element(page.getByText("Data: null")).toBeVisible();
    });

    it("gives the component null through a routeSwitch", async () => {
      const Routes = routeSwitch({ routes: [Page] });

      const { page } = await renderWithNavigator(<Routes />, "/empty");
      await expect.element(page.getByText("Data: null")).toBeVisible();
    });
  });

  it("renders Matched with route props", async () => {
    const UserPage = route(
      path("users", number("userId")),
      ({ data: { userId } }) => <h1>User {userId}</h1>,
    );

    const { page } = await renderWithNavigator(
      <UserPage.Matched data={{ userId: 7 }} exact rest={[]} />,
    );
    await expect.element(page.getByText("User 7")).toBeVisible();
  });

  it("keeps hooks and state separate between routes in a routeSwitch", async () => {
    const Counter = route(path("counter"), () => {
      const [count, setCount] = useState(0);
      return (
        <button
          onClick={() => {
            setCount(count + 1);
          }}
        >
          Count: {count}
        </button>
      );
    });
    const Named = route(path("named"), () => {
      const [first] = useState("Ada");
      const [last] = useState("Lovelace");
      return (
        <h1>
          {first} {last}
        </h1>
      );
    });
    const Routes = routeSwitch({ routes: [Counter, Named] });

    const { page, navigator } = await renderWithNavigator(
      <Routes />,
      "/counter",
    );
    await page.getByText("Count: 0").click();
    await expect.element(page.getByText("Count: 1")).toBeVisible();

    navigator.push("/named");
    await expect.element(page.getByText("Ada Lovelace")).toBeVisible();

    navigator.push("/counter");
    await expect.element(page.getByText("Count: 0")).toBeVisible();
  });

  it("supports memo components", async () => {
    const UserPage = ({ data }: { data: { id: string } }) => (
      <h1>Memo {data.id}</h1>
    );
    const Page = route(path("users", string("id")), memo(UserPage));
    const Routes = routeSwitch({ routes: [Page] });

    const { page } = await renderWithNavigator(<Page />, "/users/1");
    await expect.element(page.getByText("Memo 1")).toBeVisible();

    const other = await renderWithNavigator(<Routes />, "/users/2");
    await expect.element(other.page.getByText("Memo 2")).toBeVisible();
  });

  it("supports lazy components", async () => {
    const Page = route(
      path("users", string("id")),
      lazy(() =>
        Promise.resolve({
          default: ({ data }: { data: { id: string } }) => (
            <h1>Lazy {data.id}</h1>
          ),
        }),
      ),
    );

    const { page } = await renderWithNavigator(
      <Suspense fallback={<p>loading</p>}>
        <Page />
      </Suspense>,
      "/users/1",
    );
    await expect.element(page.getByText("Lazy 1")).toBeVisible();
  });

  it("supports class components", async () => {
    const UsersPath = path("users", string("id"));
    // unlike function components, class components must declare every prop
    class ClassPage extends Component<RouteProps<typeof UsersPath>> {
      override render() {
        return <h1>Class {this.props.data.id}</h1>;
      }
    }
    const Page = route(UsersPath, ClassPage);

    const { page } = await renderWithNavigator(<Page />, "/users/1");
    await expect.element(page.getByText("Class 1")).toBeVisible();
  });

  it("keeps the component in the component stack", async () => {
    let stack = "";
    class Boundary extends Component<
      { children: ReactNode },
      { failed: boolean }
    > {
      override state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      override componentDidCatch(_: unknown, info: ErrorInfo) {
        stack = info.componentStack ?? "";
      }
      override render() {
        return this.state.failed ? <p>failed</p> : this.props.children;
      }
    }
    const UserProfilePage = (): ReactNode => {
      throw new Error("expected by this test");
    };
    const Page = route(path("profile"), UserProfilePage);

    const { page } = await renderWithNavigator(
      <Boundary>
        <Page />
      </Boundary>,
      "/profile",
    );
    await expect.element(page.getByText("failed")).toBeVisible();
    expect(stack).toContain("UserProfilePage");
  });

  it("rejects components that take the data as individual props", () => {
    const UsersPath = path("users", string("id"));
    const SpreadPage = ({ id }: { id: string }) => <h1>{id}</h1>;

    // @ts-expect-error the data arrives in a single `data` prop
    route(UsersPath, SpreadPage);
    // @ts-expect-error the data arrives in a single `data` prop
    match(UsersPath, memo(SpreadPage));
  });
});

describe("route data identity", () => {
  const UserPath = path("users", string("id"));

  const setup = () => {
    const seen: unknown[] = [];
    let effects = 0;
    const UserPage = ({ data }: { data: { id: string } }) => {
      seen.push(data);
      useEffect(() => {
        effects += 1;
      }, [data]);
      return <h1>User {data.id}</h1>;
    };
    return { seen, effects: () => effects, UserPage };
  };

  // Shows the whole location, so a test can wait for each navigation to render
  // instead of letting React batch them together.
  const LocationProbe = () => {
    const { pathname, search, hash } = useLocation();
    return <p>At {pathname + search + hash}</p>;
  };

  it("keeps the same data across hash and query changes", async () => {
    const { seen, effects, UserPage } = setup();
    const Page = route(UserPath, UserPage);

    const { page, navigator } = await renderWithNavigator(
      <>
        <Page />
        <LocationProbe />
      </>,
      "/users/1",
    );
    await expect.element(page.getByText("User 1")).toBeVisible();
    for (const target of [
      "/users/1#comments",
      "/users/1?tab=posts",
      "/users/2",
    ]) {
      navigator.push(target);
      await expect.element(page.getByText(`At ${target}`)).toBeVisible();
    }
    await expect.element(page.getByText("User 2")).toBeVisible();

    const ones = seen.filter(d => (d as { id: string }).id === "1");
    expect(new Set(ones).size).toBe(1);
    expect(effects()).toBe(2);
  });

  it("keeps the same data across hash and query changes in a routeSwitch", async () => {
    const { seen, effects, UserPage } = setup();
    const Routes = routeSwitch({ routes: [route(UserPath, UserPage)] });

    const { page, navigator } = await renderWithNavigator(
      <>
        <Routes />
        <LocationProbe />
      </>,
      "/users/1",
    );
    await expect.element(page.getByText("User 1")).toBeVisible();
    for (const target of [
      "/users/1#comments",
      "/users/1?tab=posts",
      "/users/2",
    ]) {
      navigator.push(target);
      await expect.element(page.getByText(`At ${target}`)).toBeVisible();
    }
    await expect.element(page.getByText("User 2")).toBeVisible();

    const ones = seen.filter(d => (d as { id: string }).id === "1");
    expect(new Set(ones).size).toBe(1);
    expect(effects()).toBe(2);
  });

  it("keeps the same data when a routeSwitch's parent re-renders", async () => {
    const { seen, effects, UserPage } = setup();
    const Routes = routeSwitch({ routes: [route(UserPath, UserPage)] });
    const Parent = () => {
      const [count, setCount] = useState(0);
      return (
        <div>
          <button
            onClick={() => {
              setCount(count + 1);
            }}
          >
            Parent {count}
          </button>
          <Routes />
        </div>
      );
    };

    const { page } = await renderWithNavigator(<Parent />, "/users/1");
    await page.getByText("Parent 0").click();
    await page.getByText("Parent 1").click();
    await expect.element(page.getByText("Parent 2")).toBeVisible();

    expect(new Set(seen).size).toBe(1);
    expect(effects()).toBe(1);
  });
});

describe("route match details", () => {
  const FilesPath = path("files");
  const Files = match(FilesPath, ({ exact, rest }) => (
    <p>
      Files {String(exact)} [{rest.join("/")}]
    </p>
  ));
  const Exact = route(path("exact"), ({ exact, rest }) => (
    <p>
      Exact {String(exact)} [{rest.join("/")}]
    </p>
  ));

  it("gives match() components exact and rest", async () => {
    const { page, navigator } = await renderWithNavigator(
      <Files />,
      "/files/a/b",
    );
    await expect.element(page.getByText("Files false [a/b]")).toBeVisible();

    navigator.push("/files");
    await expect.element(page.getByText("Files true []")).toBeVisible();
  });

  it("gives match() components exact and rest in a routeSwitch", async () => {
    const Routes = routeSwitch({ routes: [Files] });
    const { page, navigator } = await renderWithNavigator(
      <Routes />,
      "/files/a/b",
    );
    await expect.element(page.getByText("Files false [a/b]")).toBeVisible();

    navigator.push("/files");
    await expect.element(page.getByText("Files true []")).toBeVisible();
  });

  it("gives route() components an exact match with no rest", async () => {
    const { page } = await renderWithNavigator(<Exact />, "/exact");
    await expect.element(page.getByText("Exact true []")).toBeVisible();
  });

  it("gives route() components an exact match with no rest in a routeSwitch", async () => {
    const Routes = routeSwitch({ routes: [Exact] });
    const { page } = await renderWithNavigator(<Routes />, "/exact/");
    await expect.element(page.getByText("Exact true []")).toBeVisible();
  });

  it("types a component's props from its path with RouteProps", async () => {
    const UserPath = path("users", string("id"));
    const UserPage = ({ data, rest }: RouteProps<typeof UserPath>) => (
      <p>
        User {data.id} [{rest.join("/")}]
      </p>
    );
    const User = match(UserPath, UserPage);

    const { page } = await renderWithNavigator(<User />, "/users/1/posts");
    await expect.element(page.getByText("User 1 [posts]")).toBeVisible();
  });
});
