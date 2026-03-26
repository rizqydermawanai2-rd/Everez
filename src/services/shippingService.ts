/**
 * Service to handle shipping cost calculations using RapidAPI (Cek Resi Cek Ongkir) via backend
 */

// Store/CEO Origin Address for shipping reference
export const STORE_ADDRESS = "Jalan Kerkof Blok. Padakasih RT/RW 04/08 No 06 Kelurahan Cibeber";
export const STORE_DISTRICT = "Cimahi Selatan";
export const STORE_CITY = "Cimahi";
export const STORE_POSTAL_CODE = "40531";
export const DEFAULT_COURIER = "JNT";

export interface ShippingRateRequest {
  origin: string;
  destination: string;
  weight: number; // in grams
  courier: string;
}

export interface ShippingRateResponse {
  cost: number;
  service: string;
  etd: string;
}

/**
 * Fetches the shipping cost from the API.
 * If the API call fails, it falls back to a default calculation.
 */
export async function fetchShippingCost(destinationCity: string, weight: number): Promise<number> {
  if (!destinationCity) return 10000; // Default minimum if no city

  try {
    // Call the backend API which handles the Biteship integration securely
    const response = await fetch('/api/shipping/cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinationCity,
        weight
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.cost === 'number') {
        return data.cost;
      }
    } else {
      console.warn('Backend shipping API failed, falling back to mock');
    }

    // Fallback/Mock logic if backend API fails
    console.log(`Using mock shipping cost from ${STORE_CITY} to ${destinationCity} with weight ${weight}g via ${DEFAULT_COURIER}`);
    
    // Mocking the API logic based on city distance from Cimahi (simulated)
    const baseRate = 10000;
    
    // Cimahi is in West Java
    let distanceMultiplier = 1;
    const dest = destinationCity.toLowerCase();
    
    if (dest.includes('cimahi') || dest.includes('bandung')) {
      distanceMultiplier = 0.8; // Local
    } else if (dest.includes('jakarta') || dest.includes('jawa barat')) {
      distanceMultiplier = 1.2;
    } else if (dest.includes('jawa')) {
      distanceMultiplier = 1.8;
    } else {
      distanceMultiplier = 3.0; // Outside Java
    }
    
    const weightInKg = Math.ceil(weight / 1000);
    const calculatedCost = Math.max(baseRate, weightInKg * baseRate * distanceMultiplier);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return calculatedCost;
  } catch (error) {
    console.error('Error fetching shipping cost:', error);
    // Fallback to basic calculation if API fails
    return Math.max(10000, Math.ceil(weight / 1000) * 10000);
  }
}
