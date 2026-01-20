import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
import { createBackup } from "../PterodactylClient/actions/backup/createBackup.operation";
import { deleteBackup } from "../PterodactylClient/actions/backup/deleteBackup.operation";
import { getBackup } from "../PterodactylClient/actions/backup/getBackup.operation";
// REUSE existing operation functions - DON'T duplicate logic!
import { listBackups } from "../PterodactylClient/actions/backup/listBackups.operation";
import { restoreBackup } from "../PterodactylClient/actions/backup/restoreBackup.operation";

export class PterodactylBackupManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Backup Management Tool",
		name: "pterodactylBackupManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: "AI-optimized backup management for Pterodactyl game servers",
		defaults: {
			name: "Pterodactyl Backup Management",
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
						name: "List Backups",
						value: "list",
						description: "List all backups for the server",
						action: "List backups",
					},
					{
						name: "Get Backup",
						value: "get",
						description: "Get details of a specific backup",
						action: "Get a backup",
					},
					{
						name: "Create Backup",
						value: "create",
						description: "Create a new backup of the server",
						action: "Create a backup",
					},
					{
						name: "Restore Backup",
						value: "restore",
						description: "Restore a server from backup",
						action: "Restore a backup",
					},
					{
						name: "Delete Backup",
						value: "delete",
						description: "Delete a backup",
						action: "Delete a backup",
					},
				],
				default: "list",
				description: "The backup management action to perform",
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
			// Backup UUID (for get/restore/delete)
			{
				displayName: "Backup UUID",
				name: "backupId",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["get", "restore", "delete"],
					},
				},
				default: "",
				description: "The UUID of the backup",
				hint: "Use the Pterodactyl Client node to list backups and get UUIDs",
			},
			// Create backup options
			{
				displayName: "Backup Name",
				name: "name",
				type: "string",
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				placeholder: "my-backup",
				description: "Optional backup name (auto-generated if not provided)",
			},
			{
				displayName: "Ignored Files",
				name: "ignored",
				type: "string",
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				placeholder: "*.log,cache/*",
				description:
					"Comma-separated list of file patterns to exclude from backup",
			},
			// Restore backup options
			{
				displayName: "Delete Files",
				name: "deleteFiles",
				type: "boolean",
				displayOptions: {
					show: {
						action: ["restore"],
					},
				},
				default: false,
				description:
					"Whether to delete existing files before restoring (dangerous!)",
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
					response = await listBackups.call(this, i);
				} else if (action === "get") {
					response = await getBackup.call(this, i);
				} else if (action === "create") {
					response = await createBackup.call(this, i);
				} else if (action === "restore") {
					response = await restoreBackup.call(this, i);
				} else if (action === "delete") {
					response = await deleteBackup.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					// Return array of backups
					resultJson = {
						success: true,
						action: "listed",
						serverId: this.getNodeParameter("serverId", i),
						backups: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get") {
					// Return single backup details
					resultJson = {
						success: true,
						action: "retrieved",
						serverId: this.getNodeParameter("serverId", i),
						backup: response,
						timestamp: new Date().toISOString(),
					};
				} else {
					// create, restore, delete actions
					resultJson = {
						success: true,
						action:
							action === "create"
								? "created"
								: action === "restore"
									? "restored"
									: "deleted",
						serverId: this.getNodeParameter("serverId", i),
						backupId:
							response?.uuid || this.getNodeParameter("backupId", i, ""),
						backupName: response?.name,
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
				const baseMessage = `Failed to execute backup management action: ${error.message || "Unknown error"}`;
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
