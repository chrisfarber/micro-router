import { route } from "@micro-router/react";
import { Link } from "@micro-router/react";
import { HomePath, DocumentsPath, ViewDocumentPath } from "../paths";

export const HomePage = route(HomePath, () => {
  return (
    <div className="home-page">
      <h1>micro-router playground</h1>
      <p className="subtitle">A TypeScript-first routing library for React</p>

      <section className="feature-section">
        <h2>Features</h2>
        <ul className="feature-list">
          <li>
            <strong>Type-safe path definitions</strong> - Paths are built using
            a composable, combinator-based API. They hoist a human-readable
            representation of the path into the type system, along with a type
            representing the data that can be parsed. These paths can be used
            both to match and parse data out of a URL string _and_ to construct
            URL strings from parsed data. See `src/paths.ts` for examples.
          </li>
          <li>
            <strong>
              Defining route components and switching between them
            </strong>{" "}
            - The `route()` and `match()` functions are used to create route
            components. These can then be passed into `routeSwitch()` to build a
            component that will decide which route component to render. See
            `src/App.tsx` for an example.
          </li>
          <li>
            <strong>Smart route matching</strong> - Paths track the number of
            "dynamic" captures, and, by default, `routeSwitch()` will prefer
            routes. This allows <code>path("/documents/new")</code> to be
            preferentially selected over{" "}
            <code>path("/documents", string("messageId"))</code>, regardless of
            the order they are provided in.
          </li>
        </ul>
      </section>

      <section className="try-section">
        <h2>Try It Out</h2>
        <p>
          <Link to={DocumentsPath}>Browse all documents</Link> to see the
          routing in action, or jump directly to a specific document:
        </p>
        <div className="quick-links">
          <Link
            to={ViewDocumentPath}
            documentId="getting-started"
            className="quick-link"
          >
            Getting Started
          </Link>
          <Link
            to={ViewDocumentPath}
            documentId="api-reference"
            className="quick-link"
          >
            API Reference
          </Link>
        </div>
      </section>
    </div>
  );
});
