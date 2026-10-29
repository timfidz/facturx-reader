// Builds public/exemple-facture.pdf from the test fixture: a readable page
// with the XML attached as factur-x.xml. It is not a certified PDF/A-3 file.
import { readFileSync, writeFileSync } from "node:fs";
import { AFRelationship, PDFDocument, StandardFonts } from "@cantoo/pdf-lib";

const xml = readFileSync("src/lib/facturx/__fixtures__/en16931.xml");

const doc = await PDFDocument.create();
doc.setTitle("Facture F-2026-0042 (exemple fictif)");
const page = doc.addPage([595, 842]);
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);

const lines = [
  [bold, 18, "Facture F-2026-0042"],
  [font, 10, "Exemple fictif : noms, numéros et adresses sont inventés."],
  [font, 11, ""],
  [bold, 11, "Atelier Exemple SARL"],
  [font, 11, "1 rue de l'Exemple, 75001 Paris"],
  [font, 11, ""],
  [bold, 11, "Facturé à : Client Fictif SAS"],
  [font, 11, "2 place du Test, 69001 Lyon"],
  [font, 11, ""],
  [font, 11, "Développement d'une page de réservation   2 jours x 450,00 €   900,00 €"],
  [font, 11, "Hébergement, un an                         1 x 120,10 €          120,10 €"],
  [font, 11, ""],
  [font, 11, "Total HT 1 020,10 €   TVA 20 % 204,02 €"],
  [bold, 12, "Net à payer 1 224,12 €"],
];
let y = 780;
for (const [f, size, text] of lines) {
  page.drawText(text, { x: 56, y, size, font: f });
  y -= size + 8;
}

await doc.attach(xml, "factur-x.xml", {
  mimeType: "text/xml",
  description: "Factur-X invoice",
  afRelationship: AFRelationship.Data,
});

writeFileSync("public/exemple-facture.pdf", await doc.save());
console.log("public/exemple-facture.pdf written");
