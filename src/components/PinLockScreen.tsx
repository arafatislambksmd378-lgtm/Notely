import React, { useEffect, useState } from 'react';
import { Delete, Fingerprint, SquarePen } from 'lucide-react';
import { useNotely } from '../context/NotelyContext';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_SECONDS = 30;

export function PinLockScreen({
  mode = 'unlock',
  title,
  subtitle,
  onSuccess,
  onCancel,
}: {
  mode?: 'unlock' | 'setup';
  title?: string;
  subtitle?: string;
  onSuccess?: (pin: string) => void;
  onCancel?: () => void;
}) {
  const {
    verifyPinAndUnlockApp,
    verifyBiometricAndUnlockApp,
    setupOrChangePin,
    settings,
    showToast,
  } = useNotely();
  const [pin, setPin] = useState('');
  const [confirmFirstPin, setConfirmFirstPin] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = window.setInterval(() => {
      setCooldownSec((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownSec]);

  const handleDigit = async (digit: string) => {
    if (cooldownSec > 0 || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setErrorMsg('');

    if (next.length === 4) {
      if (mode === 'setup') {
        if (!confirmFirstPin) {
          setConfirmFirstPin(next);
          setPin('');
        } else if (confirmFirstPin === next) {
          await setupOrChangePin(next);
          onSuccess?.(next);
        } else {
          setErrorMsg('PINs did not match. Try again.');
          setConfirmFirstPin(null);
          setPin('');
        }
      } else {
        const valid = await verifyPinAndUnlockApp(next);
        if (valid) {
          setFailedCount(0);
          onSuccess?.(next);
        } else {
          const nextFails = failedCount + 1;
          setFailedCount(nextFails);
          if (nextFails >= LOCKOUT_THRESHOLD) {
            setCooldownSec(LOCKOUT_SECONDS);
            setErrorMsg(`Too many failed attempts. Wait ${LOCKOUT_SECONDS}s.`);
          } else {
            setErrorMsg(`Incorrect PIN (${LOCKOUT_THRESHOLD - nextFails} attempts left).`);
          }
          setTimeout(() => setPin(''), 250);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (cooldownSec > 0) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleBiometricAttempt = async () => {
    if (cooldownSec > 0) return;
    const result = await verifyBiometricAndUnlockApp();
    if (result.ok) {
      showToast('Biometric verified on device', 'success');
      onSuccess?.('');
    } else {
      showToast(result.reason || 'Use your 4-digit PIN to unlock', 'info');
    }
  };

  const heading = title || 'Notely';
  const promptText =
    subtitle ||
    (mode === 'setup'
      ? confirmFirstPin
        ? 'Confirm your 4-digit PIN'
        : 'Create a 4-digit PIN'
      : 'Enter your PIN to continue');

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0E0D14] flex flex-col items-center justify-between px-6 py-10">
      <div className="w-full max-w-sm flex justify-end min-h-[36px]">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-[#92909D] hover:text-[#24232B] dark:hover:text-white px-3 py-1.5 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="w-full max-w-xs flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-5"
          style={{
            background: 'linear-gradient(135deg, var(--notely-accent) 0%, var(--notely-accent-deep) 100%)',
          }}
        >
          <SquarePen className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-[#24232B] dark:text-[#F4F3F8]">{heading}</h1>
        <p className="text-sm text-[#92909D] mt-1">{promptText}</p>

        {/* 4 circular PIN dots */}
        <div className="flex items-center gap-4 my-7" aria-label={`PIN entered ${pin.length} of 4 digits`}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-[var(--notely-accent)] scale-110'
                    : 'border-2 border-[#D8D5E2] dark:border-[#3A374C]'
                }`}
              />
            );
          })}
        </div>

        {(errorMsg || cooldownSec > 0) && (
          <p className="text-xs font-medium text-[#EF4444] mb-4 text-center" role="alert">
            {cooldownSec > 0 ? `Too many attempts. Try again in ${cooldownSec}s.` : errorMsg}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[260px]">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={cooldownSec > 0}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl bg-[#F4F3F8] dark:bg-[#1B1A26] hover:bg-[#EAE7F3] dark:hover:bg-[#262436] active:scale-95 disabled:opacity-45 text-xl font-bold text-[#24232B] dark:text-[#F4F3F8] transition-all cursor-pointer tabular-nums"
            >
              {d}
            </button>
          ))}

          {mode === 'unlock' && settings.securityPreferences.biometricEnabled ? (
            <button
              type="button"
              disabled={cooldownSec > 0}
              onClick={handleBiometricAttempt}
              aria-label="Biometric unlock"
              className="h-14 rounded-2xl flex items-center justify-center text-[var(--notely-accent)] hover:bg-[#F4F3F8] dark:hover:bg-[#1B1A26] disabled:opacity-45 cursor-pointer"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={cooldownSec > 0}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-[#F4F3F8] dark:bg-[#1B1A26] hover:bg-[#EAE7F3] dark:hover:bg-[#262436] active:scale-95 disabled:opacity-45 text-xl font-bold text-[#24232B] dark:text-[#F4F3F8] transition-all cursor-pointer tabular-nums"
          >
            0
          </button>

          <button
            type="button"
            disabled={cooldownSec > 0}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-14 rounded-2xl flex items-center justify-center text-[#5C5A68] dark:text-[#B2B0BE] hover:bg-[#F4F3F8] dark:hover:bg-[#1B1A26] active:scale-95 disabled:opacity-45 transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-[#92909D] text-center">
        Your notes never leave this device without you.
      </p>
    </div>
  );
}
