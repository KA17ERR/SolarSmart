import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasSupabaseConfiguration: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  signUp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/config", () => ({ hasSupabaseConfiguration: mocks.hasSupabaseConfiguration }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }));

import { signupAction } from "./auth-actions";

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
});
