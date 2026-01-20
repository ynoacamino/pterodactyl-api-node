import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from "n8n-workflow";
import { enhanceErrorMessage } from "../../shared/utils/errorHandling";
// REUSE existing operation functions - DON'T duplicate logic!
import { createSchedule } from "../PterodactylClient/actions/schedule/createSchedule.operation";
import { createTask } from "../PterodactylClient/actions/schedule/createTask.operation";
import { deleteSchedule } from "../PterodactylClient/actions/schedule/deleteSchedule.operation";
import { deleteTask } from "../PterodactylClient/actions/schedule/deleteTask.operation";
import { executeSchedule } from "../PterodactylClient/actions/schedule/executeSchedule.operation";
import { getSchedule } from "../PterodactylClient/actions/schedule/getSchedule.operation";
import { listSchedules } from "../PterodactylClient/actions/schedule/listSchedules.operation";
import { listScheduleTasks } from "../PterodactylClient/actions/schedule/listScheduleTasks.operation";
import { updateSchedule } from "../PterodactylClient/actions/schedule/updateSchedule.operation";
import { updateTask } from "../PterodactylClient/actions/schedule/updateTask.operation";

export class PterodactylScheduleManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pterodactyl Schedule Management Tool",
		name: "pterodactylScheduleManagementTool",
		icon: "file:pterodactylClient.svg",
		group: ["transform"],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description:
			"AI-optimized task scheduling and automation for Pterodactyl game servers",
		defaults: {
			name: "Pterodactyl Schedule Management",
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
						name: "List Schedules",
						value: "listSchedules",
						description: "List all schedules for the server",
						action: "List schedules",
					},
					{
						name: "Get Schedule",
						value: "getSchedule",
						description: "Get details of a specific schedule",
						action: "Get a schedule",
					},
					{
						name: "List Schedule Tasks",
						value: "listScheduleTasks",
						description: "List all tasks for a specific schedule",
						action: "List schedule tasks",
					},
					{
						name: "Create Schedule",
						value: "createSchedule",
						description: "Create a new task schedule",
						action: "Create a schedule",
					},
					{
						name: "Update Schedule",
						value: "updateSchedule",
						description: "Update an existing schedule",
						action: "Update a schedule",
					},
					{
						name: "Delete Schedule",
						value: "deleteSchedule",
						description: "Delete a schedule and all its tasks",
						action: "Delete a schedule",
					},
					{
						name: "Execute Schedule",
						value: "executeSchedule",
						description: "Manually trigger a schedule to run now",
						action: "Execute a schedule",
					},
					{
						name: "Create Task",
						value: "createTask",
						description: "Add a new task to a schedule",
						action: "Create a task",
					},
					{
						name: "Update Task",
						value: "updateTask",
						description: "Update an existing task",
						action: "Update a task",
					},
					{
						name: "Delete Task",
						value: "deleteTask",
						description: "Remove a task from a schedule",
						action: "Delete a task",
					},
				],
				default: "listSchedules",
				description: "The schedule management action to perform",
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
			// Schedule ID (for schedule operations)
			{
				displayName: "Schedule ID",
				name: "scheduleId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: [
							"getSchedule",
							"listScheduleTasks",
							"updateSchedule",
							"deleteSchedule",
							"executeSchedule",
							"createTask",
						],
					},
				},
				default: 0,
				description: "The numeric ID of the schedule",
				hint: "Use the Pterodactyl Client node to list schedules and get IDs",
			},
			// Task ID (for task operations)
			{
				displayName: "Task ID",
				name: "taskId",
				type: "number",
				required: true,
				displayOptions: {
					show: {
						action: ["updateTask", "deleteTask"],
					},
				},
				default: 0,
				description: "The numeric ID of the task",
				hint: "Use the Pterodactyl Client node to list tasks and get IDs",
			},
			// Schedule name (for create/update)
			{
				displayName: "Schedule Name",
				name: "name",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["createSchedule", "updateSchedule"],
					},
				},
				default: "",
				placeholder: "Daily Restart",
				description: "Descriptive name for the schedule",
			},
			// Cron expression (for create/update schedule)
			{
				displayName: "Cron Expression",
				name: "cron",
				type: "string",
				displayOptions: {
					show: {
						action: ["createSchedule", "updateSchedule"],
					},
				},
				default: "",
				placeholder: "0 3 * * *",
				description:
					'Cron expression defining when to run (e.g., "0 3 * * *" for 3 AM daily)',
			},
			// Active status (for create/update schedule)
			{
				displayName: "Active",
				name: "isActive",
				type: "boolean",
				displayOptions: {
					show: {
						action: ["createSchedule", "updateSchedule"],
					},
				},
				default: true,
				description:
					"Whether the schedule is active and will run automatically",
			},
			// Task action (for create/update task)
			{
				displayName: "Task Action",
				name: "taskAction",
				type: "options",
				options: [
					{ name: "Send Command", value: "command" },
					{ name: "Send Power Action", value: "power" },
					{ name: "Create Backup", value: "backup" },
				],
				displayOptions: {
					show: {
						action: ["createTask", "updateTask"],
					},
				},
				default: "command",
				description: "Type of action the task will perform",
			},
			// Task payload (for create/update task)
			{
				displayName: "Task Payload",
				name: "payload",
				type: "string",
				required: true,
				displayOptions: {
					show: {
						action: ["createTask", "updateTask"],
					},
				},
				default: "",
				placeholder: "say Server restarting in 5 minutes",
				description: "The command, power action, or backup name to execute",
			},
			// Time offset (for create/update task)
			{
				displayName: "Time Offset",
				name: "timeOffset",
				type: "number",
				displayOptions: {
					show: {
						action: ["createTask", "updateTask"],
					},
				},
				default: 0,
				description:
					"Seconds to wait after schedule trigger before executing (0 = immediate)",
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
				if (action === "listSchedules") {
					response = await listSchedules.call(this, i);
				} else if (action === "getSchedule") {
					response = await getSchedule.call(this, i);
				} else if (action === "listScheduleTasks") {
					response = await listScheduleTasks.call(this, i);
				} else if (action === "createSchedule") {
					response = await createSchedule.call(this, i);
				} else if (action === "updateSchedule") {
					response = await updateSchedule.call(this, i);
				} else if (action === "deleteSchedule") {
					response = await deleteSchedule.call(this, i);
				} else if (action === "executeSchedule") {
					response = await executeSchedule.call(this, i);
				} else if (action === "createTask") {
					response = await createTask.call(this, i);
				} else if (action === "updateTask") {
					response = await updateTask.call(this, i);
				} else if (action === "deleteTask") {
					response = await deleteTask.call(this, i);
				}

				// Transform response to AI-friendly format
				let resultJson: any;

				if (action === "listSchedules") {
					resultJson = {
						success: true,
						action: "listed",
						serverId: this.getNodeParameter("serverId", i),
						schedules: response,
						count: Array.isArray(response) ? response.length : 0,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "getSchedule") {
					resultJson = {
						success: true,
						action: "retrieved",
						serverId: this.getNodeParameter("serverId", i),
						schedule: response,
						timestamp: new Date().toISOString(),
					};
				} else if (action === "listScheduleTasks") {
					resultJson = {
						success: true,
						action: "listed_tasks",
						serverId: this.getNodeParameter("serverId", i),
						scheduleId: this.getNodeParameter("scheduleId", i),
						tasks: response,
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

					if (action.includes("Schedule") && action !== "createSchedule") {
						resultJson.scheduleId = this.getNodeParameter("scheduleId", i);
					}

					if (action.includes("Task") && action !== "createTask") {
						resultJson.taskId = this.getNodeParameter("taskId", i);
					}

					if (response?.id) {
						resultJson[action.includes("Task") ? "taskId" : "scheduleId"] =
							response.id;
					}

					if (response?.name) {
						resultJson.name = response.name;
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
				const baseMessage = `Failed to execute schedule management action: ${error.message || "Unknown error"}`;
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
