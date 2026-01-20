import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { getNest } from "../PterodactylApplication/actions/nest/getNest.operation";
import { getNestEgg } from "../PterodactylApplication/actions/nest/getNestEgg.operation";
import { listNestEggs } from "../PterodactylApplication/actions/nest/listNestEggs.operation";
import { listNests } from "../PterodactylApplication/actions/nest/listNests.operation";

export class PterodactylNestManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Nest Management Tool",
		name: "pterodactylNestManagementTool",
		icon: "file:pterodactylApplication.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized nest and egg information retrieval for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl Nest Management",
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
						name: "Get Nest",
						value: "getNest",
						description: "Get information about a specific nest",
						action: "Get a nest",
					},
					{
						name: "List Nests",
						value: "listNests",
						description: "List all available nests",
						action: "List all nests",
					},
					{
						name: "Get Nest Egg",
						value: "getNestEgg",
						description: "Get information about a specific egg in a nest",
						action: "Get a nest egg",
					},
					{
						name: "List Nest Eggs",
						value: "listNestEggs",
						description: "List all eggs in a specific nest",
						action: "List nest eggs",
					},
				],
				default: "listNests",
				description: "The nest management action to perform",
			},
			// Nest ID - AI-friendly: direct number input
			{
				displayName: "Nest ID",
				name: "nestId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["getNest", "getNestEgg", "listNestEggs"],
					},
				},
				default: 0,
				description: "The numeric ID of the nest",
				hint: 'Use "List Nests" action to get available nest IDs',
			},
			// Egg ID (for get specific egg)
			{
				displayName: "Egg ID",
				name: "eggId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["getNestEgg"],
					},
				},
				default: 0,
				description: "The numeric ID of the egg",
				hint: 'Use "List Nest Eggs" action to get available egg IDs',
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
				if (action === "getNest") {
					response = await getNest.call(this, i);
				} else if (action === "listNests") {
					response = await listNests.call(this, i);
				} else if (action === "getNestEgg") {
					response = await getNestEgg.call(this, i);
				} else if (action === "listNestEggs") {
					response = await listNestEggs.call(this, i);
				}

				// Transform response to AI-friendly format
				const resultJson = {
					success: true,
					action,
					data: response,
					timestamp: new Date().toISOString(),
				};

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
				const baseMessage = `Failed to execute nest management action: ${error.message || "Unknown error"}`;
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
