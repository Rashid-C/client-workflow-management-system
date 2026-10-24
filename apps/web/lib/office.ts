// Facts from the firm's own site (alfathuae.com) and new logo, shared by the
// public page and the sign-in pages.
export const OFFICE = {
  phones: ["+971 58 584 8008", "+971 55 776 9483"],
  email: "info@alfathuae.com",
  // The office's pin, as given by the client.
  coordinates: "24.47558,54.38038",
};

/** "+971 58 584 8008" → "tel:+971585848008". */
export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
