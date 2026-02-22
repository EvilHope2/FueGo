import { PricingSettings, TimeRule, WeatherRules } from "@/types";

export const RIO_GRANDE_TZ = "America/Argentina/Ushuaia";

export const defaultTimeRules: TimeRule[] = [
  {
    name: "Nocturno",
    start: "22:00",
    end: "06:00",
    multiplier: 1.15,
    enabled: true,
  },
];

export const defaultWeatherRules: WeatherRules = {
  enabled: false,
  mode: "manual",
  multiplier: 1.2,
  label: "Viento/Nieve",
};

export const defaultPricing: PricingSettings = {
  baseFare: 900,
  perKm: 950,
  minimumFare: 2500,
  rounding: 50,
  timeRules: defaultTimeRules,
  weatherRules: defaultWeatherRules,
};

export function roundTo(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 1) {
    return Math.round(value);
  }
  return Math.round(value / step) * step;
}

function parseHHMM(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return -1;
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return -1;
  }
  return h * 60 + m;
}

export function isTimeInRange(now: Date, startHHMM: string, endHHMM: string): boolean {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (start < 0 || end < 0) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

export function getNowInTimeZone(timeZone: string, baseDate = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(baseDate);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
}

export function getTimeMultiplier(now: Date, timeRules: TimeRule[]): { multiplier: number; ruleName?: string } {
  const matches = (timeRules || []).filter((rule) => rule.enabled && isTimeInRange(now, rule.start, rule.end));
  if (!matches.length) {
    return { multiplier: 1 };
  }

  const best = [...matches].sort((a, b) => b.multiplier - a.multiplier)[0];
  return {
    multiplier: best.multiplier,
    ruleName: best.name,
  };
}

export function getWeatherMultiplier(weatherRules?: WeatherRules): { multiplier: number; label?: string } {
  if (!weatherRules?.enabled) {
    return { multiplier: 1 };
  }

  return {
    multiplier: weatherRules.multiplier || 1,
    label: weatherRules.label,
  };
}

export function normalizePricingDoc(input: Partial<PricingSettings> | null | undefined): PricingSettings {
  return {
    baseFare: Number(input?.baseFare ?? defaultPricing.baseFare),
    perKm: Number(input?.perKm ?? defaultPricing.perKm),
    minimumFare: Number(input?.minimumFare ?? defaultPricing.minimumFare),
    rounding: Number(input?.rounding ?? defaultPricing.rounding),
    timeRules: (input?.timeRules || defaultPricing.timeRules).map((rule) => ({
      name: rule.name || "Regla horaria",
      start: rule.start || "00:00",
      end: rule.end || "00:00",
      multiplier: Number(rule.multiplier ?? 1),
      enabled: !!rule.enabled,
    })),
    weatherRules: {
      enabled: !!(input?.weatherRules?.enabled ?? defaultPricing.weatherRules.enabled),
      mode: "manual",
      multiplier: Number(input?.weatherRules?.multiplier ?? defaultPricing.weatherRules.multiplier),
      label: input?.weatherRules?.label || defaultPricing.weatherRules.label,
    },
  };
}

export function computePrice(km: number, pricingDoc: Partial<PricingSettings>, now: Date) {
  const pricing = normalizePricingDoc(pricingDoc);
  const basePrice = Math.max(pricing.minimumFare, pricing.baseFare + km * pricing.perKm);
  const { multiplier: timeMultiplier, ruleName: timeRuleName } = getTimeMultiplier(now, pricing.timeRules);
  const { multiplier: weatherMultiplier, label: weatherLabel } = getWeatherMultiplier(pricing.weatherRules);

  const final = roundTo(basePrice * timeMultiplier * weatherMultiplier, pricing.rounding);

  return {
    base: roundTo(basePrice, pricing.rounding),
    final,
    breakdown: {
      baseFare: pricing.baseFare,
      perKm: pricing.perKm,
      minimumFare: pricing.minimumFare,
      km,
      basePrice,
      timeMultiplier,
      weatherMultiplier,
      rounding: pricing.rounding,
      timeRuleName,
      weatherLabel,
    },
  };
}

export function validatePricing(payload: Partial<PricingSettings>): string | null {
  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const roundingSet = new Set([1, 10, 50, 100]);

  if (!payload.baseFare || payload.baseFare <= 0) return "baseFare debe ser positivo";
  if (!payload.perKm || payload.perKm <= 0) return "perKm debe ser positivo";
  if (!payload.minimumFare || payload.minimumFare <= 0) return "minimumFare debe ser positivo";
  if (!payload.rounding || !roundingSet.has(payload.rounding)) return "rounding debe ser 1, 10, 50 o 100";

  for (const rule of payload.timeRules || []) {
    if (!hhmm.test(rule.start) || !hhmm.test(rule.end)) return "Formato de hora invalido (HH:MM)";
    if (rule.multiplier < 1 || rule.multiplier > 2) return "Multiplicador horario fuera de rango (1.0 - 2.0)";
  }

  if ((payload.weatherRules?.multiplier || 1) < 1 || (payload.weatherRules?.multiplier || 1) > 2) {
    return "Multiplicador de clima fuera de rango (1.0 - 2.0)";
  }

  return null;
}
