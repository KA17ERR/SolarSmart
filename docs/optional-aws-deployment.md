# Optional AWS assistant deployment

SolarSmart’s assessment wizard, deterministic calculator, demo scenarios, comparisons, reports, and local history run without AWS credentials or network access. AWS is only an opt-in host for the qualitative assistant API. No stack, account resource, or paid service is created automatically.

## Implemented scope

| Capability | Status | Notes |
| --- | --- | --- |
| Local Next.js app and calculator | Implemented, tested without AWS | No cloud adapter is used by the core demo. |
| Assistant HTTP API | Implemented in `backend/app.py` and `template.yaml` | API Gateway REST API invokes one Lambda. Inputs are schema- and range-validated, request bodies are capped, replies are bounded, and failures use deterministic narrative fallback. |
| Optional Strands/Bedrock explanation | Implemented, disabled by default | Lambda receives only the validated assessment summary and question. The agent has no tools. The calculator remains the numerical authority. Model use requires model access and is billable according to provider/region/model terms. |
| API key and usage plan | Enabled by default in cloud profiles | The key is sent only by the Next.js server. API Gateway's key is a service gate and metering mechanism, not user identity or authorization. Remote calls require a verified Supabase user; usage-plan throttles/quotas are best-effort controls, not a hard cost ceiling ([AWS guidance](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)). |
| SSM Parameter Store SecureString | Implemented as an optional Amplify SSR runtime secret source | The SSR handler resolves the SAM API key with `GetParameter(WithDecryption=true)` through the Amplify SSR Compute role. The value is cached in server memory for five minutes; it is never written into `.env.production` or returned to a browser. |
| CloudWatch logs | Implemented for the function | Explicit log group with 14-day dev or 30-day prod retention by default. Do not log request bodies or secrets. |
| S3 assessment/image storage, DynamoDB history, Cognito, CloudFront | Not implemented | Browser-local history remains local. Roof photos are not uploaded. Add these only for a concrete product need and after access-control, privacy, retention, cost, and deletion design. |

## Repository audit and architecture decision

The application is Next.js 15 with npm and a deterministic client-side calculation engine. The default planner, assessment, dashboard, comparison, reports, and history do not need a cloud backend. Optional registration/login and saved projects already use Supabase Auth and Postgres; project ownership is enforced by Supabase RLS and the project-save server action validates and recalculates before persistence. Keep that provider and data model. No destructive auth or database migration is part of this AWS path.

The least-change AWS architecture is therefore:

| Service | Application purpose | Selection |
| --- | --- | --- |
| Amplify Hosting | Git-backed Next.js 15 SSR hosting, API route, CDN | Optional frontend host; repo config is in `amplify.yml`. |
| API Gateway REST API + Lambda | Optional qualitative assistant endpoint | Already implemented as an opt-in SAM stack; disabled model by default. |
| CloudWatch Logs | Bounded-retention Lambda operational logs | Already created by the SAM stack. |
| IAM | Lambda log permissions and conditional, model-scoped Bedrock invocation | Already defined in SAM. |
| SSM Parameter Store SecureString | Store the API Gateway key encrypted for server-side retrieval | Optional for the hosted assistant; read access is scoped to one parameter on the Amplify SSR Compute role. |
| Supabase Auth/Postgres | Existing optional identity and private project data | Remains the auth/database provider; not an AWS service. |
| S3, DynamoDB, Cognito | No present requirement | Not selected; do not create empty resources. |

The assistant API accepts an assessment summary and question, not a project ID or private record read/write request. Its API key is a service gate and usage-plan metering value, not user identity. Project ownership stays enforced by Supabase RLS. Do not describe the assistant key as end-user authorization.

## Amplify Hosting for the Next.js frontend

AWS currently documents SSR, API routes, middleware, and Next.js 15 support for Amplify Hosting compute. The included root `amplify.yml` uses `npm ci`, builds into `.next` (the directory expected by Amplify's Next.js adapter), sets a non-secret runtime dist-directory setting, caches dependencies, and declares the SSR artifact. It does not create an AWS app or connect a Git provider.

Operator setup:

1. Push the reviewed branch to a Git provider supported by Amplify, then choose **Create new app** in the Amplify console and connect the repository and branch. Select a supported Node.js 20+ build image/runtime. The repository has no remote deployment configured by this change.
2. Review the detected build specification and ensure it uses the checked-in `amplify.yml`. Choose an AWS region where Amplify Hosting is available. For a simpler low-cost path, deploy the SAM API/Lambda and SSM parameter in that same region; check Bedrock model availability there if inference will be enabled. Configure production variables listed below by branch so staging and production cannot accidentally share a Supabase URL or Parameter Store path.
3. Configure Supabase Auth's production site URL and HTTPS `/auth/callback` redirect, and allow the exact same HTTPS callback in Supabase. Password recovery also returns through `/auth/callback?next=/account/update-password`. Apply the reviewed SQL migrations to the intended Supabase project if not already done. Amplify does not provision or migrate Supabase.
4. If enabling the hosted AI assistant, create a production API key in API Gateway, save it in an SSM Parameter Store `SecureString`, create an Amplify SSR Compute role with the narrowly scoped policy below, and attach it to the production branch only. Configure the non-secret SAM API URL and parameter name in Amplify's environment variables. Do not make the key a regular Amplify environment variable or write it into `.env.production`.
5. Use Amplify's default HTTPS hostname initially. Add a custom domain only after reviewing DNS and certificate ownership. The app's Next.js response headers include HSTS, MIME sniffing protection, frame denial, referrer policy, and a restrictive permissions policy; no broad CSP is added because the optional map and configured Supabase endpoints need explicit origin design first.
6. Inspect the first build and SSR logs, test direct navigation to `/planner`, `/assessment`, `/assessment/compare`, `/login`, and the API route, then configure monitoring and cost alerts in the account.

The build file writes only public Supabase settings and non-secret runtime selectors into `.env.production` so Next's SSR runtime can read them. It never copies `SOLARSMART_AI_API_KEY` or any secret into build artifacts. The hosted route loads the API key from SSM at runtime with the AWS SDK and the role's temporary credentials. Remote model requests require a verified Supabase session; anonymous users and SSM/auth failures receive deterministic local guidance without invoking the paid endpoint.

### Environment variable inventory

| Name | Required when | Visibility | Set in / purpose |
| --- | --- | --- | --- |
| `SOLARSMART_NEXT_DIST_DIR` | Amplify build/runtime | Non-secret | `amplify.yml` sets `.next`; no console value needed. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase auth/projects enabled | Public | Supabase project URL; exposed in browser by design. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase auth/projects enabled | Public | Supabase publishable key; safe for browser only with RLS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy Supabase key naming only | Public | Compatibility fallback; use the publishable key above when available. |
| `NEXT_PUBLIC_SITE_URL` | Supabase email confirmations/recovery | Public | Exact deployed HTTPS origin; used to construct callback URLs. |
| `SOLARSMART_AI_ENDPOINT` | Hosted SAM assistant enabled | Server-only, non-secret | API Gateway `ExplainApiUrl` plus `/explain`; the build recipe copies this non-secret URL for SSR. |
| `SOLARSMART_AI_API_KEY_PARAMETER` | Hosted SAM assistant enabled | Server-only selector, non-secret | Full SSM parameter name (for example `/solarsmart/prod/assistant-api-key`); stored in Amplify env and `.env.production`. |
| `SOLARSMART_AI_SECRET_REGION` | Hosted SAM assistant enabled | Server-only selector, non-secret | AWS region containing the SSM parameter; stored in Amplify env and `.env.production`. |
| `SOLARSMART_AI_API_KEY` | Local SAM or non-Amplify server hosting only | Secret, server-only | Direct key for server-side use only. Do not set in Amplify build variables or `.env.production`; Amplify uses SSM instead. |
| `NEXT_PUBLIC_MAPTILER_API_KEY` | Planner satellite imagery | Public, origin-restricted provider key | MapTiler dashboard key. It is sent in browser tile requests; restrict origins, API use, and quotas at MapTiler. |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | Planner India-biased address autocomplete | Public, origin-restricted provider key | Geoapify project key. Enable the Address Autocomplete API and restrict allowed origins/referrers and API access. It is sent in browser search requests. |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Optional custom satellite tile provider | Public | Browser-visible tile endpoint and required provider attribution; do not put private credentials in these values. This does not replace Geoapify search. |

The core frontend does not require AWS variables. Supabase configuration is optional for the anonymous demo, but both Supabase URL and publishable/anon key are required together for account flows and saved projects. The map uses two unrelated optional browser keys: MapTiler for imagery and Geoapify for address autocomplete. Without Geoapify configured, search shows a setup message; sample/manual planning remains available. The cloud AI endpoint and SSM settings are also optional; without them the local deterministic assistant remains in use.

SAM parameters (not frontend environment variables): `DeploymentEnvironment` (`local`, `dev`, or `prod`), `RequireApiKey` (must remain `true` for public deployment), `StrandsEnabled` (default `false`), `StrandsModelId` (required only when Strands is enabled), and `LogRetentionDays`. `samconfig.toml` contains placeholder `us-east-1` dev/prod profiles; set the account owner's chosen supported region and stack names before use. `sam deploy` generates API Gateway resources and a key; copy that key directly into SSM SecureString without logging or committing it.

### Amplify SSR Compute role for the SSM key

Create a SecureString using the AWS-managed `aws/ssm` key to avoid a customer-managed KMS key's recurring key charge; this key does not provide per-role isolation by itself, so the SSR role's IAM policy must restrict both the parameter and decrypt context. Replace the placeholders below with the exact account, region, and parameter path. The `kms:Decrypt` wildcard is constrained by both `kms:ViaService` and the exact parameter encryption context.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyThisAssistantKey",
      "Effect": "Allow",
      "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:<region>:<account-id>:parameter/solarsmart/prod/assistant-api-key"
    },
    {
      "Sid": "DecryptOnlyThroughParameterStoreForThisKey",
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.<region>.amazonaws.com",
          "kms:EncryptionContext:PARAMETER_ARN": "arn:aws:ssm:<region>:<account-id>:parameter/solarsmart/prod/assistant-api-key"
        }
      }
    }
  ]
}
```

Use the documented Amplify SSR Compute trust policy and attach this role in **App settings → IAM roles → Compute role** on the production branch only. Do not attach it to untrusted pull-request/auto-created branches. If using a customer-managed KMS key instead, replace the wildcard KMS resource with that exact key ARN and review its key policy; that can add cost. Parameter Store and KMS permissions should be tested with IAM policy simulation and an authenticated deployed request.

The API Gateway SAM endpoint is invoked server-to-server by `/api/assistant`, so browser CORS is not needed and the API key never goes to the browser. Do not add permissive CORS. Keep normal Next.js SSR routing; no SPA catch-all rewrite should override the App Router. Amplify and SAM can share a region for simpler operations, but API Gateway is reached by its HTTPS output URL and the SSM SDK explicitly targets `SOLARSMART_AI_SECRET_REGION`.

Production saved projects continue to use the existing Supabase Auth/Postgres provider. Set the public Supabase URL and publishable key in Amplify, set `NEXT_PUBLIC_SITE_URL` to the exact production origin, allow `https://<deployed-host>/auth/callback` in Supabase Auth URL configuration, and ensure the reviewed RLS migrations are applied. Project authorization is enforced by Supabase RLS/server actions, not by the AWS assistant key. No Cognito or database migration is introduced.

Amplify's standard SSR service role allows its service to write SSR CloudWatch logs. The optional **SSR Compute role** is separate: grant it only `ssm:GetParameter` on the exact parameter and the restricted `kms:Decrypt` condition shown above. SAM deployment requires the account owner/operator to authorize CloudFormation changes, create API Gateway/Lambda/CloudWatch/IAM resources, and pass the Lambda role to Lambda (`iam:PassRole`); the template's Lambda execution role itself does not receive SSM or data-store permissions. Do not attach broad Administrator policies just to deploy this template. A Git connection requires repository access through the provider flow; no personal access token should be committed to the repository.

### Deployment commands and prerequisites

For the frontend, the prerequisite is a Git repo/branch that the account owner authorizes Amplify to read; create/link the app and deploy from the Amplify console. This avoids hard-coding account IDs, branch names, provider tokens, or a region in source. Do not run a deployment merely to validate the build.

For the optional SAM assistant, follow the commands below after setting the intended region and stack profile in `samconfig.toml`. `sam validate` and `sam build` are local checks; `sam deploy` creates account resources and is a separate, explicit operator action. AWS CLI credentials, SAM CLI, and permission to inspect the CloudFormation change set are prerequisites.

### Region, pricing, and Free Tier notes (checked 2026-10-10)

Amplify currently documents Next.js 15 SSR support. The repository cannot see the owner's account creation date, selected AWS plan, credits, region-specific prices, or quotas, so it cannot establish Free Tier eligibility. AWS's current new-customer offer describes up to $200 in credits, a six-month Free plan, and a 12-month credit expiration; the Amplify pricing page separately lists hosting allowances (including up to 1,000 build minutes, 5 GB CDN storage, 15 GB transfer, 500,000 SSR requests and 100 GB-hours under its Free Tier table). Confirm which offer applies to the specific account in Billing before relying on any allowance. These allowances are not a zero-cost guarantee.

The current Lambda pricing page lists 1 million requests and 400,000 GB-seconds monthly free usage; the API Gateway REST API offer lists 1 million calls/month for up to 12 months for eligible new customers. Traffic beyond allowances, data transfer, log ingestion/storage, repeated builds, SSR request duration, SAM artifact storage, and any Bedrock inference may be billed. Amplify WAF is explicitly paid ($15/month per app plus WAF charges) and is not enabled here. The included API Gateway quota/throttle is a best-effort abuse control and not a hard spending cap.

Before creating resources, the account owner should set a monthly cost budget and actual/forecast alert thresholds, review Free Tier usage alerts, and verify the deployment region and available model there. AWS Budgets currently allows free budget monitoring/notifications; action-enabled budget pricing has separate terms. Alerts can arrive late and do not necessarily stop spending. Do not enable Strands until its model/region access, data handling, and current model-specific pricing have been reviewed.

Official references: [Amplify Next.js SSR support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [Amplify SSR Compute role](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html), [Amplify hosting pricing](https://aws.amazon.com/amplify/pricing/), [Amplify SSR environment variables](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html), [Parameter Store pricing](https://aws.amazon.com/systems-manager/pricing/), [SecureString access control](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-restrict-decryption.html), [AWS Free Tier and credits](https://aws.amazon.com/free/), [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), [AWS Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/), and [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/). Verify again before deployment; prices and account offers can change.

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

After deployment, inspect the `ExplainApiUrl` output and create/retrieve the generated API key in API Gateway without printing it. For Amplify, save the key directly as an SSM `SecureString` at the configured parameter name; configure `SOLARSMART_AI_ENDPOINT`, `SOLARSMART_AI_API_KEY_PARAMETER`, and `SOLARSMART_AI_SECRET_REGION` as non-secret Amplify build variables, then attach the SSR Compute role described above. Do not set the key in an Amplify variable or write it to `.env.production`. For non-Amplify server hosting, a protected server runtime variable named `SOLARSMART_AI_API_KEY` remains supported. Then submit a test question while authenticated. Check the assistant reports Strands only when enabled; when disabled, unauthenticated, missing permission, or unreachable it should report local fallback. Verify Lambda errors and duration, API Gateway responses, and log retention in CloudWatch. Never paste a real user assessment into a test request unless its disclosure has been reviewed.

SAM package artifacts are uploaded to an S3 deployment bucket (`resolve_s3 = true`); SAM may create or reuse this bucket. It is separate from the application and is not public website storage. Inspect its name, region, access controls, and retained artifacts. Remove only an artifact bucket dedicated to this app after its stack is gone and its contents have been reviewed.

### Resources and cost review

The template creates an API Gateway REST API/stage and key/usage plan, one Lambda, one least-privilege IAM role, and one CloudWatch log group. SAM deployment also uses an S3 artifact bucket. Amplify's optional SSR role reads one Parameter Store standard SecureString; standard Parameter Store storage and default-throughput API interactions currently have no additional charge, while KMS request usage and higher throughput are priced per current terms. AWS-managed KMS keys have no monthly key fee. With Strands enabled, Lambda can invoke the selected Bedrock model. Requests, compute duration, logs and retention, artifacts/storage/requests, data transfer, and model tokens can incur charges. A custom domain, WAF, S3 user uploads, DynamoDB, Cognito, and hosted Next.js infrastructure are not created by the SAM template.

Before confirming, verify the current official [AWS Free Tier terms](https://aws.amazon.com/free/), [Lambda pricing](https://aws.amazon.com/lambda/pricing/), [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/), [Parameter Store pricing](https://aws.amazon.com/systems-manager/pricing/), [KMS pricing](https://aws.amazon.com/kms/pricing/), [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), region availability, and account-specific quotas. Consider AWS Budgets and alerts as monitoring aids; they are not instantaneous hard spending caps. API Gateway usage-plan quotas and throttles are also best-effort, not guaranteed cost ceilings.

### Rollback and cleanup

- To roll back application code/configuration, redeploy the last reviewed template/configuration and check the CloudFormation events and API output. For a failed stack update, inspect CloudFormation status before retrying; allow automatic rollback to finish.
- To remove the optional stack after confirming the exact account, region, and stack name, the sample dev command is `sam delete --stack-name solarsmart-assistant-dev --region us-east-1` (substitute the values you configured). Review every deletion prompt. This removes the API, Lambda, role, usage plan/key resources, and log group owned by the stack; its log history is therefore deleted. Export logs first if retention is required.
- Separately inspect and clean the SAM artifact S3 bucket only if dedicated to this app, and remove the Next.js endpoint/key from the server environment. Revoke/rotate keys if they may have been exposed. Verify no stack resources remain in CloudFormation and check billing/cost tools for delayed usage charges.
- For production, first stop traffic or remove the frontend endpoint, then delete the stack in a planned maintenance window. Preserve any evidence/logs that policy requires before deleting.

## LocalStack

LocalStack is not a project dependency and provides no benefit to the current local-first calculator. SAM Local already exercises the implemented Lambda/API handler. If a future adapter uses S3, DynamoDB, or Cognito, evaluate the exact service/API operations against the chosen LocalStack edition and its current licensing/features; support differs by edition and can change. Bedrock inference is not made free or locally available merely by using LocalStack. Do not install or run LocalStack for the standard demo.

## Validation status and limits

Application tests use mocked model calls and Parameter Store calls; backend unit tests exercise request validation and deterministic fallback without AWS. SAM template validation/build and Lambda emulation require SAM CLI (and Docker for local invocation). If SAM CLI is not installed on Windows, download and verify the current 64-bit MSI from the [official AWS SAM CLI installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), open a new PowerShell window, and confirm `sam --version`. From the repository root, run `sam validate --lint` and `sam build --config-env default`. AWS documentation notes SAM validation may require configured AWS credentials; validation does not deploy a stack. Docker Desktop/Engine is needed for `sam local start-api`, not for the SAM template syntax/lint check. `sam deploy` remains a separate explicit operator step. A successful local SAM run does not prove an AWS change set, account permissions, region/model access, pricing, or deployed endpoint security. Revalidate against the current SAM CLI and review the generated change set before any deployment.
