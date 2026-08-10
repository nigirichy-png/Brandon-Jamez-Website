import "server-only";

function clean(value: string | undefined, maximum = 200): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length <= maximum && !normalized.toLowerCase().includes("placeholder") ? normalized : null;
}

function email(value: string | undefined): string | null {
  const normalized = clean(value, 254)?.toLowerCase() ?? null;
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export type PublicLegalConfig = Readonly<{
  operatorName: string | null;
  entityType: string | null;
  representative: string | null;
  streetAddress: string | null;
  postalLocality: string | null;
  country: string | null;
  supportEmail: string | null;
  phone: string | null;
  registerName: string | null;
  registerNumber: string | null;
  vatId: string | null;
  complete: boolean;
}>;

export function getPublicLegalConfig(): PublicLegalConfig {
  const config = {
    operatorName: clean(process.env.LEGAL_OPERATOR_NAME),
    entityType: clean(process.env.LEGAL_ENTITY_TYPE),
    representative: clean(process.env.LEGAL_REPRESENTATIVE),
    streetAddress: clean(process.env.LEGAL_STREET_ADDRESS),
    postalLocality: clean(process.env.LEGAL_POSTAL_LOCALITY),
    country: clean(process.env.LEGAL_COUNTRY),
    supportEmail: email(process.env.SUPPORT_EMAIL),
    phone: clean(process.env.LEGAL_PHONE, 80),
    registerName: clean(process.env.LEGAL_REGISTER_NAME),
    registerNumber: clean(process.env.LEGAL_REGISTER_NUMBER),
    vatId: clean(process.env.LEGAL_VAT_ID, 80),
  };

  return {
    ...config,
    complete: Boolean(
      config.operatorName
      && config.streetAddress
      && config.postalLocality
      && config.country
      && config.supportEmail
      && config.phone,
    ),
  };
}
