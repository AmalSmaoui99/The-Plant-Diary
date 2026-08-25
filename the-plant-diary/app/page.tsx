"use client";

import { useState } from "react";
import PlantCard from "@/components/PlantCard";
import { Plant } from "@/types/Plant";

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([
    {
      id: 1,
      nickname: "Luna",
      species: "Monstera deliciosa",
      status: "Check soil today",
      icon: "🌿",
    },
    {
      id: 2,
      nickname: "Bob",
      species: "Golden Pothos",
      status: "Water in 3 days",
      icon: "🪴",
    },
    {
      id: 3,
      nickname: "Spike",
      species: "Aloe Vera",
      status: "Water in 6 days",
      icon: "🌵",
    },
  ]);

  const [showForm, setShowForm] = useState(false);

  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");

  function addPlant() {
    if (!nickname.trim() || !species.trim()) {
      return;
    }

    const newPlant: Plant = {
      id: Date.now(),
      nickname,
      species,
      status: "No care schedule yet",
      icon: "🌱",
    };

    setPlants([...plants, newPlant]);

    setNickname("");
    setSpecies("");
    setShowForm(false);
  }

  return (
    <main className="min-h-screen bg-green-50 text-gray-900">
      <div className="mx-auto max-w-5xl p-6">

        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">🌱 The Plant Diary</h1>

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
        </header>

        {/* Add Plant Form */}
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
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="e.g. Luna"
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Species
                </label>

                <input
                  value={species}
                  onChange={(event) => setSpecies(event.target.value)}
                  placeholder="e.g. Monstera deliciosa"
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-600"
                />
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

        {/* Today's tasks */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold">
            Today
          </h2>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-lg font-semibold">
                  💧 Check Luna&apos;s soil
                </p>

                <p className="text-sm text-gray-500">
                  Monstera · Last watered 9 days ago
                </p>
              </div>

              <div className="flex gap-2">

                <button className="rounded-lg bg-blue-100 px-4 py-2 text-blue-800">
                  Watered
                </button>

                <button className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700">
                  Still moist
                </button>

              </div>
            </div>
          </div>
        </section>

        {/* Plant List */}
        <section>

          <h2 className="mb-4 text-2xl font-semibold">
            My Plants
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

            {plants.map((plant) => (
              <PlantCard
                key={plant.id}
                nickname={plant.nickname}
                species={plant.species}
                status={plant.status}
                icon={plant.icon}
              />
            ))}

          </div>
        </section>

      </div>
    </main>
  );
}