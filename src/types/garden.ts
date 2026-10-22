export type NutrientDemand = "Tinggi" | "Sedang" | "Rendah" | string;

export interface Farm {
  id: number;
  name: string;
  location: string | null;
  createdAt?: string | Date;
}

export interface Crop {
  id: number;
  commonName: string;
  familyId: number;
  familyName: string;
  nutrientDemand: NutrientDemand;
}

export interface Planting {
  id: number;
  plotId: number;
  cropId: number;
  commonName: string;
  familyId: number;
  familyName: string;
  nutrientDemand: NutrientDemand;
  plantedOn: string;
  harvestedOn: string | null;
  notes: string | null;
}

export interface SoilTest {
  id: number;
  plotId: number;
  testedOn: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  organicMatter: number;
}

export interface Plot {
  id: number;
  farmId: number;
  name: string;
  area: number;
  soilType: string;
  plantings: Planting[];
  latestSoil: SoilTest | null;
}

export interface DashboardData {
  profile: { id: number; username: string };
  farms: Farm[];
  selectedFarmId: number;
  plots: Plot[];
  crops: Crop[];
}

export interface RotationRecommendation {
  plot: { id: number; name: string };
  lastPlanting: Planting | null;
  recommendedCrops: Crop[];
  reason: string;
  recentlyUsedFamilies: string[];
}
