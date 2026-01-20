import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// Import existing operation functions - REUSE, don't duplicate!
import { createUser } from "../PterodactylApplication/actions/user/createUser.operation";
import { deleteUser } from "../PterodactylApplication/actions/user/deleteUser.operation";
import { getUser } from "../PterodactylApplication/actions/user/getUser.operation";
import { getUserByExternalId } from "../PterodactylApplication/actions/user/getUserByExternalId.operation";
import { listUsers } from "../PterodactylApplication/actions/user/listUsers.operation";
import { updateUser } from "../PterodactylApplication/actions/user/updateUser.operation";

export class PterodactylUserManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl User Management Tool",
		name: "pterodactylUserManagementTool",
		icon: "file:pterodactylApplication.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: "AI-optimized user management for Pterodactyl Panel",
		defaults: {
			name: "Pterodactyl User Management",
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
						name: "List Users",
						value: "list",
						description: "List all users in Pterodactyl Panel",
						action: "List users",
					},
					{
						name: "Get User",
						value: "get",
						description: "Get details of a specific user by ID",
						action: "Get a user",
					},
					{
						name: "Get User By External ID",
						value: "getByExternalId",
						description: "Get user details by external ID",
						action: "Get user by external ID",
					},
					{
						name: "Create User",
						value: "create",
						description: "Create a new user in Pterodactyl Panel",
						action: "Create a user",
					},
					{
						name: "Update User",
						value: "update",
						description: "Update an existing user",
						action: "Update a user",
					},
					{
						name: "Delete User",
						value: "delete",
						description: "Delete a user from Pterodactyl Panel",
						action: "Delete a user",
					},
				],
				default: "list",
				description: "The user management action to perform",
			},
			// User ID (for get/update/delete) - AI-friendly: direct number input
			{
				displayName: "User ID",
				name: "userId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["get", "update", "delete"],
					},
				},
				default: 0,
				description: "The numeric ID of the user to manage",
				hint: "Use the Pterodactyl Application node to list users and get IDs",
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
				description: "The external ID of the user",
			},
			// Create/Update fields - simplified for AI agents
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
				description: "Email address for the user",
			},
			{
				displayName: "Email",
				name: "email",
				type: "string",
				required: false,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				placeholder: "user@example.com",
				description: "New email address (leave empty to keep current)",
			},
			{
				displayName: "Username",
				name: "username",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				description: "Username for the user",
			},
			{
				displayName: "Username",
				name: "username",
				type: "string",
				required: false,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				description: "New username (leave empty to keep current)",
			},
			{
				displayName: "First Name",
				name: "firstName",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				description: "First name of the user",
			},
			{
				displayName: "First Name",
				name: "firstName",
				type: "string",
				required: false,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				description: "New first name (leave empty to keep current)",
			},
			{
				displayName: "Last Name",
				name: "lastName",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				default: "",
				description: "Last name of the user",
			},
			{
				displayName: "Last Name",
				name: "lastName",
				type: "string",
				required: false,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				default: "",
				description: "New last name (leave empty to keep current)",
			},
			// Optional fields
			{
				displayName: "External ID",
				name: "externalId",
				type: "string",
				default: "",
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				description: "External ID for integration with other systems",
			},
			{
				displayName: "Password",
				name: "password",
				type: "string",
				typeOptions: {
					password: true,
				},
				default: "",
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				description: "Password (auto-generated if not provided for create)",
			},
			{
				displayName: "Language",
				name: "language",
				type: "string",
				default: "en",
				displayOptions: {
					show: {
						action: ["create", "update"],
					},
				},
				description: 'User\'s preferred language (default: "en")',
			},
			{
				displayName: "Root Admin",
				name: "rootAdmin",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						action: ["create"],
					},
				},
				description: "Whether the user should have administrator privileges",
			},
			{
				displayName: "Update Root Admin",
				name: "updateRootAdmin",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						action: ["update"],
					},
				},
				description: "Check to change root admin status",
			},
			{
				displayName: "Root Admin",
				name: "rootAdmin",
				type: "boolean",
				default: false,
				displayOptions: {
					show: {
						action: ["update"],
						updateRootAdmin: [true],
					},
				},
				description: "Whether the user should have administrator privileges",
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
					response = await listUsers.call(this, i);
				} else if (action === "get") {
					response = await getUser.call(this, i);
				} else if (action === "getByExternalId") {
					response = await getUserByExternalId.call(this, i);
				} else if (action === "create") {
					response = await createUser.call(this, i);
				} else if (action === "update") {
					response = await updateUser.call(this, i);
				} else if (action === "delete") {
					response = await deleteUser.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "list") {
					resultJson = {
						success: true,
						action: "listed",
						users: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "get" || action === "getByExternalId") {
					resultJson = {
						success: true,
						action: "retrieved",
						user: response,
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
						userId: response?.id || this.getNodeParameter("userId", i, 0),
						email: response?.email,
						username: response?.username,
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
				const baseMessage = `Failed to execute user management action: ${error.message || "Unknown error"}`;
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
