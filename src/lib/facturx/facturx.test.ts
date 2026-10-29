// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AFRelationship, PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { formatCents, sumCents, toCents, toUnits } from "./decimal";
import { extractInvoiceXml } from "./extract";
import { parseCii } from "./parse";
import { checkInvoice } from "./rules";

const xml = readFileSync(join(import.meta.dirname, "__fixtures__/en16931.xml"), "utf-8");

async function pdfWith(attachments: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  for (const [name, content] of Object.entries(attachments)) {
    await doc.attach(new TextEncoder().encode(content), name, {
      mimeType: "text/xml",
      afRelationship: AFRelationship.Data,
    });
  }
  return doc.save();
}

const failures = (source: string) =>
  checkInvoice(parseCii(source)).filter((r) => r.status === "error").map((r) => r.id);

describe("decimal", () => {
  it("adds amounts without floating-point drift", () => {
    expect(formatCents(sumCents(["0.10", "0.20"]))).toBe("0.30");
  });

  it("rounds half-cents toward +infinity, like XPath round()", () => {
    expect(toCents(toUnits("1.005"))).toBe(101n);
    expect(toCents(toUnits("-1.005"))).toBe(-100n);
  });

  it("rejects text that is not an amount", () => {
    expect(() => toUnits("12,50")).toThrow("Montant illisible");
  });
});

describe("extractInvoiceXml", () => {
  it("finds factur-x.xml among the attachments", async () => {
    const pdf = await pdfWith({ "notes.txt": "hello", "factur-x.xml": xml });
    const found = await extractInvoiceXml(pdf);
    expect(found.fileName).toBe("factur-x.xml");
    expect(found.afRelationship).toBe("Data");
    expect(found.xml).toContain("F-2026-0042");
  });

  it("explains when the PDF has no invoice XML", async () => {
    await expect(extractInvoiceXml(await pdfWith({}))).rejects.toThrow("aucune pièce jointe");
    await expect(extractInvoiceXml(await pdfWith({ "notes.txt": "x" }))).rejects.toThrow(
      "pièces jointes : notes.txt",
    );
  });

  it("rejects a file that is not a PDF", async () => {
    await expect(extractInvoiceXml(new TextEncoder().encode("hello"))).rejects.toThrow(
      "pas un PDF",
    );
  });
});

describe("parseCii", () => {
  it("reads the header, parties, lines and totals", () => {
    const invoice = parseCii(xml);
    expect(invoice.profile).toBe("EN 16931");
    expect(invoice.number).toBe("F-2026-0042");
    expect(invoice.issueDate).toBe("2026-10-15");
    expect(invoice.seller.legalId).toEqual({ value: "000000001", scheme: "0002" });
    expect(invoice.seller.vatId).toBe("FR00000000001");
    expect(invoice.buyer.address?.city).toBe("Lyon");
    expect(invoice.lines).toHaveLength(2);
    expect(invoice.lines[0]).toMatchObject({ quantity: "2", unitCode: "DAY", netAmount: "900.00" });
    expect(invoice.totals).toMatchObject({ taxTotal: "204.02", duePayable: "1224.12" });
  });

  it("rejects malformed XML and other formats", () => {
    expect(() => parseCii("<a>")).toThrow("mal formé");
    expect(() => parseCii("<Invoice xmlns='urn:oasis:names:specification:ubl:schema:xsd:Invoice-2'/>")).toThrow(
      "Format non pris en charge",
    );
  });
});

describe("checkInvoice", () => {
  it("passes a consistent invoice", () => {
    expect(failures(xml)).toEqual([]);
  });

  it("catches a line total that does not match the lines", () => {
    const broken = xml.replace("<ram:LineTotalAmount>120.10<", "<ram:LineTotalAmount>120.00<");
    const result = checkInvoice(parseCii(broken)).find((r) => r.id === "BR-CO-10");
    expect(result).toMatchObject({ status: "error", detail: "Attendu 1020.00, trouvé 1020.10." });
  });

  it("catches a wrong grand total and a wrong amount due", () => {
    const broken = xml.replace(/<ram:GrandTotalAmount>1224.12</, "<ram:GrandTotalAmount>1224.21<");
    expect(failures(broken)).toEqual(["BR-CO-15", "BR-CO-16"]);
  });

  it("accepts an invoice without VAT where TTC equals HT", () => {
    const exempt = xml
      .replace(/<ram:TaxTotalAmount[^>]*>204.02<\/ram:TaxTotalAmount>/, "")
      .replaceAll("1224.12", "1020.10");
    expect(failures(exempt)).toEqual([]);
  });

  it("reports missing mandatory fields", () => {
    expect(failures(xml.replace("<ram:Name>Client Fictif SAS</ram:Name>", ""))).toEqual(["BR-07"]);
  });

  it("does not count EXTENDED sub-lines twice", () => {
    const subLine = `<ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>1.1</ram:LineID>
        <ram:ParentLineID>1</ram:ParentLineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedLineTradeSettlement>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>900.00</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
    const withSubLine = xml.replace(
      "<ram:ApplicableHeaderTradeAgreement>",
      `${subLine}<ram:ApplicableHeaderTradeAgreement>`,
    );
    expect(parseCii(withSubLine).lines).toHaveLength(3);
    expect(failures(withSubLine)).toEqual([]);
  });

  it("does not check lines, addresses and VAT breakdown on a MINIMUM invoice", () => {
    const minimum = xml.replace("urn:cen.eu:en16931:2017<", "urn:factur-x.eu:1p0:minimum<");
    const skipped = checkInvoice(parseCii(minimum)).filter((r) => r.status === "skipped");
    expect(skipped.map((r) => r.id)).toEqual([
      "BR-08", "BR-09", "BR-10", "BR-11", "BR-12", "BR-16", "BR-CO-10", "BR-CO-13", "BR-CO-14",
    ]);
  });
});
