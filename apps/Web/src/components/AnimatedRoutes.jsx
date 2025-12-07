import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "./sections/Home";
import { Admin } from "./sections/Admin";
import { Organizer } from "./sections/Organizer";
import { Participants } from "./sections/Participants";
import { Login } from "./sections/Login";
import { CreateEvent } from "./sections/CreateEvent";
import { EditEvent } from "./sections/EditEvent";
import { CreateSurvey } from "./sections/CreateSurvey";
import { EditSurvey } from "./sections/EditSurvey";
import { EventStatistics } from "./sections/EventStatistics";
import { EventStatisticsDetail } from "./sections/EventStatisticsDetail";
import { Registration } from "./sections/Registration";
import { Events } from "./sections/Events";
import { MyEvents } from "./sections/MyEvents";
import GenerateQR from "./sections/GenerateQR";
import SurveyManagementPage from "./sections/SurveyManagementPage";
import { Evaluation } from "./sections/Evaluation";
import { EditProfile } from "./sections/EditProfile";
import ActivityLog from "./sections/ActivityLog";
import { ResetPassword } from "./sections/ResetPassword";
import { Notifications } from "./sections/Notifications";
import { Settings } from "./sections/Settings";

function AnimatedRoutes() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={isLoginPage ? 'h-full overflow-hidden' : ''}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/organizer" element={<Organizer />} />
        <Route path="/events" element={<Events />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/edit-event/:eventId" element={<EditEvent />} />
        <Route path="/create-survey" element={<CreateSurvey />} />
        <Route path="/edit-survey/:surveyId" element={<EditSurvey />} />
        <Route path="/event-statistics" element={<EventStatistics />} />
        <Route path="/event-statistics/:eventId" element={<EventStatisticsDetail />} />
        <Route path="/survey-management" element={<SurveyManagementPage />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/generate-qr" element={<GenerateQR />} />
        <Route path="/evaluation/:surveyId" element={<Evaluation />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default AnimatedRoutes;
