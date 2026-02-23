import { PricingDoc, PricingRule } from "@/lib/types";

export function roundTo(value: number, step: number): number {
  const size = step > 0 ? step : 1;
  return Math.round(value / size) * size;
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map((x) => Number(x));
  return h * 60 + m;
}

export function isTimeInRange(now: Date, startHHMM: string, endHHMM: string): boolean {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);

  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
}

export function getTimeMultiplier(now: Date, rules: PricingRule[]) {
  const matches = rules.filter((rule) => rule.enabled && isTimeInRange(now, rule.start, rule.end));
  if (!matches.length) {
    return { multiplier: 1, ruleName: null as string | null };
  }
  const winner = matches.sort((a, b) => b.multiplier - a.multiplier)[0];
  return { multiplier: winner.multiplier, ruleName: winner.name };
}

export function getWeatherMultiplier(weatherRules: PricingDoc["weatherRules"]) {
  if (!weatherRules?.enabled) {
    return { multiplier: 1, label: null as string | null };
  }
  return { multiplier: Math.max(1, weatherRules.multiplier || 1), label: weatherRules.label || "Clima" };
}

export function normalizePricing(input: Partial<PricingDoc> | null | undefined): PricingDoc {
  return {
    baseFare: Number(input?.baseFare ?? 900),
    perKm: Number(input?.perKm ?? 950),
    minimumFare: Number(input?.minimumFare ?? 2500),
    rounding: Number(input?.rounding ?? 50),
    timeRules: Array.isArray(input?.timeRules)
      ? input!.timeRules!.map((rule) => ({
          name: rule.name || "Regla",
          start: rule.start || "00:00",
          end: rule.end || "23:59",
          multiplier: Number(rule.multiplier || 1),
          enabled: Boolean(rule.enabled),
        }))
      : [],
    weatherRules: {
      enabled: Boolean(input?.weatherRules?.enabled),
      mode: "manual",
      multiplier: Number(input?.weatherRules?.multiplier ?? 1),
      label: input?.weatherRules?.label || "Clima",
    },
  };
}

export function computePrice(distanceKm: number, pricingDoc: PricingDoc, now: Date) {
  const basePrice = Math.max(pricingDoc.minimumFare, pricingDoc.baseFare + distanceKm * pricingDoc.perKm);
  const time = getTimeMultiplier(now, pricingDoc.timeRules || []);
  const weather = getWeatherMultiplier(pricingDoc.weatherRules);
  const final = roundTo(basePrice * time.multiplier * weather.multiplier, pricingDoc.rounding);

  return {
    base: roundTo(basePrice, pricingDoc.rounding),
    final,
    breakdown: {
      baseFare: pricingDoc.baseFare,
      perKm: pricingDoc.perKm,
      minimumFare: pricingDoc.minimumFare,
      km: Number(distanceKm.toFixed(2)),
      basePrice: Number(basePrice.toFixed(2)),
      timeMultiplier: time.multiplier,
      weatherMultiplier: weather.multiplier,
      rounding: pricingDoc.rounding,
      timeRuleName: time.ruleName,
      weatherLabel: weather.label,
    },
    appliedMultipliers: {
      time: time.multiplier,
      weather: weather.multiplier,
      timeRuleName: time.ruleName,
      weatherLabel: weather.label,
    },
  };
}

