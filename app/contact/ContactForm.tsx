"use client";
import { useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Errors = Record<string, string>;
export function ContactForm({ siteKey }: { siteKey: string }) {
  const formRef = useRef<HTMLFormElement>(null),
    widgetRef = useRef<TurnstileInstance>(undefined);
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [length, setLength] = useState(0),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [errors, setErrors] = useState<Errors>({});
  function clear(name: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (!token) {
      setError("Complete the security check before sending.");
      return;
    }
    const data = new FormData(event.currentTarget),
      file = data.get("attachment");
    if (file instanceof File && file.size > 8 * 1024 * 1024) {
      setError("Attachments must be under 8 MB.");
      return;
    }
    data.set("turnstileToken", token);
    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        warning?: string;
      };
      if (!response.ok || !result.ok) {
        setError(result.error || "Your message could not be sent.");
        return;
      }
      setSuccess(
        result.warning || "Message delivered. Thank you for getting in touch.",
      );
      formRef.current?.reset();
      setLength(0);
      setErrors({});
    } catch {
      setError(
        "Connection interrupted. Please try again or use the direct email link.",
      );
    } finally {
      setBusy(false);
      setToken("");
      widgetRef.current?.reset();
    }
  }
  return (
    <form
      ref={formRef}
      className="contact-form"
      onSubmit={submit}
      onInvalid={(event) => {
        const target = event.target as HTMLInputElement;
        if (target.name)
          setErrors((current) => ({
            ...current,
            [target.name]: target.validationMessage,
          }));
      }}
    >
      <div className="contact-grid">
        <Field>
          <FieldLabel htmlFor="contact-name">
            Name <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            onInput={() => clear("name")}
          />
          {errors.name ? (
            <p id="contact-name-error" className="contact-field-error">
              {errors.name}
            </p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-email">
            Email <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            onInput={() => clear("email")}
          />
          {errors.email ? (
            <p id="contact-email-error" className="contact-field-error">
              {errors.email}
            </p>
          ) : null}
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="contact-phone">
          Phone <span className="contact-optional">Optional</span>
        </FieldLabel>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          maxLength={25}
          pattern="\+?[0-9() .-]{7,25}"
          autoComplete="tel"
          placeholder="+94 …"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "contact-phone-error" : undefined}
          onInput={() => clear("phone")}
        />
        {errors.phone ? (
          <p id="contact-phone-error" className="contact-field-error">
            {errors.phone}
          </p>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="contact-subject">
          Subject <span aria-hidden="true">*</span>
        </FieldLabel>
        <Input
          id="contact-subject"
          name="subject"
          required
          minLength={3}
          maxLength={120}
          placeholder="What would you like to discuss?"
          aria-invalid={!!errors.subject}
          aria-describedby={
            errors.subject ? "contact-subject-error" : undefined
          }
          onInput={() => clear("subject")}
        />
        {errors.subject ? (
          <p id="contact-subject-error" className="contact-field-error">
            {errors.subject}
          </p>
        ) : null}
      </Field>
      <Field>
        <FieldLabel htmlFor="contact-message">
          Message <span aria-hidden="true">*</span>
        </FieldLabel>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={3400}
          rows={6}
          placeholder="Tell me a little about your message…"
          aria-invalid={!!errors.message}
          aria-describedby={
            errors.message ? "contact-message-error" : "contact-message-count"
          }
          onChange={(event) => {
            setLength(event.target.value.length);
            clear("message");
          }}
        />
        {errors.message ? (
          <p id="contact-message-error" className="contact-field-error">
            {errors.message}
          </p>
        ) : null}
        <p id="contact-message-count" className="contact-count">
          {length} / 3,400
        </p>
      </Field>
      <Field>
        <FieldLabel htmlFor="contact-attachment">
          Attachment{" "}
          <span className="contact-optional">Optional · max 8 MB</span>
        </FieldLabel>
        <Input
          id="contact-attachment"
          name="attachment"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
        />
        <p className="contact-help">PDF, PNG, JPEG or plain text.</p>
      </Field>
      <div className="contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="contact-security">
        <p>
          Your email is used to reply. This form is protected by Turnstile and
          delivers your message privately through Telegram.
        </p>
        {siteKey ? (
          <Turnstile
            ref={widgetRef}
            siteKey={siteKey}
            onSuccess={setToken}
            onExpire={() => setToken("")}
            onError={() => {
              setToken("");
              setError("Security check failed. Please retry.");
            }}
            options={{ theme: "auto" }}
          />
        ) : (
          <p role="status">
            The contact form is not configured. Please use the email link
            instead.
          </p>
        )}
      </div>
      {error ? (
        <p className="contact-feedback is-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="contact-feedback" role="status">
          {success}
        </p>
      ) : null}
      <div className="contact-actions">
        <span>Fields marked * are required.</span>
        <Button type="submit" disabled={busy || !siteKey || !token}>
          {busy ? "Sending…" : "Send message"} <span aria-hidden="true">↗</span>
        </Button>
      </div>
    </form>
  );
}
