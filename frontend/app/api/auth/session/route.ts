import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  try {
    // JWT structure: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.sub ? parseInt(payload.sub, 10) : payload.user_id || payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name || payload.email,
      },
    });
  } catch (err) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
