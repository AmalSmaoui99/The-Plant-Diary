import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Plant ID is required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.PERENUAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Perenual API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const url =
      `https://perenual.com/api/v2/species/details/${id}` +
      `?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      next: {
        revalidate: 60 * 60 * 24,
      },
    });

    if (!response.ok) {
      console.error(
        "Perenual details error:",
        response.status,
        await response.text()
      );

      return NextResponse.json(
        { error: "Could not load plant details." },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not load plant details." },
      { status: 500 }
    );
  }
}