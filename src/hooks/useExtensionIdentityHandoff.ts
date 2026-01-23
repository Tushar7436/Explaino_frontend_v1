import { useEffect, useRef } from "react";
import { sendClientIdToExtension } from "../utils/extensionUtils";

/**
 * Hook to handle identity handoff from the dashboard to the Chrome extension.
 * Detects if the page was opened from the extension via query parameter
 * and sends the clientId to the extension if the user is authenticated.
 */
export const useExtensionIdentityHandoff = () => {
    const hasHandedOff = useRef(false);

    useEffect(() => {
        // Only run once
        if (hasHandedOff.current) {
            return;
        }

        // Check if page was opened from extension
        const urlParams = new URLSearchParams(window.location.search);
        const fromExtension = urlParams.get("fromExtension") === "true";

        if (!fromExtension) {
            console.log("Dashboard not opened from extension, skipping identity handoff");
            return;
        }

        console.log("Dashboard opened from extension, checking authentication...");

        // Check if user is authenticated
        const clientId = localStorage.getItem("user_id");
        const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

        if (!clientId || !isAuthenticated) {
            console.log("User not authenticated, skipping identity handoff");
            return;
        }

        // Mark as handed off before attempting to prevent race conditions
        hasHandedOff.current = true;

        // Send clientId to extension
        console.log("Performing identity handoff with clientId:", clientId);
        sendClientIdToExtension(clientId)
            .then((success) => {
                if (success) {
                    console.log("Identity handoff completed successfully");
                } else {
                    console.warn("Identity handoff failed");
                    // Reset flag to allow retry on next render if needed
                    hasHandedOff.current = false;
                }
            })
            .catch((error) => {
                console.error("Identity handoff error:", error);
                hasHandedOff.current = false;
            });
    }, []); // Empty dependency array - only run once on mount
};
