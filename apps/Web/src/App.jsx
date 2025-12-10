import { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import AnimatedRoutes from "./components/AnimatedRoutes";
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Toast";

function App() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const location = useLocation();
    let authLoading = false;
    try {
        const auth = useAuth();
        authLoading = auth?.loading || false;
    } catch (err) {
        console.error('Error accessing auth context:', err);
        // Continue without auth loading state
    }

    // Pages that should skip loading screen and hide navbar
    const authPages = ['/login', '/registration', '/reset-password'];
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
        <ToastProvider>
            {!isLoaded && !isAuthPage && <LoadingScreen onComplete={handleLoadingComplete} />}

            <div className={`${isAuthPage ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
                {(isLoaded || isAuthPage) ? (
                    <>
                        {!isAuthPage && !authLoading && (
                            <>
                                <Navbar />
                                <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                            </>
                        )}
                        <div className={isAuthPage ? 'h-full overflow-hidden' : ''}>
                            <AnimatedRoutes />
                        </div>
                    </>
                ) : (
                    <div className="fixed inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-slate-600">Loading...</p>
                        </div>
                    </div>
                )}
            </div>
        </ToastProvider>
    );
}

export default App;
