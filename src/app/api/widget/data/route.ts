import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    title: "Universe Academy",
    updatedAt: new Date().toISOString(),
    metrics: {
      activeStudents: 1248,
      attendanceRate: "98.4%",
      activeCourses: 24,
      systemStatus: "Online & Synced"
    },
    quickActions: [
      { label: "Teacher Dashboard", url: "/teacher" },
      { label: "Student Portal", url: "/student-login" }
    ]
  });
}
