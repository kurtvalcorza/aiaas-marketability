# Contributing to AIaaS DVI Chatbot

Thank you for your interest in contributing to the AIaaS DVI Chatbot project! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Architecture Guidelines](#architecture-guidelines)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Commit Guidelines](#commit-guidelines)
8. [Pull Request Process](#pull-request-process)
9. [Documentation](#documentation)

## Code of Conduct

This project follows a professional code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Google AI API key (for local development)
- Basic knowledge of Next.js, React, and TypeScript

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aiaas-marketability-chatbot.git
   cd aiaas-marketability-chatbot
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

5. Add your Google AI API key to `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open http://localhost:3000

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes following the coding standards
2. Write or update tests
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Build the project: `npm run build`
6. Test manually in the browser

## Architecture Guidelines

This project follows a clean architecture pattern. Please read [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed information.

### Key Principles

1. **Separation of Concerns**: Keep UI, business logic, and data access separate
2. **Single Responsibility**: Each module should have one clear purpose
3. **Testability First**: All business logic should be easily testable
4. **Type Safety**: Use TypeScript and Zod for validation

### Where to Add Code

#### New API Endpoint

- **Location**: `app/api/your-endpoint/route.ts`
- **Pattern**: Use `createJsonResponse` and `createErrorResponse` from `lib/api-utils.ts`
- **Delegate**: Call service functions for business logic
- **Tests**: Add tests in `tests/api/`

#### New Business Logic

- **Location**: `services/yourService.ts`
- **Pattern**: Plain exported functions (not classes)
- **Keep**: Framework-agnostic (no Next.js dependencies)
- **Tests**: Add tests in `tests/services/`

#### New Component

- **Location**: `components/YourComponent.tsx`
- **Focus**: Rendering and user interaction only
- **Delegate**: Use hooks for state management
- **Tests**: Add tests in `tests/components/`

#### New Hook

- **Location**: `hooks/useYourHook.ts`
- **Purpose**: Manage state and side effects
- **Return**: Clear interface (state + actions)
- **Tests**: Add tests in `tests/hooks/`

#### New Constants

- **Location**: `lib/constants/appropriate-file.ts`
- **Organization**: Group by domain (security, validation, parsing)
- **Export**: Use namespaced exports

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid `any` types
- Use type inference where possible
- Add JSDoc comments for public functions

### React/Next.js

- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Follow React best practices
- Implement proper error boundaries

### Naming Conventions

- **Files**: camelCase for utilities, PascalCase for components
- **Variables/Functions**: camelCase
- **Components/Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with descriptive names

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Use semicolons consistently
- Max line length: 100 characters
- Use trailing commas in multi-line objects/arrays

### Example

```typescript
/**
 * Validates user input for security issues
 * @param input - The user input to validate
 * @returns Validation result with error message if invalid
 */
export function validateInput(input: string): ValidationResult {
  if (input.length > MAX_LENGTH) {
    return {
      valid: false,
      error: 'Input exceeds maximum length',
    };
  }
  
  return { valid: true };
}
```

## Testing Requirements

### Test Coverage

- Maintain >80% test coverage
- Write tests for all new features
- Update tests when modifying existing code
- Test both happy paths and error cases

### Test Types

#### Unit Tests

Test individual functions and hooks in isolation:

```typescript
describe('validateInput', () => {
  it('should accept valid input', () => {
    const result = validateInput('valid input');
    expect(result.valid).toBe(true);
  });
  
  it('should reject input exceeding max length', () => {
    const result = validateInput('x'.repeat(3000));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('maximum length');
  });
});
```

#### Component Tests

Test component rendering and user interactions:

```typescript
describe('ChatInput', () => {
  it('should render input field', () => {
    render(<ChatInput onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
  
  it('should call onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} isLoading={false} />);
    
    await userEvent.type(screen.getByRole('textbox'), 'test message');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    
    expect(onSubmit).toHaveBeenCalledWith('test message');
  });
});
```

#### Integration Tests

Test complete user flows:

```typescript
describe('Assessment Flow', () => {
  it('should complete full assessment', async () => {
    render(<Chat />);
    
    // Simulate user interaction
    await userEvent.type(screen.getByRole('textbox'), 'Test Organization');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    
    // Verify completion
    await waitFor(() => {
      expect(screen.getByText(/assessment complete/i)).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(chat): add message validation

Add validation for message length and content quality to prevent spam.

Closes #123
```

```
fix(api): handle rate limit errors gracefully

Previously, rate limit errors would crash the application. Now they
return a proper error response with retry information.

Fixes #456
```

### Best Practices

- Use imperative mood ("add" not "added")
- Keep subject line under 50 characters
- Capitalize subject line
- Don't end subject line with a period
- Separate subject from body with blank line
- Wrap body at 72 characters
- Explain what and why, not how

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`npm test`)
2. ✅ Linter passes (`npm run lint`)
3. ✅ Build succeeds (`npm run build`)
4. ✅ Manual testing completed
5. ✅ Documentation updated
6. ✅ Commits follow guidelines

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### Review Process

1. Submit PR with clear description
2. Address reviewer feedback
3. Keep PR focused and small
4. Respond to comments promptly
5. Update PR based on feedback

### Merging

- PRs require at least one approval
- All CI checks must pass
- Conflicts must be resolved
- Squash commits when merging

## Documentation

### Code Documentation

Add JSDoc comments for all public functions:

```typescript
/**
 * Formats interview data for Google Sheets submission
 *
 * @param data - The interview data to format
 * @returns Formatted record ready for Google Sheets
 *
 * @example
 * ```typescript
 * const formatted = formatForGoogleSheets(interviewData);
 * ```
 */
export function formatForGoogleSheets(data: InterviewData): InterviewRecord {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing setup process
- Modifying environment variables
- Updating dependencies

### Architecture Documentation

Update ARCHITECTURE.md when:
- Adding new patterns
- Changing folder structure
- Introducing new layers
- Modifying data flow

## Questions?

If you have questions or need help:

1. Check existing documentation (README, ARCHITECTURE, DEVELOPMENT)
2. Search existing issues
3. Open a new issue with the `question` label
4. Be specific and provide context

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the AIaaS DVI Chatbot project!
