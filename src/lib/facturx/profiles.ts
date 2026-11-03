// Guideline IDs (BT-24) end with the profile name in Factur-X 1.0 and ZUGFeRD 2.x, written
// "urn:factur-x.eu:1p0:minimum" or "urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p0:basic"
// (with ":" for "#" in the first Factur-X samples of 2017). XRechnung is a national use of EN 16931.
const SUFFIXES: [string, string][] = [
  [":extended-ctc-fr", "EXTENDED-CTC-FR"],
  [":minimum", "MINIMUM"],
  [":basicwl", "BASIC WL"],
  [":basic", "BASIC"],
  [":extended", "EXTENDED"],
];

export function profileName(guidelineId: string | undefined): string | undefined {
  if (!guidelineId) return undefined;
  const id = guidelineId.toLowerCase();
  const suffix = SUFFIXES.find(([end]) => id.endsWith(end));
  if (suffix) return suffix[1];
  if (id.includes("xrechnung")) return "XRechnung";
  if (id === "urn:cen.eu:en16931:2017") return "EN 16931";
  return undefined;
}
