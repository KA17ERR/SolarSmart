import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasSupabaseConfiguration: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/config", () => ({ hasSupabaseConfiguration: mocks.hasSupabaseConfiguration }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }));

import { loginAction, signupAction } from "./auth-actions";

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

  it("starts a session and redirects directly to the dashboard when confirmations are disabled", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: { access_token: "session" } }, error: null });
    await expect(signupAction({}, signupData())).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.signUp).toHaveBeenCalledWith({ email: "solar@example.com", password: "secure-password", options: { data: { display_name: "Solar User" } } });
  });

  it("explains the required Supabase setting if signup does not return a session", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: "user-1" }, session: null }, error: null });
    const result = await signupAction({}, signupData());
    expect(result.error).toContain("Turn off the email confirmation requirement");
    expect(mocks.redirect).not.toHaveBeenCalled();
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
