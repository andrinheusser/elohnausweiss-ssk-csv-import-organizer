# eLohnausweis-SSK.ch CSV Import Organizer

Generates the expected CSV File in the expected row format

- 1 Arbeitgeber
- 2 Arbeitnehmer
- 3 Lohn/Rente
- 2 Arbeitnehmer
- 3 Lohn/Rente
- ...

from (an excel-exported utf8) csv with row format

- Arbeitnehmer & Lohn/Rente
- Arbeitnehmer & Lohn/Rente
- ...

For the specific expected format, see Vorlage.csv

## Usage

Download the executable under dist/ (and the Excel/CSV Vorlage if needed)

Run `deno run index.ts` and enter Input and Arbeitgeber Data.

The created `output.csv` file is ready for upload.

### Executable

An executable is provided in `/dist` if you do not have/want deno installed. 






