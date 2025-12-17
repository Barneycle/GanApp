import { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import AnimatedRoutes from "./components/AnimatedRoutes";
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Toast";
import { useJobWorker } from "./hooks/useJobWorker";
import { SystemSettingsService } from "./services/systemSettingsService";

function App() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [checkingMaintenance, setCheckingMaintenance] = useState(true);
    const location = useLocation();

    // Start background job worker (processes jobs every 5 seconds for faster response)
    useJobWorker(true, 5000);
    let authLoading = false;
    let user = null;
    try {
        const auth = useAuth();
        authLoading = auth?.loading || false;
        user = auth?.user || null;
    } catch (err) {
        console.error('Error accessing auth context:', err);
        // Continue without auth loading state
    }

    // Check maintenance mode on mount and when location changes
    useEffect(() => {
        const checkMaintenanceMode = async () => {
            try {
                // Use RPC function that works for unauthenticated users
                const isMaintenanceMode = await SystemSettingsService.getMaintenanceMode();
                setMaintenanceMode(isMaintenanceMode);
            } catch (err) {
                console.error('Error checking maintenance mode:', err);
                setMaintenanceMode(false); // Default to disabled on error
            } finally {
                setCheckingMaintenance(false);
            }
        };

        checkMaintenanceMode();
        // Refresh maintenance mode check periodically
        const interval = setInterval(checkMaintenanceMode, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    // Pages that should skip loading screen and hide navbar
    const authPages = ['/login', '/registration', '/reset-password'];
    const isAuthPage = authPages.includes(location.pathname);
    // Also hide navbar for mobile certificate page
    const isMobileCertificate = location.pathname === '/certificate' && new URLSearchParams(location.search).get('mobile') === 'true';
    const shouldHideNavbar = isAuthPage || isMobileCertificate;

    // Allow access to login page during maintenance (so admins can log in)
    // Allow admins to access admin pages even during maintenance
    const isAdminPage = location.pathname.startsWith('/admin');
    const canAccessDuringMaintenance = isAuthPage || (user?.role === 'admin' && isAdminPage);

    const handleLoadingComplete = () => {
        setIsLoaded(true);
    };

    // Skip loading screen for auth pages
    useEffect(() => {
        if (isAuthPage && !isLoaded) {
            setIsLoaded(true);
        }
    }, [isAuthPage, isLoaded]);

    // Show maintenance mode screen if enabled (except for auth pages and admins on admin pages)
    // Allow auth pages (login, registration, reset-password) to always be accessible during maintenance
    if (!checkingMaintenance && maintenanceMode && !isAuthPage && !(user?.role === 'admin' && isAdminPage)) {
        return (
            <ToastProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">System Maintenance</h2>
                        <p className="text-slate-600 mb-6">
                            The system is currently undergoing maintenance. Please check back later.
                        </p>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-500 mb-4">
                                We apologize for any inconvenience this may cause.
                            </p>
                            <Link
                                to="/login"
                                className="inline-block w-full px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors font-medium text-center"
                            >
                                Administrator Login
                            </Link>
                        </div>
                    </div>
                </div>
            </ToastProvider>
        );
    }

    return (
        <ToastProvider>
            {!isLoaded && !isAuthPage && <LoadingScreen onComplete={handleLoadingComplete} />}

            <div className={`${shouldHideNavbar ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
                {(isLoaded || isAuthPage) ? (
                    <>
                        {!shouldHideNavbar && !authLoading && (
                            <>
                                <Navbar />
                                <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                            </>
                        )}
                        <div className={shouldHideNavbar ? 'h-full overflow-hidden' : ''}>
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
