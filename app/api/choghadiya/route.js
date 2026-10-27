import { NextResponse } from "next/server";
import SunCalc from "suncalc3";
import { DateTime } from "luxon";

const CHOGHADIYA_DAYS = [
    ["Udveg", "Chala", "Labha", "Amrit", "Kala", "Shubha", "Roga"],
    ["Amrit", "Kala", "Shubha", "Roga", "Udveg", "Chala", "Labha"],
    ["Roga", "Udveg", "Chala", "Labha", "Amrit", "Kala", "Shubha"],
    ["Labha", "Amrit", "Kala", "Shubha", "Roga", "Udveg", "Chala"],
    ["Shubha", "Roga", "Udveg", "Chala", "Labha", "Amrit", "Kala"],
    ["Chala", "Labha", "Amrit", "Kala", "Shubha", "Roga", "Udveg"],
    ["Kala", "Shubha", "Roga", "Udveg", "Chala", "Labha", "Amrit"],
];

const CHOGHADIYA_NIGHTS = [
    ["Shubha", "Amrit", "Chala", "Roga", "Kala", "Labha", "Udveg"],
    ["Chala", "Roga", "Kala", "Labha", "Udveg", "Shubha", "Amrit"],
    ["Kala", "Labha", "Udveg", "Shubha", "Amrit", "Chala", "Roga"],
    ["Udveg", "Shubha", "Amrit", "Chala", "Roga", "Kala", "Labha"],
    ["Amrit", "Chala", "Roga", "Kala", "Labha", "Udveg", "Shubha"],
    ["Roga", "Kala", "Labha", "Udveg", "Shubha", "Amrit", "Chala"],
    ["Labha", "Udveg", "Shubha", "Amrit", "Chala", "Roga", "Kala"],
];

const CHOGHADIYA_NATURE = {
    Amrit: "Good (Amrit)",
    Shubha: "Good (Excellent)",
    Labha: "Good (Gain)",
    Chala: "Neutral (Medium)",
    Udveg: "Bad (Anxiety)",
    Kala: "Bad (Loss)",
    Roga: "Bad (Disease)",
};

async function resolveLocation(inputString) {
    const coordRegex =
        /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;

    if (coordRegex.test(inputString.trim())) {
        const [lat, lon] = inputString
            .split(",")
            .map((num) => parseFloat(num.trim()));
        return {
            lat,
            lon,
            displayName: `Custom Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        };
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(inputString.trim())}&format=json&limit=1`;
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "NextJSChoghadiyaApp/1.0" },
        });
        const data = await response.json();
        if (!data || data.length === 0) return null;

        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            displayName: data[0].display_name,
        };
    } catch (err) {
        console.error("Internal Geocoding Sub-Fetch Error:", err);
        return null;
    }
}

async function getTimezone(lat, lon) {
    try {
        const url = `https://bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const response = await fetch(url);
        const data = await response.json();
        return (
            data.ianaId ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "UTC"
        );
    } catch (err) {
        console.error("Timezone fetch failed:", err);
        return "UTC";
    }
}

function calculateChoghadiyaIntervals(startTime, endTime, sequence) {
    const totalDurationMs = endTime.valueOf() - startTime.valueOf();
    const intervalMs = totalDurationMs / 8;
    const intervals = [];
    for (let i = 0; i < 8; i++) {
        const start = startTime.plus({ milliseconds: i * intervalMs });
        const end = startTime.plus({ milliseconds: (i + 1) * intervalMs });
        const name = sequence[i % 7];
        intervals.push({
            number: i + 1,
            name,
            nature: CHOGHADIYA_NATURE[name],
            startTime: start.toFormat("hh:mm a"),
            endTime: end.toFormat("hh:mm a"),
        });
    }
    return intervals;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address") || searchParams.get("city");

    if (!address) {
        return NextResponse.json(
            { error: "Location parameter (address or city) is required" },
            { status: 400 },
        );
    }

    try {
        const location = await resolveLocation(address);
        if (!location)
            return NextResponse.json(
                { error: "Location not found" },
                { status: 404 },
            );

        const timezone = await getTimezone(location.lat, location.lon);
        const localNow = DateTime.now().setZone(timezone);
        const dayOfWeek = localNow.weekday % 7;

        const sunTimes = SunCalc.getSunTimes(
            localNow.toJSDate(),
            location.lat,
            location.lon,
        );

        const sunrise = DateTime.fromJSDate(
            new Date(
                sunTimes.sunrise?.value ||
                    sunTimes.sunriseStart?.value ||
                    sunTimes.sunrise ||
                    sunTimes.sunriseStart,
            ),
        ).setZone(timezone);

        const sunset = DateTime.fromJSDate(
            new Date(
                sunTimes.sunset?.value ||
                    sunTimes.sunsetEnd?.value ||
                    sunTimes.sunset ||
                    sunTimes.sunsetEnd,
            ),
        ).setZone(timezone);

        const tomorrowSunTimes = SunCalc.getSunTimes(
            localNow.plus({ days: 1 }).toJSDate(),
            location.lat,
            location.lon,
        );
        const nextSunrise = DateTime.fromJSDate(
            new Date(
                tomorrowSunTimes.sunrise?.value ||
                    tomorrowSunTimes.sunriseStart?.value ||
                    tomorrowSunTimes.sunrise ||
                    tomorrowSunTimes.sunriseStart,
            ),
        ).setZone(timezone);

        const dayChoghadiya = calculateChoghadiyaIntervals(
            sunrise,
            sunset,
            CHOGHADIYA_DAYS[dayOfWeek],
        );
        const nightChoghadiya = calculateChoghadiyaIntervals(
            sunset,
            nextSunrise,
            CHOGHADIYA_NIGHTS[dayOfWeek],
        );

        return NextResponse.json({
            success: true,
            meta: {
                searchedAddress: address,
                resolvedLocation: location.displayName,
                coordinates: {
                    latitude: location.lat,
                    longitude: location.lon,
                },
                timezone,
                localTime: localNow.toFormat("yyyy-MM-dd hh:mm a"),
                sunrise: sunrise.toFormat("hh:mm a"),
                sunset: sunset.toFormat("hh:mm a"),
            },
            data: {
                dayTimeline: dayChoghadiya,
                nightTimeline: nightChoghadiya,
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Processing failed", details: error.message },
            { status: 500 },
        );
    }
}
