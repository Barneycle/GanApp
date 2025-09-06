import { useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import AnimatedRoutes from "./components/AnimatedRoutes";
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

function App() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const location = useLocation();
    const { loading: authLoading } = useAuth();

    const handleLoadingComplete = () => {
        setIsLoaded(true);
    };

    return (
        <>
            {!isLoaded && <LoadingScreen onComplete={handleLoadingComplete} />}

            <div className="min-h-screen bg-white text-gray-900">
                {isLoaded && !authLoading && (
                    <>
                        <Navbar />
                        <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                        <AnimatedRoutes />
                    </>
                )}
            </div>
        </>
    );
}

export default App;
