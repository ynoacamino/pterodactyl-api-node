import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { createNode } from "../PterodactylApplication/actions/node/createNode.operation";
import { createNodeAllocations } from "../PterodactylApplication/actions/node/createNodeAllocations.operation";
import { deleteNode } from "../PterodactylApplication/actions/node/deleteNode.operation";
import { deleteNodeAllocation } from "../PterodactylApplication/actions/node/deleteNodeAllocation.operation";
import { getNode } from "../PterodactylApplication/actions/node/getNode.operation";
import { getNodeConfiguration } from "../PterodactylApplication/actions/node/getNodeConfiguration.operation";
import { listNodeAllocations } from "../PterodactylApplication/actions/node/listNodeAllocations.operation";
import { listNodes } from "../PterodactylApplication/actions/node/listNodes.operation";
import { updateNode } from "../PterodactylApplication/actions/node/updateNode.operation";

export class PterodactylNodeManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Node Management Tool",
		name: "pterodactylNodeManagementTool",
		icon: "file:pterodactylApplication.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized node (infrastructure) management for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl Node Management",
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
						name: "List Nodes",
						value: "list",
						description: "List all nodes in Pterodactyl Panel",
						action: "List nodes",
					},
					{
						name: "Get Node",
						value: "get",
						description: "Get details of a specific node",
						action: "Get a node",
					},
					{
						name: "Get Node Configuration",
						value: "getConfiguration",
						description: "Get configuration details for Wings daemon",
						action: "Get node configuration",
					},
					{
						name: "List Node Allocations",
						value: "listAllocations",
						description: "List all IP allocations for a node",
						action: "List node allocations",
					},
					{
						name: "Create Node",
						value: "create",
						description:
							"Create a new node (infrastructure) in Pterodactyl Panel",
						action: "Create a node",
					},
					{
						name: "Update Node",
						value: "update",
						description: "Update an existing node",
						action: "Update a node",
					},
					{
						name: "Delete Node",
						value: "delete",
						description: "Delete a node from Pterodactyl Panel",
						action: "Delete a node",
					},
					{
						name: "Create Node Allocations",
						value: "createAllocations",
						description: "Create IP allocations for a node",
						action: "Create node allocations",
					},
					{
						name: "Delete Node Allocation",
						value: "deleteAllocation",
						description: "Delete an IP allocation from a node",
						action: "Delete node allocation",
					},
				],
				default: "list",
				description: "The node management action to perform",
			},
			// Node ID - AI-friendly: direct number input
			{
				displayName: "Node ID",
				name: "nodeId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: [
							"get",
							"getConfiguration",
							"listAllocations",
							"update",
							"delete",
							"createAllocations",
							"deleteAllocation",
						],
					},
				},
				default: 0,
				description: "The numeric ID of the node to manage",
				hint: "Use the Pterodactyl Application node to list nodes and get IDs",
			},
			// Allocation ID (for delete allocation)
			{
				displayName: "Allocation ID",
				name: "allocationId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["deleteAllocation"],
					},
				},
				default: 0,
				description: "The numeric ID of the allocation to delete",
			},
			// Create Node fields - basic required fields for AI
			{
				displayName: "Name",
				name: "name",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				description: "Node name",
			},
			{
				displayName: "Location ID",
				name: "locationId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: 0,
				description: "The numeric ID of the location for this node",
			},
			{
				displayName: "FQDN",
				name: "fqdn",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				placeholder: "node.example.com",
				description: "Fully qualified domain name for the node",
			},
			{
				displayName: "Scheme",
				name: "scheme",
				type: "options",
				options: [
					{ name: "HTTP", value: "http" },
					{ name: "HTTPS", value: "https" },
				],
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "https",
				description: "Connection scheme (HTTP or HTTPS)",
			},
			{
				displayName: "Memory (MB)",
				name: "memory",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: 0,
				description: "Total memory in megabytes",
			},
			{
				displayName: "Disk (MB)",
				name: "disk",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: 0,
				description: "Total disk space in megabytes",
			},
			// Create Allocations fields
			{
				displayName: "IP Address",
				name: "ip",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["createAllocations"],
					},
				},
				default: "",
				placeholder: "192.168.1.100",
				description: "IP address for the allocation",
			},
			{
				displayName: "Ports",
				name: "ports",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["createAllocations"],
					},
				},
				default: "",
				placeholder: "25565,25566-25570",
				description: "Ports or port ranges (comma-separated)",
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
					response = await listNodes.call(this, i);
				} else if (action === "get") {
					response = await getNode.call(this, i);
				} else if (action === "getConfiguration") {
					response = await getNodeConfiguration.call(this, i);
				} else if (action === "listAllocations") {
					response = await listNodeAllocations.call(this, i);
				} else if (action === "create") {
					response = await createNode.call(this, i);
				} else if (action === "update") {
					response = await updateNode.call(this, i);
				} else if (action === "delete") {
					response = await deleteNode.call(this, i);
				} else if (action === "createAllocations") {
					response = await createNodeAllocations.call(this, i);
				} else if (action === "deleteAllocation") {
					response = await deleteNodeAllocation.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					resultJson = {
						success: true,
						action: "listed",
						nodes: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get") {
					resultJson = {
						success: true,
						action: "retrieved",
						node: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "getConfiguration") {
					resultJson = {
						success: true,
						action: "retrieved_configuration",
						configuration: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "listAllocations") {
					resultJson = {
						success: true,
						action: "listed_allocations",
						nodeId: this.getNodeParameter("nodeId", i),
						allocations: response,
						count: Array.isArray(response) ? response.length : 0,
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
									: action === "delete"
										? "deleted"
										: action === "createAllocations"
											? "allocations_created"
											: "allocation_deleted",
						nodeId: response?.id || this.getNodeParameter("nodeId", i, 0),
						name: response?.name,
						fqdn: response?.fqdn,
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
				const baseMessage = `Failed to execute node management action: ${error.message || "Unknown error"}`;
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
