import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    const authToken = localStorage.getItem("authToken");

    // Check both for robustness
    if (!isAuthenticated || !authToken) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export const PublicRoute = () => {
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    const authToken = localStorage.getItem("authToken");

    if (isAuthenticated && authToken) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
