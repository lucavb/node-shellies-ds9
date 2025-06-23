# GitHub Workflows

This directory contains GitHub Actions workflows for automated testing and quality assurance.

## Workflows

### CI (`ci.yml`)

**Triggers:** Push to `main`, Pull Requests to `main`

**What it does:**

- Runs on Node.js 22.x and 24.x (matrix strategy)
- Code quality checks (`npm run cq:all` - includes TypeScript, ESLint, and Prettier)
- Unit tests (`npm test`)
- Build verification (`npm run build`)

### Security (`security.yml`)

**Triggers:** Push to `main`, Pull Requests to `main`, Daily at 2 AM UTC

**What it does:**

- Security audit for vulnerabilities (`npm audit`)
- Check for outdated packages (`npm outdated`)
- Runs on Node.js 22.x

## Local Development

You can run the same checks locally using these commands:

```bash
# Run all code quality checks
npm run cq:all

# Individual checks
npm run cq:tsc           # TypeScript checking
npm run cq:eslint        # Linting
npm run cq:prettier      # Formatting check

# Auto-fix issues
npm run cq:eslint:fix    # Fix linting issues
npm run cq:prettier:fix  # Fix formatting issues

# Other commands
npm test                 # Run tests
npm run build           # Build project
npm audit               # Security audit
```
