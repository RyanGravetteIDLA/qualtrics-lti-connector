# Contributing to Qualtrics LTI Connector

First off, thank you for considering contributing to the Qualtrics LTI Connector! It's people like you that make this tool better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Security Issues

⚠️ **IMPORTANT**: If you discover a security vulnerability, please DO NOT open a public issue. Instead, please send an email to the maintainers with details of the vulnerability.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible using the bug report template.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:
- A clear and descriptive title
- A detailed description of the proposed enhancement
- Examples of how the enhancement would be used
- Why this enhancement would be useful to most users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code lints
5. Update documentation if needed
6. Issue the pull request

## Development Setup

1. Clone your fork:
```bash
git clone https://github.com/your-username/qualtrics-lti-connector.git
```

2. Install dependencies:
```bash
npm install
cd functions && npm install
```

3. Set up environment:
```bash
cp functions/.env.example functions/.env
# Configure with test credentials
```

4. Run tests:
```bash
npm test
```

5. Start emulators:
```bash
firebase emulators:start
```

## Style Guide

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Avoid using `any` type
- Document complex functions with JSDoc

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Code Style
- 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Include integration tests for API endpoints
- Test with Firebase emulators

## Documentation

- Update README.md if changing setup/configuration
- Document new API endpoints
- Update type definitions
- Include JSDoc comments for public functions

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.