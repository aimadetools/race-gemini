// lib/time-helpers.js

/**
 * Helper function to parse opening hours string (e.g., "Mo-Fr 09:00-17:00; Sa 10:00-14:00")
 * @param {string} openingHoursString - The string containing opening hours.
 * @returns {Array<Object>} An array of OpeningHoursSpecification objects.
 */
function parseOpeningHours(openingHoursString) {

    const defaultOpens = "09:00";
    const defaultCloses = "17:00";
    const schemaDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayMap = {
        "mo": "Monday", "mon": "Monday",
        "tu": "Tuesday", "tue": "Tuesday",
        "we": "Wednesday", "wed": "Wednesday",
        "th": "Thursday", "thu": "Thursday",
        "fr": "Friday", "fri": "Friday",
        "sa": "Saturday", "sat": "Saturday",
        "su": "Sunday", "sun": "Sunday"
    };

    const openingHoursSpecifications = [];
    const specs = (openingHoursString || '').split(';').map(s => s.trim()).filter(s => s);

    // If no specs are found, directly use the fallback
    if (specs.length === 0) {
        openingHoursSpecifications.push({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": schemaDays.map(day => `http://schema.org/${day}`),
            "opens": defaultOpens,
            "closes": defaultCloses
        });
        return openingHoursSpecifications;
    }


    for (const spec of specs) {
        let days = [];
        let opens = defaultOpens;
        let closes = defaultCloses;
        let dayPart = spec;

        const timeRegex = /(\d{1,2}(:\d{2})?\s*(AM|PM)?)\s*-\s*(\d{1,2}(:\d{2})?\s*(AM|PM)?)/i;
        const timeMatch = spec.match(timeRegex);

        if (timeMatch) {
            opens = convertTo24Hour(timeMatch[1]);
            closes = convertTo24Hour(timeMatch[4]);
            dayPart = spec.substring(0, spec.indexOf(timeMatch[0])).trim();
        }

        // Parse days from dayPart (either full spec or narrowed)
        const rangeMatch = dayPart.match(/([a-z]{2,3})\s*-\s*([a-z]{2,3})/i);
        if (rangeMatch) {
            const startDay = dayMap[rangeMatch[1].toLowerCase()];
            const endDay = dayMap[rangeMatch[2].toLowerCase()];
            if (startDay && endDay) {
                const startIndex = schemaDays.indexOf(startDay);
                const endIndex = schemaDays.indexOf(endDay);
                if (startIndex !== -1 && endIndex !== -1) {
                    if (startIndex <= endIndex) {
                        days = schemaDays.slice(startIndex, endIndex + 1);
                    } else {
                        // Handle wrap-around ranges like "Fr-Mo"
                        days = schemaDays.slice(startIndex).concat(schemaDays.slice(0, endIndex + 1));
                    }
                }
            }
        } else {
            const individualDays = dayPart.split(',').map(d => dayMap[d.trim().toLowerCase()]).filter(d => d);
            days = individualDays;
        }

        // If no specific days were found from dayPart, default to all days
        if (days.length === 0) {
            days = schemaDays;
        }
        
        openingHoursSpecifications.push({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": days.map(day => `http://schema.org/${day}`),
            opens,
            closes
        });
    }

    return openingHoursSpecifications;
}

/**
 * Helper function to convert 12-hour time (e.g., "9 AM", "5 PM", "9:30AM") to 24-hour (HH:MM)
 * @param {string} time12h - The time string in 12-hour format with optional AM/PM.
 * @returns {string} The time string in 24-hour format (HH:MM).
 */
function convertTo24Hour(time12h) {
    if (!time12h) return "00:00"; // Default or handle error

    // Remove any spaces around AM/PM and convert to uppercase for consistency
    time12h = time12h.replace(/\s*(am|pm)\s*/i, (match, p1) => p1.toUpperCase()).trim();

    const match = time12h.match(/(\d{1,2})(:(\d{2}))?\s*(AM|PM)?/i);
    if (!match) {
        return "00:00"; // Invalid format, return default
    }

    let [_, hourStr, , minuteStr, ampm] = match;
    let hour = parseInt(hourStr, 10);
    let minute = minuteStr ? parseInt(minuteStr, 10) : 0;

    if (ampm) {
        ampm = ampm.toUpperCase();
        if (ampm === 'PM' && hour < 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) { // Midnight 12 AM
            hour = 0;
        }
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

module.exports = {
    parseOpeningHours,
    convertTo24Hour
};