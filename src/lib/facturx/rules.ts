import { centsOf, formatCents, sumCents } from "./decimal";
import type { Invoice } from "./parse";

// A subset of the EN 16931 business rules, written from the official CII
// Schematron (github.com/ConnectingEurope/eInvoicing-EN16931, EUPL 1.2).

export type RuleResult = {
  id: string;
  label: string;
  status: "ok" | "error" | "skipped";
  detail?: string;
};

type Rule = {
  id: string;
  label: string;
  /** Profiles that do not carry what the rule checks. */
  skipFor?: string[];
  /** Returns why the invoice breaks the rule, or null when it complies. */
  check: (invoice: Invoice) => string | null;
};

// MINIMUM and BASIC WL have no invoice lines.
const NO_LINES = ["MINIMUM", "BASIC WL"];

const required = (value: unknown, what: string) => (value ? null : `${what} absent.`);

function mismatch(expected: bigint, found: string): string | null {
  const actual = centsOf(found);
  return actual === expected
    ? null
    : `Attendu ${formatCents(expected)}, trouvé ${formatCents(actual)}.`;
}

const RULES: Rule[] = [
  { id: "BR-01", label: "Identifiant du profil (BT-24)", check: (i) => required(i.guidelineId, "Identifiant") },
  { id: "BR-02", label: "Numéro de facture (BT-1)", check: (i) => required(i.number, "Numéro") },
  { id: "BR-03", label: "Date d'émission (BT-2)", check: (i) => required(i.issueDate, "Date") },
  { id: "BR-04", label: "Type de document (BT-3)", check: (i) => required(i.typeCode, "Type") },
  { id: "BR-05", label: "Devise (BT-5)", check: (i) => required(i.currency, "Devise") },
  { id: "BR-06", label: "Nom du vendeur (BT-27)", check: (i) => required(i.seller.name, "Nom") },
  { id: "BR-07", label: "Nom de l'acheteur (BT-44)", check: (i) => required(i.buyer.name, "Nom") },
  {
    id: "BR-08",
    label: "Adresse du vendeur (BG-5)",
    skipFor: NO_LINES,
    check: (i) => required(i.seller.address, "Adresse"),
  },
  {
    id: "BR-09",
    label: "Pays du vendeur (BT-40)",
    skipFor: NO_LINES,
    check: (i) => required(i.seller.address?.country, "Code pays"),
  },
  {
    id: "BR-10",
    label: "Adresse de l'acheteur (BG-8)",
    skipFor: NO_LINES,
    check: (i) => required(i.buyer.address, "Adresse"),
  },
  {
    id: "BR-11",
    label: "Pays de l'acheteur (BT-55)",
    skipFor: NO_LINES,
    check: (i) => required(i.buyer.address?.country, "Code pays"),
  },
  {
    id: "BR-12",
    label: "Total des lignes (BT-106)",
    skipFor: NO_LINES,
    check: (i) => required(i.totals.lineTotal, "Montant"),
  },
  { id: "BR-13", label: "Total HT (BT-109)", check: (i) => required(i.totals.taxBasisTotal, "Montant") },
  { id: "BR-14", label: "Total TTC (BT-112)", check: (i) => required(i.totals.grandTotal, "Montant") },
  { id: "BR-15", label: "Net à payer (BT-115)", check: (i) => required(i.totals.duePayable, "Montant") },
  {
    id: "BR-16",
    label: "Au moins une ligne (BG-25)",
    skipFor: NO_LINES,
    check: (i) => (i.lines.length > 0 ? null : "Aucune ligne de facture."),
  },
  {
    id: "BR-CO-10",
    label: "Total des lignes = somme des montants nets des lignes",
    skipFor: NO_LINES,
    check: ({ lines, totals }) => {
      if (!totals.lineTotal) return "Total des lignes absent.";
      const missing = lines.filter((l) => !l.netAmount).length;
      if (missing) return `${missing} ligne(s) sans montant net.`;
      // EXTENDED sub-lines are already counted in their parent group line.
      const topLevel = lines.filter((l) => !l.parentId);
      return mismatch(sumCents(topLevel.map((l) => l.netAmount!)), totals.lineTotal);
    },
  },
  {
    id: "BR-CO-13",
    label: "Total HT = total des lignes − remises + frais",
    skipFor: NO_LINES,
    check: ({ totals }) => {
      if (!totals.lineTotal || !totals.taxBasisTotal) return "Total des lignes ou total HT absent.";
      const expected =
        centsOf(totals.lineTotal) -
        centsOf(totals.allowanceTotal ?? "0") +
        centsOf(totals.chargeTotal ?? "0");
      return mismatch(expected, totals.taxBasisTotal);
    },
  },
  {
    id: "BR-CO-14",
    label: "Total TVA = somme des montants de TVA par taux",
    skipFor: ["MINIMUM"],
    check: ({ totals, vat }) => {
      // The Schematron only checks a VAT total stated in the invoice currency.
      if (!totals.taxTotal) return null;
      const missing = vat.filter((v) => !v.amount).length;
      if (missing) return `${missing} taux de TVA sans montant.`;
      return mismatch(sumCents(vat.map((v) => v.amount!)), totals.taxTotal);
    },
  },
  {
    id: "BR-CO-15",
    label: "Total TTC = total HT + total TVA",
    check: ({ totals }) => {
      if (!totals.taxBasisTotal || !totals.grandTotal) return "Total HT ou total TTC absent.";
      const basis = centsOf(totals.taxBasisTotal);
      // Without VAT (e.g. VAT exemption), the Schematron accepts TTC = HT.
      if (centsOf(totals.grandTotal) === basis) return null;
      return mismatch(basis + centsOf(totals.taxTotal ?? "0"), totals.grandTotal);
    },
  },
  {
    id: "BR-CO-16",
    label: "Net à payer = total TTC − acomptes + arrondi",
    check: ({ totals }) => {
      if (!totals.grandTotal || !totals.duePayable) return "Total TTC ou net à payer absent.";
      const expected =
        centsOf(totals.grandTotal) -
        centsOf(totals.prepaid ?? "0") +
        centsOf(totals.rounding ?? "0");
      return mismatch(expected, totals.duePayable);
    },
  },
];

export function checkInvoice(invoice: Invoice): RuleResult[] {
  return RULES.map(({ id, label, skipFor, check }) => {
    if (invoice.profile && skipFor?.includes(invoice.profile)) {
      return { id, label, status: "skipped", detail: `Non contrôlé pour le profil ${invoice.profile}.` };
    }
    try {
      const detail = check(invoice);
      return detail ? { id, label, status: "error", detail } : { id, label, status: "ok" };
    } catch (error) {
      return { id, label, status: "error", detail: (error as Error).message };
    }
  });
}
