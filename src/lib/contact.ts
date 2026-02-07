const placeholderPattern =
  /(username|x{3,}|votre[_-]?username|code[_-]?pays|numero|example|your[_-]?|placeholder)/i;

export const isConfiguredContactUrl = (url: string) => {
  const normalized = url.trim();
  if (!normalized) {
    return false;
  }

  return !placeholderPattern.test(normalized);
};

export const buildWhatsappUrl = (baseUrl: string, message?: string) => {
  if (!isConfiguredContactUrl(baseUrl)) {
    return null;
  }

  if (!message) {
    return baseUrl;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}text=${encodeURIComponent(message)}`;
};

export const buildSnapchatUrl = (baseUrl: string) => {
  if (!isConfiguredContactUrl(baseUrl)) {
    return null;
  }

  return baseUrl;
};
