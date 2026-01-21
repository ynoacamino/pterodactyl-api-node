import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";
import {
  connectionOperations,
  executeRequestLogs,
  executeRequestStats,
  executeSendAuth,
  executeSendCommand,
  executeSetState,
  executeTestConnection,
  logsAndStatsOperations,
  serverControlOperations,
} from "./operations";

export class EnderPterodactylWebsocket implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Ender Pterodactyl WebSocket",
    name: "enderPterodactylWebsocket",
    icon: "file:pterodactylWebsocket.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Send commands via Pterodactyl WebSocket API",
    defaults: {
      name: "Ender Pterodactyl WebSocket",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "enderPterodactylClientApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Server Control",
            value: "serverControl",
            description: "Manage server power and send commands",
          },
          {
            name: "Logs & Stats",
            value: "logsAndStats",
            description: "Request logs and resource statistics",
          },
          {
            name: "Connection",
            value: "connection",
            description: "Test connection and manage authentication",
          },
        ],
        default: "serverControl",
      },
      ...serverControlOperations,
      ...logsAndStatsOperations,
      ...connectionOperations,
    ],
  };

  methods = {
    loadOptions: {
      async getClientServers(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        try {
          const { pterodactylApiRequest } = await import(
            "../../shared/transport"
          );
          const response = await pterodactylApiRequest.call(
            this as unknown as IExecuteFunctions,
            "GET",
            "/api/client",
            "",
            {},
            {},
            {},
            0,
          );

          const servers = response.data || [];

          if (servers.length === 0) {
            return [
              {
                name: "No servers found",
                value: "",
              },
            ];
          }

          return servers.map((server: any) => ({
            name: `${server.attributes.name} (${server.attributes.identifier})`,
            value: server.attributes.identifier,
          }));
        } catch (error) {
          return [
            {
              name: `Error: ${(error as Error).message}`,
              value: "",
            },
          ];
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: INodeExecutionData[] = [];

        if (resource === "serverControl") {
          if (operation === "setState") {
            responseData = await executeSetState.call(this, i);
          } else if (operation === "sendCommand") {
            responseData = await executeSendCommand.call(this, i);
          }
        } else if (resource === "logsAndStats") {
          if (operation === "requestLogs") {
            responseData = await executeRequestLogs.call(this, i);
          } else if (operation === "requestStats") {
            responseData = await executeRequestStats.call(this, i);
          }
        } else if (resource === "connection") {
          if (operation === "testConnection") {
            responseData = await executeTestConnection.call(this, i);
          } else if (operation === "sendAuth") {
            responseData = await executeSendAuth.call(this, i);
          }
        }

        returnData.push(...responseData);
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
              success: false,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
