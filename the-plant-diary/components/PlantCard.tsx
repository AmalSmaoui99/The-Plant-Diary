import Link from "next/link";

type PlantCardProps = {
  id: string;

  nickname: string;
  species: string;
  icon: string;

  imageUrl?: string | null;

  lastWatered?: string;
  wateringStatus: string;

  lastFertilized?: string;
  fertilizerStatus: string;
  fertilizerEnabled?: boolean;

  onWatered: () => void;
  onStillMoist: () => void;
  onFertilized: () => void;
};

export default function PlantCard({
  id,
  nickname,
  species,
  icon,
  imageUrl,
  lastWatered,
  wateringStatus,
  lastFertilized,
  fertilizerStatus,
  fertilizerEnabled = true,
  onWatered,
  onStillMoist,
  onFertilized,
}: PlantCardProps) {
  function formatDate(date?: string) {
    if (!date) {
      return "Never";
    }

    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">

      {/* Fixed-size image area */}
      <div className="h-48 w-full bg-green-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nickname}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            {icon}
          </div>
        )}
      </div>

      {/* Plant information */}
      <div className="flex flex-1 flex-col p-6">
        <div>
          <h3 className="text-xl font-bold">
            {nickname}
          </h3>

          <p className="mt-1 text-sm italic text-gray-500">
            {species}
          </p>
        </div>

        {/* Watering */}
        <div className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          {wateringStatus}
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Last watered: {formatDate(lastWatered)}
        </p>

        {/* Fertilizer */}
        {fertilizerEnabled && (
          <>
            <div className="mt-4 rounded-xl bg-lime-50 p-3 text-sm text-lime-800">
              {fertilizerStatus}
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Last fertilized: {formatDate(lastFertilized)}
            </p>
          </>
        )}

        {/* Push actions to bottom */}
        <div className="mt-auto pt-6">

          {/* Main care buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onWatered}
              className="rounded-xl bg-blue-100 px-3 py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-200"
            >
              💧 Watered
            </button>

            <button
              onClick={onStillMoist}
              className="rounded-xl bg-gray-100 px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              💦 Still moist
            </button>

            {fertilizerEnabled && (
              <button
                onClick={onFertilized}
                className="col-span-2 rounded-xl bg-green-100 px-3 py-3 text-sm font-medium text-green-800 transition hover:bg-green-200"
              >
                🌿 Fertilized
              </button>
            )}
          </div>

          {/* Diary */}
          <Link
            href={`/plants/${id}`}
            className="mt-3 block w-full rounded-xl border border-green-700 px-4 py-3 text-center text-sm font-medium text-green-800 transition hover:bg-green-50"
          >
            View diary →
          </Link>
        </div>
      </div>
    </div>
  );
}