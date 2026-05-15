// lib/time-helpers.js - TEMPORARY MOCK

module.exports = {
    parseOpeningHours: () => [],
    convertTo24Hour: (time12h) => time12h ? time12h.split(' ')[0] + ':00' : '00:00', // Basic conversion
};