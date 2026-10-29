# Lecteur Factur-X

Une page web qui ouvre une facture électronique Factur-X (ou ZUGFeRD), affiche son contenu et vérifie ses totaux. Le PDF est lu dans le navigateur : il n'est envoyé à aucun serveur.

## Pourquoi

Une facture Factur-X est un PDF lisible qui contient, en pièce jointe, un fichier XML avec les mêmes données sous forme structurée. Avec la réforme de la facturation électronique, les entreprises françaises doivent pouvoir recevoir ces factures. Le XML ne se voit pas quand on ouvre le PDF : cet outil le montre, et vérifie que les montants qu'il contient sont cohérents entre eux.

## Ce que fait la page

1. Elle cherche dans le PDF la pièce jointe `factur-x.xml` (ou `zugferd-invoice.xml`, `xrechnung.xml`).
2. Elle lit le XML (syntaxe CII) : numéro, date, type de document, vendeur, acheteur, lignes, ventilation de la TVA, totaux.
3. Elle détecte le profil (MINIMUM, BASIC WL, BASIC, EN 16931, EXTENDED).
4. Elle applique 21 règles de la norme EN 16931 : les champs obligatoires (BR-01 à BR-16) et les calculs de totaux (BR-CO-10, 13, 14, 15, 16).

Les règles ont été écrites à partir du Schematron officiel de la norme ([ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931), licence EUPL 1.2), avec ses règles d'arrondi.

## Ce qu'elle ne fait pas

- Ce n'est pas un validateur complet : la norme compte plus d'une centaine de règles, et la page n'en applique que 21. Elle ne valide pas non plus le XML contre les schémas XSD.
- Elle ne vérifie pas la conformité du PDF à PDF/A-3, et ne lit pas les factures en syntaxe UBL : seule la syntaxe CII, celle de Factur-X, est prise en charge.
- Pour les profils MINIMUM et BASIC WL, qui n'ont pas de lignes, les règles sur les lignes et les adresses ne sont pas appliquées.

## Vérification

- Tests unitaires (Vitest) : extraction depuis un PDF généré pendant le test, lecture du XML, chaque règle en cas de succès et d'échec, calculs sur les décimales.
- Le 29/10/2026, les 61 factures d'exemple officielles de ZUGFeRD 2.5.2 (tous profils, dont XRechnung) ont toutes été lues sans aucune fausse erreur. Ce passage a montré deux cas à traiter, qui sont couverts par des tests : les sous-lignes du profil EXTENDED, déjà comptées dans leur ligne de regroupement, et le profil MINIMUM, qui n'a pas de ventilation de TVA.

## Choix techniques

- **Next.js en export statique** : tout s'exécute dans le navigateur, donc le site est un ensemble de fichiers statiques, sans serveur.
- **Les montants ne passent jamais par des nombres flottants** : ils sont convertis en entiers (`BigInt`) avant d'être additionnés, puis arrondis au centime comme le fait le Schematron. Sinon, `0.1 + 0.2` ne donne pas `0.3`.
- **[@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib)**, une version maintenue de pdf-lib, lit les pièces jointes du PDF. La même bibliothèque génère le PDF d'exemple et les PDF des tests.
- **Le XML est lu avec `DOMParser`**, en respectant les espaces de noms : un élément ne compte que s'il est dans l'espace de noms CII attendu.

## Structure

```
src/lib/facturx/
  extract.ts    trouver le XML dans le PDF
  parse.ts      lire le XML CII
  profiles.ts   reconnaître le profil
  rules.ts      les règles EN 16931
  decimal.ts    les calculs sur les montants
src/components/ l'interface (React)
scripts/make-sample.mjs  génère public/exemple-facture.pdf
```

## Lancer en local

Node.js 24 :

```bash
npm install
npm run dev      # http://localhost:3000
npm test
npm run build    # le site statique dans out/
```

## Licence

MIT. La facture d'exemple est fictive : noms, numéros et adresses sont inventés.
