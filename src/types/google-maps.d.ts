declare global {
  interface Window {
    googleMapsLoaded?: boolean;
    initMap: () => void;
  }

  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options?: any);
      }
      
      class LatLng {
        constructor(lat: number, lng: number);
      }

      namespace places {
        class PlacesService {
          constructor(map: Map);
          nearbySearch(request: any, callback: (results: any[], status: any) => void): void;
          getDetails(request: any, callback: (result: any, status: any) => void): void;
        }

        enum PlacesServiceStatus {
          OK = 'OK'
        }
      }
    }
  }
}

export {};