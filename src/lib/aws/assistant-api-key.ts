import "server-only";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSecret: { key: string; value: string; expiresAt: number } | null = null;
let inFlight: { key: string; promise: Promise<string | null> } | null = null;
const clients = new Map<string, SSMClient>();

/**
 * Resolve the API Gateway key only inside the Next.js server runtime.
 * Local/deployment environments may inject a server-only value directly;
 * Amplify should use a SecureString in Parameter Store and its SSR Compute role.
 */
export async function getAssistantApiKey(): Promise<string | null> {
  const directKey = process.env.SOLARSMART_AI_API_KEY?.trim();
  if (directKey) return directKey;

  const parameterName = process.env.SOLARSMART_AI_API_KEY_PARAMETER?.trim();
  const region = process.env.SOLARSMART_AI_SECRET_REGION?.trim();
  if (!parameterName || !region) return null;

  const cacheKey = `${region}:${parameterName}`;
  const now = Date.now();
  if (cachedSecret?.key === cacheKey && now < cachedSecret.expiresAt) return cachedSecret.value;
  if (inFlight?.key === cacheKey) return inFlight.promise;

  const promise = (async () => {
    try {
      let client = clients.get(region);
      if (!client) {
        client = new SSMClient({ region });
        clients.set(region, client);
      }
      const result = await client.send(new GetParameterCommand({ Name: parameterName, WithDecryption: true }));
      const value = result.Parameter?.Value?.trim();
      if (!value || value.length > 512) return null;
      cachedSecret = { key: cacheKey, value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    } catch {
      // Fail closed. The route keeps the deterministic local assistant available.
      // Never log SDK errors because provider messages can contain sensitive context.
      return null;
    } finally {
      if (inFlight?.key === cacheKey) inFlight = null;
    }
  })();
  inFlight = { key: cacheKey, promise };
  return promise;
}
