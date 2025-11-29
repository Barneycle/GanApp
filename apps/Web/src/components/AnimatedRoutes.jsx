import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "./sections/Home";
import { Admin } from "./sections/Admin";
import { Organizer } from "./sections/Organizer";
import { Participants } from "./sections/Participants";
import { Login } from "./sections/Login";
import { CreateEvent } from "./sections/CreateEvent";
import { EditEvent } from "./sections/EditEvent";
import { CreateSurvey } from "./sections/CreateSurvey";
import { EventStatistics } from "./sections/EventStatistics";
import { EventStatisticsDetail } from "./sections/EventStatisticsDetail";
import { Registration } from "./sections/Registration";
import { Events } from "./sections/Events";
import { MyEvents } from "./sections/MyEvents";
import GenerateQR from "./sections/GenerateQR";
import SurveyManagementPage from "./sections/SurveyManagementPage";
import { Evaluation } from "./sections/Evaluation";
import { Certificate } from "./sections/Certificate";
import { EditProfile } from "./sections/EditProfile";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/organizer" element={<Organizer />} />
        <Route path="/events" element={<Events />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/edit-event/:eventId" element={<EditEvent />} />
        <Route path="/create-survey" element={<CreateSurvey />} />
        <Route path="/event-statistics" element={<EventStatistics />} />
        <Route path="/event-statistics/:eventId" element={<EventStatisticsDetail />} />
        <Route path="/survey-management" element={<SurveyManagementPage />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/generate-qr" element={<GenerateQR />} />
        <Route path="/evaluation/:surveyId" element={<Evaluation />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/edit-profile" element={<EditProfile />} />
      </Routes>
    </div>
  );
}

export default AnimatedRoutes;
