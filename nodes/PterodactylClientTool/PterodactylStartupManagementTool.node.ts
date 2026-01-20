import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { getStartupVariables } from "../PterodactylClient/actions/startup/getStartupVariables.operation";
import { updateStartupVariable } from "../PterodactylClient/actions/startup/updateStartupVariable.operation";

export class PterodactylStartupManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Startup Management Tool",
		name: "pterodactylStartupManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized startup variable management for Pterodactyl game servers",
		defaults: {
			name: "Pterodactyl Startup Management",
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
						name: "Get Variables",
						value: "get",
						description: "Retrieve all startup variables for the server",
						action: "Get startup variables",
					},
					{
						name: "Update Variable",
						value: "update",
						description: "Update the value of a startup variable",
						action: "Update startup variable",
					},
				],
				default: "get",
				description: "The startup management action to perform",
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
			// Variable key (for update)
			{
				displayName: "Variable Key",
				name: "key",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				placeholder: "SERVER_PORT",
				description:
					"The environment variable key to update (e.g., SERVER_PORT, MAX_PLAYERS)",
			},
			// Variable value (for update)
			{
				displayName: "Variable Value",
				name: "value",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				placeholder: "25565",
				description: "The new value for the variable",
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
				if (action === "get") {
					response = await getStartupVariables.call(this, i);
				} else if (action === "update") {
					response = await updateStartupVariable.call(this, i);
				}

				// Transform response to AI-friendly format
				const resultJson: any = {
					success: true,
					action,
					serverId: this.getNodeParameter("serverId", i),
					timestamp: new Date().toISOString(),
				};

				if (action === "get") {
					resultJson.variables = response;
				} else if (action === "update") {
					resultJson.variableKey = this.getNodeParameter("key", i);
					resultJson.variableValue = this.getNodeParameter("value", i);
					if (response) {
						resultJson.updatedVariable = response;
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
				const baseMessage = `Failed to execute startup management action: ${error.message || "Unknown error"}`;
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
