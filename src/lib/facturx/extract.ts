import { PDFDocument } from "@cantoo/pdf-lib";

// Names used for the embedded XML by Factur-X, ZUGFeRD 2 and XRechnung, in order of preference:
// some PDFs of 2017 carry a ZUGFeRD 1.0 "ZUGFeRD-invoice.xml" next to their factur-x.xml.
const INVOICE_XML_NAMES = ["factur-x.xml", "zugferd-invoice.xml", "xrechnung.xml"];

export type EmbeddedInvoice = {
  fileName: string;
  afRelationship: string | undefined;
  xml: string;
};

export async function extractInvoiceXml(pdf: Uint8Array): Promise<EmbeddedInvoice> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdf, { updateMetadata: false });
  } catch {
    throw new Error("Ce fichier n'est pas un PDF lisible.");
  }

  let attachments: ReturnType<PDFDocument["getAttachments"]>;
  try {
    attachments = doc.getAttachments();
  } catch {
    throw new Error("Ce PDF est abîmé : ses pièces jointes ne se lisent pas.");
  }
  const invoice = INVOICE_XML_NAMES.map((name) =>
    attachments.find((a) => a.name.toLowerCase() === name),
  ).find((a) => a !== undefined);
  if (!invoice) {
    const names = attachments.map((a) => a.name).join(", ");
    throw new Error(
      names
        ? `Aucune facture XML dans ce PDF (pièces jointes : ${names}).`
        : "Ce PDF ne contient aucune pièce jointe : ce n'est pas une facture Factur-X.",
    );
  }

  return {
    fileName: invoice.name,
    afRelationship: invoice.afRelationship,
    xml: new TextDecoder("utf-8").decode(invoice.data),
  };
}
