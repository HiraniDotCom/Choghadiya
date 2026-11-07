"use client";

import React, { useState, useEffect, useRef } from "react";
import { FiSunrise, FiSunset, FiMoon } from "react-icons/fi";
import { FcAlarmClock } from "react-icons/fc";
import { MdPinDrop } from "react-icons/md";
import { FaSun } from "react-icons/fa";
import { DateTime } from "luxon";

const STATUS_STYLES = {
    "Good (Amrit)": {
        bg: "bg-green-500 text-white border-green-200",
        badge: "bg-white text-black",
    },
    "Good (Excellent)": {
        bg: "bg-green-500 text-white border-green-200",
        badge: "bg-white text-black",
    },
    "Good (Gain)": {
        bg: "bg-green-500 text-white border-green-200",
        badge: "bg-white text-black",
    },
    "Neutral (Medium)": {
        bg: "bg-blue-500 text-white border-blue-200",
        badge: "bg-orange-500 text-white",
    },
    "Bad (Anxiety)": {
        bg: "bg-red-500 text-white border-orange-200",
        badge: "bg-black text-white",
    },
    "Bad (Loss)": {
        bg: "bg-red-500 text-white border-rose-200",
        badge: "bg-black text-white",
    },
    "Bad (Disease)": {
        bg: "bg-red-500 text-white border-red-200",
        badge: "bg-black text-white",
    },
};

const VEDIC_NOVICE_TIPS = {
    Amrit: "Best (A): Peak positive energy. Ultimate success for any major life event, signing contracts, or starting a journey.",
    Shubha: "Better (B): Highly prosperous and pure. Strongly favorable for celebrations, ceremonies, and creative work.",
    Labha: "Good (C): Focused on material growth. Ideal for business transactions, making purchases, investments, and work tasks.",
    Chala: "Neutral: Average energy. Good as a last resort for routine, everyday tasks if you cannot meet the auspicious time windows.",
    Udveg: "Inauspicious: Dominated by anxiety. Avoid starting new ventures or having difficult conversations.",
    Kala: "Inauspicious: Risk of loss or delays. Best suited for dismantling things, cleaning, or resolving old debts.",
    Roga: "Inauspicious: Connected to low energy or illness. Avoid health-related risks, surgeries, or major physical strain.",
};

export default function ChoghadiyaGrid() {
    const [address, setAddress] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [payload, setPayload] = useState(null);
    const [activeTab, setActiveTab] = useState("day");
    const [currentTime, setCurrentTime] = useState(null);

    // Initialize date state on client side inside useEffect to prevent hydration mismatches
    const [selectedDate, setSelectedDate] = useState("");

    const dropdownRef = useRef(null);

    // Safely set the initial local system date picker format on initial load
    useEffect(() => {
        setSelectedDate(DateTime.now().toFormat("yyyy-MM-dd"));
    }, []);

    // Keep the local time updated every 15 seconds to ensure accurate live indicators
    useEffect(() => {
        if (!payload?.meta?.timezone) return;

        const updateTime = () => {
            setCurrentTime(DateTime.now().setZone(payload.meta.timezone));
        };

        updateTime();
        const intervalId = setInterval(updateTime, 15000);
        return () => clearInterval(intervalId);
    }, [payload]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!address || address.trim().length < 3) {
            setSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                console.log(
                    "Triggering autocomplete fetch for string:",
                    address,
                );

                const url = `/api/autocomplete?q=${encodeURIComponent(address)}`;
                const res = await fetch(url);

                if (!res.ok) {
                    console.error(
                        `Autocomplete fetch failed with status code: ${res.status}`,
                    );
                    return;
                }

                const data = await res.json();
                console.log(
                    "Data successfully returned from autocomplete endpoint:",
                    data,
                );

                setSuggestions(data || []);
                setShowDropdown(true);
            } catch (err) {
                console.error("Autocomplete processing connection error:", err);
                setSuggestions([]);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [address]);

    // Automatically trigger re-fetch if location payload exists and the user changes the calendar date option
    useEffect(() => {
        if (payload?.meta?.searchedAddress && selectedDate) {
            handleSubmit(payload.meta.searchedAddress);
        }
    }, [selectedDate]);

    const handleSubmit = async (searchString) => {
        const targetAddress = searchString || address;
        if (!targetAddress.trim()) return;

        setLoading(true);
        setError(null);
        setShowDropdown(false);

        try {
            // Append optional date parameter string to API endpoint layout request
            const res = await fetch(
                `/api/choghadiya?address=${encodeURIComponent(targetAddress)}&date=${selectedDate}`,
            );
            const result = await res.json();

            if (!res.ok)
                throw new Error(result.error || "Something went wrong");

            setPayload(result);

            // Safer Tab Auto-Selection Logic using Luxon relative times
            if (result.meta && result.meta.timezone) {
                const nowInZone = DateTime.now().setZone(result.meta.timezone);
                setCurrentTime(nowInZone);

                // Use the string representations to parse clean time intervals
                const sunriseTime = DateTime.fromFormat(
                    result.meta.sunrise,
                    "hh:mm a",
                    { zone: result.meta.timezone },
                );
                const sunsetTime = DateTime.fromFormat(
                    result.meta.sunset,
                    "hh:mm a",
                    { zone: result.meta.timezone },
                );

                // Normalise hour and minute parameters for day alignment checks
                const currentMinutes = nowInZone.hour * 60 + nowInZone.minute;
                const sunriseMinutes =
                    sunriseTime.hour * 60 + sunriseTime.minute;
                const sunsetMinutes = sunsetTime.hour * 60 + sunsetTime.minute;

                if (
                    currentMinutes >= sunriseMinutes &&
                    currentMinutes < sunsetMinutes
                ) {
                    setActiveTab("day");
                } else {
                    setActiveTab("night");
                }
            }
        } catch (err) {
            setError(err.message);
            setPayload(null);
        } finally {
            setLoading(false);
        }
    };

    // Helper to evaluate if a slot is currently active in the specified timezone context
    const isSlotActive = (slotTimeStringStart, slotTimeStringEnd) => {
        if (!currentTime || !payload?.meta?.timezone) return false;

        // Skip highlighting active status badges entirely if looking up an alternate historical/future calendar date
        const todayStr = DateTime.now()
            .setZone(payload.meta.timezone)
            .toFormat("yyyy-MM-dd");
        const metaDateOnly = payload.meta.localTime
            ? payload.meta.localTime.split(" ")[0]
            : "";
        if (metaDateOnly !== todayStr) return false;

        const slotStart = DateTime.fromFormat(slotTimeStringStart, "hh:mm a", {
            zone: payload.meta.timezone,
        });
        const slotEnd = DateTime.fromFormat(slotTimeStringEnd, "hh:mm a", {
            zone: payload.meta.timezone,
        });

        const nowMins = currentTime.hour * 60 + currentTime.minute;
        let startMins = slotStart.hour * 60 + slotStart.minute;
        let endMins = slotEnd.hour * 60 + slotEnd.minute;

        // Account for night slots wrapping past midnight boundaries
        if (endMins < startMins) {
            if (nowMins >= startMins || nowMins < endMins) return true;
        }

        return nowMins >= startMins && nowMins < endMins;
    };

    const activeTimeline =
        activeTab === "day"
            ? payload?.data?.dayTimeline
            : payload?.data?.nightTimeline;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="relative z-50 mb-6" ref={dropdownRef}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                    className="flex flex-col sm:flex-row gap-3"
                >
                    {/* Location Autocomplete input container */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Enter an address, zip code, or landmark globally..."
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        {showDropdown && suggestions.length > 0 && (
                            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                                {suggestions.map((item, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => {
                                            setAddress(item.display_name);
                                            handleSubmit(item.display_name);
                                        }}
                                        className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                                    >
                                        {item.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Date Picker Input Container */}
                    <div className="w-full sm:w-44">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                    </div>

                    <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                        Search
                    </button>
                </form>
            </div>

            {loading && (
                <div className="text-center py-12 text-slate-500 animate-pulse flex flex-col items-center gap-2">
                    <FcAlarmClock className="text-3xl animate-spin" />
                    <span>Calculating Astronomical Intervals...</span>
                </div>
            )}

            {error && (
                <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                    {error}
                </div>
            )}

            {payload && !loading && (
                <div>
                    {/* Metadata Display */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-sm grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
                        <div className="md:col-span-2 flex items-center gap-2 font-medium text-slate-800 border-b border-slate-200 pb-2">
                            <MdPinDrop className="text-blue-500 text-lg" />
                            <span>{payload.meta.resolvedLocation}</span>
                        </div>
                        <div className="flex items-center gap-2 m-auto">
                            <span className="font-semibold">
                                {selectedDate !==
                                DateTime.now().toFormat("yyyy-MM-dd")
                                    ? "Date:"
                                    : "Local Clock Time:"}
                            </span>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                                {selectedDate !==
                                DateTime.now().toFormat("yyyy-MM-dd")
                                    ? DateTime.fromISO(selectedDate).toFormat(
                                          "yyyy-MM-dd",
                                      )
                                    : currentTime?.toFormat(
                                          "yyyy-MM-dd hh:mm:ss a",
                                      ) || payload.meta.localTime}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 m-auto">
                            <span className="font-semibold">Timezone:</span>
                            <span className="font-mono">
                                {payload.meta.timezone}
                            </span>
                        </div>
                        <div className="flex items-center gap-40 mt-1 border-t border-slate-100 pt-2 md:col-span-2">
                            <div className="flex items-center m-auto gap-1.5 text-amber-800 bg-amber-200 border border-amber-800 rounded-lg px-3 py-1.5">
                                <FiSunrise className="text-2xl" />
                                <span>
                                    Sunrise:{" "}
                                    <strong className="font-mono">
                                        {payload.meta.sunrise}
                                    </strong>
                                </span>
                            </div>
                            <div className="flex items-center m-auto gap-1.5 text-slate-800 bg-slate-300 border border-slate-800 rounded-lg px-3 py-1.5">
                                <FiSunset className="text-2xl" />
                                <span>
                                    Sunset:{" "}
                                    <strong className="font-mono">
                                        {payload.meta.sunset}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Day / Night Timeline Tab Selector & Right-Aligned Custom Legend Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 mb-6 pb-2">
                        {/* Tab Buttons */}
                        <div className="flex">
                            <button
                                type="button"
                                onClick={() => setActiveTab("day")}
                                className={`flex items-center gap-2 px-6 py-2.5 font-medium border-b-2 text-sm transition-all -mb-2.25 ${
                                    activeTab === "day"
                                        ? "border-amber-500 text-amber-600 font-semibold"
                                        : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <FaSun
                                    className={`text-3xl ${
                                        activeTab === "day"
                                            ? "text-amber-500"
                                            : ""
                                    }`}
                                />
                                Day Slots
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("night")}
                                className={`flex items-center gap-2 px-6 py-2.5 font-medium border-b-2 text-sm transition-all -mb-2.25 ${
                                    activeTab === "night"
                                        ? "border-blue-600 text-blue-600 font-semibold"
                                        : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                <FiMoon
                                    className={`text-3xl ${
                                        activeTab === "night"
                                            ? "text-blue-600"
                                            : ""
                                    }`}
                                />
                                Night Slots
                            </button>
                        </div>
                    </div>

                    {/* Timeline Data Card Intervals Rendering Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {activeTimeline?.map((slot) => {
                            const active = isSlotActive(
                                slot.startTime,
                                slot.endTime,
                            );
                            const style = STATUS_STYLES[slot.nature] || {
                                bg: "bg-slate-100 text-slate-700 border-slate-200",
                                badge: "bg-slate-200 text-slate-800",
                            };

                            const statusParts = slot.nature.split(" (");
                            const mainStatus = statusParts[0];
                            const description = statusParts[1]
                                ? statusParts[1].replace(")", "")
                                : "";

                            // Retrieve our custom novice advice snippet matching the slot name
                            const noviceTip =
                                VEDIC_NOVICE_TIPS[slot.name] || "";

                            let cardBgClass = "";
                            if (active) {
                                cardBgClass = `${style.bg} shadow-md ring-4 ring-offset-2 ring-blue-500 scale-[1.02] z-10`;
                            } else {
                                if (slot.nature.startsWith("Good")) {
                                    cardBgClass =
                                        "bg-green-200 text-green-800 border border-green-300 hover:border-green-900 shadow-sm";
                                } else if (slot.nature.startsWith("Bad")) {
                                    cardBgClass =
                                        "bg-red-200 text-red-800 border-red-100 hover:border-red-900 shadow-sm";
                                } else {
                                    cardBgClass =
                                        "bg-blue-200 text-blue-800 border-blue-100 hover:border-blue-900 shadow-sm";
                                }
                            }

                            return (
                                <div
                                    key={slot.number}
                                    className={`group relative p-4 rounded-xl border flex flex-col justify-between h-36 transition-all cursor-help ${cardBgClass}`}
                                >
                                    {/* Novice Advice Popover Tooltip on Card Hover */}
                                    {noviceTip && (
                                        <div className="absolute bottom-[102%] left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 w-64 max-w-xs transition-opacity duration-200 drop-shadow-md">
                                            <div className="bg-slate-900 text-white text-[11px] font-normal leading-relaxed p-2.5 rounded-lg border border-slate-800 text-center">
                                                {noviceTip}
                                            </div>
                                            {/* Arrow point down toward card */}
                                            <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-800"></div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span
                                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                                    active
                                                        ? style.badge
                                                        : "bg-black/5 text-slate-600"
                                                }`}
                                            >
                                                Slot {slot.number}
                                            </span>
                                            <span
                                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                                    active
                                                        ? "bg-white/20 text-white"
                                                        : "bg-black/5 text-slate-700 border border-transparent"
                                                }`}
                                            >
                                                {mainStatus}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold tracking-tight">
                                            {slot.name}
                                        </h3>
                                        <p
                                            className={`text-[11px] mt-0.5 ${active ? "text-white/80" : "text-slate-500"}`}
                                        >
                                            {description}
                                        </p>
                                    </div>
                                    <div
                                        className={`text-xs font-mono font-semibold tracking-tight border-t mt-2 pt-2 ${
                                            active
                                                ? "border-white/20 text-white"
                                                : "border-black/5 text-slate-500"
                                        }`}
                                    >
                                        {slot.startTime} - {slot.endTime}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
