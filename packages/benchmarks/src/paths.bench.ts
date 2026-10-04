/**
 * Benchmarks micro-router's path combinators on their own. No other router has
 * an equivalent, so unlike the other benchmarks this one has no contenders.
 */
import assert from "node:assert/strict";
import { bench, do_not_optimize, group, run } from "mitata";
import { path, string } from "@micro-router/core";
import type { Path } from "@micro-router/core";
import { cases, routeNames } from "./routes.ts";

/**
 * The app's routes as an app would write them, where most paths are built from
 * other named paths.
 */
const defineRoutes = () => {
  const Root = path();
  const Login = path("login");
  const Dashboard = path("dashboard");

  const Settings = path("settings");
  const SettingsProfile = path(Settings, "profile");
  const SettingsBilling = path(Settings, "billing");

  const Users = path("users");
  const UsersNew = path(Users, "new");
  const User = path(Users, string("userId"));
  const UserFollowers = path(User, "followers");
  const UserPosts = path(User, "posts");
  const UserPost = path(UserPosts, string("postId"));
  const UserPostEdit = path(UserPost, "edit");

  const Orgs = path("orgs");
  const Org = path(Orgs, string("orgId"));
  const OrgMembers = path(Org, "members");
  const OrgMember = path(OrgMembers, string("memberId"));
  const OrgProjects = path(Org, "projects");
  const OrgProject = path(OrgProjects, string("projectId"));
  const OrgProjectSettings = path(OrgProject, "settings");
  const OrgProjectIssues = path(OrgProject, "issues");
  const OrgProjectIssue = path(OrgProjectIssues, string("issueId"));
  const OrgProjectIssueComments = path(OrgProjectIssue, "comments");

  return {
    Root,
    Login,
    Dashboard,
    Settings,
    SettingsProfile,
    SettingsBilling,
    Users,
    UsersNew,
    User,
    UserFollowers,
    UserPosts,
    UserPost,
    UserPostEdit,
    Orgs,
    Org,
    OrgMembers,
    OrgMember,
    OrgProjects,
    OrgProject,
    OrgProjectSettings,
    OrgProjectIssues,
    OrgProjectIssue,
    OrgProjectIssueComments,
  };
};

const routes = defineRoutes();

// Flatten up front so the measured loops do nothing but call into the library.
const entries: { path: Path; url: string; data: unknown }[] = routeNames.map(
  name => ({
    path: routes[name],
    ...cases[name],
  }),
);

for (const name of routeNames) {
  const { pattern, url, data } = cases[name];
  const p = routes[name];
  assert.equal(p.path, pattern, name);
  assert.deepEqual(p.match(url), {
    ok: true,
    remaining: "",
    data,
    captures: p.captures,
  });
  // Each path's data type is specific to it; the assertions above check that
  // the data belongs to this path.
  assert.equal(p.make(data as never), url, name);
}

const count = String(routeNames.length);

group(`construct the suite of ${count} paths`, () => {
  bench("defineRoutes", () => {
    do_not_optimize(defineRoutes());
  });
});

group(`parse a url for each of ${count} paths`, () => {
  bench("match", () => {
    for (const { path, url } of entries) {
      do_not_optimize(path.match(url));
    }
  });
});

// Every url against every path: the work a linear-scan router does on each
// dispatch, minus the router itself. Most pairs fail or only partially match,
// so this is dominated by the cost of failed matches.
group(`match each of ${count} urls against every path`, () => {
  bench("match (cross product)", () => {
    for (const { url } of entries) {
      for (const { path } of entries) {
        do_not_optimize(path.match(url));
      }
    }
  });
});

group(`generate a url for each of ${count} paths`, () => {
  bench("make", () => {
    for (const { path, data } of entries) {
      do_not_optimize(path.make(data));
    }
  });
});

await run();
