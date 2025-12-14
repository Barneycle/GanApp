import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "./sections/Home";
import { Admin } from "./sections/Admin";
import { Organizer } from "./sections/Organizer";
import { Participants } from "./sections/Participants";
import { Login } from "./sections/Login";
import { CreateEvent } from "./sections/CreateEvent";
import { EditEvent } from "./sections/EditEvent";
import { DesignCertificate } from "./sections/DesignCertificate";
import { CreateSurvey } from "./sections/CreateSurvey";
import { EditSurvey } from "./sections/EditSurvey";
import { EventStatistics } from "./sections/EventStatistics";
import { EventStatisticsDetail } from "./sections/EventStatisticsDetail";
import { Registration } from "./sections/Registration";
import { Events } from "./sections/Events";
import { MyEvents } from "./sections/MyEvents";
import { MyCertificates } from "./sections/MyCertificates";
import GenerateQR from "./sections/GenerateQR";
import SurveyManagementPage from "./sections/SurveyManagementPage";
import { Evaluation } from "./sections/Evaluation";
import { EditProfile } from "./sections/EditProfile";
import { Profile } from "./sections/Profile";
import { SetupProfile } from "./sections/SetupProfile";
import ActivityLog from "./sections/ActivityLog";
import { ResetPassword } from "./sections/ResetPassword";
import { Notifications } from "./sections/Notifications";
import { Settings } from "./sections/Settings";
import { Albums } from "./sections/Albums";
import { CertificatePage } from "./sections/CertificatePage";
import { VerifyCertificate } from "./sections/VerifyCertificate";
import { StandaloneCertificateGenerator } from "./sections/StandaloneCertificateGenerator";
import { Support } from "./sections/Support";
import { HelpCenter } from "./sections/HelpCenter";
import { EventMessages } from "./sections/EventMessages";

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
        <Route path="/design-certificate" element={<DesignCertificate />} />
        <Route path="/create-survey" element={<CreateSurvey />} />
        <Route path="/edit-survey/:surveyId" element={<EditSurvey />} />
        <Route path="/event-statistics" element={<EventStatistics />} />
        <Route path="/event-statistics/:eventId" element={<EventStatisticsDetail />} />
        <Route path="/survey-management" element={<SurveyManagementPage />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/my-certificates" element={<MyCertificates />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/generate-qr" element={<GenerateQR />} />
        <Route path="/evaluation/:surveyId" element={<Evaluation />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/setup-profile" element={<SetupProfile />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/albums" element={<Albums />} />
        <Route path="/certificate" element={<CertificatePage />} />
        <Route path="/verify-certificate/:certificateNumber" element={<VerifyCertificate />} />
        <Route path="/standalone-certificate-generator" element={<StandaloneCertificateGenerator />} />
        <Route path="/support" element={<Support />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/event-messages" element={<EventMessages />} />
      </Routes>
    </div>
  );
}

export default AnimatedRoutes;
