declare module "all-the-cities" {
  export type CityRecord = {
    cityId: number;
    name: string;
    altName?: string;
    country: string;
    featureCode?: string;
    adminCode?: string;
    population: number;
    loc: { type: "Point"; coordinates: [number, number] };
  };

  const cities: CityRecord[];
  export default cities;
}
