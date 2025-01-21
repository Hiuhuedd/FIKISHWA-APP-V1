import { neon } from "@neondatabase/serverless";
import { Alert } from "react-native";

export async function POST(request: Request) {
  try {
    const sql = neon(`postgresql://fikishwa_owner:ASp35OnwoWgX@ep-plain-cell-a1s2fs7s.ap-southeast-1.aws.neon.tech/fikishwa?sslmode=require`);
    const { name, email, clerkId } = await request.json();

    if (!name || !email || !clerkId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
Alert.alert(name)
    const response = await sql`
      INSERT INTO users (
        name, 
        email, 
        clerk_id
      ) 
      VALUES (
        ${name}, 
        ${email},
        ${clerkId}
     );`;

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
