import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { createSubuser } from "../PterodactylClient/actions/subuser/createSubuser.operation";
import { deleteSubuser } from "../PterodactylClient/actions/subuser/deleteSubuser.operation";
import { getPermissions } from "../PterodactylClient/actions/subuser/getPermissions.operation";
import { getSubuser } from "../PterodactylClient/actions/subuser/getSubuser.operation";
import { listSubusers } from "../PterodactylClient/actions/subuser/listSubusers.operation";
import { updateSubuser } from "../PterodactylClient/actions/subuser/updateSubuser.operation";

export class PterodactylSubuserManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Subuser Management Tool",
		name: "pterodactylSubuserManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized subuser permission management for Pterodactyl game servers",
		defaults: {
			name: "Pterodactyl Subuser Management",
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
						name: "List Subusers",
						value: "list",
						description: "List all subusers for the server",
						action: "List subusers",
					},
					{
						name: "Get Subuser",
						value: "get",
						description: "Get details of a specific subuser",
						action: "Get a subuser",
					},
					{
						name: "Get Permissions",
						value: "getPermissions",
						description: "Get available permission options",
						action: "Get available permissions",
					},
					{
						name: "Create Subuser",
						value: "create",
						description: "Add a new subuser to the server",
						action: "Create a subuser",
					},
					{
						name: "Update Subuser",
						value: "update",
						description: "Update subuser permissions",
						action: "Update a subuser",
					},
					{
						name: "Delete Subuser",
						value: "delete",
						description: "Remove a subuser from the server",
						action: "Delete a subuser",
					},
				],
				default: "list",
				description: "The subuser management action to perform",
			},
			// Server ID - AI-friendly: direct string input
			{
				displayName: "Server ID",
				name: "serverId",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["list", "get", "create", "update", "delete"],
					},
				},
				default: "",
				description: "The server identifier (UUID or short ID)",
				hint: "Use the Pterodactyl Client node to list servers and get IDs",
			},
			// Subuser UUID (for get/update/delete)
			{
				displayName: "Subuser UUID",
				name: "subuserId",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["get", "update", "delete"],
					},
				},
				default: "",
				description: "The UUID of the subuser",
				hint: "Use the Pterodactyl Client node to list subusers and get UUIDs",
			},
			// Email (for create)
			{
				displayName: "Email",
				name: "email",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				placeholder: "user@example.com",
				description: "Email address of the user to add as subuser",
			},
			// Permissions (for create/update)
			{
				displayName: "Permissions",
				name: "permissions",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				default: "",
				placeholder: "control.console,control.start,control.stop",
				description:
					"Comma-separated list of permission nodes (e.g., control.console, control.start, file.read)",
				hint: "Common permissions: control.console, control.start, control.stop, control.restart, file.read, file.write, backup.create",
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
					response = await listSubusers.call(this, i);
				} else if (action === "get") {
					response = await getSubuser.call(this, i);
				} else if (action === "getPermissions") {
					response = await getPermissions.call(this, i);
				} else if (action === "create") {
					response = await createSubuser.call(this, i);
				} else if (action === "update") {
					response = await updateSubuser.call(this, i);
				} else if (action === "delete") {
					response = await deleteSubuser.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					resultJson = {
						success: true,
						action: "listed",
						serverId: this.getNodeParameter("serverId", i),
						subusers: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get") {
					resultJson = {
						success: true,
						action: "retrieved",
						serverId: this.getNodeParameter("serverId", i),
						subuser: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "getPermissions") {
					resultJson = {
						success: true,
						action: "retrieved_permissions",
						permissions: response,
						timestamp: new Date().toISOString(),
					};
				} else {
					resultJson = {
						success: true,
						action:
							action === "create"
								? "created"
								: action === "update"
									? "updated"
									: "deleted",
						serverId: this.getNodeParameter("serverId", i),
						timestamp: new Date().toISOString(),
					};

					if (action === "create") {
						resultJson.email = this.getNodeParameter("email", i);
						resultJson.subuserId = response?.uuid;
					} else {
						resultJson.subuserId = this.getNodeParameter("subuserId", i);
					}

					if (action !== "delete" && response) {
						resultJson.permissions = response?.permissions || [];
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
				const baseMessage = `Failed to execute subuser management action: ${error.message || "Unknown error"}`;
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
