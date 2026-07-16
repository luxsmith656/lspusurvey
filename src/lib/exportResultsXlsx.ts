import ExcelJS from "exceljs";
import { surveyQuestions } from "@/data/surveyQuestions";

interface SurveyResponseRow {
  created_at: string;
  ratings: Record<string, unknown> | null;
  suggestion: string | null;
}

interface PreAnswerRow {
  date: string;
  firstImpressionRating: number;
  comment: string;
  legacyFirstImpression: string;
  legacyRecommendation: string;
}

interface ChartCapture {
  name: string;
  pngBase64: string; // base64 without the data:image prefix
  width: number;
  height: number;
}

/**
 * Convert a rendered <svg> DOM node into a PNG data URL.
 * Works for recharts because they render inline SVG.
 */
export async function svgElementToPngBase64(
  svg: SVGSVGElement,
  scale = 2,
): Promise<{ base64: string; width: number; height: number }> {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG image for export"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    return {
      base64: dataUrl.split(",")[1] ?? "",
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function captureChartSvg(
  container: HTMLElement | null,
  name: string,
): Promise<ChartCapture | null> {
  if (!container) return null;
  const svg = container.querySelector("svg");
  if (!svg) return null;
  const { base64, width, height } = await svgElementToPngBase64(svg as SVGSVGElement);
  return { name, pngBase64: base64, width, height };
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportEvaluationXlsx(params: {
  eventTitle: string;
  evaluationResponses: SurveyResponseRow[];
  charts: ChartCapture[];
}) {
  const { eventTitle, evaluationResponses, charts } = params;
  const wb = new ExcelJS.Workbook();
  wb.creator = "M&E Survey";
  wb.created = new Date();

  // Sheet 1: Responses
  const ws = wb.addWorksheet("Responses");
  ws.columns = [
    { header: "Response #", key: "num", width: 12 },
    { header: "Date", key: "date", width: 14 },
    ...surveyQuestions.map((q) => ({ header: q.question, key: q.id, width: 32 })),
    { header: "Suggestion", key: "suggestion", width: 40 },
  ];
  ws.getRow(1).font = { bold: true };

  evaluationResponses.forEach((r, i) => {
    const row: Record<string, unknown> = {
      num: i + 1,
      date: new Date(r.created_at).toLocaleDateString(),
      suggestion: r.suggestion || "",
    };
    surveyQuestions.forEach((q) => {
      row[q.id] = Number(r.ratings?.[q.id] || 0) || "";
    });
    ws.addRow(row);
  });

  // Sheet 2: Summary averages
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Question ID", key: "id", width: 12 },
    { header: "Category", key: "category", width: 24 },
    { header: "Question", key: "question", width: 50 },
    { header: "Average", key: "average", width: 10 },
    { header: "Response Count", key: "count", width: 16 },
  ];
  summary.getRow(1).font = { bold: true };
  surveyQuestions.forEach((q) => {
    const nums = evaluationResponses
      .map((r) => Number(r.ratings?.[q.id] || 0))
      .filter((n) => n > 0);
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    summary.addRow({
      id: q.id.toUpperCase(),
      category: q.category,
      question: q.question,
      average: Math.round(avg * 100) / 100,
      count: nums.length,
    });
  });

  // Sheet 3: Charts (embedded images)
  if (charts.length > 0) {
    const chartSheet = wb.addWorksheet("Charts");
    chartSheet.getColumn(1).width = 4;
    let currentRow = 1;
    for (const chart of charts) {
      chartSheet.getCell(currentRow, 2).value = chart.name;
      chartSheet.getCell(currentRow, 2).font = { bold: true, size: 14 };
      currentRow += 1;

      const imgId = wb.addImage({
        base64: chart.pngBase64,
        extension: "png",
      });
      // Cap displayed size
      const displayW = Math.min(720, chart.width / 2);
      const displayH = Math.min(400, chart.height / 2);
      chartSheet.addImage(imgId, {
        tl: { col: 1, row: currentRow },
        ext: { width: displayW, height: displayH },
        editAs: "oneCell",
      });
      // Reserve rows for the image (roughly 20px per row)
      currentRow += Math.ceil(displayH / 20) + 2;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(
    buffer as ArrayBuffer,
    `${eventTitle.replace(/\s+/g, "_")}_evaluation_report.xlsx`,
  );
}

export async function exportPreEventXlsx(params: {
  eventTitle: string;
  preAnswers: PreAnswerRow[];
  charts: ChartCapture[];
}) {
  const { eventTitle, preAnswers, charts } = params;
  const wb = new ExcelJS.Workbook();
  wb.creator = "M&E Survey";
  wb.created = new Date();

  const ws = wb.addWorksheet("Pre-Event Responses");
  ws.columns = [
    { header: "Response #", key: "num", width: 12 },
    { header: "Date", key: "date", width: 14 },
    { header: "First Impression Rating", key: "rating", width: 22 },
    { header: "Optional Comment", key: "comment", width: 50 },
    { header: "Legacy First Impression", key: "legacyFirst", width: 34 },
    { header: "Legacy Recommendation", key: "legacyRec", width: 34 },
  ];
  ws.getRow(1).font = { bold: true };

  preAnswers.forEach((a, i) => {
    ws.addRow({
      num: i + 1,
      date: a.date,
      rating: a.firstImpressionRating || "",
      comment: a.comment,
      legacyFirst: a.legacyFirstImpression,
      legacyRec: a.legacyRecommendation,
    });
  });

  // Summary
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Rating", key: "rating", width: 10 },
    { header: "Count", key: "count", width: 10 },
  ];
  summary.getRow(1).font = { bold: true };
  for (let i = 1; i <= 5; i++) {
    const count = preAnswers.filter((a) => a.firstImpressionRating === i).length;
    summary.addRow({ rating: `${i}★`, count });
  }

  if (charts.length > 0) {
    const chartSheet = wb.addWorksheet("Charts");
    chartSheet.getColumn(1).width = 4;
    let currentRow = 1;
    for (const chart of charts) {
      chartSheet.getCell(currentRow, 2).value = chart.name;
      chartSheet.getCell(currentRow, 2).font = { bold: true, size: 14 };
      currentRow += 1;

      const imgId = wb.addImage({
        base64: chart.pngBase64,
        extension: "png",
      });
      const displayW = Math.min(720, chart.width / 2);
      const displayH = Math.min(400, chart.height / 2);
      chartSheet.addImage(imgId, {
        tl: { col: 1, row: currentRow },
        ext: { width: displayW, height: displayH },
        editAs: "oneCell",
      });
      currentRow += Math.ceil(displayH / 20) + 2;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(
    buffer as ArrayBuffer,
    `${eventTitle.replace(/\s+/g, "_")}_pre_event_report.xlsx`,
  );
}