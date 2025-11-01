# CLAUDE.md - AI Agent Guide for micro-router

**micro-router** is an experimental, TypeScript-first routing library for React.

Its public npm packages are:

- `@micro-router/core` - Path combinator library (no dependencies)
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
