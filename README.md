# micro-router

A small, TypeScript-first routing library that supports React. Weighs in at ~4KB
gzipped for the core path library, or ~8KB with the React integration.

## Why?

Other JavaScript routers have you define your paths as strings, such as
`"/documents/:documentId"`. Generally speaking, this works.

But it's not without some downsides:

- It's error prone. You end up scattering strings and string constructors around
  your codebase.
- It's tedious. The code that would like to link to a path ends up needing to
  know how to construct its string representation and safely embed data into it.
- Routes must manually parse their data. If your path params include numbers,
  UUIDs, dates, or other non-string data, your component is left to handle
  parsing and validating on its own. This happens _after_ the routing decisions
  have been made, so there's no easy way to backtrack and try a different route
  if your data fails to validate.
- It's another mini language to learn. Simple string params are easy, but syntax
  gets more complicated once you want to do things like introduce regexps.

Additionally, popular contemporary routers have expanded their scope to include
concerns like batch data loading, form-based actions, and the sometimes-optional
imposition of an isomorphism between your application's routes and the
organization of its code on the filesystem. There are for sure times when these
features are worthwhile, but, they come at a cost of complexity, and,
especially, bundle size.

`micro-router` intentionally takes a different approach, and asks the questions:

- What if you could represent your application's paths as _values_ that
  encapsulate strong type information along with the functionality to
  bidirectionally convert between the path's string representation and the data
  that can be parsed from it?
- What if everything else was essentially react-router v5?
- What if we had no external dependencies? (excepting, optionally, react)

These path values could then be composed to establish the relationship between
paths and their nested paths, and, even more importantly, can be woven
throughout your application to ensure type-safety when rendering links to other
paths. All while isolating your components from the concerns of how to parse and
construct these URL strings.

## Installation

```bash
pnpm add @micro-router/core @micro-router/history @micro-router/react
```

or,

```bash
npm install @micro-router/core @micro-router/history @micro-router/react
```

The `@micro-router/core` package can be used standalone if you don't need React
integration.

## By Example

The `@micro-router/core` package has zero dependencies and contains a DSL for
defining paths. It's agnostic of any framework — or even whether it's running in
the browser or elsewhere:

```ts
import { path, string, number } from "@micro-router/core";

export const ServicesPath = path("services");
export const ServicePath = path(ServicesPath, string("serviceId"));
export const ServiceVersionPath = path(
  ServicePath,
  "version",
  number("version"),
);

ServicePath.match("/services/abcd");
// => { ok: true, data: { serviceId: "abcd" }, ... }

ServiceVersionPath.make({ serviceId: "my-service", version: 101 });
// => "/services/my-service/version/101"

ServiceVersionPath.make({ version: 101 });
// => Type error! `serviceId` is required
```

In addition to `string` and `number`, the core package provides `textEnum` for
matching against a fixed set of options, `matchRegexp` for custom patterns, and
combinators like `segment` and `concat` for more advanced use cases.

One nice thing about routing with strings is that it's not ambiguous; when
you're reading code that links to a route, you'll see (at least partially)
reified path strings.

Therefore, our DSL also preserves this context by rolling a human-readable
representation into the type system itself. Whenever you hover over a Path, you
will see this representation along with the type of its data.

```ts
// hover your mouse cursor over any reference to this:
ServiceVersionPath;
// and TypeScript will show you:
const ServiceVersionPath: Path<
  "/services/:serviceId/version/:version[number]",
  {
    serviceId: string;
    version: number;
  }
>;
// (note that this is not some obscure type, consisting of things like
// `Record<"serviceId", string> & Record<"version", number>`, and that the path
// is a self-contained string. This makes quite a difference to readability.)
```

The core module also contains a small DSL for building routers that can be used
for either computing values and/or side-effects. It's not meant to be a full
client-side router solution, but, rather to aid in the implementation of such a
solution. It's also very convenient for those emergent needs when you need to
interpret or select between paths in other situations, such as for generating
modulepreloads in a microfrontend environment.

```ts
import { router, path, textEnum } from "@micro-router/core";

const ConfigFrontend = path(
  "config",
  textEnum({ key: "ver", options: ["v1", "v2"] }),
);
const AccountFrontend = path("account");
const BillingFrontend = path("account/billing");

type Application = "config" | "new-config" | "account" | "billing";
const knownApplications = router<Application>({ partialMatch: true })
  .on(ConfigFrontend, data => (data.ver === "v2" ? "new-config" : "config"))
  .on(AccountFrontend, () => "account")
  .on(BillingFrontend, () => "billing");

knownApplications.dispatch("/account/billing");
// => "billing"

knownApplications.dispatch("/account");
// => "account"

knownApplications.dispatch("/config/v1/anywhere");
// => "config"

knownApplications.dispatch("/somewhere/else");
// => null
```

## Using from React

Browser- and React-specific functionality is implemented in
`@micro-router/history` and `@micro-router/react`. Aside from the `react`
package's peer dependency on React, there are no external dependencies. To set
up, make sure that you have a `<NavigatorProvider>` alongside your other
application-level contexts.

### Linking

Rendering links to a path is done with full type-safety:

```tsx
import { Link } from "@micro-router/react";

/* ServicesPath has no data, so you aren't expected or allowed to provide any */
<Link to={ServicesPath}>View Services</Link>;

/* ServicePath needs a serviceId, so you can provide it like so: */
<Link to={ServicePath} serviceId="123">
  Service 123
</Link>;
/* Or, you can provide a single data prop: */
<Link to={ServicePath} data={{ serviceId: "345" }}>
  Service 345
</Link>;
```

Because we're extracting type information out of the path itself, it's not
possible to misspell or forget any of a path's data. And if the path you're
linking to has data that conflicts with the regular props of `<Link>`, you'll be
required to provide them via the `data` prop.

### Routing

As for actually defining routes, there are three primary functions: `match()`,
`route()`, and `routeSwitch()`.

Both `match()` and `route()` do almost exactly the same thing: they define a
React component that will render its children only when the current URL matches
the provided path. The only difference is that `route()` will only render if the
provided path completely matches the current URL (ignoring search params or
anchors).

```tsx
import { match, route, routeSwitch } from "@micro-router/react";
import { ServicePath, ServiceVersionPath } from "./paths";

const ServiceRoute = route(ServicePath, ({ serviceId }) => {
  return <h1>Viewing service {serviceId}</h1>;
});

const ServiceVersionRoute = route(
  ServiceVersionPath,
  ({ serviceId, version }) => {
    return (
      <h1>
        Viewing version {version} for service {serviceId}
      </h1>
    );
  },
);
```

You can render these components anywhere you'd like, and they will only render
their content when their paths match.

When building a real application, it's common to have multiple paths that could
match a particular URL. Consider:

```tsx
const ServicesPath = path("services");
const ServiceMapPath = path(ServicesPath, "map");
const ServicePath = path(ServicesPath, string("serviceId"));

const ServiceRoute = route(ServicePath, () => <ServicePage />);
const ServiceMapRoute = route(ServiceMapPath, () => <ServiceMapPage />);
```

When the current URL is `"/services/map"`, both `ServiceMapPath` and
`ServicePath` will match. In this case, we not only want to be sure that only
_one_ page has its content rendered, but also, we'd prefer for the _map_ path to
match.

We can use `routeSwitch()` to handle both of these. It will only render a single
match, and, when there are multiple matches, it will compare them by
considering:

- Which path consumes the most of the current URL? (This is only relevant for
  `match()` components, since they allow partial matches).
- Which path has the _fewest_ dynamic captures?

```tsx
const AppRoutes = routeSwitch({
  routes: [
    ServiceRoute,
    ServiceMapRoute,
    // ... other routes
  ],
  fallback: <PageNotFound />,
});

const App = () => {
  return (
    <NavigatorProvider>
      <AppRoutes />
    </NavigatorProvider>
  );
};
```

Even though `ServiceRoute` and `ServiceMapRoute` would both match on
`"/services/map"`, the latter will win because it has fewer dynamic captures.
Note that the order they are specified in the route switch does not matter.

As a final note, it's worth pointing out that the components returned by
`route()` and `match()` will include the path info in the type system. Should
you hover your cursor over `ServiceRoute`, you would see:

```ts
const ServiceRoute: RouteComponent<
  Path<"/services/:serviceId", { serviceId: string }>
>;
```

### Hooks

For programmatic navigation and access to the current location, the react
package provides several hooks:

- `useNavigator()` — returns the navigator, which can be used to call
  `push(path, data)` or `replace(path, data)` for programmatic navigation.
- `useLocation()` — subscribes to location changes and returns the current
  `{ pathname, search, hash }`.
- `usePathMatch(path)` — returns match data if the given path matches the
  current location

### Search Params and Hash

Routes match against the pathname only. Query strings and hash fragments are
accessible via `useLocation()`, and can be passed to `navigator.push()` and
`navigator.replace()` as part of the path string.

## Status

This project is experimental. The core concepts are well-tested and the code is
solid, but it hasn't yet been used in production. The API, particularly the
React package, may see breaking changes, although none are currently planned.

The idea behind micro-router has been kicking around in my mind for a couple of
years. I finally published it because I'm genuinely curious whether others find
this approach to routing compelling, misguided, or somewhere in between.
Feedback, issues, and pull requests are welcome.

## Further reading

Full API documentation is available at
[PLACEHOLDER_DOCS_URL](PLACEHOLDER_DOCS_URL).

This repository also has an [example app](./packages/playground) that is worth
looking at.
