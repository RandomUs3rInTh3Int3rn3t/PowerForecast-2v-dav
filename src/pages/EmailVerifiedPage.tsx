import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabaseClient, APP_VERSION } from "../lib/supabaseClient";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";

/** Shared channel name for cross-tab verification communication */
const AUTH_CHANNEL = "powerforecast-auth";

export const EmailVerifiedPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabCloseFailed, setTabCloseFailed] = useState(false);

  useEffect(() => {
    // Broadcast verification success to the original (waiting) tab
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.postMessage({ type: "VERIFICATION_SUCCESS", timestamp: Date.now() });
      setTimeout(() => channel.close(), 500);
    } catch {
      // BroadcastChannel not supported
    }

    try {
      localStorage.setItem(
        "powerforecast_verification_signal",
        JSON.stringify({ verified: true, timestamp: Date.now() })
      );
    } catch {
      // Ignore localStorage errors
    }

    const closeTimer = setTimeout(() => {
      window.close();
      setTimeout(() => setTabCloseFailed(true), 300);
    }, 1000);

    return () => clearTimeout(closeTimer);
  }, []);

  const handleManualLogin = async () => {
    await supabaseClient.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="pf-auth flex min-h-screen flex-col justify-between bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <div />
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-8">
        <Card className="w-full max-w-[460px] border-border bg-card/95 shadow-xl backdrop-blur-sm text-center p-2">
          <CardHeader className="space-y-3 pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-75">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Email Verified!
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground sm:text-sm leading-relaxed max-w-sm mx-auto">
              {tabCloseFailed
                ? "Thank you for verifying your email address. Your PowerForecast account is now active."
                : "Your account has been verified. Returning you to the app..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!tabCloseFailed ? (
              <div className="flex justify-center py-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground italic">
                  You can now return to your original tab or proceed to sign in directly below.
                </p>
                <Button
                  size="lg"
                  className="w-full font-semibold shadow-xs"
                  onClick={handleManualLogin}
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-center pt-2 pb-2 text-[11px] text-muted-foreground">
            PowerForecast Account Security
          </CardFooter>
        </Card>
      </main>

      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>
    </div>
  );
};

export default EmailVerifiedPage;
