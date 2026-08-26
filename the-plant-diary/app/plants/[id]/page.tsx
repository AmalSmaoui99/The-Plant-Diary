"use client";

import { useEffect, useState } from "react";
import {useParams,useRouter,} from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { Plant } from "@/types/Plant";
import { CareEvent } from "@/types/CareEvent";

export default function PlantDiaryPage() {
  const params = useParams();
  const router = useRouter();

  const plantId = params.id as string;
  const [deleting, setDeleting] = useState(false);

  const [plant, setPlant] =
    useState<Plant | null>(null);

  const [careEvents, setCareEvents] =
    useState<CareEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [photoError, setPhotoError] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

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
        `${plant.id}/personal-${Date.now()}.${extension}`;

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

              {photoError && (
                <p className="mt-2 text-sm text-red-600">
                  {photoError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Care overview */}

        <div className="mt-8 grid gap-5 md:grid-cols-2">

          {/* Water */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              💧 Watering
            </h2>

            <div className="mt-5 space-y-3">
              <div>
                <p className="text-sm text-gray-500">
                  Last watered
                </p>

                <p className="font-medium">
                  {formatDate(
                    lastWatered?.event_date
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Soil-check interval
                </p>

                <p className="font-medium">
                  Every{" "}
                  {
                    plant.watering_check_days
                  }{" "}
                  days
                </p>
              </div>
            </div>
          </section>

          {/* Fertilizer */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              🌿 Fertilizer
            </h2>

            {plant.fertilizer_enabled ? (
              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Last fertilized
                  </p>

                  <p className="font-medium">
                    {formatDate(
                      lastFertilized
                        ?.event_date
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Interval
                  </p>

                  <p className="font-medium">
                    Every{" "}
                    {
                      plant.fertilizer_interval_days
                    }{" "}
                    days
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-gray-500">
                Fertilizer tracking is
                disabled.
              </p>
            )}
          </section>
        </div>

        {/* Environment */}

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            ☀️ Environment
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-sm text-gray-500">
                Light
              </p>

              <p className="font-medium">
                {plant.light_requirement_level ??
                  "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Light range
              </p>

              <p className="font-medium">
                {plant.min_lux != null &&
                plant.max_lux != null
                  ? `${plant.min_lux.toLocaleString()}–${plant.max_lux.toLocaleString()} lux`
                  : "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Temperature
              </p>

              <p className="font-medium">
                {plant.min_temp_celsius !=
                  null &&
                plant.max_temp_celsius !=
                  null
                  ? `${plant.min_temp_celsius}–${plant.max_temp_celsius}°C`
                  : "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Ideal humidity
              </p>

              <p className="font-medium">
                {plant.ideal_humidity_percent !=
                null
                  ? `${plant.ideal_humidity_percent}%`
                  : "Unknown"}
              </p>
            </div>
          </div>

          {plant.care_source && (
            <p className="mt-5 text-xs text-gray-400">
              Care baseline:{" "}
              {plant.care_source}
              {plant.care_confidence
                ? ` · ${plant.care_confidence} confidence`
                : ""}
            </p>
          )}
        </section>

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