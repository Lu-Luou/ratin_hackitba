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

function verdictLabel(verdict: GeneratedLenderReport["underwritingVerdict"]) {
  if (verdict === "APPROVE_WITH_CONDITIONS") return "Approve With Conditions";
  if (verdict === "WATCHLIST") return "Watchlist";
  return "Decline";
}

function verdictColor(verdict: GeneratedLenderReport["underwritingVerdict"]) {
  if (verdict === "APPROVE_WITH_CONDITIONS") return rgb(0.1, 0.45, 0.24);
  if (verdict === "WATCHLIST") return rgb(0.67, 0.42, 0.06);
  return rgb(0.64, 0.17, 0.17);
}

export async function renderLenderReportPdf(context: FieldReportContext, report: GeneratedLenderReport): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const fontSize = 11;
  const lineHeight = 16;
  const maxChars = 88;

  const lines: string[] = [];
  const prediction = context.yield.latestSnapshot;

  addSection(lines, "Agri-Lending Intelligence Memo", [
    `Generated at: ${report.generatedAt}`,
    `Field: ${context.field.name} (${context.field.id.slice(0, 10)}...)`,
    `Location: ${context.field.location}`,
    `Area: ${context.field.hectares} ha`,
    `Provider: ${report.provider.name} / ${report.provider.model}`,
    `Underwriting verdict: ${verdictLabel(report.underwritingVerdict)}`,
  ]);

  addSection(lines, "Headline", wrapText(report.headline, maxChars));
  addSection(lines, "Executive Summary", wrapText(report.executiveSummary, maxChars));

  addSection(
    lines,
    "Financial Highlights",
    report.financialHighlights.length > 0
      ? report.financialHighlights.flatMap((item) => wrapText(`- ${item}`, maxChars))
      : ["- No highlights returned."],
  );

  addSection(
    lines,
    "Risk Flags",
    report.riskFlags.length > 0 ? report.riskFlags.flatMap((item) => wrapText(`- ${item}`, maxChars)) : ["- None"],
  );

  addSection(
    lines,
    "Scenario Analysis",
    [
      ...wrapText(`Base case: ${report.scenarioAnalysis.baseCase}`, maxChars),
      ...wrapText(`Downside case: ${report.scenarioAnalysis.downsideCase}`, maxChars),
      ...wrapText(`Upside case: ${report.scenarioAnalysis.upsideCase}`, maxChars),
    ],
  );

  addSection(
    lines,
    "Actions",
    report.actions.length > 0 ? report.actions.flatMap((item) => wrapText(`- ${item}`, maxChars)) : ["- No actions returned."],
  );

  addSection(lines, "Recommendation", wrapText(report.recommendation, maxChars));
  addSection(
    lines,
    "Narrative",
    report.narrative.length > 0 ? report.narrative.flatMap((item) => wrapText(`- ${item}`, maxChars)) : ["- No narrative returned."],
  );

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

  const firstPage = pdf.getPages()[0];
  firstPage.drawRectangle({
    x: 0,
    y: 742,
    width: 612,
    height: 50,
    color: rgb(0.07, 0.2, 0.14),
  });
  firstPage.drawText("Bank Underwriting Report", {
    x: margin,
    y: 760,
    size: 17,
    font: bold,
    color: rgb(0.97, 0.99, 0.98),
  });
  firstPage.drawRectangle({
    x: 442,
    y: 748,
    width: 126,
    height: 22,
    color: verdictColor(report.underwritingVerdict),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0.4,
  });
  firstPage.drawText(verdictLabel(report.underwritingVerdict), {
    x: 452,
    y: 754,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });

  y = 730;

  for (const line of lines) {
    if (y <= margin) {
      const nextPage = pdf.addPage([612, 792]);
      nextPage.drawRectangle({
        x: 0,
        y: 770,
        width: 612,
        height: 22,
        color: rgb(0.07, 0.2, 0.14),
      });
      y = 748;
    }

    const activePage = pdf.getPages()[pdf.getPages().length - 1];

    if (line === "") {
      y -= lineHeight;
      continue;
    }

    const isHeader =
      line === "Agri-Lending Intelligence Memo" ||
      line === "Headline" ||
      line === "Executive Summary" ||
      line === "Financial Highlights" ||
      line === "Risk Flags" ||
      line === "Scenario Analysis" ||
      line === "Actions" ||
      line === "Recommendation" ||
      line === "Narrative" ||
      line === "Internal Metrics" ||
      line === "External Citations";

    if (isHeader) {
      activePage.drawRectangle({
        x: margin - 6,
        y: y - 4,
        width: 520,
        height: 18,
        color: rgb(0.92, 0.96, 0.94),
      });
    }

    activePage.drawText(line, {
      x: margin,
      y,
      size: isHeader ? 13 : fontSize,
      font: isHeader ? bold : font,
      color: isHeader ? rgb(0.08, 0.25, 0.18) : rgb(0.11, 0.11, 0.11),
    });

    y -= isHeader ? lineHeight + 2 : lineHeight;
  }

  return pdf.save();
}
