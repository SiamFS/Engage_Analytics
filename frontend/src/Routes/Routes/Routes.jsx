import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import Home from "../../components/Pages/Home/Home.jsx";
import Login from "../../components/Shared/Login/Login.jsx";
import Signup from "../../components/Shared/Singup/Singup.jsx";
import ForgetPassword from "../../components/Shared/ForgetPassword/forgetpassword.jsx";
import About from "../../components/Pages/About/About.jsx";
import Profile from "../../components/Pages/Profile/Profile.jsx";
import Dashboard from "../../components/Pages/Dashboard/Dashboard.jsx";
import DashboardLayout from "../../components/Shared/DashboardLayout/DashboardLayout.jsx";
import UploadVideo from "../../components/Pages/Dashboard/Admin/UploadVideo.jsx";
import VideoDetail from "../../components/Shared/VideoPlayer/VideoDetail.jsx";
import PrivateRoute from "../PrivateRoute/Privateroute.jsx";
import AdminRoute from "../AdminRoute/AdminRoute.jsx";
import CompanyOrAdminRoute from "../CompanyOrAdminRoute/CompanyOrAdminRoute.jsx";
import UserRoute from "../UserRoute/UserRoute.jsx";
import Video from "../../components/Pages/Video/Video.jsx";
import DeviceManager from "../../components/Shared/DeviceManager/DeviceManager.jsx";
import UserWatchHistory from "../../components/Pages/Dashboard/User/UserWatchHistory.jsx";
import AdminVideos from "../../components/Pages/Dashboard/Admin/AdminVideos.jsx";
import EditVideo from "../../components/Pages/Dashboard/Admin/EditVideo.jsx";
import AdminRoleManagement from "../../components/Pages/Dashboard/Admin/AdminRoleManagement.jsx";
import UserLikedVideo from "../../components/Pages/Dashboard/User/UserLikedVideo.jsx";
import RecordedVideos from "../../components/Pages/Dashboard/Admin/RecordedVideos.jsx";
import DetailedAnalytics from "../../components/Pages/Dashboard/Admin/DetailedAnalytics.jsx";
import PointsManagement from "../../components/Pages/Dashboard/Admin/PointsManagement.jsx";
import AdminSurveyManagement from "../../components/Pages/Dashboard/Admin/AdminSurveyManagement.jsx";
import UserFeedbackHistory from "../../components/Pages/Dashboard/User/UserFeedbackHistory.jsx";
import NotificationCenter from "../../components/Pages/Dashboard/NotificationCenter.jsx";
import NotificationSettings from "../../components/Pages/Dashboard/NotificationSettings.jsx";
import CompanyUploadRequests from "../../components/Pages/Dashboard/Company/UploadRequests.jsx";
import NewUploadRequest from "../../components/Pages/Dashboard/Company/NewUploadRequest.jsx";
import UploadRequestDetail from "../../components/Pages/Dashboard/Company/UploadRequestDetail.jsx";
import CompanyAnalytics from "../../components/Pages/Dashboard/Company/CompanyAnalytics.jsx";
import AdminUploadRequestManagement from "../../components/Pages/Dashboard/Admin/AdminUploadRequests.jsx";
import UserManagement from "../../components/Pages/Dashboard/Admin/UserManagement.jsx";
import { Navigate } from "react-router-dom";


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/forgetpassword",
        element: <ForgetPassword />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/contact",
        element: <About />,
      },
      {
        path: "/privacy",
        element: <About />,
      },
      {
        path: "/terms",
        element: <About />,
      },
      {
        path: "/profile",
        element: <PrivateRoute><Profile /></PrivateRoute>,
      },
      {
        path: "/devices",
        element: <PrivateRoute><DeviceManager /></PrivateRoute>,
      },
      {
        path: "/video/:id", 
        element: <VideoDetail />,
      },
      {
        path: "/videos",
        element: <PrivateRoute><Video /></PrivateRoute>,
      }

    ]
  },

  {
    path: "/dashboard",
    element: <PrivateRoute><DashboardLayout /></PrivateRoute>,
    children: [
      {
        path: "", 
        element: <Dashboard />
      },
  
      {
        path: "upload",
        element: <CompanyOrAdminRoute><UploadVideo /></CompanyOrAdminRoute>
      },
      {
        path: "videos",
        element: <AdminRoute><AdminVideos /></AdminRoute>
      },
      {
        path: "edit-video/:id",
        element: <AdminRoute><EditVideo /></AdminRoute>
      },
      {
        path: "role-management",
        element: <AdminRoute><AdminRoleManagement /></AdminRoute>
      },
      {
        path: "recorded-videos",
        element: <AdminRoute><RecordedVideos /></AdminRoute>
      },
      {
        path: "points",
        element: <AdminRoute><PointsManagement /></AdminRoute>
      },
      {
        path: "survey",
        element: <AdminRoute><AdminSurveyManagement /></AdminRoute>
      },
      {
        path: "feedback",
        element: <Navigate to="/dashboard/survey" replace />
      },
      {
        path: "feedback/analytics",
        element: <Navigate to="/dashboard/survey" replace />
      },
      {
        path: "feedback/survey",
        element: <Navigate to="/dashboard/survey" replace />
      },
      {
        path: "my-feedback",
        element: <UserRoute><UserFeedbackHistory /></UserRoute>
      },
      {
        path: "upload-requests",
        element: <CompanyOrAdminRoute><CompanyUploadRequests /></CompanyOrAdminRoute>
      },
      {
        path: "upload-requests/new",
        element: <CompanyOrAdminRoute><NewUploadRequest /></CompanyOrAdminRoute>
      },
      {
        path: "upload-requests/:id",
        element: <CompanyOrAdminRoute><UploadRequestDetail /></CompanyOrAdminRoute>
      },
      {
        path: "company-analytics",
        element: <CompanyOrAdminRoute><CompanyAnalytics /></CompanyOrAdminRoute>
      },
      {
        path: "admin-upload-requests",
        element: <AdminRoute><AdminUploadRequestManagement /></AdminRoute>
      },
      {
        path: "company-management",
        element: <AdminRoute><UserManagement /></AdminRoute>
      },
      {
        path: "detailed-analytics",
        element: <PrivateRoute><DetailedAnalytics /></PrivateRoute>
      },
      {
        path: "analytics",
        element: <Navigate to="detailed-analytics" replace />
      },
      {
        path: "liked-videos",
        element: <UserRoute><UserLikedVideo /></UserRoute>,
      },
      {
        path: "history",
        element: <UserRoute><UserWatchHistory /></UserRoute>,
      },
      {
        path: "notifications",
        element: <PrivateRoute><NotificationCenter /></PrivateRoute>,
      },
      {
        path: "notification-settings",
        element: <PrivateRoute><NotificationSettings /></PrivateRoute>,
      },
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />
      },
    ]
  }
]);

export default router;