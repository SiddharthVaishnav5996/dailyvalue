"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Modal } from "@/components/Modal/Modal";
import { Text } from "@/components/Text/Text";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "./countries";
import styles from "./LoginModal.module.css";

export interface LoginModalProps {
  onClose: () => void;
  /** Signed in via phone → OTP (mock; any 10-digit number + any 6 digits). */
  onLoginPhone: (phone: string) => void;
}

const OTP_LENGTH = 6;
/** Seconds before the "Resend code" link re-arms. */
const RESEND_SECONDS = 30;
/** How long the green "Login successful" tick shows before the dialog resolves. */
const SUCCESS_MS = 1600;

type Step = "phone" | "otp" | "success";

/**
 * Mock login dialog — phone → OTP, Blinkit-style. No backend and no Verify
 * button: entering the last OTP digit flips straight to an animated "Login
 * successful" tick (the same green check as the payment screen), then resolves.
 * Any 10-digit number and any 6 digits are accepted.
 */
export function LoginModal({ onClose, onLoginPhone }: LoginModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [countryOpen, setCountryOpen] = useState(false);
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const phoneComplete = phone.length === country.digits;

  // Focus the first OTP box when that step opens. The phone field is left
  // unfocused on purpose so its "Enter mobile number" placeholder reads first —
  // the caret appears once the user taps the field.
  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  // Resend countdown — ticks to 0 whenever armed.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Success screen holds on the tick, then resolves the sign-in.
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => onLoginPhone(phone), SUCCESS_MS);
    return () => clearTimeout(t);
  }, [step, phone, onLoginPhone]);

  function goToOtp() {
    if (!phoneComplete) {
      setError(`Enter a ${country.digits}-digit mobile number.`);
      return;
    }
    setError(null);
    setOtp(Array(OTP_LENGTH).fill(""));
    setSecondsLeft(RESEND_SECONDS);
    setStep("otp");
  }

  function handlePhoneChange(e: ChangeEvent<HTMLInputElement>) {
    setPhone(e.target.value.replace(/\D/g, "").slice(0, country.digits));
    if (error) setError(null);
  }

  function selectCountry(next: Country) {
    setCountry(next);
    setCountryOpen(false);
    // Trim if the new country allows fewer digits, and clear a stale
    // "enter N digits" error so it can't contradict the new selection.
    setPhone((p) => p.slice(0, next.digits));
    setError(null);
  }

  function commitOtp(next: string[]) {
    setOtp(next);
    if (error) setError(null);
    // No Verify CTA — the final digit auto-submits into the success state.
    if (next.every((d) => d !== "")) setStep("success");
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    commitOtp(next);
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < digits.length; i++) next[i] = digits[i];
    commitOtp(next);
    otpRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === "phone") goToOtp();
  }

  // Back arrow: OTP → phone (change number); phone step → close the dialog.
  const handleBack = step === "otp" ? () => setStep("phone") : onClose;

  return (
    <Modal onClose={onClose} ariaLabel="Log in" maxWidth={550}>
      <div className={styles.dialog}>
        {step !== "success" && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            aria-label={step === "otp" ? "Change number" : "Close"}
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
        )}

        {/* ---- Brand lockup (all steps) ---- */}
        <div className={styles.brand}>
          <Image
            src="/logo-icon.png"
            alt="DailyValue"
            width={51}
            height={48}
            className={styles.logoMark}
            priority
          />
          <Text as="span" variant="heading6" className={styles.wordmark}>
            <span className={styles.daily}>Daily</span>
            <span className={styles.value}>Value</span>
          </Text>
        </div>

        {step === "success" ? (
          <div className={styles.success}>
            <svg
              className={styles.check}
              viewBox="0 0 52 52"
              role="img"
              aria-label="Login successful"
            >
              <circle className={styles.checkCircle} cx="26" cy="26" r="24" />
              <path className={styles.checkMark} d="M14 27 l7 7 l16 -17" />
            </svg>
            <Text as="h2" variant="heading4" className={styles.successText} aria-live="polite">
              Login successful
            </Text>
          </div>
        ) : step === "otp" ? (
          <form className={styles.body} onSubmit={handleSubmit}>
            <div className={styles.headings}>
              <Text as="h2" variant="mediumRegular" className={styles.title}>
                Verify your number
              </Text>
              <Text as="p" variant="normalRegular" className={styles.subtitle}>
                Enter the {OTP_LENGTH}-digit code sent to {country.dial} {phone}
              </Text>
            </div>

            <div className={styles.otpRow}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className={styles.otpBox}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                />
              ))}
            </div>

            <div className={styles.resendRow}>
              {secondsLeft > 0 ? (
                <Text as="span" variant="normalRegular" className={styles.resendWait}>
                  Didn&apos;t get it? Resend in {secondsLeft}s
                </Text>
              ) : (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setSecondsLeft(RESEND_SECONDS);
                    otpRefs.current[0]?.focus();
                  }}
                >
                  <Text as="span" variant="normalRegular">
                    Resend code
                  </Text>
                </button>
              )}
            </div>
          </form>
        ) : (
          <form className={styles.body} onSubmit={handleSubmit}>
            <div className={styles.headings}>
              <Text as="h2" variant="mediumRegular" className={styles.title}>
                Log in or Sign up
              </Text>
              <Text as="p" variant="normalRegular" className={styles.subtitle}>
                Compare every store, get the daily value.
              </Text>
            </div>

            <div className={styles.phoneField}>
              {/* Country picker — US and Canada share "+1", so the flag is
                  what actually distinguishes the selection. */}
              <div className={styles.countryWrap}>
                <button
                  type="button"
                  className={styles.prefix}
                  onClick={() => setCountryOpen((open) => !open)}
                  aria-label={`Country: ${country.name} (${country.dial})`}
                  aria-haspopup="listbox"
                  aria-expanded={countryOpen}
                >
                  <span className={styles.flag}>{country.flag}</span>
                  <span>{country.dial}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>

                {countryOpen && (
                  <>
                    <div
                      className={styles.countryCatcher}
                      onClick={() => setCountryOpen(false)}
                      role="presentation"
                    />
                    <ul className={styles.countryList} role="listbox" aria-label="Country">
                      {COUNTRIES.map((c) => (
                        <li key={c.iso}>
                          <button
                            type="button"
                            className={styles.countryOption}
                            role="option"
                            aria-selected={c.iso === country.iso}
                            onClick={() => selectCountry(c)}
                          >
                            <span className={styles.flag}>{c.flag}</span>
                            <span className={styles.countryName}>{c.name}</span>
                            <span className={styles.countryDial}>{c.dial}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                name="phone"
                autoComplete="tel-national"
                placeholder="Enter mobile number"
                className={styles.phoneInput}
                value={phone}
                onChange={handlePhoneChange}
              />
            </div>

            {error && (
              <Text as="p" variant="normalRegular" className={styles.error}>
                {error}
              </Text>
            )}

            <button type="submit" className={styles.primaryBtn} disabled={!phoneComplete}>
              Send OTP
            </button>

            <Text as="p" variant="normalRegular" className={styles.footer}>
              By continuing, you agree to our{" "}
              <span className={styles.footerLink}>Terms of service</span> &{" "}
              <span className={styles.footerLink}>Privacy policy</span>
            </Text>
          </form>
        )}
      </div>
    </Modal>
  );
}
