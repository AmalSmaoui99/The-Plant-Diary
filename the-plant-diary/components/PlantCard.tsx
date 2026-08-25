type PlantCardProps = {
  nickname: string;
  species: string;
  status: string;
  icon: string;
};

export default function PlantCard({
  nickname,
  species,
  status,
  icon,
}: PlantCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="mb-4 text-5xl">{icon}</div>

      <h3 className="text-xl font-semibold">{nickname}</h3>

      <p className="text-sm text-gray-500">{species}</p>

      <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
        {status}
      </div>
    </div>
  );
}