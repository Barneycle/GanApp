import { useState, useEffect } from "react";
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

    // Pages that should skip loading screen and hide navbar
    const authPages = ['/login', '/registration'];
    const isAuthPage = authPages.includes(location.pathname);

    const handleLoadingComplete = () => {
        setIsLoaded(true);
    };

    // Skip loading screen for auth pages
    useEffect(() => {
        if (isAuthPage && !isLoaded) {
            setIsLoaded(true);
        }
    }, [isAuthPage, isLoaded]);

    return (
        <>
            {!isLoaded && !isAuthPage && <LoadingScreen onComplete={handleLoadingComplete} />}

            <div className={`${isAuthPage ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
                {(isLoaded || isAuthPage) && !authLoading && (
                    <>
                        {!isAuthPage && (
                            <>
                                <Navbar />
                                <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                            </>
                        )}
                        <div className={isAuthPage ? 'h-full overflow-hidden' : ''}>
                            <AnimatedRoutes />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default App;
