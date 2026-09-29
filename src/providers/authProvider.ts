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

        try {
          const { data: secData } = await supabaseClient.rpc("get_security_question", {
            p_email: email.trim().toLowerCase(),
          });
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            formattedMessage = "Your email address has not been confirmed yet. Please check your inbox or resend the verification email.";
          } else if (secData && secData.success === false && secData.error === "No account found with this email address.") {
            formattedMessage = "No account found with this email address. Please create an account to get started.";
          } else if (error.message?.toLowerCase().includes("invalid login credentials")) {
            formattedMessage = "Incorrect password. Please verify your password or use password recovery.";
          }
        } catch {
          // Fall back to default error
          if (error.message?.toLowerCase().includes("email not confirmed")) {
            formattedMessage = "Your email address has not been confirmed yet. Please check your inbox or resend the verification email.";
          }
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
      } catch (storageErr) {
        devLog.warn("Auth", "Could not cache active user to localStorage (storage restricted):", storageErr);
      }
      devLog.info("Auth", "Authentication successful", activeUser);

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

  register: async ({ email, password, name, householdType, securityQuestion, securityAnswer }: any) => {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();
    const trimmedAnswer = (securityAnswer || "").trim().toLowerCase();
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

    if (trimmedAnswer && trimmedAnswer === trimmedEmail) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: "Security answer cannot be your email address.",
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
            security_question: securityQuestion || "",
            security_answer: (securityAnswer || "").trim().toLowerCase(),
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

      // Record security question map in local persistent cache for rapid password recovery
      if (securityQuestion && securityAnswer) {
        try {
          const secDirectory = JSON.parse(localStorage.getItem("powerforecast_sec_dir") || "{}");
          secDirectory[trimmedEmail] = {
            question: securityQuestion,
            answer: securityAnswer.trim().toLowerCase(),
          };
          localStorage.setItem("powerforecast_sec_dir", JSON.stringify(secDirectory));
        } catch (e) {
          devLog.warn("Auth", "Failed to cache security directory entry", e);
        }
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
    localStorage.removeItem("powerforecast_active_user");
    devLog.info("Auth", "User logged out successfully");
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  check: async () => {
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error || !data?.session?.user) {
        // If offline during check, preserve session if cached user exists
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          devLog.warn("Auth", "Device is offline during session check; preserving cached session");
          try {
            const cached = localStorage.getItem("powerforecast_active_user");
            if (cached) {
              return { authenticated: true };
            }
          } catch {}
        }
        try {
          localStorage.removeItem("powerforecast_active_user");
        } catch {}
        return {
          authenticated: false,
          redirectTo: "/login",
          logout: true,
        };
      }

      return {
        authenticated: true,
      };
    } catch {
      try {
        localStorage.removeItem("powerforecast_active_user");
      } catch {}
      return {
        authenticated: false,
        redirectTo: "/login",
        logout: true,
      };
    }
  },

  getIdentity: async () => {
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authData?.user) {
        return null;
      }

      const user = authData.user;

      // Query accounts table for customized profile metadata
      const { data: profile } = await supabaseClient
        .from("accounts")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const activeUser = {
        id: user.id,
        name: profile?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: profile?.email || user.email || "",
        avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`,
        householdType: user.user_metadata?.householdType || profile?.household_type || "Residential",
        provider: profile?.provider || "email",
      };

      localStorage.setItem("powerforecast_active_user", JSON.stringify(activeUser));
      return activeUser;
    } catch (e) {
      devLog.warn("Auth", "Error fetching user identity", e);
      return null;
    }
  },

  onError: async (error) => {
    console.error("Auth error:", error);
    return { error };
  },
};

export default authProvider;
