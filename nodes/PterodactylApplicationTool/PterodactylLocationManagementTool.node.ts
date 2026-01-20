import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { createLocation } from "../PterodactylApplication/actions/location/createLocation.operation";
import { deleteLocation } from "../PterodactylApplication/actions/location/deleteLocation.operation";
import { getLocation } from "../PterodactylApplication/actions/location/getLocation.operation";
import { listLocations } from "../PterodactylApplication/actions/location/listLocations.operation";
import { updateLocation } from "../PterodactylApplication/actions/location/updateLocation.operation";

export class PterodactylLocationManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Location Management Tool",
		name: "pterodactylLocationManagementTool",
		icon: "file:pterodactylApplication.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: "AI-optimized location management for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl Location Management",
		},
		inputs: ["main"],
		outputs: ["main"],
		credentials: [
			{
				name: "pterodactylApplicationApi",
				required: true,
			},
		],
		properties: [
			{
				displayName: "Action",
				name: "action",
				type: "options",
				noDataExpression: true,
				options: [
					{
						name: "List Locations",
						value: "list",
						description: "List all locations in Pterodactyl Panel",
						action: "List locations",
					},
					{
						name: "Get Location",
						value: "get",
						description: "Get details of a specific location",
						action: "Get a location",
					},
					{
						name: "Create Location",
						value: "create",
						description: "Create a new location in Pterodactyl Panel",
						action: "Create a location",
					},
					{
						name: "Update Location",
						value: "update",
						description: "Update an existing location",
						action: "Update a location",
					},
					{
						name: "Delete Location",
						value: "delete",
						description: "Delete a location from Pterodactyl Panel",
						action: "Delete a location",
					},
				],
				default: "list",
				description: "The location management action to perform",
			},
			// Location ID (for get/update/delete) - AI-friendly: direct number input
			{
				displayName: "Location ID",
				name: "locationId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["get", "update", "delete"],
					},
				},
				default: 0,
				description: "The numeric ID of the location to manage",
				hint: "Use the Pterodactyl Application node to list locations and get IDs",
			},
			// Create/Update fields - simplified for AI agents
			{
				displayName: "Short Code",
				name: "short",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				default: "",
				placeholder: "us-east",
				description: "Short identifier for the location (e.g., us-east)",
			},
			{
				displayName: "Description",
				name: "long",
				type: "string",
				required: false,
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				default: "",
				placeholder: "Data center located on the US East Coast",
				description:
					"Detailed description of the location (leave empty for update to keep current)",
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const action = this.getNodeParameter("action", i) as string;

				let response: any;

				// REUSE existing operation functions instead of duplicating logic
				if (action === "list") {
					response = await listLocations.call(this, i);
				} else if (action === "get") {
					response = await getLocation.call(this, i);
				} else if (action === "create") {
					response = await createLocation.call(this, i);
				} else if (action === "update") {
					response = await updateLocation.call(this, i);
				} else if (action === "delete") {
					response = await deleteLocation.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					resultJson = {
						success: true,
						action: "listed",
						locations: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get") {
					resultJson = {
						success: true,
						action: "retrieved",
						location: response,
						timestamp: new Date().toISOString(),
					};
				} else {
					// create, update, delete
					resultJson = {
						success: true,
						action:
							action === "create"
								? "created"
								: action === "update"
									? "updated"
									: "deleted",
						locationId:
							response?.id || this.getNodeParameter("locationId", i, 0),
						short: response?.short,
						long: response?.long,
						timestamp: new Date().toISOString(),
					};
				}

				returnData.push({ json: resultJson, pairedItem: i });
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message || "Unknown error occurred",
						},
						pairedItem: i,
					});
					continue;
				}

				// Enhanced error messages for AI understanding
				const baseMessage = `Failed to execute location management action: ${error.message || "Unknown error"}`;
				const enhancedMessage = enhanceErrorMessage(
					baseMessage,
					error.response?.statusCode || error.statusCode,
				);
				throw new Error(enhancedMessage);
			}
		}

		return [returnData];
	}
}
