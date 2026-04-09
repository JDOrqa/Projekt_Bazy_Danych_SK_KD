// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  licenseNumber?: string;
  status: 'active' | 'inactive' | 'blocked';
  roles: Role[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

// Fishing ground types
export interface FishingGround {
  id: string;
  name: string;
  type: 'lake' | 'river' | 'pond' | 'reservoir' | 'canal';
  boundaries?: Array<[number, number]>;
  areaHa: number;
  maxDepth: number;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface FishingSession {
  id: string;
  userId: string;
  groundId: string;
  startTime: Date;
  endTime?: Date;
  startGPS?: GeoCoordinates;
  endGPS?: GeoCoordinates;
  notes?: string;
  catches: CaughtFish[];
  createdAt: Date;
  updatedAt: Date;
}

// Fish types
export interface CaughtFish {
  id: string;
  sessionId: string;
  speciesId: string;
  methodId: string;
  baitId: string;
  weight?: number;
  length?: number;
  released: boolean;
  position?: GeoCoordinates;
  catchTime: Date;
  notes?: string;
  photos: FishPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FishSpecies {
  id: string;
  polishName: string;
  latinName: string;
  photoUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FishingMethod {
  id: string;
  name: string;
  description?: string;
}

export interface Bait {
  id: string;
  name: string;
  description?: string;
}

// Photo and analysis types
export interface FishPhoto {
  id: string;
  caughtFishId: string;
  url: string;
  location?: GeoCoordinates;
  captureTime: Date;
  checksum: string;
  analysis?: ImageAnalysis;
  createdAt: Date;
}

export interface ImageAnalysis {
  id: string;
  photoId: string;
  bbox?: BoundingBox;
  lengthPx: number;
  estimatedLengthCm: number;
  scaleCmPerPx: number;
  maskUrl?: string;
  algorithmVersion: string;
  confidence: number;
  verified: boolean;
  verifiedBy?: string;
  processedAt: Date;
  measurements: FishMeasurement[];
  createdAt: Date;
}

export interface FishMeasurement {
  id: string;
  analysisId: string;
  headPoint: Point;
  tailPoint: Point;
  lengthPx: number;
  method: string;
  verifiedBy?: string;
  verificationDate?: Date;
  createdAt: Date;
}

// Environmental monitoring types
export interface MonitoringStation {
  id: string;
  groundId: string;
  name: string;
  location: GeoCoordinates;
  sensorTypes: string[];
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentalReading {
  id: string;
  stationId: string;
  readingTime: Date;
  waterTempC?: number;
  oxygenMgL?: number;
  ph?: number;
  turbidityNTU?: number;
  createdAt: Date;
}

// Population types
export interface PopulationParameters {
  id: string;
  groundId: string;
  speciesId: string;
  growthRate: number;
  mortality: number;
  carryingCapacity: number;
  safeLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulationHistory {
  id: string;
  groundId: string;
  speciesId: string;
  date: Date;
  estimatedPopulation: number;
  createdAt: Date;
}

export interface Stocking {
  id: string;
  groundId: string;
  speciesId: string;
  date: Date;
  quantity: number;
  cost?: number;
  notes?: string;
  createdAt: Date;
}

// Limits and regulations
export interface CatchLimit {
  id: string;
  groundId: string;
  speciesId: string;
  minSizeCm?: number;
  dailyLimit?: number;
  protectionSeasonStart?: Date;
  protectionSeasonEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Visit tracking
export interface Visit {
  id: string;
  userId: string;
  groundId: string;
  visitDate: Date;
  arrivalLocation?: GeoCoordinates;
  notes?: string;
  createdAt: Date;
}

export interface VisitAggregate {
  userId: string;
  groundId: string;
  visitCount: number;
  lastVisit: Date;
  updatedAt: Date;
}

// Audit log
export interface AuditLog {
  id: string;
  userId?: string;
  table: string;
  recordId: string;
  action: 'create' | 'update' | 'delete';
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  timestamp: Date;
}

// Processing queue
export interface ProcessingTask {
  id: string;
  taskType: string;
  referenceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data?: Record<string, any>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Utility types
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
