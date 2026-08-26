import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      data: [],
    });
  }

  const apiKey = process.env.PERENUAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Perenual API key is not configured.",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const url =
      `https://perenual.com/api/v2/species-list` +
      `?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(query.trim())}`;

    const response = await fetch(url, {
        next: {
            revalidate: 60 * 60 * 24,
        },
    });

    if (!response.ok) {
      console.error(
        "Perenual error:",
        response.status,
        await response.text()
      );

      return NextResponse.json(
        {
          error: "Could not search plant database.",
        },
        {
          status: response.status,
        }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      data: data.data ?? [],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Plant search failed.",
      },
      {
        status: 500,
      }
    );
  }
}