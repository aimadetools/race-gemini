import { parseOpeningHours, convertTo24Hour } from '../../lib/time-helpers';

describe('convertTo24Hour', () => {
    test('should convert AM times correctly', () => {
        expect(convertTo24Hour('9 AM')).toBe('09:00');
        expect(convertTo24Hour('9:30 AM')).toBe('09:30');
        expect(convertTo24Hour('12 AM')).toBe('00:00'); // Midnight
        expect(convertTo24Hour('12:00 AM')).toBe('00:00');
        expect(convertTo24Hour('1:00 AM')).toBe('01:00');
    });

    test('should convert PM times correctly', () => {
        expect(convertTo24Hour('1 PM')).toBe('13:00');
        expect(convertTo24Hour('5 PM')).toBe('17:00');
        expect(convertTo24Hour('5:30 PM')).toBe('17:30');
        expect(convertTo24Hour('12 PM')).toBe('12:00'); // Noon
        expect(convertTo24Hour('12:00 PM')).toBe('12:00');
        expect(convertTo24Hour('11 PM')).toBe('23:00');
    });

    test('should handle 24-hour times correctly', () => {
        expect(convertTo24Hour('09:00')).toBe('09:00');
        expect(convertTo24Hour('17:00')).toBe('17:00');
        expect(convertTo24Hour('00:00')).toBe('00:00');
        expect(convertTo24Hour('23:59')).toBe('23:59');
    });

    test('should handle times without minutes', () => {
        expect(convertTo24Hour('9 AM')).toBe('09:00');
        expect(convertTo24Hour('5 PM')).toBe('17:00');
        expect(convertTo24Hour('9')).toBe('09:00'); // Assuming 24-hour format if no AM/PM
        expect(convertTo24Hour('17')).toBe('17:00');
    });

    test('should return default for invalid or empty input', () => {
        expect(convertTo24Hour('')).toBe('00:00');
        expect(convertTo24Hour(null)).toBe('00:00');
        expect(convertTo24Hour(undefined)).toBe('00:00');
        expect(convertTo24Hour('invalid time')).toBe('00:00');
    });
});

describe('parseOpeningHours', () => {
    const schemaDayPrefix = "http://schema.org/";

    test('should parse single day with times', () => {
        const result = parseOpeningHours("Mo 09:00-17:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should parse multiple days comma-separated with times', () => {
        const result = parseOpeningHours("Mo, Tu, We 09:00-17:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should parse day range with times', () => {
        const result = parseOpeningHours("Mo-Fr 09:00-17:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should parse mixed specifications', () => {
        const result = parseOpeningHours("Mo-Fr 09:00-17:00; Sa 10:00-14:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:00",
                "closes": "17:00"
            },
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Saturday`],
                "opens": "10:00",
                "closes": "14:00"
            }
        ]);
    });

    test('should parse with AM/PM times', () => {
        const result = parseOpeningHours("Mo-Fr 9 AM-5 PM");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should parse with AM/PM and minutes', () => {
        const result = parseOpeningHours("Mo-Fr 9:30 AM-5:30 PM");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:30",
                "closes": "17:30"
            }
        ]);
    });

    test('should handle wrap-around day range', () => {
        const result = parseOpeningHours("Fr-Mo 09:00-17:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`, `${schemaDayPrefix}Sunday`, `${schemaDayPrefix}Monday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should use default times if only days are provided', () => {
        const result = parseOpeningHours("Mo, Tu, We");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should use default times if only day range is provided', () => {
        const result = parseOpeningHours("Mo-Fr");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should return default all days spec if empty string input', () => {
        const result = parseOpeningHours("");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    `${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`,
                    `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`,
                    `${schemaDayPrefix}Sunday`
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should return default all days spec if null input', () => {
        const result = parseOpeningHours(null);
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    `${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`,
                    `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`,
                    `${schemaDayPrefix}Sunday`
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should return default all days spec if undefined input', () => {
        const result = parseOpeningHours(undefined);
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    `${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`,
                    `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`,
                    `${schemaDayPrefix}Sunday`
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should handle specs with invalid time format (use default times)', () => {
        const result = parseOpeningHours("Mo-Fr invalid-time");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [`${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`, `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should handle specs with invalid day format (use default all days if no valid days)', () => {
        const result = parseOpeningHours("InvalidDay 09:00-17:00");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    `${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`,
                    `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`,
                    `${schemaDayPrefix}Sunday`
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

    test('should return default all days spec if completely unparseable input', () => {
        const result = parseOpeningHours("completely unparseable string");
        expect(result).toEqual([
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    `${schemaDayPrefix}Monday`, `${schemaDayPrefix}Tuesday`, `${schemaDayPrefix}Wednesday`,
                    `${schemaDayPrefix}Thursday`, `${schemaDayPrefix}Friday`, `${schemaDayPrefix}Saturday`,
                    `${schemaDayPrefix}Sunday`
                ],
                "opens": "09:00",
                "closes": "17:00"
            }
        ]);
    });

});