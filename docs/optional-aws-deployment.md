# Optional AWS assistant deployment

SolarSmart’s assessment wizard, deterministic calculator, demo scenarios, comparisons, reports, and local history run without AWS credentials or network access. AWS is only an opt-in host for the qualitative assistant API. No stack, account resource, or paid service is created automatically.

## Implemented scope

| Capability | Status | Notes |
| --- | --- | --- |
| Local Next.js app and calculator | Implemented, tested without AWS | No cloud adapter is used by the core demo. |
| Assistant HTTP API | Implemented in `backend/app.py` and `template.yaml` | API Gateway REST API invokes one Lambda. Inputs are schema- and range-validated, request bodies are capped, replies are bounded, and failures use deterministic narrative fallback. |
| Optional Strands/Bedrock explanation | Implemented, disabled by default | Lambda receives only the validated assessment summary and question. The agent has no tools. The calculator remains the numerical authority. Model use requires model access and is billable according to provider/region/model terms. |
| API key and usage plan | Enabled by default in cloud profiles | The key is server-side in the Next.js runtime. It is an API key gate and metering mechanism, not user identity or authorization. API Gateway usage-plan throttles/quotas are best-effort controls, not a hard cost ceiling ([AWS guidance](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)). |
| CloudWatch logs | Implemented for the function | Explicit log group with 14-day dev or 30-day prod retention by default. Do not log request bodies or secrets. |
| S3 assessment/image storage, DynamoDB history, Cognito, CloudFront | Not implemented | Browser-local history remains local. Roof photos are not uploaded. Add these only for a concrete product need and after access-control, privacy, retention, cost, and deletion design. |

The only cloud data flow is an explicit user-submitted assistant question: browser → same-origin Next.js server route → configured SAM endpoint → Lambda → optional Bedrock model. City/postcode and roof images are excluded from the assistant summary. Without an endpoint, the deterministic local assistant answers. The Next.js route also has an in-memory per-process request limit; it is useful for local/app feedback but is not a distributed abuse or cost control. See [the AI privacy notes in README](../README.md#optional-ai-assistant-and-strands).

## Local application (no AWS)

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. For normal use, do not configure `.env.local`, install SAM, install Docker, or create AWS credentials.

## Optional SAM local API

Prerequisites: AWS SAM CLI and Docker Desktop/Engine. Install `cfn-lint` as an optional development tool if you want SAM's `--lint` checks (`python -m pip install cfn-lint`). Docker is used by SAM Local to emulate Lambda; it is not needed for the core app, `sam validate`, or commonly for Python dependency builds. The `local` config profile disables API-key auth for localhost and disables Strands, so no AWS credentials or model call are required.

```sh
sam validate --lint
sam build --config-env default
sam local start-api --config-env local
```

In another terminal, copy `.env.example` to `.env.local`, set:

```dotenv
SOLARSMART_AI_ENDPOINT=http://127.0.0.1:3001/explain
```

Then run/restart `npm run dev` and submit a question on the assistant panel. The API returns its deterministic fallback. This confirms the local bridge and Lambda handler; it does not test AWS deployment, Bedrock, or public API security.

## Optional dev or production deployment

Deployment is a deliberate operator action. Before starting, identify the target AWS account and region, check current prices, quotas, model availability, and Free Tier eligibility, and review the resources/permissions below. Do not infer free use from an account being new or from a nominal quota. Offers and prices change and vary by service, region, account plan, and usage.

### Prerequisites and configuration

- AWS account with permission to create/inspect CloudFormation stacks, API Gateway, Lambda, IAM roles, CloudWatch Logs, and SAM artifact storage.
- AWS CLI authenticated to the intended account/profile; AWS SAM CLI installed.
- For Strands: confirm the selected Bedrock model is available in the deployment region, enable/access it as required, and authorize only that model. Inference is optional and can create material variable charges.
- Edit `samconfig.toml`’s `region`, stack names, and log retention to match the intended isolated environment. The sample `us-east-1` is only a placeholder. The `dev` and `prod` profiles are separate named stacks; neither is selected by normal local commands.
- Default profiles require an API key, disable Strands, and set example usage-plan controls. Keep the generated key in a secret manager or protected Next.js server environment. Do not commit it, put it in a URL, or prefix it with `NEXT_PUBLIC_`.
- Strands is enabled only by an explicit deployment override. `StrandsModelId` must be a direct foundation-model ID supported in the selected region. The Lambda role’s Bedrock actions are conditionally scoped to that model ARN. Credentials are supplied by the Lambda execution role; do not place AWS access keys in Lambda environment variables.

### Build, review, deploy, verify

```sh
sam validate --lint
sam build --config-env default
sam deploy --config-env dev
```

SAM asks to confirm the CloudFormation change set (`confirm_changeset = true`). Inspect the account, region, full resource list, IAM changes, and parameter values before approving. The template’s safe defaults are `StrandsEnabled=false` and `RequireApiKey=true`; never turn off API key protection on a public deployment. Enable Strands only after checking inference pricing, privacy implications, and model access:

```sh
sam deploy --config-env dev --parameter-overrides "DeploymentEnvironment=dev RequireApiKey=true StrandsEnabled=true StrandsModelId=<approved-model-id> LogRetentionDays=14"
```

After deployment, inspect the `ExplainApiUrl` output and API key in API Gateway. Configure the Next.js **server** environment with `SOLARSMART_AI_ENDPOINT=<ExplainApiUrl>/explain` and `SOLARSMART_AI_API_KEY=<generated-key>`, restart/redeploy Next.js, then submit an assistant question. Check the assistant status explicitly reports Strands when enabled; when disabled or unreachable it should report local fallback. Verify Lambda errors and duration, API Gateway responses, and log retention in CloudWatch. Never paste a real user assessment into a test request unless its disclosure has been reviewed.

SAM package artifacts are uploaded to an S3 deployment bucket (`resolve_s3 = true`); SAM may create or reuse this bucket. It is separate from the application and is not public website storage. Inspect its name, region, access controls, and retained artifacts. Remove only an artifact bucket dedicated to this app after its stack is gone and its contents have been reviewed.

### Resources and cost review

The template creates an API Gateway REST API/stage and key/usage plan, one Lambda, one least-privilege IAM role, and one CloudWatch log group. SAM deployment also uses an S3 artifact bucket. With Strands enabled, Lambda can invoke the selected Bedrock model. Requests, compute duration, logs and retention, artifacts/storage/requests, data transfer, and model tokens can incur charges. A custom domain, CloudFront, S3 user uploads, DynamoDB, Cognito, and hosted Next.js infrastructure are not created by this template.

Before confirming, verify the current official [AWS Free Tier terms](https://aws.amazon.com/free/), [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/), [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), region availability, and account-specific quotas. Consider AWS Budgets and alerts as monitoring aids; they are not instantaneous hard spending caps. API Gateway usage-plan quotas and throttles are also best-effort, not guaranteed cost ceilings.

### Rollback and cleanup

- To roll back application code/configuration, redeploy the last reviewed template/configuration and check the CloudFormation events and API output. For a failed stack update, inspect CloudFormation status before retrying; allow automatic rollback to finish.
- To remove the optional stack after confirming the exact account, region, and stack name, the sample dev command is `sam delete --stack-name solarsmart-assistant-dev --region us-east-1` (substitute the values you configured). Review every deletion prompt. This removes the API, Lambda, role, usage plan/key resources, and log group owned by the stack; its log history is therefore deleted. Export logs first if retention is required.
- Separately inspect and clean the SAM artifact S3 bucket only if dedicated to this app, and remove the Next.js endpoint/key from the server environment. Revoke/rotate keys if they may have been exposed. Verify no stack resources remain in CloudFormation and check billing/cost tools for delayed usage charges.
- For production, first stop traffic or remove the frontend endpoint, then delete the stack in a planned maintenance window. Preserve any evidence/logs that policy requires before deleting.

## LocalStack

LocalStack is not a project dependency and provides no benefit to the current local-first calculator. SAM Local already exercises the implemented Lambda/API handler. If a future adapter uses S3, DynamoDB, or Cognito, evaluate the exact service/API operations against the chosen LocalStack edition and its current licensing/features; support differs by edition and can change. Bedrock inference is not made free or locally available merely by using LocalStack. Do not install or run LocalStack for the standard demo.

## Validation status and limits

Application tests use mocked model calls; backend unit tests exercise request validation and deterministic fallback without AWS. SAM template validation/build and Lambda emulation require SAM CLI (and Docker for local invocation). A successful local SAM run does not prove an AWS change set, account permissions, region/model access, pricing, or deployed endpoint security. Revalidate against the current SAM CLI and review the generated change set before any deployment.
