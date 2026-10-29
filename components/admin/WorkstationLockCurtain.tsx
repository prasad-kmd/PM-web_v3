"use client";

import {
  AlertCircleIcon,
  ArrowRight02Icon,
  LockPasswordIcon,
  SquareLock02Icon,
  UserIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { FLYOUT_IN, FLYOUT_OUT } from "@/lib/windows";

/**
 * 03 · Workstation Lock Curtain
 *
 * Veils the desktop work area beneath the live 40px top menubar with a frosted
 * acrylic curtain and a centered owner lock column containing both Username and
 * Password fields.
 */
export function WorkstationLockCurtain() {
  const { lockOpen, closeLockCurtain, signIn, totpRequired } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lockOpen) {
      setPassword("");
      setOtp("");
      setShowPassword(false);
      setError(null);
      setSubmitting(false);
      return;
    }
    const focusTimer = window.setTimeout(() => {
      usernameRef.current?.focus();
    }, 90);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        event.preventDefault();
        closeLockCurtain();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeLockCurtain, lockOpen, submitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      setError("Enter both your username and password.");
      setShakeKey((n) => n + 1);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await signIn({
      username: username.trim(),
      password,
      otp: totpRequired ? otp.trim() : undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Incorrect username or password.");
      setPassword("");
      setShakeKey((n) => n + 1);
    }
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
            if (event.target === event.currentTarget && !submitting) {
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
                  icon={SquareLock02Icon}
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
                Workspace locked · Sign in to continue
              </p>
            </div>

            <form
              className="workstation-lock-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <label className="workstation-lock-field">
                <span className="sr-only">Username</span>
                <span className="workstation-lock-field-icon" aria-hidden>
                  <HugeiconsIcon icon={UserIcon} strokeWidth={1.9} size={15} />
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <HugeiconsIcon
                    icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                    strokeWidth={1.9}
                    size={15}
                  />
                </button>
              </label>

              {totpRequired && (
                <label className="workstation-lock-field">
                  <span className="sr-only">Verification code</span>
                  <span className="workstation-lock-field-icon" aria-hidden>
                    <HugeiconsIcon
                      icon={SquareLock02Icon}
                      strokeWidth={1.9}
                      size={15}
                    />
                  </span>
                  <input
                    type="text"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="6-digit verification code"
                    value={otp}
                    disabled={submitting}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (error) setError(null);
                    }}
                    className="workstation-lock-input tabular-nums"
                  />
                </label>
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
                  className="w-full justify-center gap-2 rounded-xl h-9.5 text-sm font-medium"
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
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
