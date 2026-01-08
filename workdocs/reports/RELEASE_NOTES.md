# Release Notes

## Changes

### DECAF-178: Cleaner build system, first bundle release
- **Description**: Refactored the build system to be cleaner and more efficient. Introduced the first bundle release and now exports bundle size information.
- **Impact**: Improved build performance and easier consumption of the package as a bundle.
- **Breaking Changes**: The license has been updated from MIT to Mozilla Public License 2.0 with AGPL-3.0 trigger details.

### DECAF-206: Add `workdocs/assets/slogans.json` to npm package files
- **Description**: Included `workdocs/assets/slogans.json` in the published npm package.
- **Impact**: Consumers can now access the slogans asset.

### DECAF-158: Improves release script
- **Description**: Enhancements to the release script for better automation and reliability.
- **Impact**: More robust release process.

## Upgrade Instructions

To upgrade to the latest version, run:

```bash
npm install @decaf-ts/utils@latest
```

## Breaking Changes

- **License Update**: The project is now licensed under Mozilla Public License 2.0 with AGPL-3.0 trigger details. Please review the new license terms.

## Vulnerabilities

See [DEPENDENCIES.md](./DEPENDENCIES.md) for details.

## Coverage

| Category | Percentage |
| :--- | :--- |
| Statements | 95% |
| Branches | 95% |
| Functions | 95% |
| Lines | 95% |
