import { profileName } from "./profiles";

const NS: Record<string, string> = {
  rsm: "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100",
  ram: "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100",
  udt: "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100",
};

export type Address = {
  lines: string[];
  postcode?: string;
  city?: string;
  country?: string;
};

export type Party = {
  name?: string;
  /** SIREN (scheme 0002) or SIRET (scheme 0009) in France. */
  legalId?: { value: string; scheme?: string };
  vatId?: string;
  address?: Address;
};

export type Line = {
  id?: string;
  /** EXTENDED only: a sub-line, already counted in its parent group line. */
  parentId?: string;
  name?: string;
  quantity?: string;
  unitCode?: string;
  netPrice?: string;
  netAmount?: string;
  vatCategory?: string;
  vatRate?: string;
};

export type VatBreakdown = {
  category?: string;
  rate?: string;
  basis?: string;
  amount?: string;
};

/** Amounts are kept as the decimal strings found in the XML. */
export type Totals = {
  lineTotal?: string;
  allowanceTotal?: string;
  chargeTotal?: string;
  taxBasisTotal?: string;
  /** VAT total in the invoice currency (BT-110). */
  taxTotal?: string;
  grandTotal?: string;
  prepaid?: string;
  rounding?: string;
  duePayable?: string;
};

export type Invoice = {
  guidelineId?: string;
  profile?: string;
  number?: string;
  typeCode?: string;
  /** ISO date (YYYY-MM-DD). */
  issueDate?: string;
  currency?: string;
  seller: Party;
  buyer: Party;
  lines: Line[];
  vat: VatBreakdown[];
  totals: Totals;
};

/** Direct children matching a path like "ram:A/ram:B". */
function findAll(parent: Element | undefined, path: string): Element[] {
  let current = parent ? [parent] : [];
  for (const step of path.split("/")) {
    const [prefix, localName] = step.split(":");
    current = current.flatMap((el) =>
      Array.from(el.children).filter(
        (child) => child.localName === localName && child.namespaceURI === NS[prefix],
      ),
    );
  }
  return current;
}

function find(parent: Element | undefined, path: string): Element | undefined {
  return findAll(parent, path)[0];
}

function text(parent: Element | undefined, path: string): string | undefined {
  const value = find(parent, path)?.textContent?.trim();
  return value || undefined;
}

// Format 102 is YYYYMMDD.
function isoDate(el: Element | undefined): string | undefined {
  const value = el?.textContent?.trim();
  if (!value) return undefined;
  if (el?.getAttribute("format") === "102" && /^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

function parseParty(el: Element | undefined): Party {
  const legal = find(el, "ram:SpecifiedLegalOrganization/ram:ID");
  const vat = findAll(el, "ram:SpecifiedTaxRegistration/ram:ID").find(
    (id) => id.getAttribute("schemeID") === "VA",
  );
  const address = find(el, "ram:PostalTradeAddress");
  return {
    name: text(el, "ram:Name"),
    legalId: legal?.textContent?.trim()
      ? { value: legal.textContent.trim(), scheme: legal.getAttribute("schemeID") ?? undefined }
      : undefined,
    vatId: vat?.textContent?.trim() || undefined,
    address: address && {
      lines: ["ram:LineOne", "ram:LineTwo", "ram:LineThree"]
        .map((p) => text(address, p))
        .filter((l): l is string => !!l),
      postcode: text(address, "ram:PostcodeCode"),
      city: text(address, "ram:CityName"),
      country: text(address, "ram:CountryID"),
    },
  };
}

function parseLine(el: Element): Line {
  const agreement = find(el, "ram:SpecifiedLineTradeAgreement");
  const delivery = find(el, "ram:SpecifiedLineTradeDelivery/ram:BilledQuantity");
  const settlement = find(el, "ram:SpecifiedLineTradeSettlement");
  return {
    id: text(el, "ram:AssociatedDocumentLineDocument/ram:LineID"),
    parentId: text(el, "ram:AssociatedDocumentLineDocument/ram:ParentLineID"),
    name: text(el, "ram:SpecifiedTradeProduct/ram:Name"),
    quantity: delivery?.textContent?.trim() || undefined,
    unitCode: delivery?.getAttribute("unitCode") ?? undefined,
    netPrice: text(agreement, "ram:NetPriceProductTradePrice/ram:ChargeAmount"),
    netAmount: text(
      settlement,
      "ram:SpecifiedTradeSettlementLineMonetarySummation/ram:LineTotalAmount",
    ),
    vatCategory: text(settlement, "ram:ApplicableTradeTax/ram:CategoryCode"),
    vatRate: text(settlement, "ram:ApplicableTradeTax/ram:RateApplicablePercent"),
  };
}

export function parseCii(xml: string): Invoice {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Le XML de la facture est mal formé.");
  }
  const root = doc.documentElement;
  if (root.localName !== "CrossIndustryInvoice" || root.namespaceURI !== NS.rsm) {
    throw new Error(
      `Format non pris en charge : « ${root.localName} ». Seul le format CII de Factur-X est lu.`,
    );
  }

  const transaction = find(root, "rsm:SupplyChainTradeTransaction");
  const agreement = find(transaction, "ram:ApplicableHeaderTradeAgreement");
  const settlement = find(transaction, "ram:ApplicableHeaderTradeSettlement");
  const sums = find(settlement, "ram:SpecifiedTradeSettlementHeaderMonetarySummation");
  const currency = text(settlement, "ram:InvoiceCurrencyCode");
  const guidelineId = text(
    root,
    "rsm:ExchangedDocumentContext/ram:GuidelineSpecifiedDocumentContextParameter/ram:ID",
  );

  return {
    guidelineId,
    profile: profileName(guidelineId),
    number: text(root, "rsm:ExchangedDocument/ram:ID"),
    typeCode: text(root, "rsm:ExchangedDocument/ram:TypeCode"),
    issueDate: isoDate(find(root, "rsm:ExchangedDocument/ram:IssueDateTime/udt:DateTimeString")),
    currency,
    seller: parseParty(find(agreement, "ram:SellerTradeParty")),
    buyer: parseParty(find(agreement, "ram:BuyerTradeParty")),
    lines: findAll(transaction, "ram:IncludedSupplyChainTradeLineItem").map(parseLine),
    vat: findAll(settlement, "ram:ApplicableTradeTax").map((tax) => ({
      category: text(tax, "ram:CategoryCode"),
      rate: text(tax, "ram:RateApplicablePercent"),
      basis: text(tax, "ram:BasisAmount"),
      amount: text(tax, "ram:CalculatedAmount"),
    })),
    totals: {
      lineTotal: text(sums, "ram:LineTotalAmount"),
      allowanceTotal: text(sums, "ram:AllowanceTotalAmount"),
      chargeTotal: text(sums, "ram:ChargeTotalAmount"),
      taxBasisTotal: text(sums, "ram:TaxBasisTotalAmount"),
      // A second TaxTotalAmount may exist in the VAT accounting currency (BT-111).
      taxTotal: findAll(sums, "ram:TaxTotalAmount")
        .find((el) => el.getAttribute("currencyID") === currency)
        ?.textContent?.trim(),
      grandTotal: text(sums, "ram:GrandTotalAmount"),
      prepaid: text(sums, "ram:TotalPrepaidAmount"),
      rounding: text(sums, "ram:RoundingAmount"),
      duePayable: text(sums, "ram:DuePayableAmount"),
    },
  };
}
