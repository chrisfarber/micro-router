/**
 * The route suites every contender is benchmarked against. They are plain
 * data with no imports, so that loading them doesn't warm up any router.
 *
 * Patterns use the syntax most routers share: `:name` captures a segment, and
 * a trailing `*` matches anything. Each contender translates them into its own
 * route definitions.
 */

/** A route to register, and what dispatching to it should report. */
export type RouteSpec = {
  method: string;
  /** What a successful dispatch reports. */
  name: string;
  pattern: string;
};

/**
 * A url that should dispatch to the named route, with the params parsed from
 * it.
 */
export type Request = {
  method: string;
  url: string;
  name: string;
  data: Record<string, string> | null;
};

type AppCase = {
  pattern: string;
  url: string;
  data: Record<string, string> | null;
};

/**
 * A realistic application's worth of routes: one concrete url (and the data
 * it corresponds to) for every route. Urls are written out by hand rather than
 * generated, so that no contender is involved in producing its own inputs.
 */
export const cases = {
  Root: { pattern: "/", url: "/", data: null },
  Login: { pattern: "/login", url: "/login", data: null },
  Dashboard: { pattern: "/dashboard", url: "/dashboard", data: null },
  Settings: { pattern: "/settings", url: "/settings", data: null },
  SettingsProfile: {
    pattern: "/settings/profile",
    url: "/settings/profile",
    data: null,
  },
  SettingsBilling: {
    pattern: "/settings/billing",
    url: "/settings/billing",
    data: null,
  },
  Users: { pattern: "/users", url: "/users", data: null },
  UsersNew: { pattern: "/users/new", url: "/users/new", data: null },
  User: {
    pattern: "/users/:userId",
    url: "/users/u_8f3a",
    data: { userId: "u_8f3a" },
  },
  UserFollowers: {
    pattern: "/users/:userId/followers",
    url: "/users/u_8f3a/followers",
    data: { userId: "u_8f3a" },
  },
  UserPosts: {
    pattern: "/users/:userId/posts",
    url: "/users/u_8f3a/posts",
    data: { userId: "u_8f3a" },
  },
  UserPost: {
    pattern: "/users/:userId/posts/:postId",
    url: "/users/u_8f3a/posts/hello-world",
    data: { userId: "u_8f3a", postId: "hello-world" },
  },
  UserPostEdit: {
    pattern: "/users/:userId/posts/:postId/edit",
    url: "/users/u_8f3a/posts/hello-world/edit",
    data: { userId: "u_8f3a", postId: "hello-world" },
  },
  Orgs: { pattern: "/orgs", url: "/orgs", data: null },
  Org: {
    pattern: "/orgs/:orgId",
    url: "/orgs/acme",
    data: { orgId: "acme" },
  },
  OrgMembers: {
    pattern: "/orgs/:orgId/members",
    url: "/orgs/acme/members",
    data: { orgId: "acme" },
  },
  OrgMember: {
    pattern: "/orgs/:orgId/members/:memberId",
    url: "/orgs/acme/members/m_42",
    data: { orgId: "acme", memberId: "m_42" },
  },
  OrgProjects: {
    pattern: "/orgs/:orgId/projects",
    url: "/orgs/acme/projects",
    data: { orgId: "acme" },
  },
  OrgProject: {
    pattern: "/orgs/:orgId/projects/:projectId",
    url: "/orgs/acme/projects/rocket",
    data: { orgId: "acme", projectId: "rocket" },
  },
  OrgProjectSettings: {
    pattern: "/orgs/:orgId/projects/:projectId/settings",
    url: "/orgs/acme/projects/rocket/settings",
    data: { orgId: "acme", projectId: "rocket" },
  },
  OrgProjectIssues: {
    pattern: "/orgs/:orgId/projects/:projectId/issues",
    url: "/orgs/acme/projects/rocket/issues",
    data: { orgId: "acme", projectId: "rocket" },
  },
  OrgProjectIssue: {
    pattern: "/orgs/:orgId/projects/:projectId/issues/:issueId",
    url: "/orgs/acme/projects/rocket/issues/1337",
    data: { orgId: "acme", projectId: "rocket", issueId: "1337" },
  },
  OrgProjectIssueComments: {
    pattern: "/orgs/:orgId/projects/:projectId/issues/:issueId/comments",
    url: "/orgs/acme/projects/rocket/issues/1337/comments",
    data: { orgId: "acme", projectId: "rocket", issueId: "1337" },
  },
} as const satisfies Record<string, AppCase>;

export type RouteName = keyof typeof cases;

export const routeNames = Object.keys(cases) as RouteName[];

/**
 * URLs that no route in the app should match: unknown top-level paths,
 * near-misses on real prefixes, and over-long paths.
 */
export const missUrls = [
  "/about",
  "/settings/notifications",
  "/users/u_8f3a/likes",
  "/orgs/acme/projects/rocket/wiki",
  "/orgs/acme/projects/rocket/issues/1337/comments/9",
  "/dashboard/widgets",
];

/** A route in the app, along with a url it should match. */
export type AppEntry = RouteSpec & Request;

/**
 * The app's routes, plus `scale` extra units of routes. Each unit adds:
 *
 * - a new top-level section: `/section{i}`
 * - a resource family nested under an existing project:
 *   `/orgs/:orgId/projects/:projectId/resource{i}`, `…/:itemId`, `…/:itemId/edit`
 *
 * Growth mostly happens deep inside shared prefixes, as it does in real apps.
 * A linear-scan router pays for every added route on every dispatch, while a
 * prefix-aware router should be able to skip most of them.
 */
export const appRoutes = (scale = 0): AppEntry[] => {
  const entries: AppEntry[] = routeNames.map(name => ({
    method: "GET",
    name,
    ...cases[name],
  }));

  const project = { orgId: "acme", projectId: "rocket" };
  const projectPattern = cases.OrgProject.pattern;
  const projectUrl = cases.OrgProject.url;
  for (let i = 0; i < scale; i++) {
    const listPattern = `${projectPattern}/resource${String(i)}`;
    const listUrl = `${projectUrl}/resource${String(i)}`;
    const itemId = `item-${String(i)}`;
    const itemData = { ...project, itemId };
    entries.push(
      {
        method: "GET",
        name: `Section${String(i)}`,
        pattern: `/section${String(i)}`,
        url: `/section${String(i)}`,
        data: null,
      },
      {
        method: "GET",
        name: `Resource${String(i)}`,
        pattern: listPattern,
        url: listUrl,
        data: project,
      },
      {
        method: "GET",
        name: `Resource${String(i)}Item`,
        pattern: `${listPattern}/:itemId`,
        url: `${listUrl}/${itemId}`,
        data: itemData,
      },
      {
        method: "GET",
        name: `Resource${String(i)}ItemEdit`,
        pattern: `${listPattern}/:itemId/edit`,
        url: `${listUrl}/${itemId}/edit`,
        data: itemData,
      },
    );
  }
  return entries;
};

/** URLs that nothing in `appRoutes(scale)` should match. */
export const appMissUrls = (scale = 0): string[] => [
  ...missUrls,
  `/section${String(scale)}`,
  `/orgs/acme/projects/rocket/resource${String(scale)}`,
  "/orgs/acme/projects/rocket/resource0/item-0/delete",
];

/**
 * `count` urls spread evenly across `entries`, so that dispatch benchmarks do
 * the same amount of work regardless of how many routes there are.
 */
export const sampleUrls = (entries: AppEntry[], count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => entries[Math.floor((i * entries.length) / count)]?.url ?? "/",
  );

/**
 * The routes from Hono's router benchmark
 * (https://hono.dev/docs/concepts/benchmarks). Each route's name is its
 * pattern.
 */
export const honoRoutes: RouteSpec[] = [
  ["GET", "/user"],
  ["GET", "/user/comments"],
  ["GET", "/user/avatar"],
  ["GET", "/user/lookup/username/:username"],
  ["GET", "/user/lookup/email/:address"],
  ["GET", "/event/:id"],
  ["GET", "/event/:id/comments"],
  ["POST", "/event/:id/comment"],
  ["GET", "/map/:location/events"],
  ["GET", "/status"],
  ["GET", "/very/deeply/nested/route/hello/there"],
  ["GET", "/static/*"],
].map(([method = "", pattern = ""]) => ({ method, name: pattern, pattern }));

/**
 * The requests from Hono's router benchmark, along with the route each should
 * land on.
 */
export const honoRequests: (Request & { label: string })[] = [
  {
    label: "short static",
    method: "GET",
    url: "/user",
    name: "/user",
    data: null,
  },
  {
    label: "static with same radix",
    method: "GET",
    url: "/user/comments",
    name: "/user/comments",
    data: null,
  },
  {
    label: "dynamic route",
    method: "GET",
    url: "/user/lookup/username/hey",
    name: "/user/lookup/username/:username",
    data: { username: "hey" },
  },
  {
    label: "mixed static dynamic",
    method: "GET",
    url: "/event/abcd1234/comments",
    name: "/event/:id/comments",
    data: { id: "abcd1234" },
  },
  {
    label: "post",
    method: "POST",
    url: "/event/abcd1234/comment",
    name: "/event/:id/comment",
    data: { id: "abcd1234" },
  },
  {
    label: "long static",
    method: "GET",
    url: "/very/deeply/nested/route/hello/there",
    name: "/very/deeply/nested/route/hello/there",
    data: null,
  },
  {
    label: "wildcard",
    method: "GET",
    url: "/static/index.html",
    name: "/static/*",
    data: null,
  },
];
