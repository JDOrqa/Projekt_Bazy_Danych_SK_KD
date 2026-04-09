export interface FishingGround {
  id: string;
  name: string;
  type: 'lake' | 'river' | 'pond' | 'reservoir' | 'canal';
  areaHa: number;
  maxDepth: number;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}
