import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const {
    midAvg,
    midStdDev,
    finalAvg,
    finalStdDev,
    midterm,
    final,
    gradeRatios,
  } = body;

  if (
    !midAvg ||
    !midStdDev ||
    !finalAvg ||
    !finalStdDev ||
    !midterm ||
    !final ||
    !gradeRatios
  ) {
    return NextResponse.json({ error: "모든 입력값을 입력해주세요." }, { status: 400 });
  }

  const totalZ =
    ((midterm - midAvg) / midStdDev + (final - finalAvg) / finalStdDev) / 2;

  const totalPercentile = (1 - (totalZ + 3) / 6) * 100;

  const gradeMapping = [
    { grade: "A+", percentage: parseFloat(gradeRatios.APlus) || 0 },
    { grade: "A0", percentage: parseFloat(gradeRatios.AZero) || 0 },
    { grade: "B+", percentage: parseFloat(gradeRatios.BPlus) || 0 },
    { grade: "B0", percentage: parseFloat(gradeRatios.BZero) || 0 },
    { grade: "C+", percentage: parseFloat(gradeRatios.CPlus) || 0 },
    { grade: "C0", percentage: parseFloat(gradeRatios.CZero) || 0 },
    { grade: "D+", percentage: parseFloat(gradeRatios.DPlus) || 0 },
    { grade: "D0", percentage: parseFloat(gradeRatios.DZero) || 0 },
  ];

  gradeMapping.sort((a, b) => b.percentage - a.percentage);

  let accumulatedPercentile = 0;
  let predictedGrade = "F";

  for (const { grade, percentage } of gradeMapping) {
    accumulatedPercentile += percentage;
    if (totalPercentile <= accumulatedPercentile) {
      predictedGrade = grade;
      break;
    }
  }

  return NextResponse.json({ predictedGrade });
}
