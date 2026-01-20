import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { pterodactylApiRequest } from "../../shared/transport";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
import { getResources } from "../PterodactylClient/actions/server/getResources.operation";
import { getServer } from "../PterodactylClient/actions/server/getServer.operation";
import { listServers } from "../PterodactylClient/actions/server/listServers.operation";
// REUSE existing operation functions - DON'T duplicate logic!
import { sendCommand } from "../PterodactylClient/actions/server/sendCommand.operation";

export class PterodactylServerControlTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Server Control Tool",
		name: "pterodactylServerControlTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized server control (power and commands) for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl Server Control",
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
						name: "List Servers",
						value: "list",
						description: "List all servers the user has access to",
						action: "List servers",
					},
					{
						name: "Get Server",
						value: "get",
						description: "Get details of a specific server",
						action: "Get a server",
					},
					{
						name: "Get Server Resources",
						value: "getResources",
						description: "Get resource usage of a specific server",
						action: "Get server resources",
					},
					{
						name: "Start Server",
						value: "start",
						description: "Start the server",
						action: "Start a server",
					},
					{
						name: "Stop Server",
						value: "stop",
						description: "Stop the server gracefully",
						action: "Stop a server",
					},
					{
						name: "Restart Server",
						value: "restart",
						description: "Restart the server",
						action: "Restart a server",
					},
					{
						name: "Kill Server",
						value: "kill",
						description: "Force kill the server",
						action: "Kill a server",
					},
					{
						name: "Send Command",
						value: "command",
						description: "Send a console command to the server",
						action: "Send command to server",
					},
				],
				default: "list",
				description: "The server control action to perform",
			},
			// Server ID - AI-friendly: direct string input
			{
				displayName: "Server ID",
				name: "serverId",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: [
							"get",
							"getResources",
							"start",
							"stop",
							"restart",
							"kill",
							"command",
						],
					},
				},
				default: "",
				description: "The server identifier (UUID or short ID)",
				hint: "Use the Pterodactyl Client node to list servers and get IDs",
			},
			// Command (for send command action)
			{
				displayName: "Command",
				name: "command",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["command"],
					},
				},
				default: "",
				placeholder: "say Hello from AI!",
				description: "The console command to send to the server",
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const action = this.getNodeParameter("action", i) as string;

				let resultJson: any;
				let response: any;

				// REUSE existing operation functions instead of duplicating logic
				if (action === "list") {
					response = await listServers.call(this, i);
					resultJson = {
						success: true,
						action: "listed",
						servers: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get") {
					response = await getServer.call(this, i);
					resultJson = {
						success: true,
						action: "retrieved",
						server: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "getResources") {
					response = await getResources.call(this, i);
					resultJson = {
						success: true,
						action: "retrieved_resources",
						serverId: this.getNodeParameter("serverId", i),
						resources: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "command") {
					const serverId = this.getNodeParameter("serverId", i) as string;
					await sendCommand.call(this, i);
					resultJson = {
						success: true,
						serverId,
						action: "command_sent",
						command: this.getNodeParameter("command", i),
						timestamp: new Date().toISOString(),
					};
				} else {
					// For power actions (start, stop, restart, kill)
					const serverId = this.getNodeParameter("serverId", i) as string;
					await this.getCredentials("pterodactylClientApi", i);

					await pterodactylApiRequest.call(
						this,
						"POST",
						"/api/client",
						`/servers/${serverId}/power`,
						{
							signal: action,
						},
						{},
						{},
						i,
					);

					resultJson = {
						success: true,
						serverId,
						action,
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
				const baseMessage = `Failed to execute server control action: ${error.message || "Unknown error"}`;
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
