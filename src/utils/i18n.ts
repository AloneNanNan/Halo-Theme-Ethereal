export type I18nWindow = Window & { i18nResources?: Record<string, string> };

export function t(key: string, fallback: string): string {
  const value =
    typeof window !== "undefined"
      ? (window as I18nWindow).i18nResources?.[key]
      : undefined;
  return value && !value.includes("#{") ? value : fallback;
}
