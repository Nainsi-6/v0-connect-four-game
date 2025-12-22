import { NextResponse } from "next/server"

// This route creates the Socket.IO server instance
export async function GET() {
  return NextResponse.json({ status: "Socket.IO server running" })
}
