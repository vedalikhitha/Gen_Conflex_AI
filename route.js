import { db } from "@/configs/db";
import { QuizQuestions } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const questions = await db.select().from(QuizQuestions).where(eq(QuizQuestions.courseId, courseId));

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return NextResponse.json({ error: "Failed to fetch quiz questions" }, { status: 500 });
  }
}