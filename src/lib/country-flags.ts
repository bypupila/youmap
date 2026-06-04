export function normalizeCountryCode(countryCode?: string | null) {
  const code = String(countryCode || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

export function getCountryFlagClassName(countryCode?: string | null) {
  const code = normalizeCountryCode(countryCode);
  return code ? `fi fi-${code.toLowerCase()}` : "";
}

export function createCountryFlagElement(countryCode?: string | null, size = 16) {
  const code = normalizeCountryCode(countryCode);
  const flag = document.createElement("span");

  if (!code) {
    flag.textContent = "🌐";
    flag.style.fontSize = `${size}px`;
    flag.style.lineHeight = "1";
    return flag;
  }

  flag.className = getCountryFlagClassName(code);
  flag.setAttribute("aria-hidden", "true");
  flag.style.display = "inline-block";
  flag.style.width = `${size}px`;
  flag.style.height = `${Math.round(size * 0.75)}px`;
  flag.style.flex = "none";
  flag.style.borderRadius = "2px";
  flag.style.overflow = "hidden";
  flag.style.backgroundPosition = "center";
  flag.style.backgroundRepeat = "no-repeat";
  flag.style.backgroundSize = "cover";
  flag.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.14)";
  return flag;
}
