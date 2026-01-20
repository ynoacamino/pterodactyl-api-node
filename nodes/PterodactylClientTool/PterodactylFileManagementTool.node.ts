import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
import { compressFiles } from "../PterodactylClient/actions/file/compressFiles.operation";
import { createFolder } from "../PterodactylClient/actions/file/createFolder.operation";
import { decompressFile } from "../PterodactylClient/actions/file/decompressFile.operation";
import { deleteFile } from "../PterodactylClient/actions/file/deleteFile.operation";
import { listFiles } from "../PterodactylClient/actions/file/listFiles.operation";
// REUSE existing operation functions - DON'T duplicate logic!
import { readFile } from "../PterodactylClient/actions/file/readFile.operation";
import { writeFile } from "../PterodactylClient/actions/file/writeFile.operation";

export class PterodactylFileManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl File Management Tool",
		name: "pterodactylFileManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized file management for Pterodactyl game server files",
		defaults: {
			name: "Pterodactyl File Management",
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
						name: "List Files",
						value: "list",
						description: "List files in a directory",
						action: "List files",
					},
					{
						name: "Read File",
						value: "read",
						description: "Read content from a file",
						action: "Read a file",
					},
					{
						name: "Write File",
						value: "write",
						description: "Write or update file content",
						action: "Write to a file",
					},
					{
						name: "Delete File",
						value: "delete",
						description: "Delete a file or folder",
						action: "Delete a file",
					},
					{
						name: "Create Folder",
						value: "createFolder",
						description: "Create a new folder",
						action: "Create a folder",
					},
					{
						name: "Compress Files",
						value: "compress",
						description: "Compress files into an archive",
						action: "Compress files",
					},
					{
						name: "Decompress File",
						value: "decompress",
						description: "Extract files from an archive",
						action: "Decompress a file",
					},
				],
				default: "list",
				description: "The file management action to perform",
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
			// File path (for list/read/write/delete/decompress)
			{
				displayName: "File Path",
				name: "path",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["list", "read", "write", "delete", "decompress"],
					},
				},
				default: "",
				placeholder: "/config/server.properties",
				description:
					"Path to the file or directory relative to server root. For list action, this is the directory to list.",
			},
			// Folder name/path (for createFolder)
			{
				displayName: "Folder Path",
				name: "folderName",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["createFolder"],
					},
				},
				default: "",
				placeholder: "/backups",
				description: "Path for the new folder relative to server root",
			},
			// File content (for write)
			{
				displayName: "File Content",
				name: "content",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["write"],
					},
				},
				typeOptions: {
					rows: 10,
				},
				default: "",
				description: "Content to write to the file",
			},
			// Files to compress
			{
				displayName: "Files",
				name: "files",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["compress"],
					},
				},
				default: "",
				placeholder: "/world,/world_nether,/world_the_end",
				description: "Comma-separated list of file/folder paths to compress",
			},
			// Root path (for compress/decompress)
			{
				displayName: "Root Path",
				name: "root",
				type: "string",
				displayOptions: {
					show: {
						action: ["compress", "decompress"],
					},
				},
				default: "/",
				description: "Root directory for the operation",
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
					response = await listFiles.call(this, i);
				} else if (action === "read") {
					response = await readFile.call(this, i);
				} else if (action === "write") {
					response = await writeFile.call(this, i);
				} else if (action === "delete") {
					response = await deleteFile.call(this, i);
				} else if (action === "createFolder") {
					response = await createFolder.call(this, i);
				} else if (action === "compress") {
					response = await compressFiles.call(this, i);
				} else if (action === "decompress") {
					response = await decompressFile.call(this, i);
				}

				// Transform response to AI-friendly format
				const resultJson: any = {
					success: true,
					action,
					serverId: this.getNodeParameter("serverId", i),
					timestamp: new Date().toISOString(),
				};

				// Add action-specific data
				if (action === "list") {
					resultJson.files = response;
					resultJson.path = this.getNodeParameter("path", i);
					resultJson.count = Array.isArray(response) ? response.length : 0;
				} else if (action === "read") {
					resultJson.fileContent = response;
					resultJson.filePath = this.getNodeParameter("path", i);
				} else if (action === "write") {
					resultJson.filePath = this.getNodeParameter("path", i);
				} else if (action === "delete") {
					resultJson.deletedPath = this.getNodeParameter("path", i);
				} else if (action === "createFolder") {
					resultJson.folderPath = this.getNodeParameter("folderName", i);
				} else if (action === "compress") {
					resultJson.compressedFiles = this.getNodeParameter("files", i);
				} else if (action === "decompress") {
					resultJson.archivePath = this.getNodeParameter("path", i);
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
				const baseMessage = `Failed to execute file management action: ${error.message || "Unknown error"}`;
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
