import type { jsPDF } from "jspdf";
import type { Candidate, Election, Position } from "@/lib/types";
import { getDepartmentName } from "@/lib/utils";
import { toDate } from "@/lib/date";
import { formatPercentage, resolveWinners } from "@/lib/winners";

type TallyCandidate = Candidate & { voteCount: number };

export interface ResultsPdfInput {
  election: Election;
  positions: Position[];
  candidates: TallyCandidate[];
  voterCount: number;
  eligibleVoterCount: number;
  positionVoterCounts: Record<string, number>;
  positionAbstainCounts: Record<string, number>;
}

interface LoadedImage {
  data: string;
  width: number;
  height: number;
}

const LOGO_SRC = "/gdg-logo.jpg";

// A4 portrait, in mm.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 14;
const PHOTO = 18;
const ROW_H = PHOTO + 4;

const GOLD: [number, number, number] = [184, 150, 46];
const CHARCOAL: [number, number, number] = [31, 31, 31];
const GRAY: [number, number, number] = [107, 107, 107];
const LIGHT: [number, number, number] = [229, 224, 208];

/**
 * Load an image as a JPEG data URL. With `square`, it is cover-cropped to a
 * `square`×`square` thumbnail to keep the PDF small. Resolves null on failure.
 */
const loadImage = (src: string, square?: number): Promise<LoadedImage | null> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return resolve(null);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        if (square) {
          canvas.width = square;
          canvas.height = square;
          const side = Math.min(w, h);
          ctx.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, square, square);
        } else {
          canvas.width = w;
          canvas.height = h;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
        }
        resolve({
          data: canvas.toDataURL("image/jpeg", 0.8),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        // Tainted canvas (no CORS headers) or similar.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatLevel = (level: string) =>
  /^\d+$/.test(level) ? `${level} Level` : level;

const formatDateTime = (value: Election["startDate"]) =>
  toDate(value)?.toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) ?? "TBD";

const pct = (count: number, total: number) =>
  total > 0 ? `${((count / total) * 100).toFixed(2)}%` : "0.00%";

export const resultsPdfFilename = (election: Election) => {
  const name = election.title.replace(/[^\w\s-]/g, "").trim() || "Election";
  const date = new Date().toISOString().slice(0, 10);
  return `BabcockVotes - ${name} - Results - ${date}.pdf`;
};

export const exportResultsPdf = async (input: ResultsPdfInput) => {
  const {
    election,
    positions,
    candidates,
    voterCount,
    eligibleVoterCount,
    positionVoterCounts,
    positionAbstainCounts,
  } = input;

  const [{ jsPDF }, logo, photos] = await Promise.all([
    import("jspdf"),
    loadImage(LOGO_SRC),
    Promise.all(
      candidates.map(async (c) =>
        [c.id, c.photoUrl ? await loadImage(c.photoUrl, 160) : null] as const,
      ),
    ),
  ]);
  const photoById = new Map(photos);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const setText = (size: number, color = CHARCOAL, style: "normal" | "bold" | "italic" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_H - MARGIN - FOOTER_H) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // --- Header: logo top-left, label top-right ---
  const logoW = 45;
  const logoH = logo ? (logo.height / logo.width) * logoW : 0;
  if (logo) doc.addImage(logo.data, "JPEG", MARGIN, y, logoW, logoH);

  setText(9, GOLD, "bold");
  doc.text("OFFICIAL RESULTS", PAGE_W - MARGIN, y + 4, { align: "right" });
  setText(8, GRAY);
  doc.text(
    `Exported ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
    PAGE_W - MARGIN,
    y + 9,
    { align: "right" },
  );

  y += Math.max(logoH, 10) + 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // --- Election details ---
  setText(20, CHARCOAL, "bold");
  const titleLines = doc.splitTextToSize(election.title, CONTENT_W);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 8;

  setText(10, GRAY);
  doc.text(`Department: ${getDepartmentName(election.departmentId)}`, MARGIN, y);
  y += 5;
  doc.text(
    `Election window: ${formatDateTime(election.startDate)} – ${formatDateTime(election.endDate)}`,
    MARGIN,
    y,
  );
  y += 5;
  if (election.minWinnerPercentage != null) {
    doc.text(
      `Minimum winning percentage: ${formatPercentage(election.minWinnerPercentage)} of a position's ballots`,
      MARGIN,
      y,
    );
    y += 5;
  }
  y += 2;

  if (election.description?.trim()) {
    setText(10, CHARCOAL);
    const descLines = doc.splitTextToSize(election.description.trim(), CONTENT_W);
    for (const line of descLines) {
      ensureSpace(5);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    y += 3;
  }

  // --- Summary row ---
  ensureSpace(20);
  const stats: [string, string][] = [
    ["Eligible voters", String(eligibleVoterCount)],
    ["Votes cast", String(voterCount)],
    ["Turnout", pct(voterCount, eligibleVoterCount)],
    ["Positions", String(positions.length)],
  ];
  const cellW = CONTENT_W / stats.length;
  doc.setFillColor(250, 247, 238);
  doc.rect(MARGIN, y, CONTENT_W, 16, "F");
  stats.forEach(([label, value], i) => {
    const x = MARGIN + cellW * i + cellW / 2;
    setText(13, CHARCOAL, "bold");
    doc.text(value, x, y + 7, { align: "center" });
    setText(7, GRAY);
    doc.text(label.toUpperCase(), x, y + 12, { align: "center" });
  });
  y += 24;

  // --- Candidate row ---
  const drawCandidate = (
    c: TallyCandidate,
    posTotal: number,
    tag: { label: string; winner: boolean },
  ) => {
    ensureSpace(ROW_H);
    const photo = photoById.get(c.id);
    if (photo) {
      doc.addImage(photo.data, "JPEG", MARGIN, y, PHOTO, PHOTO);
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN, y, PHOTO, PHOTO, "F");
      setText(11, GRAY, "bold");
      doc.text(initials(c.fullName), MARGIN + PHOTO / 2, y + PHOTO / 2 + 1.5, { align: "center" });
    }
    if (tag.winner) {
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.rect(MARGIN, y, PHOTO, PHOTO);
    }

    const textX = MARGIN + PHOTO + 5;

    // Tag pill
    setText(7, tag.winner ? [255, 255, 255] : GRAY, "bold");
    const tagW = doc.getTextWidth(tag.label) + 4;
    if (tag.winner) {
      doc.setFillColor(...GOLD);
      doc.rect(textX, y + 1, tagW, 4.5, "F");
    } else {
      doc.setDrawColor(...LIGHT);
      doc.setLineWidth(0.3);
      doc.rect(textX, y + 1, tagW, 4.5);
    }
    doc.text(tag.label, textX + 2, y + 4.3);

    setText(12, CHARCOAL, "bold");
    doc.text(c.fullName, textX, y + 10.5);

    setText(9, GRAY);
    doc.text(
      `${getDepartmentName(c.departmentId)} · ${formatLevel(c.level)}`,
      textX,
      y + 15.5,
    );

    setText(12, CHARCOAL, "bold");
    doc.text(pct(c.voteCount, posTotal), PAGE_W - MARGIN, y + 8, { align: "right" });
    setText(9, GRAY);
    doc.text(`${c.voteCount} vote${c.voteCount === 1 ? "" : "s"}`, PAGE_W - MARGIN, y + 13, {
      align: "right",
    });

    y += ROW_H;
  };

  // --- Positions ---
  for (const position of positions) {
    const cands = candidates
      .filter((c) => c.positionId === position.id)
      .sort((a, b) => b.voteCount - a.voteCount);
    const posTotal = positionVoterCounts[position.id] ?? 0;
    const abstain = positionAbstainCounts[position.id] ?? 0;

    const { winners, others: runnersUp, belowMinimum } = resolveWinners(
      cands,
      posTotal,
      election.minWinnerPercentage,
    );
    const isTie = winners.length > 1;

    // Keep the heading with at least its first candidate.
    ensureSpace(14 + ROW_H);
    setText(13, CHARCOAL, "bold");
    doc.text(position.title, MARGIN, y);
    setText(8, GRAY);
    doc.text(`${posTotal} ballot${posTotal === 1 ? "" : "s"}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 2;
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;

    if (cands.length === 0) {
      setText(9, GRAY, "italic");
      doc.text("No candidates.", MARGIN, y + 3);
      y += 10;
      continue;
    }

    if (belowMinimum) {
      ensureSpace(8);
      setText(9, [185, 28, 28], "bold");
      doc.text(
        `No winner`,
        MARGIN,
        y + 2,
      );
      y += 8;
    }

    for (const w of winners) {
      drawCandidate(w, posTotal, { label: isTie ? "WINNER (TIE)" : "WINNER", winner: true });
    }

    if (runnersUp.length > 0) {
      ensureSpace(6 + ROW_H);
      setText(8, GRAY, "bold");
      doc.text(winners.length > 0 ? "RUNNERS-UP" : "RANKING", MARGIN, y + 3);
      y += 6;
      runnersUp.forEach((c, i) => {
        // Rank counts the winners above.
        drawCandidate(c, posTotal, { label: `#${winners.length + i + 1}`, winner: false });
      });
    }

    ensureSpace(8);
    setText(9, GRAY, "italic");
    doc.text("Abstain", MARGIN, y + 3);
    doc.text(`${abstain} (${pct(abstain, posTotal)})`, PAGE_W - MARGIN, y + 3, { align: "right" });
    y += 12;
  }

  // --- Methodology note ---
  ensureSpace(10);
  setText(7.5, GRAY, "italic");
  doc.text(
    doc.splitTextToSize(
      "* Percentages are calculated from the total ballots cast for each position, including abstentions.",
      CONTENT_W,
    ),
    MARGIN,
    y,
  );

  // --- Footer on every page ---
  drawFooters(doc);

  doc.save(resultsPdfFilename(election));
};

const drawFooters = (doc: jsPDF) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const fy = PAGE_H - MARGIN + 2;
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, fy - 5, PAGE_W - MARGIN, fy - 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Conducted on Babcock Votes · babcockvotes.com", MARGIN, fy);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, fy, { align: "right" });
  }
};
