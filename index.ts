import { readCSV } from "https://deno.land/x/csv@v0.7.5/mod.ts";

/* My best guess: The import expects ISO-8859-1.
 * Which convieniently maps +/- to the first 255 individual charCode()s
 * Also strips replacement characters without throwing an error
 */
const encodeISO88591 = (text: string): Uint8Array =>
  text.split("").reduce((arr, char) => {
    const charCode = char.charCodeAt(0);

    // Replacement character
    if (charCode === 65533) return arr;

    if (
      charCode > 0xFF || charCode < 0x0 || (charCode > 0x7E && charCode < 0xA0)
    ) {
      throw new Error(
        `Invalid character code ${charCode} (${char}) for ISO-8859-1`,
      );
    }
    return new Uint8Array([...arr, charCode]);
  }, new Uint8Array());

const abortWithError = (msg: string) => {
  console.log("");
  console.error(msg);
  console.log("");
  Deno.exit(1);
};

type Arbeitgeber = {
  name: string;
  strasse: string;
  postfach: string;
  plz: number;
  ort: string;
  land: string;
  telefon: string;
  kontaktVorname: string;
  kontaktNachname: string;
  kontaktTelefon: string;
};

const ensureString = (label: string): string => {
  const value = prompt(label);
  if (value === undefined || value === null || value === "") {
    abortWithError(`Error: ${label} ist nicht optional.`);
  }
  return value as string;
};
const ensureNumber = (label: string): number => {
  const value = ensureString(label);
  const number = parseInt(value);
  if (isNaN(number)) {
    abortWithError(`Error: ${label} ist keine Zahl.`);
  }
  return number;
};

const openFile = async (path: string): Promise<Deno.FsFile> =>
  await Deno.open(path, { create: false, read: true });

console.log("Datei Daten Lohnausweise");
const csvPath = prompt("Pfad zur .csv Datei: ", "Vorlage.csv");
let csv: Deno.FsFile;
try {
  csv = await openFile(csvPath as string);
} catch (_error) {
  abortWithError(`Error: Datei ${csvPath} konnte nicht geöffnet werden.`);
}

const csvHasHeaders =
  prompt("Hat die .csv Datei eine Kopfzeile? (y/n): ", "y") === "n"
    ? false
    : true;

console.log("");
console.log("Dateneingabe Arbeitgeber");
console.log("Mit * gekennzeichnete Felder sind Pflichtfelder");
console.log("=========================");
const agName = ensureString("Name des Arbeitgebers *:");
const agStrasse = ensureString("Strasse (inkl. Nr.) *:");
const agPostfach = prompt("Postfach:", "");
const agPlz = ensureNumber("PLZ (numerisch) *:");
const agOrt = ensureString("Ort *:");
const agLand = prompt("Land:", "Schweiz");
const agTelefon = prompt("Telefon:");
const agKontaktVorname = ensureString("Kontakt Arbeitgeber Vorname *:");
const agKontaktName = ensureString("Kontakt Arbeitgeber Name *:");
const agKontaktTelefon = ensureString(
  "Kontakt Arbeitgeber Telefon *:",
);

const arbeitgeber: Arbeitgeber = {
  name: agName,
  strasse: agStrasse,
  postfach: agPostfach || "",
  plz: agPlz,
  ort: agOrt,
  land: agLand || "",
  telefon: agTelefon || "",
  kontaktVorname: agKontaktVorname,
  kontaktNachname: agKontaktName,
  kontaktTelefon: agKontaktTelefon,
};

enum CsvRowType {
  "Arbeitgeber" = 1,
  "Arbeitnehmer" = 2,
  "Ausweis" = 3,
}

const csvRows: Array<Array<string>> = [];

csvRows.push(
  [
    CsvRowType.Arbeitgeber.toString(),
    ...Object.values(arbeitgeber).map((v) => v.toString()),
  ],
);

let currentRow = -1;
for await (const row of readCSV(csv!, { encoding: "UTF-8" })) {
  const currentEmployee: Array<string> = [CsvRowType.Arbeitnehmer.toString()];
  const currentSlip: Array<string> = [CsvRowType.Ausweis.toString()];
  let isProcessingEmployee = true;

  currentRow++;
  if (currentRow === 0 && csvHasHeaders) continue;

  let cellCount = 0;
  for await (const cell of row) {
    cellCount++;
    if (cell.toLowerCase() === "sr" || cell.toLowerCase() === "ar") {
      isProcessingEmployee = false;
    }
    if (isProcessingEmployee) {
      currentEmployee.push(cell);
    } else {
      currentSlip.push(cell);
    }
  }

  if (cellCount < 3) continue;

  if (currentEmployee.length !== 12) {
    console.error(
      "Error: Invalid employee row, expected 12 fields, read " +
        currentEmployee.length,
      currentEmployee,
    );
    continue;
  }
  if (currentSlip.length !== 35) {
    console.error(
      "Error: Invalid slip row, expected 35 fields, read " +
        currentSlip.length,
      currentSlip,
    );
    continue;
  }

  csvRows.push(currentEmployee, currentSlip);
}

const output = Deno.openSync(`output.csv`, {
  write: true,
  create: true,
  truncate: true,
});

await output.write(
  encodeISO88591(
    csvRows.map((row) => row.join(";")).join("\r\n"),
  ),
);
