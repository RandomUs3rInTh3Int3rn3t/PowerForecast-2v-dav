import { AuthProvider } from "@refinedev/core";
import { supabaseClient } from "../lib/supabaseClient";
import { devLog } from "../lib/devLogger";

export const authProvider: AuthProvider = {
  login: async ({ email, password, rememberMe }: any) => {
    if (!email || !password) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: "Please enter both email and password.",
        },
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        devLog.warn("Auth", `Supabase login failed: ${error.message}`);
        let formattedMessage = error.message || "Invalid email or password.";

        if (error.message?.toLowerCase().includes("email not confirmed")) {
          formattedMessage = "Your email address has not been confirmed yet. Please check your inbox or resend the verification email.";
        } else if (error.message?.toLowerCase().includes("invalid login credentials")) {
          formattedMessage = "Incorrect email or password. Please verify your credentials or use password recovery.";
        }

        return {
          success: false,
          error: {
            name: error.name || "LoginError",
            message: formattedMessage,
            status: error.status,
            code: (error as any).code,
            rawError: error,
          },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: {
            name: "LoginError",
            message: "User session could not be established.",
          },
        };
      }

      // Fetch user profile from accounts table
      let accountProfile: any = null;
      try {
        const { data: profile } = await supabaseClient
          .from("accounts")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();
        accountProfile = profile;
      } catch (profileErr) {
        devLog.warn("Auth", "Could not fetch user profile record:", profileErr);
      }

      const activeUser = {
        id: data.user.id,
        email: data.user.email || email,
        name: accountProfile?.full_name || data.user.user_metadata?.name || email.split("@")[0],
        avatar: accountProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        role: "authenticated",
        householdType: data.user.user_metadata?.householdType || accountProfile?.household_type || "Residential",
      };

      try {
        localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
        localStorage.setItem("powerforecast_remember_me", rememberMe ? "true" : "false");
        sessionStorage.setItem("powerforecast_session_active", "true");
      } catch (storageErr) {
        devLog.warn("Auth", "Could not cache active user to localStorage (storage restricted):", storageErr);
      }
      devLog.info("Auth", "Authentication successful (rememberMe=" + Boolean(rememberMe) + ")", activeUser);

      return {
        success: true,
        redirectTo: "/dashboard",
      };
    } catch (err: any) {
      devLog.error("Auth", "Unexpected login error:", err);
      return {
        success: false,
        error: {
          name: "LoginError",
          message: err?.message || "An unexpected error occurred during login.",
        },
      };
    }
  },

  register: async ({ email, password, name, householdType }: any) => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();
    const trimmedName = (name || "").trim();

    if (!trimmedEmail || !trimmedPassword) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: "Please provide an email and password.",
        },
      };
    }

    if (trimmedName) {
      const nameRegex = /^[a-zA-Z\s-]+$/;
      if (!nameRegex.test(trimmedName)) {
        return {
          success: false,
          error: {
            name: "RegisterError",
            message: "Full Name can only contain letters, spaces, and hyphens.",
          },
        };
      }
    }

    if (trimmedPassword.toLowerCase() === trimmedEmail) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: "Password cannot be identical to your email address.",
        },
      };
    }


    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            name: name?.trim() || trimmedEmail.split("@")[0],
            householdType: householdType || "Residential (Meralco 230V)",
          },
          // Tell Supabase where to send the user after they click the email link
          emailRedirectTo: `${window.location.origin}/#/verified`,
        },
      });

      if (error) {
        devLog.warn("Auth", `Supabase registration failed: ${error.message}`);
        const isDuplicate =
          error.message?.toLowerCase().includes("already registered") ||
          error.message?.toLowerCase().includes("already in use") ||
          error.message?.toLowerCase().includes("user already exists");
        const isEmailError = error.message?.toLowerCase().includes("confirmation email") || error.message?.toLowerCase().includes("sending email");

        let formattedMsg = error.message || "Failed to create account.";
        if (isDuplicate) {
          formattedMsg = "This email is already registered. Please sign in or use password recovery.";
        } else if (isEmailError) {
          formattedMsg = "Unable to dispatch confirmation email. Please ensure 'noreply@comugallery.me' is set as the Sender Email in Supabase SMTP Settings.";
        }

        return {
          success: false,
          error: {
            name: "RegisterError",
            message: formattedMsg,
          },
        };
      }

      // Detect Supabase duplicate email response (empty identities array)
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        devLog.warn("Auth", `Registration rejected: email already registered (${trimmedEmail})`);
        return {
          success: false,
          error: {
            name: "RegisterError",
            message: "This email is already registered. Please sign in or use password recovery.",
          },
        };
      }


      // If a session was created during sign up, set active user and go directly to dashboard
      let userSession = data?.session;
      let userId = data?.user?.id;

      if (!userSession && data?.user) {
        // If Supabase didn't return an active session immediately, log in with password
        try {
          const signInRes = await supabaseClient.auth.signInWithPassword({
            email: trimmedEmail,
            password: password.trim(),
          });
          if (signInRes.data?.session) {
            userSession = signInRes.data.session;
            userId = signInRes.data.user?.id || userId;
          }
        } catch (signInErr) {
          devLog.warn("Auth", "Automatic post-registration login attempt:", signInErr);
        }
      }

      if (userId) {
        const activeUser = {
          id: userId,
          email: trimmedEmail,
          name: name?.trim() || trimmedEmail.split("@")[0],
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedEmail}`,
          role: "authenticated",
          householdType: householdType || "Residential",
        };
        try {
          localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
        } catch (storageErr) {
          devLog.warn("Auth", "Could not cache active user during registration:", storageErr);
        }
      }

      // Check if email confirmation is required by Supabase Auth
      const requiresEmailConfirmation = !userSession && Boolean(data?.user);

      if (requiresEmailConfirmation) {
        devLog.info("Auth", `Registration requires email verification for ${trimmedEmail}. Redirecting to /verify-email.`);
        return {
          success: true,
          redirectTo: `/verify-email?email=${encodeURIComponent(trimmedEmail)}`,
        } as any;
      }

      devLog.info("Auth", "User registered successfully with active session. Proceeding to dashboard.");
      return {
        success: true,
        redirectTo: "/dashboard",
      } as any;
    } catch (err: any) {
      devLog.error("Auth", "Unexpected registration error:", err);
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: err?.message || "An unexpected error occurred during registration.",
        },
      };
    }
  },

  logout: async () => {
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      devLog.warn("Auth", "Sign out error:", err);
    }
    try {
      localStorage.removeItem("powerforecast_active_user");
      localStorage.removeItem("powerforecast_remember_me");
      sessionStorage.removeItem("powerforecast_session_active");
    } catch {}
    devLog.info("Auth", "User logged out successfully");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    try {
      const rememberMe = localStorage.getItem("powerforecast_remember_me");
      const sessionActive = sessionStorage.getItem("powerforecast_session_active");

      // If Remember Me was unchecked and browser/tab was closed, expire the session immediately
      if (rememberMe === "false" && !sessionActive) {
        devLog.info("Auth", "Remember Me was disabled and browser tab was closed. Clearing session.");
        try {
          await supabaseClient.auth.signOut();
          localStorage.removeItem("powerforecast_active_user");
          localStorage.removeItem("powerforecast_remember_me");
        } catch {}
        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
        };
      }

      const { data, error } = await supabaseClient.auth.getSession();
      if (error || !data?.session?.user) {
        // If cached user exists and rememberMe is not explicitly false, preserve session during refresh
        const cached = localStorage.getItem("powerforecast_active_user");
        if (cached && rememberMe !== "false") {
          return { authenticated: true };
        }
        try {
          localStorage.removeItem("powerforecast_active_user");
          localStorage.removeItem("powerforecast_remember_me");
          sessionStorage.removeItem("powerforecast_session_active");
        } catch {}
        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
        };
      }

      // Session is active and verified
      try {
        sessionStorage.setItem("powerforecast_session_active", "true");
      } catch {}

      return {
        authenticated: true,
      };
    } catch {
      const cached = localStorage.getItem("powerforecast_active_user");
      const rememberMe = localStorage.getItem("powerforecast_remember_me");
      if (cached && rememberMe !== "false") {
        return { authenticated: true };
      }
      try {
        localStorage.removeItem("powerforecast_active_user");
        localStorage.removeItem("powerforecast_remember_me");
        sessionStorage.removeItem("powerforecast_session_active");
      } catch {}
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }
  },

  getIdentity: async () => {
    // Instant synchronous cache hydration to eliminate refresh race condition
    let cachedActiveUser: any = null;
    try {
      const raw = localStorage.getItem("powerforecast_active_user");
      if (raw) cachedActiveUser = JSON.parse(raw);
    } catch {}

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authData?.user) {
        return cachedActiveUser || null;
      }

      const user = authData.user;

      // Query accounts table for customized profile metadata
      let accountProfile: any = null;
      try {
        const { data: profile } = await supabaseClient
          .from("accounts")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        accountProfile = profile;
      } catch {}

      const activeUser = {
        id: user.id,
        name: accountProfile?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || cachedActiveUser?.name || "User",
        email: accountProfile?.email || user.email || cachedActiveUser?.email || "",
        avatar: accountProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`,
        householdType: user.user_metadata?.householdType || accountProfile?.household_type || "Residential",
        provider: accountProfile?.provider || "email",
      };

      localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
      return activeUser;
    } catch (e) {
      devLog.warn("Auth", "Error fetching user identity", e);
      return cachedActiveUser || null;
    }
  },

  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  },
};

export default authProvider;
