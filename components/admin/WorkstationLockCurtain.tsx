"use client";

import {
  AlertCircleIcon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Key01Icon,
  LockPasswordIcon,
  SquareLock02Icon,
  UserIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAdminAuth,
  type TotpChallengeState,
} from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { FLYOUT_IN, FLYOUT_OUT } from "@/lib/windows";

const OTP_LENGTH = 6;

function formatRecoveryInput(raw: string): string {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

function formatCountdown(remainingSeconds: number): string {
  const clamped = Math.max(0, remainingSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * 03 · Workstation Lock Curtain
 *
 * Two-step owner unlock surface:
 * - Step 1 ("credentials"): Username + Password only (stealthy — zero hint of
 *   2FA to public visitors).
 * - Step 2 ("totp"): Triggered only after primary credentials succeed when TOTP
 *   is configured and the browser isn't trusted. Supports 6-box segmented OTP
 *   with paste & auto-submit, emergency recovery codes, and 30-day browser trust.
 */
export function WorkstationLockCurtain() {
  const { lockOpen, closeLockCurtain, signInPrimary, verifyTotpChallenge } =
    useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [challenge, setChallenge] = useState<TotpChallengeState | null>(null);
  const [digits, setDigits] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill(""),
  );
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const recoveryRef = useRef<HTMLInputElement>(null);
  const autoSubmittedCodeRef = useRef<string | null>(null);

  const resetToCredentials = useCallback((nextError: string | null = null) => {
    setChallenge(null);
    setDigits(Array(OTP_LENGTH).fill(""));
    setUseRecovery(false);
    setRecoveryCode("");
    setTrustDevice(false);
    setRemainingSec(0);
    setPassword("");
    setSubmitting(false);
    setError(nextError);
    autoSubmittedCodeRef.current = null;
  }, []);

  useEffect(() => {
    if (!lockOpen) {
      resetToCredentials(null);
      setShowPassword(false);
      return;
    }
    const focusTimer = window.setTimeout(() => {
      if (challenge) {
        if (useRecovery) recoveryRef.current?.focus();
        else otpRefs.current[0]?.focus();
      } else {
        usernameRef.current?.focus();
      }
    }, 90);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        event.preventDefault();
        if (challenge) {
          resetToCredentials(null);
        } else {
          closeLockCurtain();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    challenge,
    closeLockCurtain,
    lockOpen,
    resetToCredentials,
    submitting,
    useRecovery,
  ]);

  // Live 90s step-up challenge countdown
  useEffect(() => {
    if (!challenge) return;
    const tick = () => {
      const secs = Math.max(
        0,
        Math.ceil((challenge.expiresAtMs - Date.now()) / 1000),
      );
      setRemainingSec(secs);
      if (secs <= 0) {
        resetToCredentials(
          "Verification challenge expired. Enter your password again.",
        );
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [challenge, resetToCredentials]);

  const submitTotpCode = useCallback(
    async (codeToVerify: string, recoveryMode: boolean) => {
      if (!challenge || submitting) return;
      const trimmed = codeToVerify.trim();
      if (!trimmed) {
        setError(
          recoveryMode
            ? "Enter a recovery code."
            : "Enter the 6-digit verification code.",
        );
        setShakeKey((n) => n + 1);
        return;
      }

      setSubmitting(true);
      setError(null);
      const result = await verifyTotpChallenge({
        challengeToken: challenge.challengeToken,
        code: trimmed,
        useRecoveryCode: recoveryMode,
        trustDevice: !recoveryMode && trustDevice,
      });
      setSubmitting(false);

      if (!result.ok) {
        if (result.expiredChallenge) {
          resetToCredentials(
            result.error ||
              "Verification challenge expired. Enter your password again.",
          );
          setShakeKey((n) => n + 1);
          window.setTimeout(() => passwordRef.current?.focus(), 80);
          return;
        }
        setError(result.error);
        setShakeKey((n) => n + 1);
        if (recoveryMode) {
          setRecoveryCode("");
          window.setTimeout(() => recoveryRef.current?.focus(), 60);
        } else {
          setDigits(Array(OTP_LENGTH).fill(""));
          autoSubmittedCodeRef.current = null;
          window.setTimeout(() => otpRefs.current[0]?.focus(), 60);
        }
      }
    },
    [
      challenge,
      resetToCredentials,
      submitting,
      trustDevice,
      verifyTotpChallenge,
    ],
  );

  // Auto-submit once all 6 digits are filled in authenticator mode
  useEffect(() => {
    if (!challenge || useRecovery || submitting) return;
    const joined = digits.join("");
    if (
      joined.length === OTP_LENGTH &&
      /^\d{6}$/.test(joined) &&
      autoSubmittedCodeRef.current !== joined
    ) {
      autoSubmittedCodeRef.current = joined;
      void submitTotpCode(joined, false);
    }
  }, [challenge, digits, submitTotpCode, submitting, useRecovery]);

  async function handlePrimarySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError("Enter both your username and password.");
      setShakeKey((n) => n + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signInPrimary({
      username: username.trim(),
      password,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      setPassword("");
      setShakeKey((n) => n + 1);
      return;
    }

    if (result.step === "totp") {
      setPassword("");
      setDigits(Array(OTP_LENGTH).fill(""));
      setUseRecovery(false);
      setRecoveryCode("");
      autoSubmittedCodeRef.current = null;
      setChallenge(result.challenge);
    }
  }

  function handleStep2Submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (useRecovery) {
      void submitTotpCode(recoveryCode, true);
    } else {
      void submitTotpCode(digits.join(""), false);
    }
  }

  function handleOtpSlotChange(index: number, rawValue: string) {
    if (error) setError(null);
    const numeric = rawValue.replace(/\D/g, "");
    if (!numeric) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      autoSubmittedCodeRef.current = null;
      return;
    }

    // Handle multi-digit autofill (e.g. one-time-code fill into slot 0)
    if (numeric.length > 1) {
      const chars = numeric.slice(0, OTP_LENGTH - index).split("");
      setDigits((prev) => {
        const next = [...prev];
        chars.forEach((ch, offset) => {
          if (index + offset < OTP_LENGTH) {
            next[index + offset] = ch;
          }
        });
        return next;
      });
      const focusIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
      otpRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = numeric.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace") {
      if (digits[index]) {
        event.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
        autoSubmittedCodeRef.current = null;
      } else if (index > 0) {
        event.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        autoSubmittedCodeRef.current = null;
        otpRefs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    if (error) setError(null);
    const sliced = pasted.slice(0, OTP_LENGTH).split("");
    const filled = Array(OTP_LENGTH)
      .fill("")
      .map((_, i) => sliced[i] ?? "");
    setDigits(filled);
    const focusIdx = Math.min(sliced.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
  }

  return (
    <AnimatePresence>
      {lockOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workstation-lock-title"
          aria-describedby="workstation-lock-subtitle"
          className="workstation-lock-curtain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onPointerDown={(event) => {
            // A secondary-button press belongs to the context menu; it must
            // not dismiss the curtain before `contextmenu` can open it.
            if (
              event.button === 0 &&
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeLockCurtain();
            }
          }}
        >
          <div className="workstation-lock-backdrop" aria-hidden />
          <div className="workstation-lock-ambient" aria-hidden />

          <motion.div
            key={shakeKey}
            className="workstation-lock-column"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={
              shakeKey > 0 && error
                ? {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -7, 7, -5, 5, 0],
                  }
                : { opacity: 1, y: 0, scale: 1, x: 0 }
            }
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={
              shakeKey > 0 && error
                ? { duration: 0.34, ease: "easeInOut" }
                : FLYOUT_IN
            }
          >
            <div className="workstation-lock-avatar-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/profile-placeholder.jpg"
                alt="Prasad Madhuranga"
                className="workstation-lock-avatar"
                width={76}
                height={76}
              />
              <span className="workstation-lock-badge" aria-hidden>
                <HugeiconsIcon
                  icon={challenge ? Key01Icon : SquareLock02Icon}
                  strokeWidth={2}
                  size={13}
                />
              </span>
            </div>

            <div className="workstation-lock-heading">
              <h2 id="workstation-lock-title" className="workstation-lock-name">
                Prasad Madhuranga
              </h2>
              <p
                id="workstation-lock-subtitle"
                className="workstation-lock-status"
              >
                {challenge
                  ? useRecovery
                    ? "Emergency unlock · Enter recovery code"
                    : "Two-step verification · Enter 6-digit code"
                  : "Workspace locked · Sign in to continue"}
              </p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {!challenge ? (
                <motion.form
                  key="step-credentials"
                  className="workstation-lock-form"
                  onSubmit={handlePrimarySubmit}
                  noValidate
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label className="workstation-lock-field">
                    <span className="sr-only">Username</span>
                    <span className="workstation-lock-field-icon" aria-hidden>
                      <HugeiconsIcon
                        icon={UserIcon}
                        strokeWidth={1.9}
                        size={15}
                      />
                    </span>
                    <input
                      ref={usernameRef}
                      type="text"
                      name="username"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Username"
                      value={username}
                      disabled={submitting}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError(null);
                      }}
                      className="workstation-lock-input"
                    />
                  </label>

                  <label className="workstation-lock-field">
                    <span className="sr-only">Password</span>
                    <span className="workstation-lock-field-icon" aria-hidden>
                      <HugeiconsIcon
                        icon={LockPasswordIcon}
                        strokeWidth={1.9}
                        size={15}
                      />
                    </span>
                    <input
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      disabled={submitting}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      className="workstation-lock-input workstation-lock-input-trailing"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="workstation-lock-eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <HugeiconsIcon
                        icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                        strokeWidth={1.9}
                        size={15}
                      />
                    </button>
                  </label>

                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={FLYOUT_OUT}
                        className="workstation-lock-error"
                      >
                        <HugeiconsIcon
                          icon={AlertCircleIcon}
                          strokeWidth={2}
                          size={14}
                          className="shrink-0"
                        />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="workstation-lock-actions">
                    <Button
                      type="submit"
                      loading={submitting}
                      className="h-9.5 w-full justify-center gap-2 rounded-xl text-sm font-medium"
                    >
                      <span>Unlock workspace</span>
                      <HugeiconsIcon
                        icon={ArrowRight02Icon}
                        strokeWidth={2}
                        size={15}
                      />
                    </Button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={closeLockCurtain}
                      className="workstation-lock-cancel"
                    >
                      Return to workspace
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="step-totp"
                  className="workstation-lock-form"
                  onSubmit={handleStep2Submit}
                  noValidate
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="workstation-lock-step-meta">
                    <span>Authenticator step</span>
                    <span
                      className={`workstation-lock-timer tabular-nums${remainingSec <= 20 ? " is-urgent" : ""}`}
                      aria-label={`${remainingSec} seconds remaining`}
                    >
                      {formatCountdown(remainingSec)}
                    </span>
                  </div>

                  {!useRecovery ? (
                    <div
                      className="workstation-otp-row"
                      role="group"
                      aria-label="6-digit verification code"
                    >
                      {digits.map((digit, idx) => (
                        <div key={idx} className="contents">
                          {idx === 3 && (
                            <span className="workstation-otp-sep" aria-hidden>
                              ·
                            </span>
                          )}
                          <input
                            ref={(el) => {
                              otpRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete={idx === 0 ? "one-time-code" : "off"}
                            aria-label={`Digit ${idx + 1} of 6`}
                            value={digit}
                            disabled={submitting}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              handleOtpSlotChange(idx, e.target.value)
                            }
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            onPaste={handleOtpPaste}
                            className="workstation-otp-slot tabular-nums"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <label className="workstation-lock-field">
                      <span className="sr-only">Emergency recovery code</span>
                      <span className="workstation-lock-field-icon" aria-hidden>
                        <HugeiconsIcon
                          icon={Key01Icon}
                          strokeWidth={1.9}
                          size={15}
                        />
                      </span>
                      <input
                        ref={recoveryRef}
                        type="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="XXXX-XXXX-XXXX"
                        value={recoveryCode}
                        disabled={submitting}
                        onChange={(e) => {
                          setRecoveryCode(formatRecoveryInput(e.target.value));
                          if (error) setError(null);
                        }}
                        className="workstation-lock-input font-mono tracking-wider uppercase"
                      />
                    </label>
                  )}

                  {!useRecovery && challenge.trustDurationDays > 0 && (
                    <label className="workstation-trust-row">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        disabled={submitting}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="workstation-trust-checkbox"
                      />
                      <span>
                        Trust this browser for {challenge.trustDurationDays}{" "}
                        days
                      </span>
                    </label>
                  )}

                  {challenge.recoveryAvailable && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        const nextMode = !useRecovery;
                        setUseRecovery(nextMode);
                        setError(null);
                        setDigits(Array(OTP_LENGTH).fill(""));
                        setRecoveryCode("");
                        autoSubmittedCodeRef.current = null;
                        window.setTimeout(() => {
                          if (nextMode) recoveryRef.current?.focus();
                          else otpRefs.current[0]?.focus();
                        }, 40);
                      }}
                      className="workstation-recovery-toggle"
                    >
                      {useRecovery
                        ? "Use 6-digit authenticator code"
                        : "Use an emergency recovery code"}
                    </button>
                  )}

                  <AnimatePresence initial={false}>
                    {error && (
                      <motion.div
                        role="alert"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={FLYOUT_OUT}
                        className="workstation-lock-error"
                      >
                        <HugeiconsIcon
                          icon={AlertCircleIcon}
                          strokeWidth={2}
                          size={14}
                          className="shrink-0"
                        />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="workstation-lock-actions">
                    <Button
                      type="submit"
                      loading={submitting}
                      className="h-9.5 w-full justify-center gap-2 rounded-xl text-sm font-medium"
                    >
                      <span>Verify &amp; unlock</span>
                      <HugeiconsIcon
                        icon={ArrowRight02Icon}
                        strokeWidth={2}
                        size={15}
                      />
                    </Button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => resetToCredentials(null)}
                      className="workstation-lock-cancel inline-flex items-center justify-center gap-1"
                    >
                      <HugeiconsIcon
                        icon={ArrowLeft02Icon}
                        strokeWidth={2}
                        size={13}
                      />
                      <span>Back to password</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
