import { number, path, string } from "@micro-router/core";
import { Profiler, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Link } from "./link";
import { useLocation } from "./hooks";
import { renderWithNavigator } from "./test-helpers";
import { Navigator } from "./navigator";
import { NavigatorProvider } from "./provider";
import { BrowserHistory } from "@micro-router/history";
import { render } from "vitest-browser-react";
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

    it("renders an anchor with href built from path and data", async () => {
      const { page } = await renderWithNavigator(
        <Link to={UserPath} data={{ userId: 42 }}>
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
        <Link to={PostPath} data={{ userId: 5, slug: "hello-world" }}>
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
        <Link
          to={ArticlePath}
          data={{ category: "tech", slug: "new-features" }}
        >
          Article
        </Link>,
      );

      const link = page.getByRole("link", { name: "Article" });
      await expect
        .element(link)
        .toHaveAttribute("href", "/articles/tech/new-features");
    });

    it("accepts data whose keys are also anchor attributes", async () => {
      const ItemPath = path("items", string("id"), string("title"));

      const { page } = await renderWithNavigator(
        <Link to={ItemPath} data={{ id: "7", title: "notes" }} id="link-id">
          Item
        </Link>,
      );

      const link = page.getByRole("link", { name: "Item" });
      await expect.element(link).toHaveAttribute("href", "/items/7/notes");
      await expect.element(link).toHaveAttribute("id", "link-id");
    });

    it("handles numeric zero as a parameter", async () => {
      const { page } = await renderWithNavigator(
        <Link to={UserPath} data={{ userId: 0 }}>
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

    it("forwards any anchor attribute", async () => {
      const { page } = await renderWithNavigator(
        <Link
          to="/test"
          id="link-id"
          title="A title"
          target="_self"
          rel="nofollow"
          style={{ color: "rgb(255, 0, 0)" }}
        >
          Any Attribute
        </Link>,
      );
      const link = page.getByRole("link", { name: "Any Attribute" });
      await expect.element(link).toHaveAttribute("id", "link-id");
      await expect.element(link).toHaveAttribute("title", "A title");
      await expect.element(link).toHaveAttribute("target", "_self");
      await expect.element(link).toHaveAttribute("rel", "nofollow");
      await expect.element(link).toHaveStyle({ color: "rgb(255, 0, 0)" });
    });

    it("gives a callback ref the anchor", async () => {
      let anchor: HTMLAnchorElement | null = null;
      await renderWithNavigator(
        <Link
          to="/test"
          ref={el => {
            anchor = el;
          }}
        >
          Ref Link
        </Link>,
      );
      expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    });

    it("types path data as the data prop only", () => {
      const UserPath = path("users", number("userId"));
      // oxlint-disable-next-line no-unused-expressions
      [
        // @ts-expect-error path data is no longer given as inline props
        <Link key="inline" to={UserPath} userId={42} />,
        // @ts-expect-error a path with data requires the data prop
        <Link key="missing" to={UserPath} />,
        // @ts-expect-error data must match the path
        <Link key="wrong" to={UserPath} data={{ userId: "42" }} />,
        <Link key="ok" to={UserPath} data={{ userId: 42 }} />,
        <Link key="none" to="/no-data" />,
      ];
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

    it("clicking a link to the current page does not create duplicate history entries", async () => {
      const { page, navigator } = await renderWithNavigator(
        <>
          <Link to="/page-one">Page One</Link>
          <Link to="/page-two">Page Two</Link>
        </>,
        "/page-one",
      );

      // Navigate to page-two first to establish a history entry
      await userEvent.click(page.getByRole("link", { name: "Page Two" }));
      expect(navigator.location.pathname).toEqual("/page-two");

      // Click the same link multiple times - should not add duplicate entries
      await userEvent.click(page.getByRole("link", { name: "Page Two" }));
      await userEvent.click(page.getByRole("link", { name: "Page Two" }));
      await userEvent.click(page.getByRole("link", { name: "Page Two" }));

      // Should still be on page-two
      expect(navigator.location.pathname).toEqual("/page-two");

      // Navigate back once - should go directly to page-one, not to a duplicate page-two
      navigator.go(-1);
      await expect.poll(() => navigator.location.pathname).toEqual("/page-one");
    });

    it("replaces the current entry with the replace prop", async () => {
      const { page, navigator } = await renderWithNavigator(
        <Link to="/replaced" replace>
          Replace
        </Link>,
        "/start",
      );

      await userEvent.click(page.getByRole("link", { name: "Replace" }));
      expect(navigator.location.pathname).toEqual("/replaced");
      navigator.go(-1);
      expect(navigator.location.pathname).toEqual("/replaced");
    });

    it("calls onClick before navigating", async () => {
      const calls: string[] = [];
      const { page, navigator } = await renderWithNavigator(
        <Link
          to="/next"
          onClick={() => {
            calls.push(navigator.location.pathname);
          }}
        >
          Next
        </Link>,
        "/start",
      );

      await userEvent.click(page.getByRole("link", { name: "Next" }));
      expect(calls).toEqual(["/start"]);
      expect(navigator.location.pathname).toEqual("/next");
    });

    it("does not navigate when onClick prevents the default", async () => {
      const { page, navigator } = await renderWithNavigator(
        <Link
          to="/next"
          onClick={e => {
            e.preventDefault();
          }}
        >
          Next
        </Link>,
        "/start",
      );

      await userEvent.click(page.getByRole("link", { name: "Next" }));
      expect(navigator.location.pathname).toEqual("/start");
    });
  });

  describe("aria-current", () => {
    const UserPath = path("users", number("userId"));

    const current = (
      page: Awaited<ReturnType<typeof renderWithNavigator>>["page"],
      name: string,
    ) =>
      page.getByRole("link", { name }).element().getAttribute("aria-current");

    it("marks a link to the current page", async () => {
      const { page, navigator } = await renderWithNavigator(
        <>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </>,
        "/about",
      );
      expect(current(page, "About")).toBe("page");
      expect(current(page, "Contact")).toBeNull();

      navigator.push("/contact");
      await expect
        .element(page.getByRole("link", { name: "Contact" }))
        .toHaveAttribute("aria-current", "page");
      expect(current(page, "About")).toBeNull();
    });

    it("compares a path's data", async () => {
      const { page } = await renderWithNavigator(
        <>
          <Link to={UserPath} data={{ userId: 1 }}>
            One
          </Link>
          <Link to={UserPath} data={{ userId: 2 }}>
            Two
          </Link>
        </>,
        "/users/1",
      );
      expect(current(page, "One")).toBe("page");
      expect(current(page, "Two")).toBeNull();
    });

    it("ignores case, trailing slashes, the query and the hash", async () => {
      const { page } = await renderWithNavigator(
        <Link to={UserPath} data={{ userId: 1 }}>
          One
        </Link>,
        "/USERS/1/?tab=posts#top",
      );
      expect(current(page, "One")).toBe("page");
    });

    it("does not mark a link to a parent of the current page", async () => {
      const { page } = await renderWithNavigator(
        <>
          <Link to={UserPath} data={{ userId: 1 }}>
            One
          </Link>
          <Link to="/users">Users</Link>
        </>,
        "/users/1/posts",
      );
      expect(current(page, "One")).toBeNull();
      expect(current(page, "Users")).toBeNull();
    });

    it("never marks a link to another origin", async () => {
      const { page } = await renderWithNavigator(
        <Link to="https://example.com/about">Elsewhere</Link>,
        "/about",
      );
      expect(current(page, "Elsewhere")).toBeNull();
    });

    it("uses aria-current when it's given", async () => {
      const { page } = await renderWithNavigator(
        <>
          <Link to="/docs" aria-current="true">
            Section
          </Link>
          <Link to="/docs/intro" aria-current={false}>
            Opted out
          </Link>
        </>,
        "/docs/intro",
      );
      expect(current(page, "Section")).toBe("true");
      expect(current(page, "Opted out")).toBe("false");
    });

    it("only re-renders when whether it's current changes", async () => {
      let renders = 0;
      const { page, navigator } = await renderWithNavigator(
        <Profiler
          id="link"
          onRender={() => {
            renders += 1;
          }}
        >
          <Link to="/target">Target</Link>
        </Profiler>,
        "/start",
      );
      const afterMount = renders;

      for (const target of ["/a", "/b", "/c"]) {
        navigator.push(target);
        await expect.poll(() => navigator.location.pathname).toBe(target);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(renders).toBe(afterMount);

      navigator.push("/target");
      await expect
        .element(page.getByRole("link", { name: "Target" }))
        .toHaveAttribute("aria-current", "page");
      expect(renders).toBe(afterMount + 1);
    });
  });

  describe("clicks the browser should handle", () => {
    // Records whether Link took over a click, then cancels the click so that
    // the browser doesn't actually navigate away from the test page.
    let intercepted: boolean[] = [];
    const listener = (e: MouseEvent) => {
      intercepted.push(e.defaultPrevented);
      e.preventDefault();
    };
    beforeEach(() => {
      intercepted = [];
      window.addEventListener("click", listener);
    });
    afterEach(() => {
      window.removeEventListener("click", listener);
    });

    const click = (anchor: HTMLAnchorElement, init: MouseEventInit = {}) => {
      anchor.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          button: 0,
          ...init,
        }),
      );
    };

    const renderLink = async (link: ReactNode) => {
      const { page, navigator } = await renderWithNavigator(link, "/start");
      const anchor = page.getByRole("link").element() as HTMLAnchorElement;
      return { anchor, navigator };
    };

    it.each([
      ["another origin", "https://example.com/"],
      ["a protocol-relative url", "//cdn.example.com/file"],
      ["a mailto link", "mailto:someone@example.com"],
    ])("leaves links to %s alone", async (_, to) => {
      const { anchor, navigator } = await renderLink(<Link to={to}>Out</Link>);

      click(anchor);
      expect(intercepted).toEqual([false]);
      expect(navigator.location.pathname).toEqual("/start");
    });

    it("leaves links that open in another target alone", async () => {
      const { anchor, navigator } = await renderLink(
        <Link to="/next" target="_blank">
          New tab
        </Link>,
      );

      click(anchor);
      expect(intercepted).toEqual([false]);
      expect(navigator.location.pathname).toEqual("/start");
    });

    it("leaves download links alone", async () => {
      const { anchor, navigator } = await renderLink(
        <Link to="/file.txt" download>
          Download
        </Link>,
      );

      click(anchor);
      expect(intercepted).toEqual([false]);
      expect(navigator.location.pathname).toEqual("/start");
    });

    it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"])(
      "leaves clicks with %s alone",
      async modifier => {
        const { anchor, navigator } = await renderLink(
          <Link to="/next">Next</Link>,
        );

        click(anchor, { [modifier]: true });
        expect(intercepted).toEqual([false]);
        expect(navigator.location.pathname).toEqual("/start");
      },
    );

    it("handles links to a hash of the current page", async () => {
      const before = window.location.href;
      const { anchor, navigator } = await renderLink(
        <Link to="#section">Section</Link>,
      );

      click(anchor);
      expect(intercepted).toEqual([true]);
      expect(navigator.location.pathname + navigator.location.hash).toEqual(
        "/start#section",
      );
      expect(window.location.href).toEqual(before);
    });

    it("still handles links to a hash of another page", async () => {
      const { anchor, navigator } = await renderLink(
        <Link to="/next#section">Next</Link>,
      );

      click(anchor);
      expect(intercepted).toEqual([true]);
      expect(navigator.location.pathname).toEqual("/next");
      expect(navigator.location.hash).toEqual("#section");
    });

    it("still handles absolute urls on the same origin", async () => {
      const { anchor, navigator } = await renderLink(
        <Link to={`${window.location.origin}/next`}>Same origin</Link>,
      );

      click(anchor);
      expect(intercepted).toEqual([true]);
      expect(navigator.location.pathname).toEqual("/next");
    });
  });

  describe("with the browser's history", () => {
    const original = window.location.href;
    afterEach(() => {
      window.history.replaceState(null, "", original);
      window.scrollTo(0, 0);
    });

    const renderPage = async () => {
      const navigator = new Navigator(new BrowserHistory());
      const page = await render(
        <NavigatorProvider navigator={navigator}>
          <Link to="#section">Section</Link>
          <div id="section" style={{ marginTop: "5000px" }}>
            Target
          </div>
        </NavigatorProvider>,
      );
      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.hash);
      });
      return { page, navigator, seen };
    };
    const targeted = () => document.querySelector(":target")?.id;

    it("navigates to a hash natively, and notifies once", async () => {
      const { page, navigator, seen } = await renderPage();
      const entries = window.history.length;
      let hashchanges = 0;
      const onHashchange = () => {
        hashchanges += 1;
      };
      window.addEventListener("hashchange", onHashchange);

      try {
        await userEvent.click(page.getByRole("link", { name: "Section" }));
        await expect.poll(() => hashchanges).toBe(1);
        expect(targeted()).toEqual("section");
        expect(window.scrollY).toBeGreaterThan(0);
        expect(window.history.length).toBe(entries + 1);
        expect(navigator.location.hash).toEqual("#section");
        expect(seen).toEqual(["#section"]);
      } finally {
        window.removeEventListener("hashchange", onHashchange);
      }
    });

    it("scrolls to the hash again without adding an entry", async () => {
      const { page, seen } = await renderPage();
      const link = page.getByRole("link", { name: "Section" });

      await userEvent.click(link);
      await expect.poll(() => window.scrollY).toBeGreaterThan(0);
      const entries = window.history.length;

      window.scrollTo(0, 0);
      await userEvent.click(link);
      await expect.poll(() => window.scrollY).toBeGreaterThan(0);
      expect(window.history.length).toBe(entries);
      expect(seen).toEqual(["#section"]);
    });

    // These call the history directly, not the navigator, so that the page
    // can only update if the browser reports the navigation through popstate.
    const ShowHash = () => <p>Hash: {useLocation().hash}</p>;
    const renderWithHash = async () => {
      const navigator = new Navigator(new BrowserHistory());
      const page = await render(
        <NavigatorProvider navigator={navigator}>
          <ShowHash />
          <div id="section" style={{ marginTop: "5000px" }}>
            Target
          </div>
        </NavigatorProvider>,
      );
      return { page, history: new BrowserHistory() };
    };

    it("updates the page after replacing with a hash", async () => {
      const { page, history } = await renderWithHash();
      const entries = window.history.length;

      history.replace("#section");
      await expect.element(page.getByText("Hash: #section")).toBeVisible();
      expect(targeted()).toEqual("section");
      expect(window.scrollY).toBeGreaterThan(0);
      expect(window.history.length).toBe(entries);
    });

    it("updates the page after pushing a hash", async () => {
      const { page, history } = await renderWithHash();
      const entries = window.history.length;

      history.push("#section");
      await expect.element(page.getByText("Hash: #section")).toBeVisible();
      expect(targeted()).toEqual("section");
      expect(window.history.length).toBe(entries + 1);
    });

    it("replaces with a hash from a replace link", async () => {
      const navigator = new Navigator(new BrowserHistory());
      const page = await render(
        <NavigatorProvider navigator={navigator}>
          <Link to="#section" replace>
            Section
          </Link>
          <div id="section" style={{ marginTop: "5000px" }}>
            Target
          </div>
        </NavigatorProvider>,
      );
      const seen: string[] = [];
      navigator.listen(l => {
        seen.push(l.hash);
      });
      const entries = window.history.length;

      await userEvent.click(page.getByRole("link", { name: "Section" }));
      await expect.poll(targeted).toEqual("section");
      expect(window.history.length).toBe(entries);
      expect(navigator.location.hash).toEqual("#section");
      expect(seen).toEqual(["#section"]);
    });

    it("navigates natively when pushed programmatically", async () => {
      const { navigator } = await renderPage();

      navigator.push("#section");
      await expect.poll(targeted).toEqual("section");
      expect(navigator.location.hash).toEqual("#section");
    });
  });
});
