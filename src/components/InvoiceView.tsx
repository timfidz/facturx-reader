import type { Invoice, Party } from "@/lib/facturx/parse";
import type { RuleResult } from "@/lib/facturx/rules";

// UNTDID 1001 codes most used for BT-3.
const TYPE_LABELS: Record<string, string> = {
  "380": "Facture",
  "381": "Avoir",
  "384": "Facture rectificative",
  "386": "Facture d'acompte",
  "389": "Autofacture",
};

// SIREN and SIRET scheme identifiers (ISO 6523).
const LEGAL_SCHEMES: Record<string, string> = { "0002": "SIREN", "0009": "SIRET" };

function money(value: string | undefined, currency: string | undefined): string {
  if (value === undefined) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency ?? "EUR" }).format(
      Number(value),
    );
  } catch {
    return `${value} ${currency ?? ""}`;
  }
}

function decimal(value: string | undefined): string {
  return value === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(Number(value));
}

function PartyCard({ title, party }: { title: string; party: Party }) {
  const { address, legalId } = party;
  return (
    <section className="rounded-lg border border-line p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <p className="mt-1 font-medium">{party.name ?? "—"}</p>
      {address && (
        <p className="text-sm text-muted">
          {address.lines.join(", ")}
          {address.lines.length > 0 && <br />}
          {[address.postcode, address.city, address.country].filter(Boolean).join(" ")}
        </p>
      )}
      {legalId && (
        <p className="mt-2 text-sm">
          {LEGAL_SCHEMES[legalId.scheme ?? ""] ?? "Identifiant"} : {legalId.value}
        </p>
      )}
      {party.vatId && <p className="text-sm">TVA : {party.vatId}</p>}
    </section>
  );
}

const STATUS_STYLES = {
  ok: { mark: "✓", className: "text-ok" },
  error: { mark: "✕", className: "text-error" },
  skipped: { mark: "–", className: "text-muted" },
};

export function RuleList({ results }: { results: RuleResult[] }) {
  const errors = results.filter((r) => r.status === "error").length;
  return (
    <section>
      <h2 className="text-lg font-semibold">
        Contrôles EN 16931{" "}
        <span className={errors ? "text-error" : "text-ok"}>
          {errors ? `· ${errors} erreur${errors > 1 ? "s" : ""}` : "· aucune erreur"}
        </span>
      </h2>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {results.map((r) => (
          <li key={r.id} className="flex gap-3 px-4 py-2 text-sm">
            <span className={`w-4 shrink-0 font-bold ${STATUS_STYLES[r.status].className}`} aria-hidden>
              {STATUS_STYLES[r.status].mark}
            </span>
            <span className="w-20 shrink-0 font-mono text-muted">{r.id}</span>
            <span className="flex-1">
              {r.label}
              {r.detail && <span className={`block ${STATUS_STYLES[r.status].className}`}>{r.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InvoiceView({ invoice }: { invoice: Invoice }) {
  const { totals, currency } = invoice;
  const totalRows: [string, string | undefined][] = [
    ["Total des lignes", totals.lineTotal],
    ["Remises", totals.allowanceTotal],
    ["Frais", totals.chargeTotal],
    ["Total HT", totals.taxBasisTotal],
    ["TVA", totals.taxTotal],
    ["Total TTC", totals.grandTotal],
    ["Acomptes versés", totals.prepaid],
    ["Arrondi", totals.rounding],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm text-muted">
            {TYPE_LABELS[invoice.typeCode ?? ""] ?? `Document de type ${invoice.typeCode ?? "inconnu"}`}
          </p>
          <h2 className="text-2xl font-semibold">{invoice.number ?? "Sans numéro"}</h2>
          {invoice.issueDate && (
            <p className="text-sm text-muted">
              Émise le {new Date(invoice.issueDate).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" })}
            </p>
          )}
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-sm">
          Profil {invoice.profile ?? "inconnu"}
        </span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <PartyCard title="Vendeur" party={invoice.seller} />
        <PartyCard title="Acheteur" party={invoice.buyer} />
      </div>

      {invoice.lines.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Désignation</th>
                <th className="px-4 py-2 text-right font-medium">Qté</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Prix unitaire HT</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">TVA</th>
                <th className="px-4 py-2 text-right font-medium">Montant HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoice.lines.map((line, index) => (
                <tr key={index} className={line.parentId ? "text-muted" : undefined}>
                  <td className={`px-4 py-2 ${line.parentId ? "pl-8" : ""}`}>{line.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{decimal(line.quantity)}</td>
                  <td className="hidden px-4 py-2 text-right tabular-nums sm:table-cell">
                    {money(line.netPrice, currency)}
                  </td>
                  <td className="hidden px-4 py-2 text-right tabular-nums sm:table-cell">
                    {line.vatRate ? `${decimal(line.vatRate)} %` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(line.netAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        {totalRows
          .filter(([, value]) => value !== undefined)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right tabular-nums">{money(value, currency)}</dd>
            </div>
          ))}
        <dt className="border-t border-line pt-1 font-semibold">Net à payer</dt>
        <dd className="border-t border-line pt-1 text-right font-semibold tabular-nums">
          {money(totals.duePayable, currency)}
        </dd>
      </dl>
    </div>
  );
}
