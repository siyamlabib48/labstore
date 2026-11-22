import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { supabase } from "@/api/supabaseClient";
import { loginWithGoogle } from "@/lib/authMfa";
import { safeReturnTo } from "@/lib/authReturnTo";
import { authErrorMessage } from "@/lib/authErrorMessage";

// /mfa: two jobs, both on Supabase Auth TOTP.
// - Landing here right after a password sign-in with a verified factor
//   means a challenge is still owed (session at aal1): enter the 6-digit
//   code to finish signing in.
// - Opened directly it is the two-factor settings page: sign in if
//   needed, then enrol an authenticator app or remove the factor.
export default function Mfa() {
  const returnTo = safeReturnTo();
  const [phase, setPhase] = useState("loading"); // loading | signin | challenge | manage
  const [factor, setFactor] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setPhase("signin");
      return;
    }
    const [{ data: aal }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    const verified = (factors?.totp || []).find((f) => f.status === "verified") || null;
    setFactor(verified);
    if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2" && verified) {
      setPhase("challenge");
    } else {
      setPhase("manage");
    }
  }, []);

  useEffect(() => {
    refresh().catch((err) => {
      setError(authErrorMessage(err, "Something went wrong. Please try again."));
      setPhase("signin");
    });
  }, [refresh]);

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AuthLayout
      icon={ShieldCheck}
      title={phase === "challenge" ? "Two-factor authentication" : "Two-factor settings"}
      subtitle={
        phase === "challenge"
          ? "Enter the code from your authenticator app"
          : phase === "signin"
            ? "Sign in to manage two-factor authentication"
            : "Protect your account with an authenticator app"
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {phase === "signin" && <SignInStep onDone={refresh} onError={setError} />}
      {phase === "challenge" && factor && (
        <CodeStep
          factorId={factor.id}
          onError={setError}
          onVerified={() => {
            window.location.href = returnTo;
          }}
        />
      )}
      {phase === "manage" && (
        <ManageStep factor={factor} onChanged={refresh} onError={setError} />
      )}
    </AuthLayout>
  );
}

function SignInStep({ onDone, onError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    onError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await onDone();
    } catch (err) {
      onError(authErrorMessage(err, "That email and password do not match. Check both and try again."));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      await loginWithGoogle(safeReturnTo() !== "/" ? safeReturnTo() : "/mfa");
    } catch (err) {
      onError(authErrorMessage(err, "Unable to sign in with Google. Please try again."));
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full h-12 text-sm font-medium" onClick={google}>
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="mfa-email" type="email" autoComplete="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mfa-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="mfa-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={busy}>
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Continue
        </Button>
      </form>
    </div>
  );
}

// One 6-digit code entry, shared by the sign-in challenge and by enrolment
// verification: both are a Supabase challenge + verify pair.
function CodeStep({ factorId, onVerified, onError, submitLabel = "Verify" }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    onError("");
    setBusy(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch (err) {
      onError(authErrorMessage(err, "That code is not correct. Check the 6 digits and try again."));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus autoComplete="one-time-code">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button className="w-full h-12 font-medium" onClick={submit} disabled={busy || code.length < 6}>
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}

function ManageStep({ factor, onChanged, onError }) {
  const [enrolment, setEnrolment] = useState(null);
  const [busy, setBusy] = useState(false);

  const startEnrol = async () => {
    onError("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrolment(data);
    } catch (err) {
      onError(authErrorMessage(err, "Could not start setup. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    onError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      await onChanged();
    } catch (err) {
      onError(authErrorMessage(err, "Could not remove two-factor authentication. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (enrolment) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
        </p>
        <div className="flex justify-center">
          <img src={enrolment.totp.qr_code} alt="Two-factor QR code" className="w-44 h-44" />
        </div>
        <p className="text-xs text-muted-foreground text-center break-all">
          Or enter this secret manually: {enrolment.totp.secret}
        </p>
        <CodeStep
          factorId={enrolment.id}
          onError={onError}
          submitLabel="Confirm and turn on"
          onVerified={async () => {
            setEnrolment(null);
            await onChanged();
          }}
        />
      </div>
    );
  }

  if (factor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Two-factor authentication is on</p>
            <p className="text-muted-foreground">{factor.friendly_name || "Authenticator app"}</p>
          </div>
        </div>
        <Button variant="destructive" className="w-full h-12 font-medium" onClick={remove} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Remove authenticator
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Add an authenticator app (Google Authenticator, Authy, 1Password and similar) as a second step at sign-in.
      </p>
      <Button className="w-full h-12 font-medium" onClick={startEnrol} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldPlus className="w-4 h-4 mr-2" />}
        Set up authenticator
      </Button>
    </div>
  );
}
