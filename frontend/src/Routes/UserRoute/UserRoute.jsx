import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthProvider/AuthProvider';
import { Spinner } from 'flowbite-react';
import { useLocation, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const UserRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
    }
  }, [loading]);

  if (loading && !authChecked) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner size="xl" aria-label="Loading content" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'user') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  return children;
};

UserRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default UserRoute;
