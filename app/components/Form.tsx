"use client";

import { useState, useEffect, useRef } from "react";

// 에러 함수 구현 (Abramowitz and Stegun의 근사식을 사용)
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // 부호 저장
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  // 근사식 계산
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);

  return sign * y;
}

// 표준 정규 분포의 CDF 계산
function normCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Define the possible keys for gradeRatios
type GradeKey =
  | "APlus"
  | "AZero"
  | "BPlus"
  | "BZero"
  | "CPlus"
  | "CZero"
  | "DPlus"
  | "DZero";

// Define the shape of gradeRatios
interface GradeRatios {
  APlus: string;
  AZero: string;
  BPlus: string;
  BZero: string;
  CPlus: string;
  CZero: string;
  DPlus: string;
  DZero: string;
}

// Define the shape of finalCalculator state
interface FinalCalculatorState {
  midAvg: string;
  midStdDev: string;
  midMax: string;
  myMidScore: string;
  finalAvg: string;
  finalStdDev: string;
  finalMax: string;
  myFinalScore: number; // 드래그로 선택된 점수
}

export default function Form() {
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<"predictor" | "finalCalculator">(
    "predictor"
  );

  // ---------------------- 대학 성적 예측기 상태 ----------------------
  const [midAvg, setMidAvg] = useState("");
  const [midStdDev, setMidStdDev] = useState("");
  const [finalAvg, setFinalAvg] = useState("");
  const [finalStdDev, setFinalStdDev] = useState("");

  const [midMax, setMidMax] = useState("");
  const [finalMax, setFinalMax] = useState("");

  const [midterm, setMidterm] = useState("");
  const [final, setFinal] = useState("");
  const [gradeRatiosPredictor, setGradeRatiosPredictor] = useState<GradeRatios>({
    APlus: "",
    AZero: "",
    BPlus: "",
    BZero: "",
    CPlus: "",
    CZero: "",
    DPlus: "",
    DZero: "",
  });
  const [predictedGrade, setPredictedGrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartDataPredictor, setChartDataPredictor] = useState<number[]>([]);
  const [myPositionPredictor, setMyPositionPredictor] = useState<number | null>(
    null
  );

  // ---------------------- 기말 성적 계산 상태 ----------------------
  const [finalCalculator, setFinalCalculator] = useState<FinalCalculatorState>({
    midAvg: "",
    midStdDev: "",
    midMax: "",
    myMidScore: "",
    finalAvg: "",
    finalStdDev: "",
    finalMax: "",
    myFinalScore: 0, // 드래그로 선택된 점수
  });
  const [finalCalculatorGrade, setFinalCalculatorGrade] = useState<
    string | null
  >(null);
  const [finalCalculatorError, setFinalCalculatorError] = useState<
    string | null
  >(null);

  const finalBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [gradeRatiosFinalCalculator, setGradeRatiosFinalCalculator] =
    useState<GradeRatios>({
      APlus: "",
      AZero: "",
      BPlus: "",
      BZero: "",
      CPlus: "",
      CZero: "",
      DPlus: "",
      DZero: "",
    });
  const [chartDataFinalCalculator, setChartDataFinalCalculator] = useState<
    number[]
  >([]);
  const [myPositionFinalCalculator, setMyPositionFinalCalculator] =
    useState<number | null>(null);

  // Function to calculate recommended standard deviation (10% of max score)
  const getRecommendedStdDev = (maxScore: number): number => {
    return Math.round(maxScore * 0.1);
  };

  // Handlers for grade ratio changes
  const handleGradeRatioChangePredictor = (key: GradeKey, value: string) => {
    setGradeRatiosPredictor({ ...gradeRatiosPredictor, [key]: value });
  };

  const handleGradeRatioChangeFinalCalculator = (
    key: GradeKey,
    value: string
  ) => {
    setGradeRatiosFinalCalculator({
      ...gradeRatiosFinalCalculator,
      [key]: value,
    });
  };

  // mapGradeToPosition 함수
  const mapGradeToPosition = (
    position: number,
    gradeRatios: GradeRatios
  ): string => {
    const gradeOrder: { grade: string; key: GradeKey }[] = [
      { grade: "A+", key: "APlus" },
      { grade: "A0", key: "AZero" },
      { grade: "B+", key: "BPlus" },
      { grade: "B0", key: "BZero" },
      { grade: "C+", key: "CPlus" },
      { grade: "C0", key: "CZero" },
      { grade: "D+", key: "DPlus" },
      { grade: "D0", key: "DZero" },
    ];

    let cumulative = 0;
    for (const { grade, key } of gradeOrder) {
      const ratio = parseFloat(gradeRatios[key]) || 0;
      cumulative += ratio; // Cumulative percentage
      if (position <= cumulative) {
        return grade;
      }
    }
    return "F"; // Return "F" if mapping fails
  };

  // ---------------------- 대학 성적 예측기 handleSubmit ----------------------
  const handlePredictorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalRatio = Object.values(gradeRatiosPredictor).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );

    if (totalRatio < 99 || totalRatio > 101) {
      setError("성적 비율의 합계가 99에서 101 사이여야 합니다.");
      return;
    }

    // Validate that max scores are provided and greater than zero
    if (
      !midMax ||
      !finalMax ||
      parseFloat(midMax) <= 0 ||
      parseFloat(finalMax) <= 0
    ) {
      setError("중간고사와 기말고사의 만점은 0보다 커야 합니다.");
      return;
    }

    // Validate that standard deviations are provided and reasonable
    const midMaxNum = parseFloat(midMax);
    const finalMaxNum = parseFloat(finalMax);
    const midStdDevNum =
      parseFloat(midStdDev) || getRecommendedStdDev(midMaxNum);
    const finalStdDevNum =
      parseFloat(finalStdDev) || getRecommendedStdDev(finalMaxNum);

    // Check if standard deviations are not more than 50% of max scores
    if (
      midStdDevNum > midMaxNum * 0.5 ||
      finalStdDevNum > finalMaxNum * 0.5
    ) {
      setError("표준편차는 만점의 50%를 초과할 수 없습니다.");
      return;
    }

    setError(null);

    try {
      // Normalize scores to percentages
      const normalizedMidterm = (parseFloat(midterm) / midMaxNum) * 100;
      const normalizedFinal = (parseFloat(final) / finalMaxNum) * 100;

      // Normalize averages and standard deviations to percentages
      const normalizedMidAvg = (parseFloat(midAvg) / midMaxNum) * 100;
      const normalizedFinalAvg = (parseFloat(finalAvg) / finalMaxNum) * 100;
      const normalizedMidStdDev = (midStdDevNum / midMaxNum) * 100;
      const normalizedFinalStdDev = (finalStdDevNum / finalMaxNum) * 100;

      // Calculate Z-scores based on normalized scores
      const midZ =
        (normalizedMidterm - normalizedMidAvg) / normalizedMidStdDev;
      const finalZ =
        (normalizedFinal - normalizedFinalAvg) / normalizedFinalStdDev;
      const overallZ = (midZ + finalZ) / 2;

      // Clamp overallZ to range [-3, 3]
      const clampedOverallZ = Math.max(-3, Math.min(overallZ, 3));

      // Calculate position based on clamped Z-score using CDF
      const position = (1 - normCDF(clampedOverallZ)) * 100;
      const clampedPosition = Math.max(0, Math.min(position, 100));
      setMyPositionPredictor(clampedPosition);

      // Calculate grade
      const calculatedGrade = mapGradeToPosition(
        clampedPosition,
        gradeRatiosPredictor
      );
      setPredictedGrade(calculatedGrade);

      // Update chartData
      const ratios = [
        gradeRatiosPredictor.APlus,
        gradeRatiosPredictor.AZero,
        gradeRatiosPredictor.BPlus,
        gradeRatiosPredictor.BZero,
        gradeRatiosPredictor.CPlus,
        gradeRatiosPredictor.CZero,
        gradeRatiosPredictor.DPlus,
        gradeRatiosPredictor.DZero,
      ].map((ratio) => parseFloat(ratio) || 0);
      setChartDataPredictor(ratios);
    } catch (err) {
      console.error(err);
      setError("예측 요청 중 문제가 발생했습니다.");
    }
  };

  // ---------------------- 기말 성적 계산 handleChange ----------------------
  const handleFinalCalculatorChange = () => {
    const {
      midAvg,
      midStdDev,
      midMax,
      myMidScore,
      finalAvg,
      finalStdDev,
      finalMax,
      myFinalScore,
    } = finalCalculator;

    // Validate inputs
    if (
      !midAvg ||
      !midStdDev ||
      !midMax ||
      myMidScore === "" ||
      !finalAvg ||
      !finalStdDev ||
      !finalMax
    ) {
      setFinalCalculatorError("모든 필드를 채워주세요.");
      setFinalCalculatorGrade(null);
      return;
    }

    const totalRatio = Object.values(gradeRatiosFinalCalculator).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );

    if (totalRatio < 99 || totalRatio > 101) {
      setFinalCalculatorError("성적 비율의 합계가 99에서 101 사이여야 합니다.");
      setFinalCalculatorGrade(null);
      return;
    }

    // Validate that max scores are provided and greater than zero
    if (
      parseFloat(midMax) <= 0 ||
      parseFloat(finalMax) <= 0 ||
      parseFloat(myMidScore) < 0 ||
      parseFloat(myMidScore) > parseFloat(midMax)
    ) {
      setFinalCalculatorError(
        "중간고사와 기말고사의 만점은 0보다 커야 하며, 내 점수는 만점 이하여야 합니다."
      );
      setFinalCalculatorGrade(null);
      return;
    }

    // Validate that standard deviations are provided and reasonable
    const midMaxNum = parseFloat(midMax);
    const finalMaxNum = parseFloat(finalMax);
    const midStdDevNum =
      parseFloat(midStdDev) || getRecommendedStdDev(midMaxNum);
    const finalStdDevNum =
      parseFloat(finalStdDev) || getRecommendedStdDev(finalMaxNum);

    // Check if standard deviations are not more than 50% of max scores
    if (
      midStdDevNum > midMaxNum * 0.5 ||
      finalStdDevNum > finalMaxNum * 0.5
    ) {
      setFinalCalculatorError("표준편차는 만점의 50%를 초과할 수 없습니다.");
      setFinalCalculatorGrade(null);
      return;
    }

    setFinalCalculatorError(null);

    try {
      // Normalize scores to percentages
      const normalizedMyMidterm = (parseFloat(myMidScore) / midMaxNum) * 100;
      const normalizedMyFinal = (myFinalScore / finalMaxNum) * 100;

      // Normalize averages and standard deviations to percentages
      const normalizedMidAvg = (parseFloat(midAvg) / midMaxNum) * 100;
      const normalizedMidStdDev = (midStdDevNum / midMaxNum) * 100;
      const normalizedFinalAvg = (parseFloat(finalAvg) / finalMaxNum) * 100;
      const normalizedFinalStdDev = (finalStdDevNum / finalMaxNum) * 100;

      // Calculate Z-scores based on normalized scores
      const midZ =
        (normalizedMyMidterm - normalizedMidAvg) / normalizedMidStdDev;
      const finalZ =
        (normalizedMyFinal - normalizedFinalAvg) / normalizedFinalStdDev;
      const overallZ = (midZ + finalZ) / 2;

      // Clamp overallZ to range [-3, 3]
      const clampedOverallZ = Math.max(-3, Math.min(overallZ, 3));

      // Calculate position based on clamped Z-score using CDF
      const position = (1 - normCDF(clampedOverallZ)) * 100;
      const clampedPosition = Math.max(0, Math.min(position, 100));
      setMyPositionFinalCalculator(clampedPosition);

      // Calculate grade
      const calculatedGrade = mapGradeToPosition(
        clampedPosition,
        gradeRatiosFinalCalculator
      );
      setFinalCalculatorGrade(calculatedGrade);

      // Update chartData
      const ratios = [
        gradeRatiosFinalCalculator.APlus,
        gradeRatiosFinalCalculator.AZero,
        gradeRatiosFinalCalculator.BPlus,
        gradeRatiosFinalCalculator.BZero,
        gradeRatiosFinalCalculator.CPlus,
        gradeRatiosFinalCalculator.CZero,
        gradeRatiosFinalCalculator.DPlus,
        gradeRatiosFinalCalculator.DZero,
      ].map((ratio) => parseFloat(ratio) || 0);
      setChartDataFinalCalculator(ratios);

      // 디버깅용 로그 (필요 시 주석 해제)
      /*
      console.log("Normalized My Final:", normalizedMyFinal);
      console.log("Final Z-score:", finalZ);
      console.log("Overall Z-score:", overallZ);
      console.log("Clamped Overall Z:", clampedOverallZ);
      console.log("Position:", clampedPosition);
      */
    } catch (err) {
      console.error(err);
      setFinalCalculatorError("예측 요청 중 문제가 발생했습니다.");
      setFinalCalculatorGrade(null);
    }
  };

  // ---------------------- 기말 성적 계산 드래그 핸들러 ----------------------
  const handleDragFinalCalculator = (clientX: number) => {
    if (!finalBarRef.current) return;

    const rect = finalBarRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = (relativeX / rect.width) * 100;
    const clampedPercentage = Math.max(0, Math.min(percentage, 100));
    const calculatedScore =
      (clampedPercentage / 100) * parseFloat(finalCalculator.finalMax || "1");
    setFinalCalculator((prev) => ({
      ...prev,
      myFinalScore: calculatedScore,
    }));
  };

  const handleMouseDownFinalCalculator = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleDragFinalCalculator(e.clientX);
  };

  const handleTouchStartFinalCalculator = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    handleDragFinalCalculator(touch.clientX);
  };

  const handleMouseMoveFinalCalculator = (e: MouseEvent) => {
    if (isDragging) {
      handleDragFinalCalculator(e.clientX);
    }
  };

  const handleTouchMoveFinalCalculator = (e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      handleDragFinalCalculator(touch.clientX);
    }
  };

  const handleMouseUpFinalCalculator = () => {
    if (isDragging) {
      setIsDragging(false);
      handleFinalCalculatorChange();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMoveFinalCalculator);
      window.addEventListener("mouseup", handleMouseUpFinalCalculator);
      window.addEventListener("touchmove", handleTouchMoveFinalCalculator);
      window.addEventListener("touchend", handleMouseUpFinalCalculator);
    } else {
      window.removeEventListener("mousemove", handleMouseMoveFinalCalculator);
      window.removeEventListener("mouseup", handleMouseUpFinalCalculator);
      window.removeEventListener("touchmove", handleTouchMoveFinalCalculator);
      window.removeEventListener("touchend", handleMouseUpFinalCalculator);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveFinalCalculator);
      window.removeEventListener("mouseup", handleMouseUpFinalCalculator);
      window.removeEventListener("touchmove", handleTouchMoveFinalCalculator);
      window.removeEventListener("touchend", handleMouseUpFinalCalculator);
    };
  }, [isDragging]);

  // ---------------------- useEffect for Final Calculator ----------------------
  useEffect(() => {
    // Whenever myFinalScore or gradeRatiosFinalCalculator changes, update the grade
    handleFinalCalculatorChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalCalculator.myFinalScore, gradeRatiosFinalCalculator]);

  // ---------------------- UI 렌더링 ----------------------
  return (
    <div style={containerStyle}>
      {/* CSS to hide spin buttons */}
      <style>
        {`
          /* Hide spin buttons for WebKit browsers */
          input[type=number]::-webkit-outer-spin-button,
          input[type=number]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          /* Hide spin buttons for Firefox */
          input[type=number] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      <h2 style={titleStyle}>대학 성적 예측기</h2>

      {/* 탭 네비게이션 */}
      <div style={tabContainerStyle}>
        <button
          onClick={() => setActiveTab("predictor")}
          style={{
            ...tabButtonStyle,
            ...(activeTab === "predictor" ? activeTabStyle : {}),
          }}
        >
          대학 성적 예측기
        </button>
        <button
          onClick={() => setActiveTab("finalCalculator")}
          style={{
            ...tabButtonStyle,
            ...(activeTab === "finalCalculator" ? activeTabStyle : {}),
          }}
        >
          기말 성적 계산
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "predictor" && (
        <form onSubmit={handlePredictorSubmit} style={formStyle}>
          {/* Input Section */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              중간고사 평균:
              <input
                type="number"
                value={midAvg}
                onChange={(e) => setMidAvg(e.target.value)}
                required
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </label>
            <label style={labelStyle}>
              중간고사 표준편차:
              <input
                type="number"
                value={midStdDev}
                onChange={(e) => setMidStdDev(e.target.value)}
                style={inputStyle}
                placeholder="예: 10"
                min="0"
                step="0.01"
              />
              {midMax && (
                <span style={helperTextStyle}>
                  추천: {getRecommendedStdDev(parseFloat(midMax))} (만점의 10%)
                </span>
              )}
            </label>
          </div>
          {/* Input for Midterm Maximum Score */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              중간고사 만점:
              <input
                type="number"
                value={midMax}
                onChange={(e) => setMidMax(e.target.value)}
                required
                style={inputStyle}
                min="1"
                step="0.01"
              />
            </label>
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>
              기말고사 평균:
              <input
                type="number"
                value={finalAvg}
                onChange={(e) => setFinalAvg(e.target.value)}
                required
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </label>
            <label style={labelStyle}>
              기말고사 표준편차:
              <input
                type="number"
                value={finalStdDev}
                onChange={(e) => setFinalStdDev(e.target.value)}
                style={inputStyle}
                placeholder="예: 10"
                min="0"
                step="0.01"
              />
              {finalMax && (
                <span style={helperTextStyle}>
                  추천: {getRecommendedStdDev(parseFloat(finalMax))} (만점의 10%)
                </span>
              )}
            </label>
          </div>
          {/* Input for Final Maximum Score */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              기말고사 만점:
              <input
                type="number"
                value={finalMax}
                onChange={(e) => setFinalMax(e.target.value)}
                required
                style={inputStyle}
                min="1"
                step="0.01"
              />
            </label>
          </div>
          <div style={rowStyle}>
            <label style={labelStyle}>
              내 중간고사 점수:
              <input
                type="number"
                value={midterm}
                onChange={(e) => setMidterm(e.target.value)}
                required
                style={inputStyle}
                min="0"
                max={midMax || undefined}
                step="0.01"
              />
            </label>
            <label style={labelStyle}>
              내 기말고사 점수:
              <input
                type="number"
                value={final}
                onChange={(e) => setFinal(e.target.value)}
                required
                style={inputStyle}
                min="0"
                max={finalMax || undefined}
                step="0.01"
              />
            </label>
          </div>

          {/* Grade Ratio Inputs */}
          <h3 style={sectionTitleStyle}>성적 비율 입력</h3>
          <div style={gradeRowStyle}>
            {[
              "APlus",
              "AZero",
              "BPlus",
              "BZero",
              "CPlus",
              "CZero",
              "DPlus",
              "DZero",
            ].map((key) => (
              <div key={key} style={gradeColumnStyle}>
                <p style={gradeLabelStyle}>
                  {key.replace("Plus", "+").replace("Zero", "0")}
                </p>
                <input
                  type="number"
                  value={gradeRatiosPredictor[key as GradeKey]}
                  onChange={(e) =>
                    handleGradeRatioChangePredictor(
                      key as GradeKey,
                      e.target.value
                    )
                  }
                  required
                  style={smallInputStyle}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* 합계 표시 */}
          <SumDisplay
            gradeRatios={gradeRatiosPredictor}
            validRange={{ min: 99, max: 101 }}
          />

          {/* 추가 안내 문구 */}
          <p style={additionalNoticeStyle}>
            이전 학기 성적 부여 비율은 HY-in / 수업 / 교과목 포트폴리오 / 리포트 출력에서 확인하실 수 있습니다.
          </p>

          {error && <p style={errorStyle}>{error}</p>}
          <button type="submit" style={buttonStyle}>
            성적 예측하기
          </button>

          {/* Results and Chart */}
          {predictedGrade && (
            <div style={resultContainerStyle}>
              <h3>예측된 성적: {predictedGrade}</h3>
              <p style={positionStyle}>
                상위 {myPositionPredictor !== null ? myPositionPredictor.toFixed(2) : "??"}%
              </p>
              <div style={horizontalBarContainerStyle}>
                {chartDataPredictor.map((value, index) => (
                  <div
                    key={index}
                    style={{
                      ...horizontalBarStyle,
                      width: `${value}%`,
                      backgroundColor: gradeColors[index],
                    }}
                  >
                    {value >= 5 && (
                      <span style={barTextStyle}>
                        {[
                          "A+",
                          "A0",
                          "B+",
                          "B0",
                          "C+",
                          "C0",
                          "D+",
                          "D0",
                        ][index]}
                        : {value}%
                      </span>
                    )}
                  </div>
                ))}
                {myPositionPredictor !== null && (
                  <>
                    {/* Black line indicating my position */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${myPositionPredictor}%`,
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        backgroundColor: "black",
                      }}
                    />
                    {/* Text for my position */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${myPositionPredictor}%`,
                        bottom: "-20px",
                        transform: "translateX(-50%)",
                        fontSize: "12px",
                        color: "black",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ^ 내 위치
                    </div>
                  </>
                )}
              </div>
              {/* 안내 문구 및 GitHub 링크 추가 */}
              <p style={noticeStyle}>
                과제 및 출석 등을 제외한 단순 시험 점수로만 계산한 성적으로, 부정확할 수 있습니다.{" "}
                <a
                  href="https://github.com/sealmean"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={githubLinkStyle}
                >
                  <GitHubIcon /> GitHub
                </a>
              </p>
            </div>
          )}
        </form>
      )}

      {activeTab === "finalCalculator" && (
        <form onSubmit={(e) => e.preventDefault()} style={formStyle}>
          {/* Input Section */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              중간고사 평균:
              <input
                type="number"
                value={finalCalculator.midAvg}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    midAvg: e.target.value,
                  })
                }
                required
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </label>
            <label style={labelStyle}>
              중간고사 표준편차:
              <input
                type="number"
                value={finalCalculator.midStdDev}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    midStdDev: e.target.value,
                  })
                }
                style={inputStyle}
                placeholder="예: 10"
                min="0"
                step="0.01"
              />
              {finalCalculator.midMax && (
                <span style={helperTextStyle}>
                  추천: {getRecommendedStdDev(parseFloat(finalCalculator.midMax))} (만점의 10%)
                </span>
              )}
            </label>
          </div>
          {/* Input for Midterm Maximum Score */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              중간고사 만점:
              <input
                type="number"
                value={finalCalculator.midMax}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    midMax: e.target.value,
                  })
                }
                required
                style={inputStyle}
                min="1"
                step="0.01"
              />
            </label>
          </div>
          {/* Input for My Midterm Score */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              내 중간고사 점수:
              <input
                type="number"
                value={finalCalculator.myMidScore}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    myMidScore: e.target.value,
                  })
                }
                required
                style={inputStyle}
                min="0"
                max={finalCalculator.midMax || undefined}
                step="0.01"
              />
            </label>
          </div>
          {/* Input for Final Average */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              기말고사 평균:
              <input
                type="number"
                value={finalCalculator.finalAvg}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    finalAvg: e.target.value,
                  })
                }
                required
                style={inputStyle}
                min="0"
                step="0.01"
              />
            </label>
            <label style={labelStyle}>
              기말고사 표준편차:
              <input
                type="number"
                value={finalCalculator.finalStdDev}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    finalStdDev: e.target.value,
                  })
                }
                style={inputStyle}
                placeholder="예: 10"
                min="0"
                step="0.01"
              />
              {finalCalculator.finalMax && (
                <span style={helperTextStyle}>
                  추천: {getRecommendedStdDev(parseFloat(finalCalculator.finalMax))} (만점의 10%)
                </span>
              )}
            </label>
          </div>
          {/* Input for Final Maximum Score */}
          <div style={rowStyle}>
            <label style={labelStyle}>
              기말고사 만점:
              <input
                type="number"
                value={finalCalculator.finalMax}
                onChange={(e) =>
                  setFinalCalculator({
                    ...finalCalculator,
                    finalMax: e.target.value,
                  })
                }
                required
                style={inputStyle}
                min="1"
                step="0.01"
              />
            </label>
          </div>

          {/* Grade Ratio Inputs */}
          <h3 style={sectionTitleStyle}>성적 비율 입력</h3>
          <div style={gradeRowStyle}>
            {[
              "APlus",
              "AZero",
              "BPlus",
              "BZero",
              "CPlus",
              "CZero",
              "DPlus",
              "DZero",
            ].map((key) => (
              <div key={key} style={gradeColumnStyle}>
                <p style={gradeLabelStyle}>
                  {key.replace("Plus", "+").replace("Zero", "0")}
                </p>
                <input
                  type="number"
                  value={gradeRatiosFinalCalculator[key as GradeKey]}
                  onChange={(e) =>
                    handleGradeRatioChangeFinalCalculator(
                      key as GradeKey,
                      e.target.value
                    )
                  }
                  required
                  style={smallInputStyle}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            ))}
          </div>

          {/* 합계 표시 */}
          <SumDisplay
            gradeRatios={gradeRatiosFinalCalculator}
            validRange={{ min: 99, max: 101 }}
          />

          {/* 추가 안내 문구 */}
          <p style={additionalNoticeStyle}>
            이전 학기 성적 부여 비율은 HY-in / 수업 / 교과목 포트폴리오 / 리포트 출력에서 확인하실 수 있습니다.
          </p>

          {/* Drag-able Final Score Selector */}
          <div style={finalCalculatorContainerStyle}>
            <h3 style={sectionTitleStyle}>기말고사 점수 선택</h3>
            <div
              ref={finalBarRef}
              style={finalBarStyle}
              onMouseDown={handleMouseDownFinalCalculator}
              onTouchStart={handleTouchStartFinalCalculator}
            >
              {/* Drag Handle */}
              <div
                style={{
                  ...dragHandleStyle,
                  left: `${(finalCalculator.myFinalScore /
                    parseFloat(finalCalculator.finalMax || "1")) *
                    100}%`,
                }}
              />
            </div>
            <p style={scoreDisplayStyle}>
              선택한 기말고사 점수:{" "}
              {finalCalculator.myFinalScore.toFixed(2)} /{" "}
              {finalCalculator.finalMax ? parseFloat(finalCalculator.finalMax).toFixed(2) : "0"}
            </p>
          </div>

          {finalCalculatorError && (
            <p style={errorStyle}>{finalCalculatorError}</p>
          )}
          {/* 기말 성적 계산 결과 */}
          {finalCalculatorGrade && (
            <div style={resultContainerStyle}>
              <h3>예측된 성적: {finalCalculatorGrade}</h3>
              <p style={positionStyle}>
                상위 {myPositionFinalCalculator !== null
                  ? myPositionFinalCalculator.toFixed(2)
                  : "??"}
                %
              </p>
              {/* 기말 성적 분포 그래프 (가로) */}
              <div style={horizontalBarContainerStyle}>
                {chartDataFinalCalculator.map((value, index) => (
                  <div
                    key={index}
                    style={{
                      ...horizontalBarStyle,
                      width: `${value}%`,
                      backgroundColor: gradeColors[index],
                    }}
                  >
                    {value >= 5 && (
                      <span style={barTextStyle}>
                        {[
                          "A+",
                          "A0",
                          "B+",
                          "B0",
                          "C+",
                          "C0",
                          "D+",
                          "D0",
                        ][index]}
                        : {value}%
                      </span>
                    )}
                  </div>
                ))}
                {myPositionFinalCalculator !== null && (
                  <>
                    {/* Black line indicating my position */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${myPositionFinalCalculator}%`,
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        backgroundColor: "black",
                      }}
                    />
                    {/* Text for my position */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${myPositionFinalCalculator}%`,
                        bottom: "-20px",
                        transform: "translateX(-50%)",
                        fontSize: "12px",
                        color: "black",
                        fontWeight: "bold",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ^ 내 위치
                    </div>
                  </>
                )}
              </div>
              {/* 안내 문구 및 GitHub 링크 추가 */}
              <p style={noticeStyle}>
                과제 및 출석 등을 제외한 단순 시험 점수로만 계산한 성적으로, 부정확할 수 있습니다.{" "}
                <a
                  href="https://github.com/sealmean"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={githubLinkStyle}
                >
                  <GitHubIcon /> GitHub
                </a>
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ---------------------- 스타일 정의 ----------------------
const containerStyle: React.CSSProperties = {
  maxWidth: "800px",
  margin: "20px auto",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#fff",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const titleStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#333",
  fontSize: "24px",
  marginBottom: "20px",
};

const tabContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "20px",
};

const tabButtonStyle: React.CSSProperties = {
  padding: "10px 20px",
  margin: "0 5px",
  backgroundColor: "#f0f0f0",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "16px",
};

const activeTabStyle: React.CSSProperties = {
  backgroundColor: "#0070f3",
  color: "white",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
};

const gradeRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "space-between",
};

const gradeColumnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "60px",
};

const gradeLabelStyle: React.CSSProperties = {
  marginBottom: "4px",
  fontSize: "12px",
  fontWeight: "500",
  color: "#555",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "15px 0",
  fontSize: "16px",
  color: "#333",
  textAlign: "center",
};

const labelStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "left",
  minWidth: "150px",
  fontSize: "14px",
  color: "#333",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  marginTop: "4px",
};

const smallInputStyle: React.CSSProperties = {
  width: "60px",
  padding: "4px 6px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "14px",
};

const helperTextStyle: React.CSSProperties = {
  display: "block",
  marginTop: "2px",
  fontSize: "12px",
  color: "#888",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px",
  backgroundColor: "#0070f3",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "16px",
  transition: "background-color 0.3s",
};

const errorStyle: React.CSSProperties = {
  color: "red",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "500",
};

const resultContainerStyle: React.CSSProperties = {
  marginTop: "25px",
  textAlign: "center",
  fontSize: "18px",
  color: "#333",
};

const positionStyle: React.CSSProperties = {
  color: "#555",
  fontSize: "14px",
  fontWeight: "500",
};

const horizontalBarContainerStyle: React.CSSProperties = {
  position: "relative",
  height: "30px",
  width: "100%",
  display: "flex",
  alignItems: "center",
  backgroundColor: "#eaeaea",
  borderRadius: "4px",
  overflow: "hidden",
  marginTop: "15px",
  border: "1px solid #ccc",
};

const horizontalBarStyle: React.CSSProperties = {
  height: "100%",
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  color: "white",
  fontSize: "12px",
};

const barTextStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "10px",
  color: "white",
  textAlign: "center",
  width: "100%",
};

// 기말 성적 계산 스타일
const finalCalculatorContainerStyle: React.CSSProperties = {
  marginTop: "20px",
  textAlign: "center",
};

const finalBarStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "30px",
  backgroundColor: "#eaeaea",
  borderRadius: "4px",
  margin: "0 auto",
  cursor: "pointer",
};

const dragHandleStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "20px",
  height: "20px",
  backgroundColor: "#0070f3",
  borderRadius: "50%",
  cursor: "grab",
};

// 추가 안내 문구 스타일 추가
const additionalNoticeStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#555",
  fontStyle: "italic",
  textAlign: "center",
  marginTop: "10px",
};

// 안내 문구 스타일 수정
const noticeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  color: "#555",
  fontStyle: "italic",
  textAlign: "center",
  marginTop: "15px",
};

const githubLinkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  marginLeft: "8px",
  color: "#0070f3",
  textDecoration: "none",
  fontWeight: "bold",
};

const GitHubIcon = () => (
  <svg
    height="16"
    width="16"
    viewBox="0 0 16 16"
    fill="#333"
    xmlns="http://www.w3.org/2000/svg"
    style={{ marginRight: "4px" }}
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.68 7.68 0 012.01-.27c.68 0 1.36.09 2.01.27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

// 성적 비율 색상
const gradeColors: string[] = [
  "#4CAF50", // A+
  "#2196F3", // A0
  "#FFC107", // B+
  "#FF5722", // B0
  "#9C27B0", // C+
  "#E91E63", // C0
  "#795548", // D+
  "#607D8B", // D0
];

// ---------------------- SumDisplay 컴포넌트 추가 ----------------------
interface SumDisplayProps {
  gradeRatios: GradeRatios;
  validRange: { min: number; max: number };
}

const SumDisplay: React.FC<SumDisplayProps> = ({ gradeRatios, validRange }) => {
  const sum = Object.values(gradeRatios).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  const isValid = sum >= validRange.min && sum <= validRange.max;

  const sumStyle: React.CSSProperties = {
    color: isValid ? "green" : "red",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: "14px",
  };

  return <p style={sumStyle}>합계: {sum.toFixed(2)}%</p>;
};

// ---------------------- scoreDisplayStyle 추가 ----------------------
const scoreDisplayStyle: React.CSSProperties = {
  marginTop: "10px",
  fontSize: "16px",
  color: "#333",
};
