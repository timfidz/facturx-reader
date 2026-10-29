"use client";

import { useState } from "react";
import { extractInvoiceXml, type EmbeddedInvoice } from "@/lib/facturx/extract";
import { parseCii, type Invoice } from "@/lib/facturx/parse";
import { checkInvoice, type RuleResult } from "@/lib/facturx/rules";
import { InvoiceView, RuleList } from "./InvoiceView";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; fileName: string; embedded: EmbeddedInvoice; invoice: Invoice; results: RuleResult[] };

export function InvoiceReader() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [dragging, setDragging] = useState(false);

  async function read(fileName: string, bytes: Uint8Array) {
    setState({ status: "loading" });
    try {
      const embedded = await extractInvoiceXml(bytes);
      const invoice = parseCii(embedded.xml);
      setState({ status: "done", fileName, embedded, invoice, results: checkInvoice(invoice) });
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }

  async function readFile(file: File | undefined) {
    if (file) await read(file.name, new Uint8Array(await file.arrayBuffer()));
  }

  async function readSample() {
    const response = await fetch("exemple-facture.pdf");
    await read("exemple-facture.pdf", new Uint8Array(await response.arrayBuffer()));
  }

  return (
    <div className="space-y-8">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          readFile(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-line hover:border-accent"
        }`}
      >
        <span className="font-medium">Déposez une facture PDF ici, ou cliquez pour la choisir</span>
        <span className="text-sm text-muted">Le fichier est lu dans votre navigateur et n&apos;est envoyé nulle part.</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => readFile(e.target.files?.[0])}
        />
      </label>

      {state.status === "idle" && (
        <p className="text-center text-sm">
          Pas de facture sous la main ?{" "}
          <button type="button" onClick={readSample} className="text-accent underline underline-offset-4">
            Essayer avec un exemple
          </button>
        </p>
      )}

      <div aria-live="polite">
        {state.status === "loading" && <p className="text-center text-muted">Lecture…</p>}
        {state.status === "error" && (
          <p role="alert" className="rounded-lg border border-error/40 bg-error/5 p-4 text-error">
            {state.message}
          </p>
        )}
      </div>

      {state.status === "done" && (
        <div className="space-y-10">
          <p className="text-sm text-muted">
            {state.fileName} · XML intégré : {state.embedded.fileName}
            {state.embedded.afRelationship && ` (relation ${state.embedded.afRelationship})`}
          </p>
          <InvoiceView invoice={state.invoice} />
          <RuleList results={state.results} />
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium">Voir le XML</summary>
            <pre className="max-h-96 overflow-auto border-t border-line p-4 text-xs">{state.embedded.xml}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
