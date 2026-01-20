import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { assignAllocation } from "../PterodactylClient/actions/network/assignAllocation.operation";
import { deleteAllocation } from "../PterodactylClient/actions/network/deleteAllocation.operation";
import { listAllocations } from "../PterodactylClient/actions/network/listAllocations.operation";
import { setPrimary } from "../PterodactylClient/actions/network/setPrimary.operation";
import { updateNotes } from "../PterodactylClient/actions/network/updateNotes.operation";

export class PterodactylNetworkManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Network Management Tool",
		name: "pterodactylNetworkManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized network allocation management for Pterodactyl game servers",
		defaults: {
			name: "Pterodactyl Network Management",
		},
		inputs: ["main"],
		outputs: ["main"],
		credentials: [
			{
				name: "pterodactylClientApi",
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
						name: "List Allocations",
						value: "list",
						description: "List all network allocations for the server",
						action: "List network allocations",
					},
					{
						name: "Assign Allocation",
						value: "assign",
						description: "Assign a new network allocation to the server",
						action: "Assign a network allocation",
					},
					{
						name: "Delete Allocation",
						value: "delete",
						description: "Remove a network allocation from the server",
						action: "Delete a network allocation",
					},
					{
						name: "Set Primary",
						value: "setPrimary",
						description: "Set an allocation as the primary server address",
						action: "Set primary allocation",
					},
					{
						name: "Update Notes",
						value: "updateNotes",
						description: "Update notes for a network allocation",
						action: "Update allocation notes",
					},
				],
				default: "list",
				description: "The network management action to perform",
			},
			// Server ID - AI-friendly: direct string input
			{
				displayName: "Server ID",
				name: "serverId",
				type: "string",
				required: true,
				default: "",
				description: "The server identifier (UUID or short ID)",
				hint: "Use the Pterodactyl Client node to list servers and get IDs",
			},
			// Allocation ID (for delete, setPrimary, updateNotes)
			{
				displayName: "Allocation ID",
				name: "allocationId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["delete", "setPrimary", "updateNotes"],
					},
				},
				default: 0,
				description: "The numeric ID of the allocation",
				hint: "Use the Pterodactyl Client node to list allocations and get IDs",
			},
			// Notes (for updateNotes)
			{
				displayName: "Notes",
				name: "notes",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["updateNotes"],
					},
				},
				default: "",
				placeholder: "Main game port",
				description: "Notes to describe the allocation purpose",
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
					response = await listAllocations.call(this, i);
				} else if (action === "assign") {
					response = await assignAllocation.call(this, i);
				} else if (action === "delete") {
					response = await deleteAllocation.call(this, i);
				} else if (action === "setPrimary") {
					response = await setPrimary.call(this, i);
				} else if (action === "updateNotes") {
					response = await updateNotes.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					resultJson = {
						success: true,
						action: "listed",
						serverId: this.getNodeParameter("serverId", i),
						allocations: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else {
					resultJson = {
						success: true,
						action,
						serverId: this.getNodeParameter("serverId", i),
						timestamp: new Date().toISOString(),
					};

					if (action !== "delete" && action !== "assign") {
						resultJson.allocationId = this.getNodeParameter("allocationId", i);
					}

					if (response) {
						resultJson.allocation = response;
					}
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
				const baseMessage = `Failed to execute network management action: ${error.message || "Unknown error"}`;
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
