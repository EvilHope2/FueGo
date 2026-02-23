export type Role = "client" | "driver" | "admin";

export type RideStatus =
  | "requested"
  | "offered"
  | "accepted"
  | "arriving"
  | "in_progress"
  | "completed"
  | "canceled";

export type PlacePoint = {
  address: string;
  lat: number;
  lng: number;
  streetName?: string;
  streetNumber?: string;
  isApproximate?: boolean;
  mapboxFeatureType?: string;
};

export type PricingRule = {
  name: string;
  start: string;
  end: string;
  multiplier: number;
  enabled: boolean;
};

export type PricingDoc = {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  rounding: number;
  timeRules: PricingRule[];
  weatherRules: {
    enabled: boolean;
    mode: "manual";
    multiplier: number;
    label: string;
  };
};

