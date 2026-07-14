# Requirements Document

## Introduction

This feature adds a GitHub Actions CI/CD pipeline to the retail store sample application. The pipeline detects which microservice has changed based on modified file paths, builds the corresponding Docker image, pushes it to Amazon ECR, and updates the image tag in the service's Helm chart `values.yaml`. This enables the GitOps branch (`gitops`) to maintain fully automated, per-service continuous delivery integrated with ArgoCD.

The application is composed of five services — `cart` (Java/Spring Boot), `catalog` (Go), `checkout` (Node.js), `orders` (Java), and `ui` (Java/Spring Boot) — each with its own `Dockerfile` under `src/{service}/Dockerfile` and Helm chart under `src/{service}/chart/values.yaml`.

## Glossary

- **Pipeline**: The GitHub Actions CI/CD workflow defined in `.github/workflows/`.
- **Service**: One of the five microservices: `cart`, `catalog`, `checkout`, `orders`, `ui`.
- **ECR**: Amazon Elastic Container Registry — the private container image registry where built images are stored.
- **Helm_Chart**: The per-service Helm chart located at `src/{service}/chart/values.yaml` that controls deployment configuration including image repository and tag.
- **Image_Tag**: The Docker image tag used to uniquely identify a specific build; set to the short Git commit SHA (7 characters).
- **Change_Detection**: Path-based filtering that determines which services have code changes in a given commit or pull request.
- **GitOps_Branch**: The `gitops` branch of the repository, which is the branch the Pipeline runs on and commits updated Helm values back to.
- **Commit_Actor**: The GitHub Actions bot identity (`github-actions[bot]`) used for automated commits.
- **AWS_Credentials**: The set of GitHub Actions repository secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`) required to authenticate with AWS.
- **ECR_Repository**: A named Amazon ECR repository of the form `retail-store-{service}`, automatically created if it does not exist.
- **Infrastructure_Image**: A third-party image (e.g., MySQL, Redis, DynamoDB Local) referenced in Helm charts that must not be overwritten by the Pipeline.
- **Round_Trip**: The property that serializing a value and then deserializing it produces an equivalent value; used here for Helm values update correctness.

## Requirements

### Requirement 1: Path-Based Change Detection

**User Story:** As a platform engineer, I want the pipeline to detect which services have changed based on file paths, so that only affected services are rebuilt and redeployed, saving build time and reducing risk.

#### Acceptance Criteria

1. WHEN a push or pull request event targets the `gitops` branch AND modified files include paths matching `src/cart/**`, THE Pipeline SHALL set the `cart` service build flag to `true`.
2. WHEN a push or pull request event targets the `gitops` branch AND modified files include paths matching `src/catalog/**`, THE Pipeline SHALL set the `catalog` service build flag to `true`.
3. WHEN a push or pull request event targets the `gitops` branch AND modified files include paths matching `src/checkout/**`, THE Pipeline SHALL set the `checkout` service build flag to `true`.
4. WHEN a push or pull request event targets the `gitops` branch AND modified files include paths matching `src/orders/**`, THE Pipeline SHALL set the `orders` service build flag to `true`.
5. WHEN a push or pull request event targets the `gitops` branch AND modified files include paths matching `src/ui/**`, THE Pipeline SHALL set the `ui` service build flag to `true`.
6. WHEN the Pipeline is triggered via `workflow_dispatch`, THE Pipeline SHALL set all five service build flags to `true`.
7. WHEN a push or pull request event targets the `gitops` branch AND no files under `src/cart/**`, `src/catalog/**`, `src/checkout/**`, `src/orders/**`, or `src/ui/**` are modified, THE Pipeline SHALL complete the workflow run with a successful status without executing any service build jobs.
8. BEFORE evaluating path filters in criteria 1–5, THE Pipeline SHALL initialize all five service build flags to `false`.

---

### Requirement 2: AWS Authentication

**User Story:** As a platform engineer, I want the pipeline to authenticate with AWS using repository secrets, so that it can push images to ECR and update Helm charts securely.

#### Acceptance Criteria

1. WHEN a service build job is executed, THE Pipeline SHALL configure AWS credentials using the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` repository secrets before any ECR operation.
2. WHEN AWS credential configuration succeeds, THE Pipeline SHALL authenticate the Docker client with Amazon ECR using the AWS CLI `get-login-password` command before any `docker push` operation.
3. IF the AWS credential configuration step fails, THEN THE Pipeline SHALL fail the job immediately and report an error message indicating the credential configuration failure without proceeding to subsequent steps.
4. THE Pipeline SHALL derive the ECR registry URL from the `AWS_ACCOUNT_ID` and `AWS_REGION` secrets in the format `{AWS_ACCOUNT_ID}.dkr.ecr.{AWS_REGION}.amazonaws.com`.
5. IF the ECR authentication step fails, THEN THE Pipeline SHALL fail the job immediately and report an error message indicating the ECR authentication failure without proceeding to any `docker push` operation.
6. IF any required secret (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, or `AWS_ACCOUNT_ID`) is absent or empty at job start, THEN THE Pipeline SHALL fail the job immediately and report an error message identifying which secret is missing before attempting any AWS operation.

---

### Requirement 3: ECR Repository Management

**User Story:** As a platform engineer, I want the pipeline to automatically create ECR repositories when they do not exist, so that the first deployment of a service does not require manual setup.

#### Acceptance Criteria

1. WHEN a service build job runs for a service named `{service}`, THE Pipeline SHALL ensure an ECR repository named `retail-store-{service}` exists in the configured AWS region before pushing the image.
2. WHEN the ECR repository `retail-store-{service}` does not exist, THE Pipeline SHALL create it using the AWS CLI with image tag immutability disabled and scan-on-push disabled, and SHALL only proceed to push the image after the repository is confirmed as created.
3. WHEN the ECR repository `retail-store-{service}` already exists, THE Pipeline SHALL proceed to the build and push steps without error and without attempting to recreate it.
4. IF the ECR repository existence check or creation step fails, THEN THE Pipeline SHALL fail the job immediately and report an error message indicating the repository name, AWS region, and cause of the failure without proceeding to the push step.

---

### Requirement 4: Docker Image Build and Push

**User Story:** As a platform engineer, I want the pipeline to build and push a Docker image for each changed service, so that the latest code is available as a container image in ECR.

#### Acceptance Criteria

1. WHEN a service build flag is `true`, THE Pipeline SHALL build the Docker image for that service using the `Dockerfile` located at `src/{service}/Dockerfile` with the build context set to `src/{service}/`.
2. WHEN the Docker build succeeds, THE Pipeline SHALL tag the image as `{ECR_REGISTRY}/retail-store-{service}:{IMAGE_TAG}` where `IMAGE_TAG` is the first 7 characters of the triggering commit SHA.
3. WHEN the image is tagged, THE Pipeline SHALL push the tagged image to the ECR repository `retail-store-{service}`.
4. IF the Docker build command fails, THEN THE Pipeline SHALL fail the job, emit the failed service name and non-zero exit code in the error output, and skip all subsequent steps for that service without attempting to push the image.
5. IF the `docker push` step fails, THEN THE Pipeline SHALL retry the push up to 3 times with a 10-second delay between attempts; IF all retry attempts fail, THE Pipeline SHALL fail the job and report the failed ECR repository and exit code without proceeding to the Helm chart update step.
6. IF the `Dockerfile` is not found at `src/{service}/Dockerfile` when a service build flag is `true`, THEN THE Pipeline SHALL fail the job immediately and report an error identifying the missing file path before attempting any build command.

---

### Requirement 5: Helm Chart Image Tag Update

**User Story:** As a platform engineer, I want the pipeline to update the Helm chart `values.yaml` with the new image repository and tag after a successful push, so that ArgoCD can detect and deploy the updated image automatically.

#### Acceptance Criteria

1. WHEN an image is successfully pushed to ECR, THE Pipeline SHALL update `image.repository` in `src/{service}/chart/values.yaml` to `{ECR_REGISTRY}/retail-store-{service}`.
2. WHEN an image is successfully pushed to ECR, THE Pipeline SHALL update `image.tag` in `src/{service}/chart/values.yaml` to the 7-character commit SHA used as the `IMAGE_TAG`.
3. THE Pipeline SHALL update only the top-level `image:` key (at root indentation level, with no parent key) in `src/{service}/chart/values.yaml`, preserving the `image` values of nested Infrastructure_Image blocks (e.g., `dynamodb.image`, `rabbitmq.image`, `mysql.image`) and the `image.pullPolicy` field.
4. WHEN the `values.yaml` file is updated, THE Pipeline SHALL commit the change to the `gitops` branch with the message `Update {service} image to {IMAGE_TAG} [skip ci]` using the Commit_Actor identity.
5. IF the `values.yaml` file has not changed (image repository and tag already match the new values), THE Pipeline SHALL skip the commit step without error.
6. IF `src/{service}/chart/values.yaml` is absent or unreadable before the update attempt, THEN THE Pipeline SHALL fail the job immediately and report an error identifying the missing or unreadable file path without attempting to write or commit.
7. IF the git push to the `gitops` branch fails after a successful local commit, THEN THE Pipeline SHALL fail the job, report the failure including the branch name and cause, and not retry, leaving the remote branch state unchanged.

---

### Requirement 6: Git Commit Safety

**User Story:** As a platform engineer, I want automated commits to use a `[skip ci]` marker and a bot identity, so that they do not re-trigger the pipeline and clutter the commit history with bot attribution.

#### Acceptance Criteria

1. THE Pipeline SHALL configure the Git commit author name as `github-actions[bot]` and the commit author email as `github-actions[bot]@users.noreply.github.com` as two separate, explicitly set fields before making any automated commit.
2. WHEN an automated commit is made, THE Pipeline SHALL include the string `[skip ci]` as a standalone token in the commit message (not embedded within another word or phrase) to prevent the commit from re-triggering the Pipeline.
3. THE Pipeline SHALL use the `GITHUB_TOKEN` provided by GitHub Actions with write permission scoped to `contents` (and no broader permissions) to push automated commits to the `gitops` branch.
4. IF the git push of an automated commit fails, THEN THE Pipeline SHALL stop immediately, emit an error message identifying the target branch, the operation attempted, and the cause of the failure, and SHALL NOT retry the push.

---

### Requirement 7: Parallel Service Builds

**User Story:** As a platform engineer, I want independent service builds to run in parallel, so that the total pipeline duration is minimized when multiple services change in the same commit.

#### Acceptance Criteria

1. WHEN multiple service build flags are `true`, THE Pipeline SHALL execute the corresponding build jobs concurrently as independent jobs with no ordering dependencies between them, rather than sequentially.
2. WHEN one service build job fails, THE Pipeline SHALL allow other concurrently running service build jobs to complete regardless of the failed job's exit status, without cancellation.
3. THE Pipeline SHALL report the final status of each service build job independently in the GitHub Actions UI, with each job appearing as a distinct named entry showing pass or fail.
4. WHEN all parallel service build jobs complete, THE Pipeline SHALL report an overall workflow status of failure if any individual service build job failed, and success only if all executed service build jobs succeeded.

---

### Requirement 8: Workflow Trigger Configuration

**User Story:** As a platform engineer, I want the pipeline to trigger automatically on pushes to the `gitops` branch and also be manually triggerable, so that deployments are automated by default but can also be forced when needed.

#### Acceptance Criteria

1. THE Pipeline SHALL trigger automatically on every `push` event to the `gitops` branch.
2. THE Pipeline SHALL trigger automatically on every `pull_request` event targeting the `gitops` branch.
3. THE Pipeline SHALL support manual execution via the `workflow_dispatch` event with no required input parameters.
4. THE Pipeline SHALL NOT trigger on pushes to any branch other than `gitops` unless invoked via `workflow_dispatch`.
5. WHEN a `workflow_dispatch` event is received, THE Pipeline SHALL begin execution within the standard GitHub Actions queue time, treating it as equivalent to a push event with all five service build flags set to `true`.
