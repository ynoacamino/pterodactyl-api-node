import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
import { deleteServer } from "../PterodactylApplication/actions/server/deleteServer.operation";
import { forceDeleteServer } from "../PterodactylApplication/actions/server/forceDeleteServer.operation";
import { getServer } from "../PterodactylApplication/actions/server/getServer.operation";
import { getServerByExternalId } from "../PterodactylApplication/actions/server/getServerByExternalId.operation";
import { listServers } from "../PterodactylApplication/actions/server/listServers.operation";
import { reinstallServer } from "../PterodactylApplication/actions/server/reinstallServer.operation";
// REUSE existing operation functions - DON'T duplicate logic!
import { suspendServer } from "../PterodactylApplication/actions/server/suspendServer.operation";
import { unsuspendServer } from "../PterodactylApplication/actions/server/unsuspendServer.operation";

export class PterodactylServerManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Server Management Tool",
		name: "pterodactylServerManagementTool",
		icon: "file:pterodactylApplication.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: "AI-optimized server management for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl Server Management",
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
						name: "List Servers",
						value: "list",
						description: "List all servers in Pterodactyl Panel",
						action: "List servers",
					},
					{
						name: "Get Server",
						value: "get",
						description: "Get details of a specific server by ID",
						action: "Get a server",
					},
					{
						name: "Get Server By External ID",
						value: "getByExternalId",
						description: "Get server details by external ID",
						action: "Get server by external ID",
					},
					{
						name: "Suspend Server",
						value: "suspend",
						description: "Suspend a server to prevent it from running",
						action: "Suspend a server",
					},
					{
						name: "Unsuspend Server",
						value: "unsuspend",
						description: "Unsuspend a server to allow it to run again",
						action: "Unsuspend a server",
					},
					{
						name: "Reinstall Server",
						value: "reinstall",
						description: "Reinstall a server (wipes and reinstalls)",
						action: "Reinstall a server",
					},
					{
						name: "Delete Server",
						value: "delete",
						description: "Delete a server permanently",
						action: "Delete a server",
					},
					{
						name: "Force Delete Server",
						value: "forceDelete",
						description: "Force delete a server (bypasses normal cleanup)",
						action: "Force delete a server",
					},
				],
				default: "list",
				description: "The server management action to perform",
			},
			// External ID (for getByExternalId)
			{
				displayName: "External ID",
				name: "externalId",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["getByExternalId"],
					},
				},
				default: "",
				description: "The external ID of the server",
			},
			{
				displayName: "Server ID",
				name: "serverId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: [
							"get",
							"suspend",
							"unsuspend",
							"reinstall",
							"delete",
							"forceDelete",
						],
					},
				},
				default: 0,
				description: "The numeric ID of the server to manage",
				hint: "Use the Pterodactyl Application node to list servers and get IDs",
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

				// REUSE existing operation functions - single source of truth!
				if (action === "list") {
					response = await listServers.call(this, i);
				} else if (action === "get") {
					response = await getServer.call(this, i);
				} else if (action === "getByExternalId") {
					response = await getServerByExternalId.call(this, i);
				} else if (action === "suspend") {
					response = await suspendServer.call(this, i);
				} else if (action === "unsuspend") {
					response = await unsuspendServer.call(this, i);
				} else if (action === "reinstall") {
					response = await reinstallServer.call(this, i);
				} else if (action === "delete") {
					response = await deleteServer.call(this, i);
				} else if (action === "forceDelete") {
					response = await forceDeleteServer.call(this, i);
				}

				// Transform response to AI-friendly format
				let json: any;

				if (action === "list") {
					json = {
						success: true,
						action: "listed",
						servers: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get" || action === "getByExternalId") {
					json = {
						success: true,
						action: "retrieved",
						server: response,
						timestamp: new Date().toISOString(),
					};
				} else {
					json = {
						success: true,
						serverId: this.getNodeParameter("serverId", i),
						action: response?.action || action,
						timestamp: new Date().toISOString(),
					};
				}

				returnData.push({ json, pairedItem: i });
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

				// Enhanced error message for better AI understanding
				const baseMessage = `Failed to execute server management action: ${error.message || "Unknown error"}`;
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
