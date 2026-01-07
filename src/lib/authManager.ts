import { apolloClient } from "./apolloClient";
import { gql } from "@apollo/client";

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refresh_token: String!) {
    refresh_token(refresh_token: $refresh_token) {
      auth_token
      refresh_token
      id
      status
    }
  }
`;

let refreshTimer: NodeJS.Timeout | null = null;
const REFRESH_BUFFER = 60 * 60 * 1000; // 1 hour (Refresh at 23rd hour of 24h token)

export const initAuthManager = () => {
    console.log("[AuthManager] Initializing...");
    checkAndScheduleRefresh();

    // Re-check when window comes into focus/visible
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            console.log("[AuthManager] App visible. Checking token...");
            checkAndScheduleRefresh();
        }
    });
};

const checkAndScheduleRefresh = async () => {
    const expiryStr = localStorage.getItem("tokenExpiry");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!expiryStr || !refreshToken) {
        console.log("[AuthManager] No session found.");
        return;
    }

    const expiry = parseInt(expiryStr);
    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    // Logic: 
    // If timeUntilExpiry < Buffer (1 hour), it means > 23 hours passed (if 24h life).
    // -> Refresh Immediately.

    if (timeUntilExpiry < REFRESH_BUFFER) {
        console.log("[AuthManager] Token expiring soon or expired. Refreshing now...");
        await performTokenRefresh(refreshToken);
    } else {
        // Schedule refresh
        const delay = timeUntilExpiry - REFRESH_BUFFER;
        console.log(`[AuthManager] Token valid. Refresh scheduled in ${Math.round(delay / 60000)} minutes.`);

        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            console.log("[AuthManager] Timer triggered. Refreshing token...");
            performTokenRefresh(refreshToken);
        }, delay);
    }
};

const performTokenRefresh = async (refreshToken: string) => {
    try {
        const result = await apolloClient.mutate({
            mutation: REFRESH_TOKEN_MUTATION,
            variables: { refresh_token: refreshToken },
        });

        if ((result.data as any)?.refresh_token) {
            console.log("[AuthManager] Refresh successful.");
            const data = (result.data as any).refresh_token as { auth_token: string; refresh_token?: string; id: string };
            const { auth_token, refresh_token: newRefreshToken } = data;

            // Update Local Storage
            localStorage.setItem("authToken", auth_token);
            localStorage.setItem("auth_token", auth_token); // Legacy

            if (newRefreshToken) {
                localStorage.setItem("refreshToken", newRefreshToken);
                localStorage.setItem("refresh_token", newRefreshToken); // Legacy
            }

            // Parse new expiry
            try {
                const base64Url = auth_token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const decoded = JSON.parse(jsonPayload);
                if (decoded.exp) {
                    const newExpiry = decoded.exp * 1000;
                    localStorage.setItem("tokenExpiry", newExpiry.toString());
                    // Reschedule
                    checkAndScheduleRefresh();
                }
            } catch (e) {
                console.error("[AuthManager] Failed to parse new token expiry", e);
            }

        } else {
            console.warn("[AuthManager] Refresh failed. Result format unexpected.");
            handleLogout();
        }
    } catch (error) {
        console.error("[AuthManager] Refresh failed:", error);
        // If refresh fails, usually means session is dead.
        handleLogout();
    }
};

const handleLogout = () => {
    console.log("[AuthManager] Logging out due to session expiry/failure.");
    localStorage.clear();
    // Redirect to login
    window.location.href = "/";
};
