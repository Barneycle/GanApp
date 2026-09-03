import { useState, useEffect } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import AnimatedRoutes from "./components/AnimatedRoutes";
import { Navbar } from "./components/Navbar";
import { MobileMenu } from "./components/MobileMenu";
import { AppShell } from "./components/AppShell";
import { SmartSpinner } from "./components/loading/SmartSpinner";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Toast";
import { MotionConfig } from "framer-motion";
import { SystemSettingsService } from "./services/systemSettingsService";

function App() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [checkingMaintenance, setCheckingMaintenance] = useState(true);
    const location = useLocation();

    const { loading: authLoading = false, user = null } = useAuth();

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
    const isAdmin = user?.role === 'admin';

    // Allow access to login page during maintenance (so admins can log in)
    // Allow admins to access admin pages even during maintenance
    const isAdminPage = location.pathname.startsWith('/admin');
    const _canAccessDuringMaintenance = isAuthPage || (user?.role === 'admin' && isAdminPage);

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
            <MotionConfig reducedMotion="user">
            <ToastProvider>
                <div className="app-shell flex min-h-screen items-center justify-center p-4">
                    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
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
                                className="inline-block w-full rounded-md bg-blue-900 px-6 py-3 text-center font-medium text-white transition-colors hover:bg-blue-800"
                            >
                                Administrator Login
                            </Link>
                        </div>
                    </div>
                </div>
            </ToastProvider>
            </MotionConfig>
        );
    }

    return (
        <MotionConfig reducedMotion="user">
        <ToastProvider>
            {!isLoaded && !isAuthPage && <LoadingScreen onComplete={handleLoadingComplete} />}

            <div className={`${shouldHideNavbar ? 'h-screen overflow-hidden' : 'min-h-screen'} ${isAdmin ? 'bg-white text-gray-900' : 'app-shell'}`}>
                {(isLoaded || isAuthPage) ? (
                    <>
                        {!shouldHideNavbar && !authLoading && isAdmin && (
                            <>
                                <Navbar />
                                <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                            </>
                        )}
                        {!shouldHideNavbar && !authLoading && !isAdmin ? (
                            <AppShell>
                                <AnimatedRoutes />
                            </AppShell>
                        ) : (
                            <div className={shouldHideNavbar ? 'h-full overflow-hidden' : ''}>
                                <AnimatedRoutes />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="fixed inset-0 flex items-center justify-center">
                        <SmartSpinner
                            active
                            label="This is taking a moment"
                            messages={['Still loading GanApp', 'This is taking a bit longer', 'Almost there']}
                        />
                    </div>
                )}
            </div>
        </ToastProvider>
        </MotionConfig>
    );
}

export default App;
