"use client";

import { useEffect, useState } from "react";
import {useParams,useRouter,} from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { Plant } from "@/types/Plant";
import { CareEvent } from "@/types/CareEvent";
import {
  getCurrentPlantSeason,
} from "@/lib/season";

export default function PlantDiaryPage() {
  const params = useParams();
  const router = useRouter();

  const plantId = params.id as string;
  const [deleting, setDeleting] = useState(false);

  const [plant, setPlant] =
    useState<Plant | null>(null);

  const [careEvents, setCareEvents] =
    useState<CareEvent[]>([]);

  const [loading, setLoading] =useState(true);

  const [uploadingPhoto, setUploadingPhoto] =useState(false);

  const [photoError, setPhotoError] =useState("");

  const [errorMessage, setErrorMessage] =useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editNickname, setEditNickname] =useState("");

  const [editWateringDays, setEditWateringDays] =useState(7);

  const [
    editSummerWateringDays,
    setEditSummerWateringDays,
  ] = useState(7);

  const [
    editWinterWateringDays,
    setEditWinterWateringDays,
  ] = useState(12);

  const [
    editSummerFertilizerDays,
    setEditSummerFertilizerDays,
  ] = useState(30);

  const [
    editWinterFertilizerDays,
    setEditWinterFertilizerDays,
  ] = useState(60);

  const [
    editSeasonalCareEnabled,
    setEditSeasonalCareEnabled,
  ] = useState(true);

  const [
    editFertilizerEnabled,
    setEditFertilizerEnabled,
  ] = useState(true);

  const [
    editFertilizerDays,
    setEditFertilizerDays,
  ] = useState(30);

  const [
    editMoistRecheckDays,
    setEditMoistRecheckDays,
  ] = useState(2);

  useEffect(() => {
    async function loadPlant() {
      const {
        data: plantData,
        error: plantError,
      } = await supabase
        .from("plants")
        .select("*")
        .eq("id", plantId)
        .single();

      if (plantError) {
        console.warn(plantError);

        setErrorMessage(
          "Could not load this plant."
        );

        setLoading(false);
        return;
      }

      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("care_events")
        .select("*")
        .eq("plant_id", plantId)
        .order("event_date", {
          ascending: false,
        });

      if (eventError) {
        console.warn(eventError);

        setErrorMessage(
          "Could not load care history."
        );
      }

      setPlant(plantData);
      setCareEvents(eventData ?? []);
      setLoading(false);
    }

    loadPlant();
  }, [plantId]);

  function getLastEvent(
    eventType: string
  ) {
    return careEvents.find(
      (event) =>
        event.event_type === eventType
    );
  }

  function formatDate(
    date?: string | null
  ) {
    if (!date) {
      return "Never";
    }

    return new Date(
      date
    ).toLocaleDateString();
  }

  function getEventLabel(
    eventType: string
  ) {
    switch (eventType) {
      case "watered":
        return "💧 Watered";

      case "soil_still_moist":
        return "💦 Soil still moist";

      case "fertilized":
        return "🌿 Fertilized";

      case "repotted":
        return "🪴 Repotted";

      case "pruned":
        return "✂️ Pruned";

      default:
        return eventType;
    }
  }

  async function deletePlant() {
    if (!plant) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      user &&
      plant.image_path?.startsWith(
        `${user.id}/`
      )
    ) {
      const { error: storageError } =
        await supabase.storage
          .from("plant-images")
          .remove([plant.image_path]);

      if (storageError) {
        console.warn(
          "Could not delete plant image:",
          storageError
        );
      }
    }

    const confirmed = window.confirm(
      `Delete ${plant.nickname}?\n\nThis will permanently delete the plant and its entire care history.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setErrorMessage("");

    const imagePath = plant.image_path;

    try {
      const { error: deleteError } = await supabase
        .from("plants")
        .delete()
        .eq("id", plant.id);

      if (deleteError) {
        throw deleteError;
      }

      // The care_events rows are automatically deleted
      // because we created the foreign key with ON DELETE CASCADE.

      if (imagePath) {
        const { error: storageError } =
          await supabase.storage
            .from("plant-images")
            .remove([imagePath]);

        if (storageError) {
          console.warn(
            "Plant deleted, but image cleanup failed:",
            storageError
          );
        }
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.warn("Delete plant failed:", error);

      setErrorMessage(
        "Could not delete this plant."
      );

      setDeleting(false);
    }
  }

  async function uploadPlantPhoto(file: File) {
    if (!plant) {
      return;
    }

    setPhotoError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPhotoError(
        "You must be signed in to upload photos."
      );
      setUploadingPhoto(false);
      return;
    }

    // Only allow images
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }

    // Maximum 8 MB
    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      setPhotoError(
        "The image is too large. Maximum size is 8 MB."
      );
      return;
    }

    setUploadingPhoto(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() ??
        "jpg";

      const newImagePath =
        `${user.id}/${plant.id}/personal-${Date.now()}.${extension}`;

      // Upload the new image
      const { error: uploadError } =
        await supabase.storage
          .from("plant-images")
          .upload(newImagePath, file, {
            contentType: file.type,
            upsert: false,
          });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } =
        supabase.storage
          .from("plant-images")
          .getPublicUrl(newImagePath);

      const newImageUrl =
        publicUrlData.publicUrl;

      const oldImagePath =
        plant.image_path;

      // Update the plant row
      const { error: updateError } =
        await supabase
          .from("plants")
          .update({
            image_url: newImageUrl,
            image_path: newImagePath,
          })
          .eq("id", plant.id);

      if (updateError) {
        // Database update failed.
        // Remove the image we just uploaded.
        await supabase.storage
          .from("plant-images")
          .remove([newImagePath]);

        throw updateError;
      }

      // Update the UI immediately
      setPlant({
        ...plant,
        image_url: newImageUrl,
        image_path: newImagePath,
      });

      // Remove the old stored image
      if (
        oldImagePath &&
        oldImagePath !== newImagePath
      ) {
        const { error: deleteOldError } =
          await supabase.storage
            .from("plant-images")
            .remove([oldImagePath]);

        if (deleteOldError) {
          console.warn(
            "Old plant photo could not be removed:",
            deleteOldError
          );
        }
      }
    } catch (error) {
      console.warn(
        "Plant photo upload failed:",
        error
      );

      setPhotoError(
        "Could not upload the plant photo."
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  function startEditing() {
    if (!plant) {
      return;
    }

    setEditNickname(plant.nickname);

    setEditWateringDays(
      getActiveWateringInterval()
    );

    setEditFertilizerEnabled(
      plant.fertilizer_enabled
    );

    setEditFertilizerDays(
      plant.fertilizer_interval_days ?? 30
    );

    setEditSummerWateringDays(
      plant.summer_watering_check_days ??
        getActiveWateringInterval()
    );

    setEditWinterWateringDays(
      plant.winter_watering_check_days ??
        getActiveWateringInterval()
    );

    setEditSummerFertilizerDays(
      plant.summer_fertilizer_interval_days ??
        plant.fertilizer_interval_days ??
        30
    );

    setEditWinterFertilizerDays(
      plant.winter_fertilizer_interval_days ??
        plant.fertilizer_interval_days ??
        60
    );

    setEditMoistRecheckDays(
      plant.moist_recheck_days ?? 2
    );

    setEditSeasonalCareEnabled(
      plant.seasonal_care_enabled
    );

    setEditing(true);
  }

  async function savePlantChanges() {
    if (!plant) {
      return;
    }

    if (!editNickname.trim()) {
      setErrorMessage(
        "Plant nickname cannot be empty."
      );
      return;
    }

    if (editWateringDays < 1) {
      setErrorMessage(
        "Soil-check interval must be at least 1 day."
      );
      return;
    }

    if (
      editFertilizerEnabled &&
      editFertilizerDays < 1
    ) {
      setErrorMessage(
        "Fertilizer interval must be at least 1 day."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const updates = {
      nickname: editNickname.trim(),
      moist_recheck_days:
        editMoistRecheckDays,

      watering_check_days:
        editWateringDays,

      fertilizer_enabled:
        editFertilizerEnabled,

      fertilizer_interval_days:
        editFertilizerEnabled
          ? editFertilizerDays
          : null,

      seasonal_care_enabled:
        editSeasonalCareEnabled,

      summer_watering_check_days:
        editSummerWateringDays,

      winter_watering_check_days:
        editWinterWateringDays,

      summer_fertilizer_interval_days:
        editFertilizerEnabled
          ? editSummerFertilizerDays
          : null,

      winter_fertilizer_interval_days:
        editFertilizerEnabled
          ? editWinterFertilizerDays
          : null,
    };

    const { error } = await supabase
      .from("plants")
      .update(updates)
      .eq("id", plant.id);

    if (error) {
      console.warn(
        "Could not update plant:",
        error
      );

      setErrorMessage(
        "Could not save plant changes."
      );

      setSaving(false);
      return;
    }

    setPlant({
      ...plant,
      ...updates,
    });

    setEditing(false);
    setSaving(false);
  }

  function getActiveWateringInterval(): number {
    if (!plant) {
      return 0;
    }

    if (!plant.seasonal_care_enabled) {
      return getActiveWateringInterval();
    }

    if (currentSeason === "summer") {
      return (
        plant.summer_watering_check_days ??
        getActiveWateringInterval()
      );
    }

    return (
      plant.winter_watering_check_days ??
      getActiveWateringInterval()
    );
  }

  const currentSeason = getCurrentPlantSeason();

  if (loading) {
    return (
      <main className="min-h-screen bg-green-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-500">
            Loading plant diary...
          </p>
        </div>
      </main>
    );
  }

  if (!plant) {
    return (
      <main className="min-h-screen bg-green-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-red-700">
            {errorMessage ||
              "Plant not found."}
          </p>

          <Link
            href="/"
            className="mt-5 inline-block text-green-800 underline"
          >
            ← Back to plants
          </Link>
        </div>
      </main>
    );
  }

  const lastWatered =
    getLastEvent("watered");

  const lastFertilized =
    getLastEvent("fertilized");

  return (
    <main className="min-h-screen bg-green-50 text-gray-900">
      <div className="mx-auto max-w-4xl p-6">

        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-green-800 hover:underline"
        >
          ← Back to my plants
        </Link>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Plant header */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {plant.image_url ? (
            <img
              src={plant.image_url}
              alt={plant.nickname}
              className="h-72 w-full object-cover"
            />
          ) : (
            <div className="flex h-48 items-center justify-center bg-green-100 text-7xl">
              {plant.icon}
            </div>
          )}

          <div className="p-7">
            <h1 className="text-4xl font-bold">
              {plant.nickname}
            </h1>

            <p className="mt-1 text-lg italic text-gray-500">
              {plant.species}
            </p>

            {plant.common_name && (
              <p className="mt-1 text-sm text-gray-500">
                {plant.common_name}
              </p>
            )}

            {plant.seasonal_care_enabled && (
              <div className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {currentSeason === "summer"
                  ? "☀️ Growing season schedule active"
                  : "❄️ Winter schedule active"}
              </div>
            )}

            <div className="mt-5">
              <label
                className={`inline-block rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  uploadingPhoto
                    ? "cursor-not-allowed bg-gray-400"
                    : "cursor-pointer bg-green-700 hover:bg-green-800"
                }`}
              >
                {uploadingPhoto
                  ? "Uploading..."
                  : plant.image_url
                    ? "📷 Change photo"
                    : "📷 Add photo"}
                        
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingPhoto}
                  className="hidden"
                  onChange={(event) => {
                    const file =
                      event.target.files?.[0];

                    if (file) {
                      uploadPlantPhoto(file);
                    }

                    // Allows selecting the same file again later.
                    event.target.value = "";
                  }}
                />
              </label>

              <button
                onClick={startEditing}
                className="ml-2 rounded-lg border border-green-700 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
              >
                ✏️ Edit plant
              </button>

              {photoError && (
                <p className="mt-2 text-sm text-red-600">
                  {photoError}
                </p>
              )}
            </div>
          </div>
        </section>

        {editing && (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              ✏️ Edit plant
            </h2>

            <div className="mt-5 space-y-5">

              {/* Nickname */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nickname
                </label>

                <input
                  value={editNickname}
                  onChange={(event) =>
                    setEditNickname(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  💦 If soil is still moist, check again after
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={editMoistRecheckDays}
                    onChange={(event) =>
                      setEditMoistRecheckDays(
                        Number(event.target.value)
                      )
                    }
                    className="w-24 rounded-lg border border-gray-300 p-3"
                  />

                  <span className="text-gray-600">
                    days
                  </span>
                </div>
              </div>

              {/* Watering */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  💧 Check soil every
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={editWateringDays}
                    onChange={(event) =>
                      setEditWateringDays(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="w-24 rounded-lg border border-gray-300 p-3"
                  />

                  <span className="text-gray-600">
                    days
                  </span>
                </div>
              </div>

              {/* Fertilizer */}
              <div className="rounded-xl bg-green-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      editFertilizerEnabled
                    }
                    onChange={(event) =>
                      setEditFertilizerEnabled(
                        event.target.checked
                      )
                    }
                  />

                  <span className="font-medium">
                    🌿 Track fertilizer
                  </span>
                </label>

                {editFertilizerEnabled && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium">
                      Fertilize every
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={
                          editFertilizerDays
                        }
                        onChange={(event) =>
                          setEditFertilizerDays(
                            Number(
                              event.target.value
                            )
                          )
                        }
                        className="w-24 rounded-lg border border-gray-300 bg-white p-3"
                      />

                      <span>days</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={savePlantChanges}
                  disabled={saving}
                  className="rounded-lg bg-green-700 px-5 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save changes"}
                </button>

                <button
                  onClick={() =>
                    setEditing(false)
                  }
                  disabled={saving}
                  className="rounded-lg bg-gray-100 px-5 py-2 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>

            </div>
          </section>
        )}



        {/* Care overview */}

        <div className="space-y-5">

          {/* Seasonal care toggle */}
          <div className="rounded-xl bg-green-50 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editSeasonalCareEnabled}
                onChange={(event) =>
                  setEditSeasonalCareEnabled(
                    event.target.checked
                  )
                }
                className="h-4 w-4"
              />

              <div>
                <p className="font-medium">
                  🌦️ Use seasonal care
                </p>

                <p className="text-xs text-gray-500">
                  Use different schedules for the growing
                  and winter seasons.
                </p>
              </div>
            </label>
          </div>

          {editSeasonalCareEnabled ? (
            <>
              {/* Summer */}
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <h3 className="font-semibold">
                  ☀️ Growing season
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  April – September
                </p>

                <div className="mt-5 space-y-4">

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      💧 Check soil every
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={editSummerWateringDays}
                        onChange={(event) =>
                          setEditSummerWateringDays(
                            Number(event.target.value)
                          )
                        }
                        className="w-24 rounded-lg border border-gray-300 bg-white p-3"
                      />

                      <span className="text-gray-600">
                        days
                      </span>
                    </div>
                  </div>

                  {editFertilizerEnabled && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        🌿 Fertilize every
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={editSummerFertilizerDays}
                          onChange={(event) =>
                            setEditSummerFertilizerDays(
                              Number(event.target.value)
                            )
                          }
                          className="w-24 rounded-lg border border-gray-300 bg-white p-3"
                        />

                        <span className="text-gray-600">
                          days
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Winter */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="font-semibold">
                  ❄️ Winter / lower-growth season
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  October – March
                </p>

                <div className="mt-5 space-y-4">

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      💧 Check soil every
                    </label>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={editWinterWateringDays}
                        onChange={(event) =>
                          setEditWinterWateringDays(
                            Number(event.target.value)
                          )
                        }
                        className="w-24 rounded-lg border border-gray-300 bg-white p-3"
                      />

                      <span className="text-gray-600">
                        days
                      </span>
                    </div>
                  </div>

                  {editFertilizerEnabled && (
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        🌿 Fertilize every
                      </label>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={editWinterFertilizerDays}
                          onChange={(event) =>
                            setEditWinterFertilizerDays(
                              Number(event.target.value)
                            )
                          }
                          className="w-24 rounded-lg border border-gray-300 bg-white p-3"
                        />

                        <span className="text-gray-600">
                          days
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </>
          ) : (
            <>
              {/* Non-seasonal watering */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  💧 Check soil every
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={editWateringDays}
                    onChange={(event) =>
                      setEditWateringDays(
                        Number(event.target.value)
                      )
                    }
                    className="w-24 rounded-lg border border-gray-300 p-3"
                  />

                  <span className="text-gray-600">
                    days
                  </span>
                </div>
              </div>

              {editFertilizerEnabled && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    🌿 Fertilize every
                  </label>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={editFertilizerDays}
                      onChange={(event) =>
                        setEditFertilizerDays(
                          Number(event.target.value)
                        )
                      }
                      className="w-24 rounded-lg border border-gray-300 p-3"
                    />

                    <span className="text-gray-600">
                      days
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fertilizer master toggle */}
          <div className="rounded-xl bg-green-50 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editFertilizerEnabled}
                onChange={(event) =>
                  setEditFertilizerEnabled(
                    event.target.checked
                  )
                }
              />

              <span className="font-medium">
                🌿 Track fertilizer
              </span>
            </label>
          </div>

        </div>
    
        {/* History */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            📖 Care History
          </h2>

          {careEvents.length === 0 ? (
            <p className="mt-5 text-gray-500">
              No care events recorded yet.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-gray-100">
              {careEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-4"
                >
                  <div>
                    <p className="font-medium">
                      {getEventLabel(
                        event.event_type
                      )}
                    </p>

                    {event.notes && (
                      <p className="mt-1 text-sm text-gray-500">
                        {event.notes}
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-500">
                    {formatDate(
                      event.event_date
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-red-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Danger zone
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Deleting this plant permanently removes its
            diary and complete care history.
          </p>

          <button
            onClick={deletePlant}
            disabled={deleting}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "Deleting..."
              : "🗑️ Delete plant"}
          </button>
        </section>

      </div>
    </main>
  );
}