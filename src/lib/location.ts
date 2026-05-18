export type LiveLocationCoords = {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
};

export type LiveLocationError = {
  code: number;
  message: string;
};

const defaultLocationOptions: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 3000,
  timeout: 15000,
};

export const isGeolocationSupported = () => {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
};

export const startLiveLocationTracking = (
  callback: (coords: LiveLocationCoords) => void,
  errorCallback?: (error: LiveLocationError) => void
): number | null => {
  if (!isGeolocationSupported()) {
    const error = {
      code: 0,
      message: "Geolocation is not supported by this browser.",
    };

    console.error(error.message);
    errorCallback?.(error);
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      let message = "Unable to get your current location.";

      if (error.code === error.PERMISSION_DENIED) {
        message =
          "Location permission was denied. Please allow location access to use live rider tracking.";
      }

      if (error.code === error.POSITION_UNAVAILABLE) {
        message =
          "Location information is unavailable. Please check your GPS/location settings.";
      }

      if (error.code === error.TIMEOUT) {
        message =
          "Location request timed out. Please move to an open area or check your internet/GPS.";
      }

      console.error("Location error:", message, error);

      errorCallback?.({
        code: error.code,
        message,
      });
    },
    defaultLocationOptions
  );

  return watchId;
};

export const stopLiveLocationTracking = (watchId: number | null | undefined) => {
  if (!isGeolocationSupported()) return;
  if (watchId === null || watchId === undefined) return;

  navigator.geolocation.clearWatch(watchId);
};

export const getCurrentLocation = (
  callback: (coords: LiveLocationCoords) => void,
  errorCallback?: (error: LiveLocationError) => void
) => {
  if (!isGeolocationSupported()) {
    const error = {
      code: 0,
      message: "Geolocation is not supported by this browser.",
    };

    console.error(error.message);
    errorCallback?.(error);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      let message = "Unable to get your current location.";

      if (error.code === error.PERMISSION_DENIED) {
        message =
          "Location permission was denied. Please allow location access.";
      }

      if (error.code === error.POSITION_UNAVAILABLE) {
        message =
          "Location information is unavailable. Please check your GPS/location settings.";
      }

      if (error.code === error.TIMEOUT) {
        message =
          "Location request timed out. Please try again.";
      }

      console.error("Current location error:", message, error);

      errorCallback?.({
        code: error.code,
        message,
      });
    },
    defaultLocationOptions
  );
};