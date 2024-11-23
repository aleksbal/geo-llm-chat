import { FeatureCollection } from 'geojson';

export function extractGeoJson(text: string): FeatureCollection | null {
  try {
    // Look for GeoJSON in the text between markers
    const geoJsonMatch = text.match(/\{[\s\S]*"type"\s*:\s*"FeatureCollection"[\s\S]*\}/);
    
    if (geoJsonMatch) {
      const geoJson = JSON.parse(geoJsonMatch[0]);
      
      // Validate GeoJSON structure
      if (
        geoJson.type === 'FeatureCollection' &&
        Array.isArray(geoJson.features) &&
        geoJson.features.every((f: any) => 
          f.type === 'Feature' &&
          f.geometry &&
          typeof f.geometry.type === 'string' &&
          Array.isArray(f.geometry.coordinates) &&
          ['Point', 'Polygon', 'MultiPolygon'].includes(f.geometry.type)
        )
      ) {
        // Ensure coordinates are valid numbers
        const validateCoordinates = (coords: any[]): boolean => {
          return coords.every(coord => 
            Array.isArray(coord) 
              ? validateCoordinates(coord)
              : typeof coord === 'number' && !isNaN(coord)
          );
        };

        if (geoJson.features.every((f: any) => validateCoordinates(f.geometry.coordinates))) {
          return geoJson;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting GeoJSON:', error);
    return null;
  }
}