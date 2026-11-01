# micro-router

**micro-router** is a router that leverage's TypeScript's type system to provide
safe routing.

Its public npm packages are:

- `@micro-router/core` - Core library for defining paths and building routers
  (no dependencies)
- `@micro-router/history` - Browser history API abstraction (depends on core)
- `@micro-router/react` - React router implementation (depends on core +
  history)

There is also a react-based playground app, `@micro-router/playground`. This is
where we have a collection of playwright tests for exercising the router in a
real browser.

## Tools

This project uses pnpm with workspaces and turbo. Since there are
interdependencies, if you are ever not sure about the build state of a
dependency, be sure to use `turbo` instead of just `pnpm` to run a task.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between
installed versions and may differ from your training data. Resolve the `turbo`
package from this file's directory or relevant workspace; in monorepos, it may
not be visible from the repository root. For example, run
`node -p "require.resolve('turbo/package.json')"` from a workspace that depends
on `turbo`.

Read `docs/README.md` inside that installed package first, then read the
relevant pages from its `docs/` directory before changing Turborepo
configuration or commands. Heed deprecation notices. These bundled docs match
the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands
when an AI agent is detected. In the Turborepo source repository, its template
is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the
managed block while updates are enabled means a later qualifying invocation will
add it again. Set `"agentGuidance": false` in the root `turbo.json` or
`turbo.jsonc` to opt out; this does not remove an existing block. Keep the block
committed with your work to avoid an uncommitted change on the next agent
invocation.
<!-- END:turborepo-agent-rules -->
