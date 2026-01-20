import type { IExecuteFunctions, INodeProperties } from "n8n-workflow";
import { pterodactylApiRequest } from "../../../../shared/transport";

export const listLocationsOperation: INodeProperties[] = [];

export async function listLocations(
  this: IExecuteFunctions,
  index: number,
): Promise<any> {
  const response = await pterodactylApiRequest.call(
    this,
    "GET",
    "/api/application",
    `/locations`,
    {},
    {},
    {},
    index,
  );
  // Extract attributes from each location object
  const locations = (response.data || []).map(
    (location: any) => location.attributes || location,
  );
  return locations;
}
