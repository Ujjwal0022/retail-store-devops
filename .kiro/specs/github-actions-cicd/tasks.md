# Implementation Plan: GitHub Actions CI/CD Pipeline

## Overview

Create a GitHub Actions workflow at `.github/workflows/cicd.yml` that implements a detect-build-push-update pipeline for the five retail store microservices. Alongside the workflow, implement a small Node.js helper module and property-based test suite (using `fast-check`) that validates the pure-logic functions extracted from the pipeline (IMAGE_TAG extraction, Helm values update, nested image preservation, commit message format).

## Tasks

- [x] 1. Bootstrap the Node.js test helper package
  - [x] 1.1 Create `scripts/cicd-helpers/` directory with `package.json` and install `fast-check` and `js-yaml` as dependencies
    - Initialize with `npm init -y` in the `scripts/cicd-helpers/` directory
    - Add `fast-check` (≥3.0.0) and `js-yaml` (≥4.0.0) as exact-pinned dev dependencies
    - Add a `test` script entry pointing to `node --test` or `jest --run` depending on available runner
    - Create `scripts/cicd-helpers/.gitignore` excluding `node_modules/`
    - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 6.2_

- [x] 2. Implement core pipeline helper functions
  - [x] 2.1 Implement `extractImageTag(sha)` in `scripts/cicd-helpers/pipelineHelpers.js`
    - Accept a commit SHA string; return the first 7 characters
    - Export as a named function for use in tests and in the workflow's inline script
    - _Requirements: 4.2_

  - [x] 2.2 Write property test for `extractImageTag` (Property 1)
    - **Property 1: IMAGE_TAG is a 7-character SHA prefix**
    - **Validates: Requirements 4.2**
    - File: `scripts/cicd-helpers/pipelineHelpers.test.js`
    - Generator: arbitrary hex strings of length ≥ 7
    - Assertion: `result.length === 7 && sha.startsWith(result)`
    - Minimum 100 iterations

  - [x] 2.3 Implement `applyImageUpdate(yamlContent, newRepo, newTag)` in `scripts/cicd-helpers/pipelineHelpers.js`
    - Parse `yamlContent` with `js-yaml`
    - Set only the top-level `.image.repository` and `.image.tag` keys
    - Leave `.image.pullPolicy` and all nested image blocks (e.g., `dynamodb.image`, `mysql.image`) untouched
    - Serialize back to YAML string and return it
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.4 Write property test for top-level image update (Property 2)
    - **Property 2: Top-level image values are updated correctly**
    - **Validates: Requirements 5.1, 5.2**
    - File: `scripts/cicd-helpers/pipelineHelpers.test.js`
    - Generator: arbitrary ECR repo URLs and 7-char hex tags; wrap in minimal values.yaml template
    - Assertion: after `applyImageUpdate`, parsed result has `.image.repository === newRepo` and `.image.tag === newTag`
    - Minimum 100 iterations

  - [x] 2.5 Write property test for nested image preservation (Property 3)
    - **Property 3: Nested infrastructure image values are preserved**
    - **Validates: Requirements 5.3**
    - File: `scripts/cicd-helpers/pipelineHelpers.test.js`
    - Generator: values.yaml content with one or more nested image blocks under arbitrary parent keys alongside the top-level `image:` block
    - Assertion: after `applyImageUpdate`, all nested `*.image.repository` and `*.image.tag` values are identical to pre-update values
    - Minimum 100 iterations

  - [x] 2.6 Implement `buildCommitMessage(service, imageTag)` in `scripts/cicd-helpers/pipelineHelpers.js`
    - Return the string `Update {service} image to {imageTag} [skip ci]`
    - Export as a named function
    - _Requirements: 5.4, 6.2_

  - [x] 2.7 Write property test for commit message format (Property 4)
    - **Property 4: Commit message contains [skip ci] as a standalone token**
    - **Validates: Requirements 5.4, 6.2**
    - File: `scripts/cicd-helpers/pipelineHelpers.test.js`
    - Generator: arbitrary alphabetic service name strings and 7-char hex tag strings
    - Assertion: message matches `/^Update \S+ image to \S+ \[skip ci\]$/` and contains `[skip ci]` as a space-delimited token
    - Minimum 100 iterations

- [-] 3. Checkpoint — Ensure all helper tests pass
  - Run `npm test` in `scripts/cicd-helpers/` and confirm all property tests pass with no failures. Ask the user if any questions arise.

- [x] 4. Create the GitHub Actions workflow file skeleton
  - [x] 4.1 Create `.github/workflows/cicd.yml` with trigger configuration
    - Add `on.push.branches: [gitops]`, `on.pull_request.branches: [gitops]`, and `on.workflow_dispatch:` triggers
    - Set top-level `permissions: contents: write`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 6.3_

  - [x] 4.2 Add the `detect-changes` job to `.github/workflows/cicd.yml`
    - Job runs on `ubuntu-latest`; checks out the repository
    - Adds `dorny/paths-filter@v3` step with filters for all five services (`src/cart/**`, `src/catalog/**`, `src/checkout/**`, `src/orders/**`, `src/ui/**`)
    - Adds an `Override flags for workflow_dispatch` step (no-op run step)
    - Declares `outputs:` block for all five services using the conditional expression:
      `${{ github.event_name == 'workflow_dispatch' && 'true' || steps.filter.outputs.<service> }}`
    - _Requirements: 1.1–1.8, 8.5_

- [x] 5. Implement the five parallel build jobs
  - [x] 5.1 Add `build-cart` job to `.github/workflows/cicd.yml`
    - `needs: detect-changes`; `if: needs.detect-changes.outputs.cart == 'true'`
    - Steps in order:
      1. `actions/checkout@v4`
      2. `aws-actions/configure-aws-credentials@v4` (using `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` secrets)
      3. `aws-actions/amazon-ecr-login@v2` (id: `ecr-login`)
      4. Inline `run` step: ECR repo idempotent create (`describe-repositories || create-repository --image-tag-mutability MUTABLE --no-image-scanning-configuration`)
      5. Docker build: `docker build -f src/cart/Dockerfile -t ${ECR_REGISTRY}/retail-store-cart:${GITHUB_SHA::7} src/cart/`
      6. Docker push with retry loop (3 attempts, 10-second sleep between failures)
      7. `yq` step: update `src/cart/chart/values.yaml` `.image.repository` and `.image.tag`
      8. Git config (`user.name`, `user.email`) + remote URL inject with `GITHUB_TOKEN`
      9. `git add`, idempotency check, conditional commit + push
    - _Requirements: 1.1, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.7, 6.1–6.4, 7.1–7.4_

  - [x] 5.2 Add `build-catalog` job to `.github/workflows/cicd.yml`
    - Identical structure to `build-cart`; change service name to `catalog` throughout
    - `if: needs.detect-changes.outputs.catalog == 'true'`
    - _Requirements: 1.2, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.7, 6.1–6.4, 7.1–7.4_

  - [x] 5.3 Add `build-checkout` job to `.github/workflows/cicd.yml`
    - Identical structure to `build-cart`; change service name to `checkout` throughout
    - `if: needs.detect-changes.outputs.checkout == 'true'`
    - _Requirements: 1.3, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.7, 6.1–6.4, 7.1–7.4_

  - [x] 5.4 Add `build-orders` job to `.github/workflows/cicd.yml`
    - Identical structure to `build-cart`; change service name to `orders` throughout
    - `if: needs.detect-changes.outputs.orders == 'true'`
    - _Requirements: 1.4, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.7, 6.1–6.4, 7.1–7.4_

  - [x] 5.5 Add `build-ui` job to `.github/workflows/cicd.yml`
    - Identical structure to `build-cart`; change service name to `ui` throughout
    - `if: needs.detect-changes.outputs.ui == 'true'`
    - _Requirements: 1.5, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.7, 6.1–6.4, 7.1–7.4_

- [~] 6. Checkpoint — Static review of the workflow YAML
  - Verify the following manually or with `yq`/`yamllint`:
    - Path filters are correctly scoped to `src/{service}/**` for all five services
    - `workflow_dispatch` trigger is present with no required inputs
    - All five build jobs have `needs: detect-changes` and correct `if:` conditions
    - No `needs:` relationships exist between any two build jobs (confirming parallelism)
    - `permissions: contents: write` is present at the workflow level
    - Git config sets `user.name` and `user.email` to the bot identity
    - `[skip ci]` token is present in the commit message template in every build job
  - Ensure all helper tests still pass. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they exercise the property-based correctness guarantees from the design's Correctness Properties section.
- Each `build-{service}` job is intentionally self-contained (no shared steps job) to satisfy Requirement 7.3 (distinct named entries in the GitHub Actions UI).
- The `yq` command-line tool must be available on `ubuntu-latest` GitHub-hosted runners (it is pre-installed as of mid-2023); no additional installation step is needed.
- The helper module at `scripts/cicd-helpers/pipelineHelpers.js` exists purely to make the four pure-logic functions testable; the workflow YAML inlines the equivalent shell/bash logic directly.
- The `[skip ci]` marker prevents the git push from triggering a new pipeline run (Requirements 6.2, 8.4).
- Docker push retry is capped at 3 attempts with 10-second delays; no other step has a retry policy.
- Git push must NOT be retried (Requirement 6.4) to avoid push conflicts when multiple build jobs finish around the same time.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.6", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.7", "4.2"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
