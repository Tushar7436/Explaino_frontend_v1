/* eslint-disable no-undef */

const EXTENSION_ID = "jemkddimmnncailhokfcbbppkmaackjb";

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
