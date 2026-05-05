const fs = require("node:fs/promises");
const path = require("node:path");
const ExcelJS = require("exceljs");

const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, "import_supabase.csv");

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

function detectCorrectAnswer(row) {
  if (hasFill(row.getCell(2))) return "a";
  if (hasFill(row.getCell(3))) return "b";
  if (hasFill(row.getCell(4))) return "c";
  return "";
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

async function processWorkbook(filePath, rowsOut) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const intrebareText = normalizeText(row.getCell(1).value);
      const variantaA = normalizeText(row.getCell(2).value);
      const variantaB = normalizeText(row.getCell(3).value);
      const variantaC = normalizeText(row.getCell(4).value);

      if (!intrebareText && !variantaA && !variantaB && !variantaC) {
        return;
      }

      const raspunsCorect = detectCorrectAnswer(row);
      if (!raspunsCorect) {
        console.warn(
          `[WARN] Fara varianta colorata in ${path.basename(filePath)} / sheet "${sheet.name}" / rand ${row.number}`
        );
      }

      rowsOut.push([
        "1",
        intrebareText,
        variantaA,
        variantaB,
        variantaC,
        raspunsCorect,
      ]);
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

  const header = [
    "examen_id",
    "intrebare_text",
    "varianta_a",
    "varianta_b",
    "varianta_c",
    "raspuns_corect",
  ];

  const csvLines = [header.join(",")];
  for (const row of rows) {
    csvLines.push(row.map(csvEscape).join(","));
  }

  await fs.writeFile(OUTPUT_FILE, `${csvLines.join("\n")}\n`, "utf8");
  console.log(`[DONE] Am generat ${OUTPUT_FILE} cu ${rows.length} intrebari.`);
}

main().catch((error) => {
  console.error("[ERROR]", error.message);
  process.exitCode = 1;
});
