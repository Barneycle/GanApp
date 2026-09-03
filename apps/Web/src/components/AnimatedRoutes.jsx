import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { PageTransition } from "./motion/PageTransition";
import { PageSkeleton } from "./loading/Skeleton";

const named = (importer, exportName) =>
  lazy(() => importer().then((mod) => ({ default: mod[exportName] })));

const Home = named(() => import("./sections/Home"), "Home");
const Admin = named(() => import("./sections/Admin"), "Admin");
const Organizer = named(() => import("./sections/Organizer"), "Organizer");
const Participants = named(() => import("./sections/Participants"), "Participants");
const Login = named(() => import("./sections/Login"), "Login");
const CreateEvent = named(() => import("./sections/CreateEvent"), "CreateEvent");
const EditEvent = named(() => import("./sections/EditEvent"), "EditEvent");
const DesignCertificate = named(() => import("./sections/DesignCertificate"), "DesignCertificate");
const CreateSurvey = named(() => import("./sections/CreateSurvey"), "CreateSurvey");
const EditSurvey = named(() => import("./sections/EditSurvey"), "EditSurvey");
const EventStatistics = named(() => import("./sections/EventStatistics"), "EventStatistics");
const EventStatisticsDetail = named(() => import("./sections/EventStatisticsDetail"), "EventStatisticsDetail");
const Registration = named(() => import("./sections/Registration"), "Registration");
const Events = named(() => import("./sections/Events"), "Events");
const MyEvents = named(() => import("./sections/MyEvents"), "MyEvents");
const MyCertificates = named(() => import("./sections/MyCertificates"), "MyCertificates");
const GenerateQR = lazy(() => import("./sections/GenerateQR"));
const SurveyManagementPage = lazy(() => import("./sections/SurveyManagementPage"));
const Evaluation = named(() => import("./sections/Evaluation"), "Evaluation");
const EditProfile = named(() => import("./sections/EditProfile"), "EditProfile");
const Profile = named(() => import("./sections/Profile"), "Profile");
const SetupProfile = named(() => import("./sections/SetupProfile"), "SetupProfile");
const ActivityLog = lazy(() => import("./sections/ActivityLog"));
const ResetPassword = named(() => import("./sections/ResetPassword"), "ResetPassword");
const Notifications = named(() => import("./sections/Notifications"), "Notifications");
const Settings = named(() => import("./sections/Settings"), "Settings");
const Albums = named(() => import("./sections/Albums"), "Albums");
const CertificatePage = named(() => import("./sections/CertificatePage"), "CertificatePage");
const VerifyCertificate = named(() => import("./sections/VerifyCertificate"), "VerifyCertificate");
const StandaloneCertificateGenerator = named(
  () => import("./sections/StandaloneCertificateGenerator"),
  "StandaloneCertificateGenerator",
);
const Support = named(() => import("./sections/Support"), "Support");
const HelpCenter = named(() => import("./sections/HelpCenter"), "HelpCenter");
const EventMessages = named(() => import("./sections/EventMessages"), "EventMessages");

function AnimatedRoutes() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className={isLoginPage ? "h-full overflow-hidden" : ""}>
      <PageTransition>
        <Suspense fallback={<PageSkeleton />}>
          <Routes location={location}>
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
        </Suspense>
      </PageTransition>
    </div>
  );
}

export default AnimatedRoutes;
