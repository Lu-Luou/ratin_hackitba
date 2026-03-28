import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GeneratedLenderReport } from "@/lib/report/generation";
import type { FieldReportContext } from "@/lib/report/context";

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }

    current = word;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function addSection(lines: string[], title: string, content: string[]) {
  lines.push(title);
  lines.push(...content);
  lines.push("");
}

export async function renderLenderReportPdf(context: FieldReportContext, report: GeneratedLenderReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const fontSize = 11;
  const lineHeight = 16;
  const maxChars = 95;

  const lines: string[] = [];
  const prediction = context.yield.latestSnapshot;

  addSection(lines, "Lender Report", [
    `Generated at: ${report.generatedAt}`,
    `Field: ${context.field.name} (${context.field.id})`,
    `Location: ${context.field.location}`,
    `Area: ${context.field.hectares} ha`,
    `Provider: ${report.provider.name} / ${report.provider.model}`,
  ]);

  addSection(lines, "Executive Summary", wrapText(report.executiveSummary, maxChars));

  addSection(
    lines,
    "Risk Flags",
    report.riskFlags.length > 0 ? report.riskFlags.flatMap((item) => wrapText(`- ${item}`, maxChars)) : ["- None"],
  );

  addSection(lines, "Recommendation", wrapText(report.recommendation, maxChars));
  addSection(lines, "Narrative", wrapText(report.narrative, maxChars));

  addSection(lines, "Internal Metrics", [
    `Completeness score: ${context.completeness.score}`,
    `Latest prediction: ${prediction ? `${prediction.predictedYieldTonHa} ton/ha` : "n/a"}`,
    `Net spot projection: ${prediction ? `USD ${prediction.netSpotUsd.toFixed(2)}` : "n/a"}`,
    `Weather risk score: ${context.weather ? context.weather.metrics.riskScore : "n/a"}`,
    `Credit decision: ${context.credit ? `${context.credit.decision} (${context.credit.score})` : "n/a"}`,
  ]);

  if (report.citations.length > 0) {
    addSection(
      lines,
      "External Citations",
      report.citations.flatMap((citation, index) =>
        wrapText(`${index + 1}. ${citation.title} - ${citation.url}`, maxChars),
      ),
    );
  }

  let y = 760;

  for (const line of lines) {
    if (y <= margin) {
      y = 760;
      pdf.addPage([612, 792]);
    }

    const activePage = pdf.getPages()[pdf.getPages().length - 1];

    if (line === "") {
      y -= lineHeight;
      continue;
    }

    const isHeader =
      line === "Lender Report" ||
      line === "Executive Summary" ||
      line === "Risk Flags" ||
      line === "Recommendation" ||
      line === "Narrative" ||
      line === "Internal Metrics" ||
      line === "External Citations";

    activePage.drawText(line, {
      x: margin,
      y,
      size: isHeader ? 13 : fontSize,
      font: isHeader ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= isHeader ? lineHeight + 2 : lineHeight;
  }

  return pdf.save();
}
