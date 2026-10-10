import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasSupabaseConfiguration: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/config", () => ({ hasSupabaseConfiguration: mocks.hasSupabaseConfiguration }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }));

import { loginAction, signupAction, resendSignupVerificationAction } from "./auth-actions";

function signupData() {
  const data = new FormData();
  data.set("name", "Solar User");
  data.set("email", "solar@example.com");
  data.set("password", "secure-password");
  data.set("confirmPassword", "secure-password");
  return data;
}

describe("signupAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasSupabaseConfiguration.mockReturnValue(true);
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { signUp: mocks.signUp } });
  });

  it("starts a session and redirects directly to the dashboard when signup returns one", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: { access_token: "session" } }, error: null });
    await expect(signupAction({}, signupData())).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.signUp).toHaveBeenCalledWith({ email: "solar@example.com", password: "secure-password", options: { data: { display_name: "Solar User" }, emailRedirectTo: "http://localhost:3000/auth/callback?next=/dashboard" } });
  });

  it("explains email verification if signup does not return a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });
    const result = await signupAction({}, signupData());
    expect(result.message).toContain("Check your inbox for the Supabase verification link");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("reports the exact missing Supabase environment variables instead of pretending signup is available", async () => {
    mocks.hasSupabaseConfiguration.mockReturnValue(false);
    const result = await signupAction({}, signupData());
    expect(result.error).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(result.error).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(result.error).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("shows an actionable message when Supabase rejects a weak password", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "weak_password" } });
    const result = await signupAction({}, signupData());
    expect(result.error).toContain("Choose a stronger password");
  });

  it("keeps existing-account responses generic", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_already_exists" } });
    const result = await signupAction({}, signupData());
    expect(result.error).toContain("If you already registered");
    expect(result.error).not.toContain("solar@example.com");
  });
});

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasSupabaseConfiguration.mockReturnValue(true);
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { signInWithPassword: mocks.signInWithPassword } });
  });

  it("returns a successful login to the protected destination it requested", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const data = new FormData();
    data.set("email", "solar@example.com");
    data.set("password", "secure-password");
    data.set("next", "/planner?project=project-1");
    await expect(loginAction({}, data)).rejects.toThrow("REDIRECT:/planner?project=project-1");
  });

  it("does not allow an external login redirect", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const data = new FormData();
    data.set("email", "solar@example.com");
    data.set("password", "secure-password");
    data.set("next", "//attacker.example");
    await expect(loginAction({}, data)).rejects.toThrow("REDIRECT:/dashboard");
  });
});

describe("resendSignupVerificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasSupabaseConfiguration.mockReturnValue(true);
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { resend: mocks.resend } });
  });

  it("resends a confirmation link to the app callback without exposing account existence", async () => {
    mocks.resend.mockResolvedValue({ error: null });
    const data = new FormData();
    data.set("email", "solar@example.com");
    const result = await resendSignupVerificationAction({}, data);
    expect(result.message).toContain("If the address has a pending signup");
    expect(mocks.resend).toHaveBeenCalledWith({ type: "signup", email: "solar@example.com", options: { emailRedirectTo: "http://localhost:3000/auth/callback?next=/dashboard" } });
  });

  it("explains resend rate limits", async () => {
    mocks.resend.mockResolvedValue({ error: { code: "over_email_send_rate_limit" } });
    const data = new FormData();
    data.set("email", "solar@example.com");
    const result = await resendSignupVerificationAction({}, data);
    expect(result.error).toContain("rate-limiting verification emails");
  });
});
