import { InvoiceReader } from "@/components/InvoiceReader";

const SOURCE = "https://github.com/timfidz/facturx-reader";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Lecteur Factur-X</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Ouvrez une facture électronique Factur-X ou ZUGFeRD pour voir les données qu&apos;elle contient vraiment, et
        vérifier que ses montants sont justes. Gratuit, sans inscription.
      </p>
      <div className="mt-10">
        <InvoiceReader />
      </div>

      <div className="mt-16 max-w-2xl space-y-10 leading-relaxed">
        <Section title="Pourquoi ouvrir le XML ?">
          <p>
            Une facture Factur-X est un PDF qui contient, en pièce jointe, un fichier XML avec les mêmes informations
            sous une forme que les logiciels savent lire. Vous voyez le PDF ; votre logiciel comptable et les
            plateformes de facturation lisent le XML. Rien ne garantit que les deux disent la même chose : un total
            corrigé à la main sur le PDF, une ligne oubliée dans le XML. La page affiche le XML sous forme de facture,
            pour que vous puissiez le comparer au PDF.
          </p>
        </Section>

        <Section title="Vos factures restent sur votre ordinateur">
          <p>
            Le PDF est ouvert par votre navigateur. Il n&apos;est envoyé à aucun serveur et rien n&apos;est enregistré.
            Le code de la page est{" "}
            <a className="text-accent underline underline-offset-4" href={SOURCE}>
              public
            </a>
            , chacun peut vérifier ce qu&apos;elle fait.
          </p>
        </Section>

        <Section title="Ce que la page vérifie">
          <p>
            21 règles de la norme européenne des factures électroniques (EN 16931) : les mentions obligatoires
            (numéro, date, vendeur, acheteur, totaux) et les calculs (somme des lignes, total HT, TVA, total TTC, net à
            payer), arrondis au centime comme le fait le contrôle officiel.
          </p>
          <p>
            Ce n&apos;est pas un validateur complet : la norme compte plus d&apos;une centaine de règles, et une
            plateforme de facturation peut en appliquer d&apos;autres. Une facture sans erreur ici peut encore être
            refusée ailleurs.
          </p>
        </Section>

        <Section title="Questions">
          <h3 className="font-medium">Mon PDF n&apos;est pas reconnu</h3>
          <p>
            Il ne contient sans doute pas de XML : c&apos;est alors un PDF ordinaire. Les factures
            envoyées en XML seul, sans PDF (format UBL), ne sont pas lues.
          </p>
          <h3 className="font-medium">Que veulent dire MINIMUM, BASIC, EN 16931, EXTENDED ?</h3>
          <p>
            Ce sont les profils de Factur-X, du moins détaillé au plus détaillé. Les profils MINIMUM et BASIC WL ne
            contiennent pas les lignes de la facture : la page ne peut pas en vérifier la somme.
          </p>
          <h3 className="font-medium">Une règle est en erreur : que faire ?</h3>
          <p>
            Le message dit ce qui manque, ou quel montant était attendu. La facture sort du logiciel de celui qui
            l&apos;a émise : c&apos;est à lui de la corriger et de vous la renvoyer.
          </p>
          <h3 className="font-medium">Un problème avec la page ?</h3>
          <p>
            Écrivez à{" "}
            <a className="text-accent underline underline-offset-4" href="mailto:support@timaub.fr">
              support@timaub.fr
            </a>
            , sans joindre de facture : décrivez ce qui s&apos;affiche.
          </p>
        </Section>
      </div>
    </main>
  );
}
