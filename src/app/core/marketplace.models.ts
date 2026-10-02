// Marketplace de espacios temporales (propietario). Los mismos nombres que devuelve la API.

// Edificio del usuario con el marketplace disponible. canPublish: es propietario principal de alguna unidad.
export interface MarketplaceBuilding {
  buildingId: string;
  buildingName: string;
  canPublish: boolean;
}

// Unidad que el usuario puede publicar (de la que es propietario principal).
export interface MarketplacePublishableUnit {
  unitId: string;
  code: string;
  floor: string;
}

export type MarketplaceListingStatus = 'Active' | 'Suspended' | 'Closed';

export interface MarketplaceListing {
  id: string;
  buildingId: string;
  unitId: string;
  unitCode: string;
  ownerId: string;
  ownerName: string;
  title: string;
  windowStartUtc: string;
  windowEndUtc: string;
  windowHours: number;
  hourlyPrice: number;
  status: MarketplaceListingStatus;
  statusReason: string | null;
  // La ventana ya terminó (aunque el estado todavía no se haya cerrado).
  windowEnded: boolean;
  activeReservations: number;
  createdAtUtc: string;
}

export interface MarketplaceListingUpdateRequest {
  title: string;
  windowStartUtc: string;
  windowEndUtc: string;
  hourlyPrice: number;
}

export interface MarketplaceListingCreateRequest extends MarketplaceListingUpdateRequest {
  buildingId: string;
  unitId: string;
}
