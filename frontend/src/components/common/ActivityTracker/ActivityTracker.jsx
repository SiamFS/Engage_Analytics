import { useContext, useEffect } from 'react';
import { AuthContext, AuthActionsContext } from '../../../contexts/AuthProvider/AuthProvider';

/**
 * Component that tracks user activity and automatically extends the session
 * This component doesn't render anything visible
 */
const ActivityTracker = () => {
  const { user } = useContext(AuthContext);
  const { extendSession } = useContext(AuthActionsContext);
  
  useEffect(() => {
    if (!user) return; // Only track activity when user is logged in
    
    // Define the user actions that count as activity
    const activityEvents = ['mousedown', 'keydown'];
    
    // Track last activity time
    let lastActivityTime = Date.now();
    const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    // Handler for user activity
    const handleUserActivity = () => {
      const currentTime = Date.now();
      
      // Only consider it new activity if enough time has passed
      if (currentTime - lastActivityTime >= ACTIVITY_THRESHOLD) {
        console.log('Significant user activity detected, extending session');
        extendSession();
        lastActivityTime = currentTime;
      }
    };
    
    // Add event listeners for all activity events
    activityEvents.forEach(eventType => {
      window.addEventListener(eventType, handleUserActivity, { passive: true });
    });
    
    // Clean up event listeners
    return () => {
      activityEvents.forEach(eventType => {
        window.removeEventListener(eventType, handleUserActivity);
      });
    };
  }, [user, extendSession]);

  return null;
};

export default ActivityTracker;