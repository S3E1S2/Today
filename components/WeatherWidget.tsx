"use client";

import { useEffect, useState } from "react";

const WMO: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Light drizzle", 53: "Drizzle", 55: "Drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

interface Forecast { day: string; max: number; min: number; }
interface Weather { temp: number; condition: string; forecast: Forecast[]; }

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode` +
            `&timezone=auto&forecast_days=4`
          );
          const data = await res.json();
          const daily = data.daily;
          const now = new Date();
          const forecast: Forecast[] = [1, 2, 3].map(i => ({
            day: new Date(now.getTime() + i * 86400000)
              .toLocaleDateString("en-US", { weekday: "short" }),
            max: Math.round(daily.temperature_2m_max[i]),
            min: Math.round(daily.temperature_2m_min[i]),
          }));
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            condition: WMO[data.current.weathercode] ?? "Unknown",
            forecast,
          });
        } catch {}
      },
      () => {}
    );
  }, []);

  if (!weather) return null;

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <p className="text-sm" style={{ color: "var(--c-text2)" }}>
        {weather.temp}° · {weather.condition}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>
        {weather.forecast.map(f => `${f.day} ${f.max}°/${f.min}°`).join(" · ")}
      </p>
    </div>
  );
}
