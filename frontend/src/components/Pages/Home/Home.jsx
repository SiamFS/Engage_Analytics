import React, { useContext, Suspense, lazy } from 'react';
import { AuthContext } from "../../../contexts/AuthProvider/AuthProvider";
import { Spinner } from 'flowbite-react';

const NotLoggedInView = lazy(() => import('../../Shared/NotLoggedInView/NotLoggedInView'));
const LoggedInView = lazy(() => import('../../Shared/LoggedInView/LoggedInView'));

const FullPageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-surface">
    <div className="flex flex-col items-center">
      <Spinner size="xl" className="fill-brand-500" />
      <p className="mt-4 text-gray-300">Loading...</p>
    </div>
  </div>
);

const Home = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <FullPageLoader />;
  }
  return (
    <div className="bg-surface min-h-screen">
      <Suspense fallback={<FullPageLoader />}>
        {user ? <LoggedInView /> : <NotLoggedInView />}
      </Suspense>
    </div>
  );
};

export default Home;
