/**
 * In-memory handoff for opening Settings at a particular section.
 *
 * Settings is an in-desktop app rather than a routed page, so a caller cannot
 * encode the target tab in a URL. Keep the request in module memory (not
 * browser storage) and also dispatch an event for an already-mounted window.
 */
export const SETTINGS_SECTION_EVENT = "pm:settings-section";
export type SettingsSectionRequest = "privacy-storage";

let pendingSection: SettingsSectionRequest | null = null;

export function requestSettingsSection(section: SettingsSectionRequest) {
  pendingSection = section;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SettingsSectionRequest>(SETTINGS_SECTION_EVENT, {
      detail: section,
    }),
  );
}

export function consumePendingSettingsSection(): SettingsSectionRequest | null {
  const section = pendingSection;
  pendingSection = null;
  return section;
}

export function clearPendingSettingsSection(section: SettingsSectionRequest) {
  if (pendingSection === section) pendingSection = null;
}
