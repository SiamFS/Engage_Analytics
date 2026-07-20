import React, { useState, useContext, useId, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthActionsContext } from '../../../contexts/AuthProvider/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../Brandlogo/brandlogo';
import { FormInput, SubmitButton } from '../Authcommon/FormElements';
import PropTypes from 'prop-types';

const COOLDOWN_SECONDS = 60;
const STORAGE_KEY = 'ea_reset_cooldown';
const MAX_EMAIL_LENGTH = 254;

const ErrorMessage = ({ error }) => (
  <motion.div
    initial={{ opacity: 0, y: -15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3 }}
    className="p-3 rounded-lg bg-red-800/30 border border-red-700"
  >
    <p className="text-red-400 text-xs sm:text-sm">{error}</p>
  </motion.div>
);

ErrorMessage.propTypes = {
  error: PropTypes.string.isRequired
};

const SuccessMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.3 }}
    className="p-3 rounded-lg bg-green-800/30 border border-green-700"
  >
    <p className="text-green-400 text-xs sm:text-sm">{message}</p>
  </motion.div>
);

SuccessMessage.propTypes = {
  message: PropTypes.string.isRequired
};

const ForgetPassword = () => {
  const { resetPassword } = useContext(AuthActionsContext);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef(null);

  const emailId = useId();

  const backgroundVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 1.2, 
        ease: 'easeOut'
      }
    }
  };

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const expiry = parseInt(stored, 10);
        const timeLeft = Math.ceil((expiry - Date.now()) / 1000);
        if (timeLeft > 0) {
          setCooldown(timeLeft);
          startCooldownTimer(timeLeft);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Error loading cooldown:', e);
    }

    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const startCooldownTimer = (duration) => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          sessionStorage.removeItem(STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      setError('Email address is too long');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setSuccess(true);

      const expires = Date.now() + COOLDOWN_SECONDS * 1000;
      try {
        sessionStorage.setItem(STORAGE_KEY, String(expires));
      } catch (e) {
        /* storage full */
      }
      setCooldown(COOLDOWN_SECONDS);
      startCooldownTimer(COOLDOWN_SECONDS);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setSuccess(true);
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please try again later.');
        console.error('Password reset error:', error);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div 
      className="min-h-screen flex flex-col justify-center items-center px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 bg-surface overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div 
        className="fixed top-0 -left-32 w-64 sm:w-96 h-64 sm:h-96 bg-brand-600 opacity-15 rounded-full filter blur-[40px] sm:blur-[64px] pointer-events-none"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />
      <motion.div 
        className="fixed bottom-0 -right-32 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500 opacity-15 rounded-full filter blur-[40px] sm:blur-[64px] pointer-events-none"
        variants={backgroundVariants}
        initial="initial"
        animate="animate"
      />
      
      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="flex justify-center mb-6 sm:mb-8">
          <BrandLogo className="w-auto h-10 sm:h-12" />
        </div>
  
        <div className="relative bg-elevated backdrop-blur-md rounded-[16px] sm:rounded-[20px] md:rounded-[28px] border border-elevated-border shadow-2xl ring-1 ring-brand-900/30 p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-white mb-2 sm:mb-3 sticky top-0 py-2 z-10">
            Reset Password
          </h2>

          <form onSubmit={handlePasswordReset} className="space-y-4 sm:space-y-5">
            <FormInput
              id={emailId}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={MAX_EMAIL_LENGTH}
              required
              placeholder="Enter your email address"
              autoComplete="email"
            />

            <AnimatePresence mode="wait">
              {error && <ErrorMessage error={error} />}
              {success && (
                <SuccessMessage 
                  message="If an account exists with this email address, you will receive a password reset link shortly."
                />
              )}
            </AnimatePresence>

            <SubmitButton
              text="Send Reset Link"
              loadingText={cooldown > 0 ? `Retry in ${cooldown}s` : "Sending..."}
              loading={loading || cooldown > 0}
              disabled={loading || cooldown > 0}
            />
          </form>

          <p className="mt-4 sm:mt-5 md:mt-6 text-center text-xs sm:text-sm text-gray-400 sticky bottom-0 py-2">
            <Link
              to="/login"
              className="font-medium text-brand-400 hover:text-brand-300 focus:outline-none focus:underline inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default ForgetPassword;
