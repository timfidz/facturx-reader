// Guideline IDs (BT-24) of the Factur-X profiles.
const PROFILES: Record<string, string> = {
  "urn:factur-x.eu:1p0:minimum": "MINIMUM",
  "urn:factur-x.eu:1p0:basicwl": "BASIC WL",
  "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic": "BASIC",
  "urn:cen.eu:en16931:2017": "EN 16931",
  "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended": "EXTENDED",
  "urn:cen.eu:en16931:2017#conformant#urn.cpro.gouv.fr:1p0:extended-ctc-fr": "EXTENDED-CTC-FR",
};

export function profileName(guidelineId: string | undefined): string | undefined {
  return guidelineId ? PROFILES[guidelineId] : undefined;
}
