import { InvoiceReader } from "@/components/InvoiceReader";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Lecteur Factur-X</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Ouvrez une facture électronique Factur-X ou ZUGFeRD : la page extrait le XML caché dans le PDF,
        affiche la facture et vérifie ses totaux selon les règles de la norme EN 16931.
      </p>
      <div className="mt-10">
        <InvoiceReader />
      </div>
    </main>
  );
}
