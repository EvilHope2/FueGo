export type Role = "client" | "driver" | "admin";

export type DriverStatus = "pending" | "approved" | "blocked";

export type RideStatus =
  | "requested"
  | "offered"
  | "accepted"
  | "arriving"
  | "in_progress"
  | "completed"
  | "canceled";

export type OfferStatus = "sent" | "accepted" | "rejected" | "expired";

export interface UserProfile {
  role: Role;
  name: string;
  phone?: string;
  createdAt: number;
}

export interface DriverProfile {
  status: DriverStatus;
  vehicleType: "auto" | "moto";
  plate?: string;
  isOnline: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    geohash: string;
  };
  lastSeenAt?: number;
}

export interface PricingSettings {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  rounding: number;
  timeRules: TimeRule[];
  weatherRules: WeatherRules;
}

export interface TimeRule {
  name: string;
  start: string;
  end: string;
  multiplier: number;
  enabled: boolean;
}

export interface WeatherRules {
  enabled: boolean;
  mode: "manual";
  multiplier: number;
  label: string;
}

export interface RideLocation {
  address: string;
  lat: number;
  lng: number;
}

export interface RideAmount {
  distanceKm: number;
  durationMin: number;
  price: number;
  pricingBreakdown?: PricingBreakdown;
  appliedMultipliers?: {
    time: number;
    weather: number;
    timeRuleName?: string;
    weatherLabel?: string;
  };
}

export interface PricingBreakdown {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  km: number;
  basePrice: number;
  timeMultiplier: number;
  weatherMultiplier: number;
  rounding: number;
  timeRuleName?: string;
  weatherLabel?: string;
}

export interface Ride {
  clientId: string;
  driverId: string | null;
  status: RideStatus;
  pickup: RideLocation;
  dropoff: RideLocation;
  estimate: RideAmount;
  final?: RideAmount;
  createdAt: number;
  updatedAt: number;
  canceledBy?: string;
}

