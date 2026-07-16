import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from "../../firebase/firebase.config";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  reauthenticateWithCredential
} from 'firebase/auth';
import PropTypes from 'prop-types';
import TokenService from '../../utils/TokenService';
import VideoService from '../../utils/VideoService';
import ApiService from '../../utils/ApiService';

export const AuthContext = createContext();
const googleProvider = new GoogleAuthProvider();

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>');

const getUserDevicesFromApi = async () => {
  try {
    const response = await ApiService.get('/user/devices/');
    return response || [];
  } catch {
    return [];
  }
};

const addDeviceToApi = async (deviceId, deviceName) => {
  try {
    await ApiService.post('/user/devices/', { id: deviceId, name: deviceName });
  } catch (error) {
    if (error.message && error.message.includes('device limit')) {
      const limitError = new Error('Maximum device limit reached (5). Please remove a device first.');
      limitError.code = 'MAX_DEVICES_REACHED';
      throw limitError;
    }
    throw error;
  }
};

const removeDeviceFromApi = async (deviceId) => {
  try {
    await ApiService.delete(`/user/devices/?device_id=${encodeURIComponent(deviceId)}`);
  } catch {
    // Silently ignore
  }
};

// Helper function to process user data after authentication
const processAuthenticatedUser = async (userCredential, deviceId) => {
  if (!userCredential?.user) return null;
  
  try {
    const token = await userCredential.user.getIdToken();
    TokenService.setToken(token, userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Error processing authenticated user:', error);
    return userCredential.user;
  }
};

// Helper function to check pending navigations
const checkPendingNavigations = (currentUser) => {
  const pendingNavigation = sessionStorage.getItem('auth_navigation_pending');
  if (pendingNavigation === 'true') {
    sessionStorage.removeItem('auth_navigation_pending');
    
    const authPaths = ['/login', '/signup', '/forgetpassword'];
    const currentPath = window.location.pathname;
    
    // Check if the current path is an auth page
    if (authPaths.some(path => currentPath.includes(path))) {
      const targetPath = sessionStorage.getItem('auth_navigation_target') || '/';
      sessionStorage.removeItem('auth_navigation_target');
      
      console.log('Auth state changed, forcing navigation from auth page');
      window.location.href = targetPath;
    }
  }
  
  // Handle verification redirects
  const verificationRedirect = sessionStorage.getItem('verification_redirect');
  if (verificationRedirect === 'true') {
    sessionStorage.removeItem('verification_redirect');
    
    if (currentUser.emailVerified) {
      console.log('Email verified, redirecting to home');
      window.location.href = '/';
    }
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceError] = useState(null);
  const [sessionExpiring, setSessionExpiring] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(null);
  const [googleAuthChecked, setGoogleAuthChecked] = useState(false);

  const updateUserDevices = async (deviceId) => {
    const deviceName = TokenService.getDeviceName();
    await addDeviceToApi(deviceId, deviceName);
  };

  const createUser = async (email, password, firstName, lastName) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      try {
        await sendEmailVerification(userCredential.user);
      } catch (verificationError) {
        console.warn('Failed to send verification email:', verificationError.code);
        // Continue even if verification email fails — user can request resend later
      }

      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
        photoURL: DEFAULT_AVATAR
      });
  
      const deviceId = TokenService.getCurrentDeviceId();
      await updateUserDevices(deviceId);

      // Sign out user immediately after account creation - they need to verify email first
      await signOut(auth);
      
      // Return user data without processing authentication (no token set)
      return userCredential.user;
    } catch (error) {
      console.error('Error creating user:', error);
  
      if (error.message === 'MAX_DEVICES_REACHED') {
        error.code = 'MAX_DEVICES_REACHED';
      }
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        try {
          await sendEmailVerification(userCredential.user);
        } catch {
          // verification email may fail if already sent recently
        }
        await signOut(auth);
        const error = new Error('Please verify your email before logging in. A new verification email has been sent. Check your inbox and spam folder.');
        error.code = 'EMAIL_NOT_VERIFIED';
        error.email = email;
        throw error;
      }

      const deviceId = TokenService.getCurrentDeviceId();
      
      try {
        await updateUserDevices(deviceId);

        return processAuthenticatedUser(userCredential, deviceId);
      } catch (error) {
        if (error.message === 'MAX_DEVICES_REACHED' || error.code === 'MAX_DEVICES_REACHED') {
          await signOut(auth);
          error.code = 'MAX_DEVICES_REACHED';
        }
        throw error;
      }
    } catch (error) {
      console.error('Login error:', error);
  
      if (error.message === 'MAX_DEVICES_REACHED') {
        error.code = 'MAX_DEVICES_REACHED';
      }
      throw error;
    }
  };

  // Handle Google sign-in process
  const handleGoogleSignIn = async (result) => {
    const deviceId = TokenService.getCurrentDeviceId();

    try {
      if (!result.user.emailVerified) {
        await signOut(auth);
        const error = new Error('Your Google account email is not verified. Please verify it with Google first.');
        error.code = 'EMAIL_NOT_VERIFIED';
        throw error;
      }

      const googlePhotoURL = result.user.photoURL;

      await updateUserDevices(deviceId);

      const token = await result.user.getIdToken();
      TokenService.setToken(token, result.user.uid);

      TokenService.setGoogleAuthCache({
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: googlePhotoURL
      }, result.user.uid);

      return result.user;
    } catch (error) {
      console.error('Google sign-in processing error:', error);

      if (error.message === 'MAX_DEVICES_REACHED' || error.code === 'MAX_DEVICES_REACHED') {
        await signOut(auth);
        error.code = 'MAX_DEVICES_REACHED';
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const cachedAuth = TokenService.getGoogleAuthCache();
      
      if (cachedAuth?.email) {
        console.log(`Signing in with previously used Google account: ${cachedAuth.email}`);
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      return await handleGoogleSignIn(result);
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-disabled') {
        TokenService.clearGoogleAuthCache();
      }
      
      if (error.message === 'MAX_DEVICES_REACHED') {
        error.code = 'MAX_DEVICES_REACHED';
      }
      
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const linkAccounts = async (email, password) => {
    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(auth.currentUser, credential);
    } catch (error) {
      console.error('Error linking accounts:', error);
      throw error;
    }
  };

  const checkSession = useCallback(() => {
    if (TokenService.isTokenExpired()) {
      if (user) {
        console.log('Session expired, logging out');
        logout();
      }
      return false;
    }
    
    const timeRemaining = TokenService.getTimeUntilExpiry();
    setSessionTimeRemaining(timeRemaining);
    
    if (timeRemaining < 60 * 60 * 1000 && timeRemaining > 0) {
      setSessionExpiring(true);
    } else {
      setSessionExpiring(false);
    }
    
    return true;
  }, [user]);

  const extendSession = useCallback(async () => {
    if (user) {
      try {
        const token = await user.getIdToken(true);
        TokenService.setToken(token, user.uid);
        setSessionExpiring(false);
        checkSession();
        return true;
      } catch (error) {
        console.error("Failed to extend session:", error);
        return false;
      }
    }
    return false;
  }, [user, checkSession]);

  const logout = async () => {
    try {
      const deviceId = TokenService.getCurrentDeviceId();

      setSessionExpiring(false);
      setSessionTimeRemaining(null);

      if (deviceId) {
        try {
          await removeDeviceFromApi(deviceId);
        } catch (error) {
          console.error('Error removing device during logout:', error);
        }
      }

      TokenService.clearAuth();
      VideoService.clearCache();
      return signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
      TokenService.clearAuth();
      return signOut(auth);
    }
  };

  const removeDevice = async (deviceId, password = null) => {
    if (!user?.uid) return false;

    try {
      if (password) {
        try {
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthenticateWithCredential(auth.currentUser, credential);
        } catch (authError) {
          console.error("Authentication error:", authError);
          throw new Error('INVALID_PASSWORD');
        }
      }

      await removeDeviceFromApi(deviceId);

      if (deviceId === TokenService.getCurrentDeviceId()) {
        await logout();
      }

      return true;
    } catch (error) {
      console.error("Error removing device:", error);
      if (error.message === 'INVALID_PASSWORD') {
        throw error;
      }
      return false;
    }
  };

  const getUserDevices = async () => {
    if (!user?.uid) return [];

    try {
      return await getUserDevicesFromApi();
    } catch (error) {
      console.error("Error getting devices:", error);
      return [];
    }
  };

  // Check for Google auth cache
  useEffect(() => {
    const checkGoogleAuthCache = async () => {
      try {
        const cachedAuth = TokenService.getGoogleAuthCache();
        if (cachedAuth?.email) {
          console.log(`Found cached Google account: ${cachedAuth.email}`);
        }
      } catch (error) {
        console.error("Error checking Google auth cache:", error);
        TokenService.clearGoogleAuthCache();
      } finally {
        setGoogleAuthChecked(true);
      }
    };
    
    checkGoogleAuthCache();
  }, []);

  // Session check for logged in user
  useEffect(() => {
    if (!user) return undefined;
    
    checkSession();
    
    const intervalId = setInterval(() => {
      checkSession();
    }, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user, checkSession]);

  // Main auth state listener
  useEffect(() => {
    const handleAuthStateChange = async (currentUser) => {
      try {
        if (currentUser) {
          // Only attempt to process and get token if the user is authenticated
          try {
            await processAuthenticatedUser({ user: currentUser });
          } catch (tokenError) {
            console.warn('Error processing authentication token:', tokenError);
            // Continue anyway as we still have the currentUser object
          }
          
           const userData = await getUserProfileData(currentUser);
          
          setUser({ 
            ...currentUser, 
            ...userData,
            emailVerified: currentUser.emailVerified 
          });
          
          checkSession();
          checkPendingNavigations(currentUser);
        } else {
          TokenService.clearAuth();
          setUser(null);
          setSessionExpiring(false);
          setSessionTimeRemaining(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        TokenService.clearAuth();
        setUser(null);
      }
      
      setLoading(false);
    };

    const getUserProfileData = async (currentUser) => {
      try {
        if (currentUser.providerData.some(provider => provider.providerId === 'google.com')) {
          TokenService.setGoogleAuthCache({
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL
          }, currentUser.uid);
        }

        try {
          const profile = await ApiService.get('/user/profile/');
          return {
            role: profile.role,
            firstName: profile.first_name,
            lastName: profile.last_name,
            photoURL: profile.photo_url || currentUser.photoURL || DEFAULT_AVATAR,
          };
        } catch {
          return {};
        }
      } catch (error) {
        console.error('Error getting user profile data:', error);
        return {};
      }
    };
    
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
    return () => unsubscribe();
  }, [checkSession]);
  
  // Force check on initial load
  useEffect(() => {
    const checkCurrentAuthState = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(true);
          TokenService.setToken(token, auth.currentUser.uid);
        } catch (error) {
          console.error('Error refreshing token on initial load:', error);
        }
      }
    };
    
    checkCurrentAuthState();
    
    const handleBackNavigation = () => {
      if (auth.currentUser) {
        const authPaths = ['/login', '/signup', '/forgetpassword'];
        const currentPath = window.location.pathname;
        
        if (authPaths.some(path => currentPath.includes(path))) {
          console.log('Detected back navigation to auth page while logged in');
          window.location.replace('/');
        }
      }
    };
    
    window.addEventListener('popstate', handleBackNavigation);
    
    return () => {
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, []);

  const safeGetGoogleAuthCache = useCallback(() => {
    try {
      return TokenService.getGoogleAuthCache();
    } catch (error) {
      console.error("Error getting Google auth cache:", error);
      return null;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    deviceError,
    createUser,
    login,
    logout,
    signInWithGoogle,
    linkAccounts,
    resetPassword,
    removeDevice,
    getUserDevices,
    maxDevices: TokenService.maxDevices,
    sessionExpiring,
    sessionTimeRemaining,
    extendSession,
    checkSession,
    googleAuthChecked,
    getGoogleAuthCache: safeGetGoogleAuthCache 
  }), [user, loading, deviceError, sessionExpiring, sessionTimeRemaining, extendSession, checkSession, googleAuthChecked, safeGetGoogleAuthCache]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthProvider;