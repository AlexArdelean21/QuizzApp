/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs/promises");
const path = require("node:path");
const ExcelJS = require("exceljs");

const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, "import_supabase.csv");

// Columns B..K (Excel indices 2..11) hold up to 10 answer variants.
const MIN_VARIANT_COL = 2;
const MAX_VARIANT_COL = 11;
const MAX_VARIANTS = MAX_VARIANT_COL - MIN_VARIANT_COL + 1; // 10
const OPTION_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

function cellValueToText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
    if (value.text != null) return String(value.text);
    if (value.result != null) return String(value.result);
    if (value.hyperlink != null && value.text != null) return String(value.text);
  }

  return String(value);
}

function normalizeText(value) {
  return cellValueToText(value).replace(/\s+/g, " ").trim();
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function hasFill(cell) {
  const fill = cell?.fill;
  if (!fill) return false;

  if (fill.type === "pattern") {
    if (!fill.pattern || fill.pattern === "none") return false;
    return true;
  }

  if (fill.type === "gradient") {
    return true;
  }

  return false;
}

/**
 * Returns every label (a..j) whose corresponding answer cell has any kind
 * of background fill. A cell is considered "marked correct" iff it has a
 * non-empty fill, regardless of color — the convention is that the import
 * spreadsheet colors only the correct answer cells.
 */
function detectCorrectAnswers(row, variantCount) {
  const labels = [];
  for (let i = 0; i < variantCount; i++) {
    const cell = row.getCell(MIN_VARIANT_COL + i);
    if (hasFill(cell)) {
      labels.push(OPTION_LABELS[i]);
    }
  }
  return labels;
}

/**
 * Reads the actual variant texts from one Excel row. Trailing empty
 * variant cells are ignored so a 3-option row doesn't generate fake
 * empty D..J entries, and a 5-option row stops at the last filled cell.
 */
function readVariants(row) {
  const variants = [];
  let lastNonEmpty = -1;
  for (let i = 0; i < MAX_VARIANTS; i++) {
    const text = normalizeText(row.getCell(MIN_VARIANT_COL + i).value);
    variants.push(text);
    if (text) lastNonEmpty = i;
  }
  if (lastNonEmpty < 0) return [];
  return variants.slice(0, lastNonEmpty + 1);
}

async function getXlsxFilesFromRoot() {
  const entries = await fs.readdir(PROJECT_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".xlsx"))
    .filter((name) => !name.startsWith("~$"))
    .sort((a, b) => a.localeCompare(b, "ro"));
}

/**
 * Serializes a JS string array as a Postgres `text[]` literal that
 * pg_copy / Supabase CSV import will accept (e.g. {a,b,c}). Embedded
 * commas, quotes, and backslashes are escaped per Postgres array
 * conventions.
 */
function toPgTextArray(values) {
  const escaped = values.map((value) => {
    const safe = String(value)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    return `"${safe}"`;
  });
  return `{${escaped.join(",")}}`;
}

async function processWorkbook(filePath, rowsOut) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const intrebareText = normalizeText(row.getCell(1).value);
      const variants = readVariants(row);

      if (!intrebareText && variants.length === 0) {
        return;
      }

      if (variants.length < 2) {
        console.warn(
          `[WARN] Mai putin de 2 variante in ${path.basename(filePath)} / sheet "${sheet.name}" / rand ${row.number} — sarit.`
        );
        return;
      }

      const corectArr = detectCorrectAnswers(row, variants.length);
      if (corectArr.length === 0) {
        console.warn(
          `[WARN] Fara varianta colorata in ${path.basename(filePath)} / sheet "${sheet.name}" / rand ${row.number}`
        );
      }

      rowsOut.push({
        examen_id: "1",
        intrebare_text: intrebareText,
        variante: JSON.stringify(variants),
        raspunsuri_corecte: toPgTextArray(corectArr),
      });
    });
  }
}

async function main() {
  const xlsxFiles = await getXlsxFilesFromRoot();
  if (xlsxFiles.length === 0) {
    throw new Error("Nu am gasit fisiere .xlsx in radacina proiectului.");
  }

  const rows = [];
  for (const file of xlsxFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    console.log(`[INFO] Procesez ${file}`);
    await processWorkbook(filePath, rows);
  }

  const header = ["examen_id", "intrebare_text", "variante", "raspunsuri_corecte"];

  const csvLines = [header.join(",")];
  for (const row of rows) {
    csvLines.push(
      [row.examen_id, row.intrebare_text, row.variante, row.raspunsuri_corecte]
        .map(csvEscape)
        .join(",")
    );
  }

  await fs.writeFile(OUTPUT_FILE, `${csvLines.join("\n")}\n`, "utf8");
  console.log(`[DONE] Am generat ${OUTPUT_FILE} cu ${rows.length} intrebari.`);
  console.log(
    "[NOTE] In Supabase: importati CSV-ul si setati tipul coloanei `variante` ca jsonb si `raspunsuri_corecte` ca text[]."
  );
}

main().catch((error) => {
  console.error("[ERROR]", error.message);
  process.exitCode = 1;
});
