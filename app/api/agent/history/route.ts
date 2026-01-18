
import { db } from "@/db";
import { users, conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
    try {
        // 默认获取 admin 用户的历史
        const user = await db.query.users.findFirst({
            where: eq(users.username, "admin")
        });

        if (!user) {
            return new Response(JSON.stringify([]), { status: 200 }); // 或 404
        }

        const history = await db.query.conversations.findMany({
            where: eq(conversations.userId, user.id),
            orderBy: [desc(conversations.updatedAt)],
            limit: 20
        });

        return new Response(JSON.stringify(history), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Fetch history error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
