"use client";

import React, { useState, useEffect, useRef } from "react";

import { FiSunrise, FiSunset, FiMoon } from "react-icons/fi";
import { FcAlarmClock } from "react-icons/fc";
import { MdPinDrop } from "react-icons/md";
import { FaSun } from "react-icons/fa";
import { DateTime } from "luxon";

const STATUS_STYLES = {
    "Good (Amrit)": {
        bg: "bg-green-50 text-green-700 border-green-200",
        badge: "bg-green-700 text-white",
    },
    "Good (Excellent)": {
        bg: "bg-green-50 text-green-500 border-green-200",
        badge: "bg-green-500 text-white",
    },
    "Good (Gain)": {
        bg: "bg-green-50 text-green-300 border-green-200",
        badge: "bg-green-300 text-white",
    },
    "Neutral (Medium)": {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        badge: "bg-blue-500 text-white",
    },
    "Bad (Anxiety)": {
        bg: "bg-orange-50 text-orange-800 border-orange-200",
        badge: "bg-orange-800 text-white",
    },
    "Bad (Loss)": {
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        badge: "bg-rose-500 text-white",
    },
    "Bad (Disease)": {
        bg: "bg-red-50 text-red-700 border-red-200",
        badge: "bg-red-500 text-white",
    },
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

    const dropdownRef = useRef(null);

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

    const handleSubmit = async (searchString) => {
        const targetAddress = searchString || address;
        if (!targetAddress.trim()) return;

        setLoading(true);
        setError(null);
        setShowDropdown(false);

        try {
            const res = await fetch(
                `/api/choghadiya?address=${encodeURIComponent(targetAddress)}`,
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
                    className="flex gap-2"
                >
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
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 shrink-0"
                    >
                        {loading ? "Searching..." : "Get Timelines"}
                    </button>
                </form>

                {/* Suggestion Dropdown List */}
                {showDropdown && suggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full z-100 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 block">
                        {suggestions.map((item, idx) => (
                            <li key={item.place_id || idx} className="block">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddress(item.display_name);
                                        setShowDropdown(false);
                                        handleSubmit(item.display_name);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 bg-white"
                                >
                                    <span className="opacity-60 shrink-0">
                                        <MdPinDrop className="inline text-3xl" />
                                    </span>
                                    <span className="truncate">
                                        {item.display_name}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {error && (
                <div className="p-4 mb-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-sm">
                    ⚠️ {error}
                </div>
            )}

            {payload && (
                <div>
                    {/* Metadata Display */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-sm grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
                        <div className="md:col-span-2 flex items-center gap-2">
                            <MdPinDrop className="text-xl text-blue-500 shrink-0" />
                            <div>
                                <span className="font-semibold text-slate-800">
                                    Location:
                                </span>{" "}
                                {payload.meta.resolvedLocation}
                            </div>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                                <FcAlarmClock className="text-lg" /> Local Clock
                                Time:
                            </span>
                            <div className="pl-5 text-slate-700 font-medium">
                                {currentTime
                                    ? currentTime.toFormat("yyyy-MM-dd hh:mm a")
                                    : payload.meta.localTime}
                            </div>
                            <div className="pl-5 text-xs text-slate-400">
                                Zone: {payload.meta.timezone}
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                            <div className="flex items-center gap-1">
                                <FiSunrise className="text-amber-500 text-xl" />
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                        Sunrise
                                    </div>
                                    <div className="font-bold text-slate-700">
                                        {payload.meta.sunrise}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 pr-4">
                                <FiSunset className="text-indigo-500 text-xl" />
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                                        Sunset
                                    </div>
                                    <div className="font-bold text-slate-700">
                                        {payload.meta.sunset}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Day / Night Segment Toggles */}
                    <div className="flex border-b border-slate-100 mb-6">
                        <button
                            type="button"
                            onClick={() => setActiveTab("day")}
                            className={`flex-1 pb-3 font-semibold text-sm transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "day"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <FaSun className="text-amber-400 text-lg" /> Day
                            Choghadiya
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("night")}
                            className={`flex-1 pb-3 font-semibold text-sm transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "night"
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            }`}
                        >
                            <FiMoon className="text-slate-400 text-lg" /> Night
                            Choghadiya
                        </button>
                    </div>

                    {/* Choghadiya Cards Presentation Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {activeTimeline?.map((item) => {
                            const isCurrent = isSlotActive(
                                item.startTime,
                                item.endTime,
                            );
                            const styles =
                                STATUS_STYLES[item.nature] ||
                                STATUS_STYLES["Neutral (Medium)"];

                            return (
                                <div
                                    key={item.number}
                                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-xs relative overflow-hidden ${styles.bg} ${
                                        isCurrent
                                            ? "ring-4 ring-blue-500 scale-[1.03] shadow-md z-10 border-transparent"
                                            : "opacity-90 hover:opacity-100"
                                    }`}
                                >
                                    {/* Animated Top border bar for active cards */}
                                    {isCurrent && (
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500 via-indigo-500 to-cyan-500 animate-pulse" />
                                    )}

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">
                                                Slot {item.number}
                                            </span>
                                            {isCurrent ? (
                                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-600 text-white tracking-widest uppercase animate-pulse flex items-center gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-white block animate-ping" />
                                                    LIVE NOW
                                                </span>
                                            ) : (
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}
                                                >
                                                    {item.nature.split(" ")[0]}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-black tracking-tight mb-1">
                                            {item.name}
                                        </div>
                                        <div className="text-xs opacity-75 font-medium">
                                            {item.nature.includes("(")
                                                ? item.nature.substring(
                                                      item.nature.indexOf("("),
                                                  )
                                                : ""}
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono font-bold tracking-tight border-t border-current/10 pt-2 opacity-80">
                                        {item.startTime} - {item.endTime}
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
