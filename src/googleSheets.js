// **USER ACTION REQUIRED**: Replace this URL with your actual Google Apps Script Web App URL
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyKlrokPBousG7NgRIF2PmEckhyXbxop_EXIpk-bsmeb-Q958JDr1e6utCNBx-1SGvLbw/exec";

const CHECK_IN_FEE = 2.50;

/**
 * Fetches the current club roster from the Google Sheet
 * @returns {Promise<Array>} List of players with {firstName, lastName}
 */
export const fetchRoster = async () => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Use deterministic IDs instead of Date.now() for persistent states across refreshes
        return data.roster.map((player) => {
            const safeFn = (player.firstName || "").trim().toLowerCase();
            const safeLn = (player.lastName || "").trim().toLowerCase();
            return {
                ...player,
                id: `player-${safeFn}-${safeLn}`
            };
        });
    } catch (error) {
        console.error("Failed to fetch roster:", error);
        return [];
    }
};

/**
 * Logs a check-in to the Google Sheet
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {Promise<boolean>} Success status
 */
export const checkInPlayer = async (firstName, lastName) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            // mode: 'no-cors' is often needed depending on how the Google App Script is deployed, 
            // but fetch using text/plain avoids the CORS preflight OPTIONS request that Apps Script fails on.
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify({
                action: "checkIn",
                firstName: firstName,
                lastName: lastName,
                amount: CHECK_IN_FEE
            })
        });

        // Read the response text (Apps script returns JSON but we fetch it as text to avoid CORS issues)
        const resultText = await response.text();
        // Try to parse if we can, but if no-cors is true, response is opaque.
        return true;
    } catch (error) {
        console.error("Failed to check in:", error);
        return false;
    }
};

/**
 * Adds a new player to the roster in the Google Sheet
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {Promise<boolean>} Success status
 */
export const addPlayerToRoster = async (firstName, lastName) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify({
                action: "addPlayer",
                firstName: firstName,
                lastName: lastName
            })
        });
        return true;
    } catch (error) {
        console.error("Failed to add player:", error);
        return false;
    }
};

/**
 * Edits an existing player's name in the roster
 * @param {string} oldFirstName 
 * @param {string} oldLastName 
 * @param {string} newFirstName 
 * @param {string} newLastName 
 * @returns {Promise<boolean>} Success status
 */
export const editPlayerInRoster = async (oldFirstName, oldLastName, newFirstName, newLastName) => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify({
                action: "editPlayer",
                oldFirstName: oldFirstName,
                oldLastName: oldLastName,
                newFirstName: newFirstName,
                newLastName: newLastName
            })
        });
        return true;
    } catch (error) {
        console.error("Failed to edit player:", error);
        return false;
    }
};
