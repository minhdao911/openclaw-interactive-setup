# Contributing to ClawPath

Thanks for your interest in contributing.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.local.example .env.local
```

4. Start development server:

```bash
npm run dev
```

## Before Opening a Pull Request

- Run lint:

```bash
npm run lint
```

- Ensure the app builds:

```bash
npm run build
```

- Keep pull requests focused and small when possible.
- Update docs when behavior or setup changes.

## Pull Request Guidelines

- Use a clear title and describe why the change is needed.
- Include screenshots or short recordings for UI changes.
- Reference related issues when applicable.
- Add manual test notes in the PR description.

## Code Style

- TypeScript first.
- Prefer clear, readable code over clever abstractions.
- Keep components and hooks focused on one responsibility.
- Avoid introducing breaking changes without discussion in an issue.
