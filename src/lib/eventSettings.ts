export const APP_NAME = "LSPU-LB Pulsong Ka-PiYu";
export const GAWAD_EVENT_TITLE = "5th Gawad Parangal 2026";
export const GAWAD_EVENT_SLUG = "gawad-parangal-2026";
export const DEFAULT_PUBLIC_SITE_URL = "https://lspusurvey.vercel.app";

export interface EventSettings {
  slug?: string;
  mainFormOpen?: boolean;
}

export interface EventWithSettings {
  id: string;
  title: string;
  description?: string | null;
}

const SETTINGS_KEY = "surveySettings";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const getPermanentEventPath = () => `/${GAWAD_EVENT_SLUG}`;

export const getPublicSiteUrl = (fallbackOrigin = "") => {
  return (import.meta.env.VITE_PUBLIC_SITE_URL || DEFAULT_PUBLIC_SITE_URL || fallbackOrigin).replace(/\/$/, "");
};

export const getPermanentEventUrl = (origin = "") => `${getPublicSiteUrl(origin)}${getPermanentEventPath()}`;

export const parseEventSettings = (description?: string | null): EventSettings => {
  if (!description) return {};

  try {
    const parsed = JSON.parse(description) as { [SETTINGS_KEY]?: EventSettings };
    return parsed[SETTINGS_KEY] || {};
  } catch {
    return {};
  }
};

export const serializeEventDescription = (
  settings: EventSettings,
  previousDescription?: string | null,
) => {
  let note = "";

  if (previousDescription) {
    try {
      const parsed = JSON.parse(previousDescription) as { note?: string };
      note = parsed.note || "";
    } catch {
      note = previousDescription;
    }
  }

  return JSON.stringify({ [SETTINGS_KEY]: settings, note }, null, 2);
};

export const isPermanentGawadEvent = (event: EventWithSettings) => {
  const settings = parseEventSettings(event.description);
  return settings.slug === GAWAD_EVENT_SLUG || normalize(event.title) === normalize(GAWAD_EVENT_TITLE);
};

export const getEventSettingsWithDefaults = (event: EventWithSettings): EventSettings => {
  const settings = parseEventSettings(event.description);

  if (isPermanentGawadEvent(event)) {
    return {
      slug: GAWAD_EVENT_SLUG,
      mainFormOpen: false,
      ...settings,
    };
  }

  return settings;
};
