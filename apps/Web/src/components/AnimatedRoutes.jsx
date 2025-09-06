import { Routes, Route, useLocation } from "react-router-dom";
import { Home } from "./sections/Home";
import { Admin } from "./sections/Admin";
import { Organizer } from "./sections/Organizer";
import { Participants } from "./sections/Participants";
import { Login } from "./sections/Login";
import { CreateEvent } from "./sections/CreateEvent";
import { CreateSurvey } from "./sections/CreateSurvey";
import { SurveyAnalytics } from "./sections/SurveyAnalytics";
import { Registration } from "./sections/Registration";
import { Events } from "./sections/Events";
import GenerateQR from "./sections/GenerateQR";

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
        <Route path="/create-survey" element={<CreateSurvey />} />
        <Route path="/survey-analytics" element={<SurveyAnalytics />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/generate-qr" element={<GenerateQR />} />
      </Routes>
    </div>
  );
}

export default AnimatedRoutes;
