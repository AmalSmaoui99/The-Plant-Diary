import {
  NextRequest,
  NextResponse,
} from "next/server";

import { findFloraPlant } from "@/lib/floradb";

export async function GET(
  request: NextRequest
) {
  const scientificName =
    request.nextUrl.searchParams.get("name");

  if (!scientificName) {
    return NextResponse.json(
      {
        error:
          "Scientific plant name is required.",
      },
      {
        status: 400,
      }
    );
  }

  const plant =
    findFloraPlant(scientificName);

  if (!plant) {
    return NextResponse.json({
      data: null,
    });
  }

  return NextResponse.json({
    data: plant,
  });
}