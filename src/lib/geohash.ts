import { geohashForLocation } from "geofire-common";

export function buildGeoPoint(lat: number, lng: number) {
  return {
    lat,
    lng,
    geohash: geohashForLocation([lat, lng]),
  };
}

