import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sourceUrl, plantId } = await request.json();

    if (!sourceUrl || !plantId) {
      return NextResponse.json(
        { error: "sourceUrl and plantId are required." },
        { status: 400 }
      );
    }

    const parsedUrl = new URL(sourceUrl);

    // Perenual currently serves its images from Wasabi.
    // Don't allow this endpoint to fetch arbitrary URLs.
    if (!parsedUrl.hostname.endsWith("wasabisys.com")) {
      return NextResponse.json(
        { error: "Unsupported image source." },
        { status: 400 }
      );
    }

    const imageResponse = await fetch(sourceUrl, {
      cache: "no-store",
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Could not download plant image." },
        { status: 502 }
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") ??
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Source is not an image." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );

    let extension = "jpg";

    if (contentType.includes("png")) {
      extension = "png";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    }

    const imagePath =
      `${plantId}/species.${extension}`;

    const { error: uploadError } =
      await supabase.storage
        .from("plant-images")
        .upload(imagePath, buffer, {
          contentType,
          upsert: false,
        });

    if (uploadError) {
      console.warn(uploadError);

      return NextResponse.json(
        { error: "Could not store plant image." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from("plant-images")
      .getPublicUrl(imagePath);

    return NextResponse.json({
      imageUrl: data.publicUrl,
      imagePath,
    });
  } catch (error) {
    console.warn(error);

    return NextResponse.json(
      { error: "Image caching failed." },
      { status: 500 }
    );
  }
}