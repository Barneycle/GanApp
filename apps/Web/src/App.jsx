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

            <div className={`${location.pathname === '/login' ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
                {isLoaded && !authLoading && (
                    <>
                        {location.pathname !== '/login' && (
                            <>
                                <Navbar />
                                <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                            </>
                        )}
                        <div className={location.pathname === '/login' ? 'h-full overflow-hidden' : ''}>
                            <AnimatedRoutes />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default App;
