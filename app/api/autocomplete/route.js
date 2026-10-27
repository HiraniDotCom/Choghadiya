import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 3) {
        return NextResponse.json([]);
    }

    try {
        // Shifting to Photon's open-source geocoding API built for real-time typing
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;

        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(
                `Autocomplete engine responded with status: ${res.status}`,
            );
        }

        const rawData = await res.json();

        // Maps the incoming location array structure into your component's display format
        const formattedSuggestions = rawData.features.map((feature) => {
            const props = feature.properties;

            // Build a clean, comma-separated location string from the address fields
            const addressParts = [
                props.name,
                props.street,
                props.city,
                props.postcode,
                props.country,
            ].filter(Boolean); // Removes blank fields

            return {
                place_id:
                    feature.geometry.coordinates.join("-") +
                    "-" +
                    (props.name || "loc"),
                display_name: addressParts.join(", "),
            };
        });

        return NextResponse.json(formattedSuggestions);
    } catch (error) {
        console.error("Autocomplete processing error:", error);
        return NextResponse.json(
            { error: "Failed to fetch suggestions" },
            { status: 500 },
        );
    }
}
