import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";

export type Cell = string | number | null;
export type Grid = Cell[][];

const MAX_REPEAT = 40;

export async function readXlsx(buffer: Buffer): Promise<Record<string, Grid>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheets: Record<string, Grid> = {};
  workbook.eachSheet((sheet) => {
    const rows: Grid = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const cells: Cell[] = [];
      const width = Math.min(row.cellCount, 48);
      for (let column = 1; column <= width; column += 1) {
        cells.push(excelCell(row.getCell(column).value));
      }
      rows.push(cells);
    });
    sheets[sheet.name] = rows;
  });
  return sheets;
}

export function readOds(buffer: Buffer): Record<string, Grid> {
  const files = unzipSync(new Uint8Array(buffer));
  const content = files["content.xml"];
  if (!content) throw new Error("ODS is missing content.xml");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (name) =>
      name === "table" ||
      name === "table-row" ||
      name === "table-cell" ||
      name === "covered-table-cell" ||
      name === "p",
  });
  const doc = parser.parse(strFromU8(content)) as XmlNode;
  const tables = asArray(doc["document-content"]?.body?.spreadsheet?.table);
  const sheets: Record<string, Grid> = {};
  for (const table of tables) {
    const name = text(table["@_name"]);
    if (!name) continue;
    sheets[name] = odsRows(table);
  }
  return sheets;
}

function excelCell(value: ExcelJS.CellValue): Cell {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value) return excelCell(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
  }
  return null;
}

type XmlNode = {
  "document-content"?: { body?: { spreadsheet?: { table?: XmlTable | XmlTable[] } } };
};

type XmlTable = {
  "@_name"?: string;
  "table-row"?: XmlRow | XmlRow[];
};

type XmlRow = {
  "@_number-rows-repeated"?: string;
  "table-cell"?: XmlCell | XmlCell[];
};

type XmlCell = {
  "@_value-type"?: string;
  "@_value"?: string;
  "@_number-columns-repeated"?: string;
  p?: unknown;
};

function odsRows(table: XmlTable): Grid {
  const rows: Grid = [];
  for (const row of asArray(table["table-row"])) {
    const cells = odsCells(row);
    const requested = Number(row["@_number-rows-repeated"] ?? 1) || 1;
    const hasContent = cells.some((cell) => cell != null && cell !== "");
    const repeat = hasContent ? Math.min(requested, 30) : 1;
    for (let index = 0; index < repeat; index += 1) rows.push(cells);
    if (rows.length > 5000) break;
  }
  return rows;
}

function odsCells(row: XmlRow): Cell[] {
  const cells: Cell[] = [];
  for (const cell of asArray(row["table-cell"])) {
    const requested = Number(cell["@_number-columns-repeated"] ?? 1) || 1;
    const value = odsValue(cell);
    if (requested > MAX_REPEAT && value == null) continue;
    const repeat = Math.min(requested, MAX_REPEAT);
    for (let index = 0; index < repeat; index += 1) cells.push(value);
    if (cells.length > 48) break;
  }
  return cells;
}

function odsValue(cell: XmlCell): Cell {
  const type = cell["@_value-type"];
  if (type === "float" || type === "percentage" || type === "currency") {
    const parsed = Number(cell["@_value"]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const label = paragraphText(cell.p);
  if (type === "string" || label) return label || null;
  if (cell["@_value"]) return cell["@_value"];
  return null;
}

function paragraphText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(paragraphText).join(" ").trim();
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record["#text"] === "string") return record["#text"];
    if ("p" in record) return paragraphText(record.p);
  }
  return "";
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
