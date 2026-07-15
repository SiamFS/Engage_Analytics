import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ErrorMessage } from '../../common/ErrorMessage/ErrorMessage';
import AuthForm from '../Authcommon/AuthForm';
import { FormInput, PasswordInput, SubmitButton } from '../Authcommon/FormElements';
import { useLoginForm, useGoogleAuth } from '../Authcommon/useAuth';

const Login = () => { 
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    loading,
    authError,
    handleEmailLogin
  } = useLoginForm();

  const {
    loading: googleLoading,
    authError: googleAuthError,
    cachedGoogleAccount,
    setCachedGoogleAccount,
    handleGoogleLogin
  } = useGoogleAuth();

  const emailId = useId();
  const passwordId = useId();

  
  
  const combinedError = authError || googleAuthError;

  const isDeviceLimitError = 
    combinedError?.toLowerCase().includes('maximum device limit') || 
    combinedError?.toLowerCase().includes('device limit') || 
    combinedError?.includes('MAX_DEVICES_REACHED');

  return (
    <AuthForm
      title="Login"
      error={combinedError}
      loading={loading || googleLoading}
      onGoogleLogin={handleGoogleLogin}
      cachedGoogleAccount={cachedGoogleAccount}
      setCachedGoogleAccount={setCachedGoogleAccount}
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkPath="/signup"
    >
      <form onSubmit={handleEmailLogin} className="space-y-5 sm:space-y-6">
        <FormInput
          id={emailId}
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordInput
          id={passwordId}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          required
        />

        <AnimatePresence mode="wait">
          {combinedError && !isDeviceLimitError && <ErrorMessage error={combinedError} />}
        </AnimatePresence>

        <div className="flex justify-between items-center">
          <Link 
            to="/forgetpassword" 
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          text="Sign in"
          loadingText="Signing in..."
          loading={loading || googleLoading}
        />
      </form>

      <div className="mt-4 pt-3 border-t border-elevated-border">
        <details className="group" open>
          <summary className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full cursor-pointer hover:bg-yellow-500/20 transition-colors select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            Demo Admin Access
          </summary>
          <div className="mt-3 p-3 bg-surface-600 border border-elevated-border rounded-lg text-xs space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-16 shrink-0">Email</span>
              <code className="text-gray-200 select-all bg-surface px-2 py-0.5 rounded text-xs break-all">testadmin@gmail.com</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-16 shrink-0">Password</span>
              <code className="text-gray-200 select-all bg-surface px-2 py-0.5 rounded text-xs break-all">Admin@123</code>
            </div>
          </div>
        </details>
      </div>
    </AuthForm>
  );
};

export default Login;
