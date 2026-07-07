import { filterProperties, parseFilter } from "./filter";
import { getPropertyById, listAllProperties, queryByBoundingBox } from "./properties";
import { parseBoundingBox } from "./geo";

export type ApiRequest = {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
};

export type ApiResponse = {
  statusCode: number;
  body: unknown;
};

/**
 * Framework-agnostic request router shared by the Lambda handler (production)
 * and the local dev server. Keeps the HTTP plumbing in one place so the same
 * logic runs in both environments.
 */
export async function route(req: ApiRequest): Promise<ApiResponse> {
  if (req.method !== "GET") {
    return { statusCode: 405, body: { error: "Method not allowed" } };
  }

  if (req.path === "/health") {
    return { statusCode: 200, body: { ok: true } };
  }

  // GET /properties/:id
  const detailMatch = req.path.match(/^\/properties\/([^/]+)$/);
  if (detailMatch) {
    const property = await getPropertyById(decodeURIComponent(detailMatch[1]));
    if (!property) {
      return { statusCode: 404, body: { error: "Property not found" } };
    }
    return { statusCode: 200, body: { property } };
  }


  // GET /properties
  if (req.path === "/properties") {
    if(req.query.bbox && req.query.bbox != "") {
      const box = parseBoundingBox(req.query.bbox);
      if(!box) {
        return { statusCode: 400, body: { error: "Invalid bounding box" } };
      }

      const properties = await queryByBoundingBox(box);
      const filteredProperties = filterProperties(properties, parseFilter(req.query));
      return { statusCode: 200, body: { properties: filteredProperties, count: filteredProperties.length } };
    } 
    
    const all = await listAllProperties();
    const properties = filterProperties(all, parseFilter(req.query));
    return { statusCode: 200, body: { properties, count: properties.length } };
  }

  return { statusCode: 404, body: { error: "Not found" } };
}
