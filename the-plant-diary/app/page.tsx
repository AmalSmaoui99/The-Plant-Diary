"use client";

import { useEffect, useRef, useState } from "react";
import PlantCard from "@/components/PlantCard";
import { Plant } from "@/types/Plant";
import { CareEvent, CareEventType } from "@/types/CareEvent";
import { PlantSpecies } from "@/types/PlantSpecies";
import { FloraPlant } from "@/types/FloraPlant";
import { supabase } from "@/lib/supabase";
import {getCurrentPlantSeason,} from "@/lib/season";

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [wateringDays, setWateringDays] = useState(7);
  const [fertilizerEnabled, setFertilizerEnabled] = useState(true);
  const [fertilizerDays, setFertilizerDays] = useState(30);

  const [speciesResults, setSpeciesResults] = useState<PlantSpecies[]>([]);
  const [searchingSpecies, setSearchingSpecies] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<PlantSpecies | null>(null);
  const speciesSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(
  null
);
  
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [floraCare, setFloraCare] = useState<FloraPlant | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
    
  useEffect(() => {
  async function loadData() {
        const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    setCheckingAuth(false);
    setLoading(true);
    setErrorMessage("");

    const {
      data: plantData,
      error: plantError,
    } = await supabase
      .from("plants")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: true,
      });

    if (plantError) {
      console.error(plantError);
      setErrorMessage("Could not load plants.");
      setLoading(false);
      return;
    }

    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from("care_events")
      .select("*")
      .order("event_date", { ascending: false });

    if (eventError) {
      console.error(eventError);
      setErrorMessage("Could not load care history.");
    }

    setPlants(plantData ?? []);
    setCareEvents(eventData ?? []);

    setLoading(false);
  }

  loadData();
}, []);

  async function addPlant() {
    if (!userId) {
      setErrorMessage(
        "You must be signed in to add plants."
      );
      return;
    }
    if (!nickname.trim() || !species.trim()) {
      setErrorMessage("Please enter a nickname and species.");
      return;
    }

    if (wateringDays < 1) {
      setErrorMessage(
        "Watering check interval must be at least 1 day."
      );
      return;
    }

    if (fertilizerEnabled && fertilizerDays < 1) {
      setErrorMessage(
        "Fertilizer interval must be at least 1 day."
      );
      return;
    }

    setErrorMessage("");

    const newPlantId = crypto.randomUUID();

    const sourceImageUrl =
      selectedSpecies?.default_image?.medium_url ??
      selectedSpecies?.default_image?.regular_url ??
      selectedSpecies?.default_image?.small_url ??
      selectedSpecies?.default_image?.thumbnail ??
      null;

    let permanentImageUrl: string | null = null;
    let permanentImagePath: string | null = null;

    if (sourceImageUrl) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const imageResponse = await fetch(
          "/api/plants/cache-image",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session?.access_token}`,
            },

            body: JSON.stringify({
              sourceUrl:
                sourceImageUrl,

              plantId:
                newPlantId,
            }),
          }
        );

        if (!session) {
          setErrorMessage(
            "You must be signed in."
          );
          return;
        }

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();

          permanentImageUrl = imageData.imageUrl;
          permanentImagePath = imageData.imagePath;
        } else {
          console.warn(
            "Could not copy species image to Supabase Storage."
          );
        }
      } catch (error) {
        console.warn(
          "Species image caching failed:",
          error
        );
      }
    }

    const { data, error } = await supabase
      .from("plants")
      .insert({
        id: newPlantId,

        user_id: userId,

        nickname: nickname.trim(),

        species: species.trim(),

        common_name:
          selectedSpecies?.common_name ??
          floraCare?.common_name ??
          null,

        perenual_id:
          selectedSpecies?.id ?? null,

        flora_plant_id:
          floraCare?.plant_id ?? null,

        image_url:
          permanentImageUrl ??
          floraCare?.image_url ??
          null,

        image_path: permanentImagePath,

        icon: "🌱",

        status: "Active",

        // Care schedule
        watering_check_days: wateringDays,

        fertilizer_enabled: fertilizerEnabled,

        fertilizer_interval_days:
          fertilizerEnabled
            ? fertilizerDays
            : null,

        // FloraDB care information
        care_source:
          floraCare
            ? "FloraDB"
            : selectedSpecies
              ? "Perenual"
              : "Manual",

        care_confidence:
          floraCare?.care_confidence ?? null,

        light_requirement_level:
          floraCare?.light_requirement_level ??
          selectedSpecies?.sunlight?.join(", ") ??
          null,

        min_lux:
          floraCare?.min_lux ?? null,

        max_lux:
          floraCare?.max_lux ?? null,

        min_temp_celsius:
          floraCare?.min_temp_celsius ?? null,

        max_temp_celsius:
          floraCare?.max_temp_celsius ?? null,

        ideal_humidity_percent:
          floraCare?.ideal_humidity_percent ??
          null,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setErrorMessage("Could not add plant.");
      return;
    }

    setPlants((currentPlants) => [
      ...currentPlants,
      data,
    ]);

    setNickname("");
    setSpecies("");

    setWateringDays(7);
    setFertilizerEnabled(true);
    setFertilizerDays(30);

    setSelectedSpecies(null);
    setSpeciesResults([]);

    setFloraCare(null);

    setShowForm(false);
  }

  async function recordCareEvent(
    plantId: string,
    eventType: CareEventType
  ) {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("care_events")
      .insert({
        plant_id: plantId,
        event_type: eventType,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      setErrorMessage("Could not record plant care.");
      return;
    }

    setCareEvents((currentEvents) => [
      data,
      ...currentEvents,
    ]);
  }

  function getLastWatered(plantId: string) {
    return careEvents.find(
      (event) =>
        event.plant_id === plantId &&
        event.event_type === "watered"
    )?.event_date;
  }

  function getLatestWateringEvent(
    plantId: string
  ) {
    return careEvents.find(
      (event) =>
        event.plant_id === plantId &&
        (
          event.event_type === "watered" ||
          event.event_type ===
            "soil_still_moist"
        )
    );
  }

  function getWateringInfo(plant: Plant) {
    const latestEvent =
      getLatestWateringEvent(plant.id);

    // Plant has never been checked/watered
    if (!latestEvent) {
      return {
        message: "⚠️ Check soil today",
        due: true,
        daysUntil: 0,
      };
    }

    const eventDate = new Date(
      latestEvent.event_date
    );

    const nextCheckDate =
      new Date(eventDate);

    let intervalDays: number;

    if (
      latestEvent.event_type ===
      "soil_still_moist"
    ) {
      // Soil was still wet:
      // recheck relatively soon.
      intervalDays =
        plant.moist_recheck_days ?? 2;
    } else {
      // Plant was watered:
      // restart normal seasonal schedule.
      intervalDays =
        getWateringInterval(plant);
    }

    nextCheckDate.setDate(
      nextCheckDate.getDate() +
        intervalDays
    );

    nextCheckDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const daysUntil = Math.round(
      (
        nextCheckDate.getTime() -
        today.getTime()
      ) / millisecondsPerDay
    );

    if (daysUntil > 1) {
      return {
        message:
          latestEvent.event_type ===
          "soil_still_moist"
            ? `💦 Soil was still moist · check again in ${daysUntil} days`
            : `💧 Check soil in ${daysUntil} days`,
        due: false,
        daysUntil,
      };
    }

    if (daysUntil === 1) {
      return {
        message:
          latestEvent.event_type ===
          "soil_still_moist"
            ? "💦 Soil was still moist · check again tomorrow"
            : "💧 Check soil tomorrow",
        due: false,
        daysUntil,
      };
    }

    if (daysUntil === 0) {
      return {
        message: "⚠️ Check soil today",
        due: true,
        daysUntil,
      };
    }

    const overdueDays =
      Math.abs(daysUntil);

    return {
      message:
        overdueDays === 1
          ? "🔴 Soil check overdue by 1 day"
          : `🔴 Soil check overdue by ${overdueDays} days`,
      due: true,
      daysUntil,
    };
  }
  
  function getLastFertilized(plantId: string) {
    return careEvents.find(
      (event) =>
        event.plant_id === plantId &&
        event.event_type === "fertilized"
    )?.event_date;
  }

  function getFertilizerInfo(plant: Plant) {
    if (
      !plant.fertilizer_enabled ||
      !plant.fertilizer_interval_days
    ) {
      return {
        message: "Fertilizer disabled",
        due: false,
        daysUntil: null,
      };
    }

    const lastFertilized = getLastFertilized(plant.id);

    if (!lastFertilized) {
      return {
        message: "🌿 Fertilize today",
        due: true,
        daysUntil: 0,
      };
    }
    

    const lastDate = new Date(lastFertilized);
    const nextDate = new Date(lastDate);
    const fertilizerInterval = getFertilizerInterval(plant);
    
    if (!fertilizerInterval) {
      return {
        message: "Fertilizer disabled",
        due: false,
        daysUntil: null,
      };
    }
    nextDate.setDate(
      nextDate.getDate() +
        fertilizerInterval
    );

    nextDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const daysUntil = Math.round(
      (nextDate.getTime() - today.getTime()) /
        millisecondsPerDay
    );

    if (daysUntil > 1) {
      return {
        message: `🌿 Fertilize in ${daysUntil} days`,
        due: false,
        daysUntil,
      };
    }

    if (daysUntil === 1) {
      return {
        message: "🌿 Fertilize tomorrow",
        due: false,
        daysUntil,
      };
    }

    if (daysUntil === 0) {
      return {
        message: "🌿 Fertilize today",
        due: true,
        daysUntil,
      };
    }

    const overdueDays = Math.abs(daysUntil);

    return {
      message:
        overdueDays === 1
          ? "🟠 Fertilizer overdue by 1 day"
          : `🟠 Fertilizer overdue by ${overdueDays} days`,
      due: true,
      daysUntil,
    };
  }

  const plantsDueForWater = plants.filter(
    (plant) => getWateringInfo(plant).due
  );
  const plantsDueForFertilizer = plants.filter(
    (plant) => getFertilizerInfo(plant).due
  );

  async function searchSpecies(search: string) {
    setSearchingSpecies(true);

    try {
      const response = await fetch(
        `/api/plants/search?q=${encodeURIComponent(search.trim())}`
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(result);
        setSpeciesResults([]);
        return;
      }

      setSpeciesResults(result.data ?? []);
    } catch (error) {
      console.error(error);
      setSpeciesResults([]);
    } finally {
      setSearchingSpecies(false);
    }
  }

  function handleSpeciesChange(value: string) {
    setSpecies(value);
    setSelectedSpecies(null);

    if (speciesSearchTimer.current) {
      clearTimeout(speciesSearchTimer.current);
    }

    if (value.trim().length < 3) {
      setSpeciesResults([]);
      setSearchingSpecies(false);
      return;
    }

    speciesSearchTimer.current = setTimeout(() => {
      searchSpecies(value);
    }, 600);
  }

  function getSuggestedWateringDays(
    plant: PlantSpecies
  ): number {
    const benchmark =
      plant.watering_general_benchmark;

    if (
      benchmark?.value &&
      benchmark.unit
        ?.toLowerCase()
        .includes("day")
    ) {
      const numbers = String(benchmark.value)
        .match(/\d+/g)
        ?.map(Number);

      if (numbers && numbers.length > 0) {
        return numbers[0];
      }
    }

    switch (plant.watering?.toLowerCase()) {
      case "frequent":
        return 4;

      case "average":
        return 7;

      case "minimum":
        return 14;

      case "none":
        return 21;

      default:
        return 7;
    }
  }

  async function selectSpecies(
    result: PlantSpecies
  ) {
    const scientificName =
      result.scientific_name?.[0] ??
      result.common_name;

    setSpecies(scientificName);
    setSpeciesResults([]);
    setSelectedSpecies(result);
    setFloraCare(null);

    // FIRST: try our local houseplant dataset
    try {
      const floraResponse = await fetch(
        `/api/plants/care?name=${encodeURIComponent(
          scientificName
        )}`
      );

      const floraResult =
        await floraResponse.json();

      if (
        floraResponse.ok &&
        floraResult.data
      ) {
        const care =
          floraResult.data as FloraPlant;

        setFloraCare(care);

        setWateringDays(
          care.watering_frequency_days
        );

        return;
      }
    } catch (error) {
      console.warn(
        "FloraDB lookup failed:",
        error
      );
    }

    // SECOND: try Perenual details,
    // but only where the free plan allows it.
    if (result.id <= 3000) {
      try {
        const response = await fetch(
          `/api/plants/details?id=${result.id}`
        );

        const responseData =
          await response.json();

        if (response.ok) {
          const details =
            responseData.data as PlantSpecies;

          setSelectedSpecies(details);

          setWateringDays(
            getSuggestedWateringDays(
              details
            )
          );

          return;
        }
      } catch (error) {
        console.warn(
          "Perenual details lookup failed:",
          error
        );
      }
    }

    // Final fallback
    setWateringDays(
      getSuggestedWateringDays(result)
    );
  }

  function getWateringInterval(
    plant: Plant
  ): number {
    if (!plant.seasonal_care_enabled) {
      return plant.watering_check_days;
    }

    const season = getCurrentPlantSeason();

    if (season === "summer") {
      return (
        plant.summer_watering_check_days ??
        plant.watering_check_days
      );
    }

    return (
      plant.winter_watering_check_days ??
      plant.watering_check_days
    );
  }

  function getFertilizerInterval(
    plant: Plant
  ): number | null {
    if (!plant.fertilizer_enabled) {
      return null;
    }

    if (!plant.seasonal_care_enabled) {
      return plant.fertilizer_interval_days;
    }

    const season = getCurrentPlantSeason();

    if (season === "summer") {
      return (
        plant.summer_fertilizer_interval_days ??
        plant.fertilizer_interval_days
      );
    }

    return (
      plant.winter_fertilizer_interval_days ??
      plant.fertilizer_interval_days
    );
  }

  async function signOut() {
    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-green-50 text-gray-900">
      <div className="mx-auto max-w-5xl p-6">

        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              🌱 The Plant Diary
            </h1>

            <p className="mt-2 text-gray-600">
              Keep your plants happy and healthy.
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800"
          >
            + Add Plant
          </button>

          <button
            onClick={signOut}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {showForm && (
          <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-2xl font-semibold">
              Add a Plant
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nickname
                </label>

                <input
                  value={nickname}
                  onChange={(event) =>
                    setNickname(event.target.value)
                  }
                  placeholder="e.g. Luna"
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Species
                </label>

                <div className="relative">
                  <input
                    value={species}
                    onChange={(event) => {
                      handleSpeciesChange(event.target.value);
                    }}
                    placeholder="Search e.g. Monstera..."
                    autoComplete="off"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                  />

                  {searchingSpecies && (
                    <p className="mt-2 text-sm text-gray-500">
                      Searching plants...
                    </p>
                  )}

                  {!selectedSpecies &&
                    speciesResults.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                        {speciesResults.slice(0, 8).map(
                          (result) => (
                            <button
                              key={result.id}
                              type="button"
                              onClick={() => {
                                selectSpecies(result);
                              }}
                              className="flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left last:border-0 hover:bg-green-50"
                            >
                              {result.default_image?.thumbnail && (
                                <img
                                  src={
                                    result.default_image.thumbnail
                                  }
                                  alt={result.common_name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}

                              <div>
                                <p className="font-medium">
                                  {result.common_name}
                                </p>

                                <p className="text-sm italic text-gray-500">
                                  {result.scientific_name?.[0]}
                                </p>

                                {result.watering && (
                                  <p className="mt-1 text-xs text-gray-400">
                                    💧 {result.watering}
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>

                {selectedSpecies && (
                  <div className="mt-3 rounded-xl bg-green-50 p-4">
                    <div className="flex gap-4">
                      {selectedSpecies.default_image?.thumbnail && (
                        <img
                          src={
                            selectedSpecies.default_image.thumbnail
                          }
                          alt={selectedSpecies.common_name}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      )}

                      <div>
                        <p className="font-semibold text-green-950">
                          ✓ {selectedSpecies.common_name}
                        </p>

                        <p className="text-sm italic text-green-700">
                          {selectedSpecies.scientific_name?.[0]}
                        </p>

                        {floraCare && (
                          <div className="mt-3 space-y-1 text-sm text-green-800">

                            <p>
                              💧 Recommended interval:{" "}
                              {floraCare.watering_frequency_days} days
                            </p>

                            <p>
                              ☀️ Light:{" "}
                              {floraCare.light_requirement_level}
                            </p>

                            <p>
                              💡 Target light:{" "}
                              {floraCare.min_lux.toLocaleString()}–
                              {floraCare.max_lux.toLocaleString()} lux
                            </p>

                            <p>
                              🌡️ Temperature:{" "}
                              {floraCare.min_temp_celsius}–
                              {floraCare.max_temp_celsius}°C
                            </p>

                            <p>
                              💦 Ideal humidity:{" "}
                              {floraCare.ideal_humidity_percent}%
                            </p>

                          </div>
                        )}

                        {selectedSpecies.watering_general_benchmark && (
                          <p className="mt-2 text-sm font-medium text-green-800">
                            💧 Suggested soil check: every{" "}
                            {
                              selectedSpecies
                                .watering_general_benchmark.value
                            }{" "}
                            {
                              selectedSpecies
                                .watering_general_benchmark.unit
                            }
                          </p>
                        )}

                        {selectedSpecies.watering && (
                          <p className="mt-2 text-sm text-green-800">
                            💧 Watering:{" "}
                            {selectedSpecies.watering}
                          </p>
                         
                        )}

                        {selectedSpecies.sunlight &&
                          selectedSpecies.sunlight.length > 0 && (
                            <p className="mt-1 text-sm text-green-800">
                              ☀️ Light:{" "}
                              {selectedSpecies.sunlight.join(", ")}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  💧 Check soil every
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={wateringDays}
                    onChange={(event) =>
                      setWateringDays(
                        Number(event.target.value)
                      )
                    }
                    className="w-24 rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                  />

                  <span className="text-gray-600">
                    days
                  </span>
                </div>

                <div className="mt-1 text-xs text-gray-500">

                  {floraCare ? (
                    <p>
                      FloraDB recommendation:{" "}
                      <strong>
                        every{" "}
                        {floraCare.watering_frequency_days}{" "}
                        days
                      </strong>
                      . Use this as a soil-check starting
                      point and adjust it based on your
                      plant&apos;s actual behavior.
                    </p>
                  ) : selectedSpecies
                      ?.watering_general_benchmark ? (
                    <p>
                      Plant database recommendation:{" "}
                      <strong>
                        every{" "}
                        {String(
                          selectedSpecies
                            .watering_general_benchmark
                            .value
                        ).replaceAll('"', "")}{" "}
                        {
                          selectedSpecies
                            .watering_general_benchmark
                            .unit
                        }
                      </strong>
                      .
                    </p>
                  ) : (
                    <p>
                      No exact care interval was found.
                      The current soil-check interval is{" "}
                      <strong>{wateringDays} days</strong>
                      and can be changed manually.
                    </p>
                  )}

                </div>

              </div>

              <div className="flex gap-3">
                <button
                  onClick={addPlant}
                  className="rounded-lg bg-green-700 px-4 py-2 text-white hover:bg-green-800"
                >
                  Add Plant
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold">
            Today
          </h2>

          {plantsDueForWater.length === 0 &&
          plantsDueForFertilizer.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="font-medium">
                ✅ Everything looks good
              </p>

              <p className="mt-1 text-sm text-gray-500">
                No plant care tasks are due today.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {plantsDueForWater.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-gray-700">
                    💧 Watering
                  </h3>

                  <div className="space-y-3">
                    {plantsDueForWater.map((plant) => {
                      const wateringInfo =
                        getWateringInfo(plant);

                      return (
                        <div
                          key={`water-${plant.id}`}
                          className="rounded-2xl bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold">
                                {plant.icon} {plant.nickname}
                              </p>

                              <p className="text-sm text-gray-500">
                                {plant.species}
                              </p>

                              <p className="mt-2 text-sm font-medium">
                                {wateringInfo.message}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  recordCareEvent(
                                    plant.id,
                                    "watered"
                                  )
                                }
                                className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                              >
                                💧 Watered
                              </button>

                              <button
                                onClick={() =>
                                  recordCareEvent(
                                    plant.id,
                                    "soil_still_moist"
                                  )
                                }
                                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                              >
                                Still moist
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-green-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={fertilizerEnabled}
                    onChange={(event) =>
                      setFertilizerEnabled(
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="font-medium">
                    🌿 Track fertilizer
                  </span>
                </label>

                {fertilizerEnabled && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium">
                      Fertilize every
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={fertilizerDays}
                        onChange={(event) =>
                          setFertilizerDays(
                            Number(event.target.value)
                          )
                        }
                        className="w-24 rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-green-600"
                      />

                      <span className="text-gray-600">
                        days
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {plantsDueForFertilizer.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-gray-700">
                    🌿 Fertilizer
                  </h3>

                  <div className="space-y-3">
                    {plantsDueForFertilizer.map((plant) => {
                      const fertilizerInfo =
                        getFertilizerInfo(plant);

                      return (
                        <div
                          key={`fertilizer-${plant.id}`}
                          className="rounded-2xl bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold">
                                {plant.icon} {plant.nickname}
                              </p>

                              <p className="text-sm text-gray-500">
                                {plant.species}
                              </p>

                              <p className="mt-2 text-sm font-medium">
                                {fertilizerInfo.message}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                recordCareEvent(
                                  plant.id,
                                  "fertilized"
                                )
                              }
                              className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-200"
                            >
                              🌿 Fertilized
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            My Plants
          </h2>

          {loading ? (
            <p className="text-gray-500">
              Loading plants...
            </p>
          ) : plants.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-medium">
                No plants yet 🌱
              </p>

              <p className="mt-2 text-gray-500">
                Add your first plant to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  id={plant.id}
                  nickname={plant.nickname}
                  species={plant.species}
                  icon={plant.icon}
                  imageUrl={plant.image_url}

                  lastWatered={getLastWatered(plant.id)}
                  wateringStatus={getWateringInfo(plant).message}

                  lastFertilized={getLastFertilized(plant.id)}
                  fertilizerStatus={getFertilizerInfo(plant).message}
                  fertilizerEnabled={plant.fertilizer_enabled}


                  onWatered={() =>
                    recordCareEvent(
                      plant.id,
                      "watered"
                    )
                  }

                  onStillMoist={() =>
                    recordCareEvent(
                      plant.id,
                      "soil_still_moist"
                    )
                  }

                  onFertilized={() =>
                    recordCareEvent(
                      plant.id,
                      "fertilized"
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}