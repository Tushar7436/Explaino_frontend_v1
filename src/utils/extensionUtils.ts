/* eslint-disable no-undef */

const EXTENSION_ID = "dajchnchedhpjnfnbdhhjihodoaenmhd";

/**
 * Checks if the Explaino extension is installed and ready.
 * @returns Promise<boolean>
 */
export const checkExtensionConnection = (): Promise<boolean> => {
    return new Promise((resolve) => {
        // @ts-ignore
        if (typeof window === "undefined" || !window.chrome || !window.chrome.runtime) {
            console.warn("Chrome runtime not available");
            resolve(false);
            return;
        }

        try {
            // @ts-ignore
            window.chrome.runtime.sendMessage(
                EXTENSION_ID,
                { type: "PING" },
                (response: any) => {
                    // @ts-ignore
                    if (window.chrome.runtime.lastError) {
                        // @ts-ignore
                        console.log("Extension not found or error:", window.chrome.runtime.lastError.message);
                        resolve(false);
                    } else if (response && response.success) {
                        console.log("Extension connected!", response.version);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            );
        } catch (err) {
            console.error("Failed to send message to extension:", err);
            resolve(false);
        }
    });
};

/**
 * Sends a message to the extension to open its UI.
 * @param clientId - The client_id (user_id) to pass to the extension
 */
export const openExtension = (clientId?: string): void => {
    // @ts-ignore
    if (typeof window === "undefined" || !window.chrome || !window.chrome.runtime) return;

    console.log("🚀 Sending to extension - client_id:", clientId);

    try {
        // @ts-ignore
        window.chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
                type: "OPEN_EXTENSION",
                client_id: clientId
            },
            (response: any) => {
                if (response?.success) {
                    console.log("✅ Extension opened successfully with client_id:", clientId);
                } else {
                    console.warn("⚠️ Extension response:", response);
                }
            }
        );
    } catch (error) {
        console.error("❌ Failed to open extension", error);
    }
};

/**
 * Sends the client ID to the extension for identity handoff.
 * This is used when the dashboard is opened from the extension.
 * @param clientId - The client_id (user_id) to pass to the extension
 * @returns Promise<boolean> - True if message was sent successfully
 */
export const sendClientIdToExtension = (clientId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        // @ts-ignore
        if (typeof window === "undefined" || !window.chrome || !window.chrome.runtime) {
            console.warn("Chrome runtime not available for identity handoff");
            resolve(false);
            return;
        }

        if (!clientId) {
            console.warn("No clientId provided for identity handoff");
            resolve(false);
            return;
        }

        console.log("🔑 Sending clientId to extension for identity handoff:", clientId);

        try {
            // @ts-ignore
            window.chrome.runtime.sendMessage(
                EXTENSION_ID,
                {
                    type: "EXTENSION_CLIENT_ID",
                    clientId: clientId
                },
                (response: any) => {
                    // @ts-ignore
                    if (window.chrome.runtime.lastError) {
                        // @ts-ignore
                        console.log("Extension identity handoff error:", window.chrome.runtime.lastError.message);
                        resolve(false);
                    } else if (response?.success) {
                        console.log("✅ ClientId sent to extension successfully");
                        resolve(true);
                    } else {
                        console.warn("⚠️ Extension identity handoff response:", response);
                        resolve(false);
                    }
                }
            );
        } catch (error) {
            console.error("❌ Failed to send clientId to extension", error);
            resolve(false);
        }
    });
};
