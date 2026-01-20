# AGENTS.md - Developer Guide for AI Coding Agents

This guide provides essential information for AI coding agents working on the n8n-nodes-pterodactyl project.

## Project Overview

**n8n-nodes-pterodactyl** is an n8n community node package for Pterodactyl Panel API integration. It provides 47+ operations for game server management, including Client API (user operations), Application API (admin operations), and WebSocket support for real-time monitoring.

**Tech Stack:**

- TypeScript (strict mode)
- n8n-workflow SDK
- Jest for testing
- ESLint + Prettier for code quality
- Node.js 18.10.0+

## Build & Development Commands

### Essential Commands

```bash
# Build the project (TypeScript compilation + icon processing)
npm run build

# Development mode (watch for changes)
npm run dev

# Lint code
npm run lint

# Auto-fix linting issues
npm run lintfix

# Format code with Prettier
npm run format

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov
```

### Running a Single Test

```bash
# Run a specific test file
npx jest path/to/test.test.ts

# Run tests matching a pattern
npx jest --testNamePattern="test name pattern"

# Run a specific test file in watch mode
npx jest path/to/test.test.ts --watch
```

### Pre-Commit Checklist

Before committing, ensure:

```bash
npm run build    # Must compile without errors
npm run lint     # No linting errors
npm test         # All tests pass (coverage threshold: 80%)
npm run format   # Code is formatted
```

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode enabled**: All strict TypeScript checks are enforced
- **Target**: ES2022
- **Module**: CommonJS (for n8n compatibility)
- **No unused locals/parameters**: Code must not have unused variables
- **No implicit returns**: Functions must explicitly return values
- **Source maps & declarations**: Always generated for debugging

### Import Organization

Imports should follow this order:

1. n8n-workflow imports
2. Internal shared modules (transport, types, utils)
3. Relative imports (operations, resources)

Example:

```typescript
import { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { pterodactylApiRequest } from '../../../../shared/transport';
import { PterodactylServer } from '../../../../shared/types';
```

### Formatting Rules (.prettierrc)

- **Semicolons**: Required (`semi: true`)
- **Quotes**: Single quotes (`singleQuote: true`)
- **Trailing commas**: All (`trailingComma: "all"`)
- **Tabs**: Use tabs, not spaces (`useTabs: true`)
- **Tab width**: 2 spaces equivalent (`tabWidth: 2`)
- **Print width**: 100 characters (`printWidth: 100`)
- **Arrow parens**: Always use (`arrowParens: "always"`)

### Naming Conventions

- **Files**: camelCase for operations (e.g., `getServer.operation.ts`)
- **Node files**: PascalCase with type suffix (e.g., `PterodactylClient.node.ts`)
- **Variables/Functions**: camelCase
- **Types/Interfaces**: PascalCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE for true constants

### Type Definitions

- **Avoid `any`**: Warned by ESLint, use specific types or `unknown`
- **Explicit types**: Use interfaces from `shared/types/index.ts`
- **No explicit return types**: Turned off for brevity (module boundary types off)
- **Unused variables**: Prefix with `_` if intentionally unused

Example:

```typescript
export async function getServer(this: IExecuteFunctions, index: number): Promise<any> {
	const serverId = this.getNodeParameter('serverId', index) as string;
	// ... implementation
}
```

### Error Handling

Use the centralized error handling from `shared/utils/errorHandling.ts`:

```typescript
import { enhanceErrorMessage } from '../utils/errorHandling';

// In catch blocks, enhance error messages with context
const errorMessage = enhanceErrorMessage(baseMessage, response.statusCode);
throw new Error(errorMessage);
```

**Error handling patterns:**

- HTTP 401: API key issues → Suggest credential check
- HTTP 403: Permission issues
- HTTP 404: Resource not found
- HTTP 429: Rate limit → Suggest retry settings
- HTTP 5xx: Server errors → Check panel/Wings logs
- ConfigurationNotPersistedException: Log as warning, don't throw (operation succeeded)

### API Request Pattern

All API calls use `pterodactylApiRequest` from `shared/transport`:

```typescript
const response = await pterodactylApiRequest.call(
	this,
	'GET', // method
	'/api/client', // apiBase: '/api/client' or '/api/application'
	`/servers/${serverId}`, // endpoint
	{}, // body
	{}, // query string params
	{}, // additional options
	index, // item index
);
```

For paginated requests, use `pterodactylApiRequestAllItems`.

## File Structure & Organization

### Directory Layout

```
credentials/          # API credential definitions
nodes/               # n8n node implementations
  ├── PterodactylClient/       # Client API node
  ├── PterodactylApplication/  # Application API node
  ├── PterodactylWebsocket/    # WebSocket node
  └── PterodactylWebsocketTrigger/  # WebSocket trigger node
shared/              # Shared utilities
  ├── transport/     # API request helpers
  ├── types/         # TypeScript type definitions
  ├── utils/         # Utility functions (error handling)
  └── websocket/     # WebSocket utilities
tests/               # Test files
  ├── unit/          # Unit tests (mirror src structure)
  ├── helpers/       # Test helpers and mocks
  └── fixtures/      # Test fixtures and data
```

### Operation File Pattern

Each operation consists of two exports:

1. **Properties array** (`{operation}Operation: INodeProperties[]`): n8n UI configuration
2. **Execute function** (`{operation}(this: IExecuteFunctions, index: number): Promise<any>`): Implementation

Example structure:

```typescript
// 1. Define UI properties
export const getServerOperation: INodeProperties[] = [
	{
		displayName: 'Server',
		name: 'serverId',
		type: 'options',
		// ... configuration
	},
];

// 2. Implement execution logic
export async function getServer(this: IExecuteFunctions, index: number): Promise<any> {
	const serverId = this.getNodeParameter('serverId', index) as string;
	const response = await pterodactylApiRequest.call(/* ... */);
	return response.attributes || response;
}
```

### Adding New Operations

1. Create operation file: `nodes/{Node}/actions/{resource}/{operation}.operation.ts`
2. Export properties and function
3. Update resource `index.ts` to export new operation
4. Import in main node file (e.g., `PterodactylClient.node.ts`)
5. Add to operation dropdown in node properties
6. Route in execute method
7. Add tests in `tests/unit/operations/{resource}/{operation}.test.ts`

## Testing Guidelines

### Test Structure

- **Location**: Mirror source structure in `tests/unit/`
- **Naming**: `{module}.test.ts`
- **Framework**: Jest with ts-jest
- **Coverage threshold**: 80% (branches, functions, lines, statements)

### Mock Helpers

Use provided test helpers:

```typescript
import { createMockExecuteFunctions } from '../../helpers/mockExecuteFunctions';
import { createMockHttpResponse } from '../../helpers/mockHttpRequest';
import { testClientCredentials } from '../../fixtures/testCredentials';

const mockExecuteFunctions = createMockExecuteFunctions();
mockExecuteFunctions.getCredentials.mockResolvedValue(testClientCredentials);
```

### Test Patterns

- Test credential handling (Client vs Application API)
- Test parameter validation
- Test success responses
- Test error scenarios (401, 403, 404, 429, 5xx)
- Test pagination for list operations
- Test special cases (ConfigurationNotPersistedException)

## Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `perf`: Performance improvements

**Examples:**

```
feat(server): add startup variables operation
fix(backup): handle missing backup name parameter
docs: update AGENTS.md with testing guidelines
```

## Common Patterns & Best Practices

1. **Credential verification**: Always check credentials are configured for the correct API type
2. **Return data format**: Return `response.attributes || response` for consistency
3. **Parameter extraction**: Use `this.getNodeParameter(name, index) as Type`
4. **Error context**: Always use `enhanceErrorMessage()` for user-friendly errors
5. **Pagination**: Use `pterodactylApiRequestAllItems` for "Return All" operations
6. **WebSocket**: Handle reconnection and token refresh gracefully
7. **Barrel exports**: Use `index.ts` files to export module contents

## AI Tool Nodes

### What are AI Tool Nodes?

AI Tool nodes are **specialized, simplified nodes optimized for use with AI agents**. They differ from regular nodes:

- **Simplified parameters**: Direct parameter input (e.g., `serverId: number`) instead of complex dropdowns
- **Single action focus**: Each AI Tool node focuses on a specific category of operations
- **AI-friendly responses**: Structured JSON responses optimized for AI parsing
- **Enhanced error messages**: Use `enhanceErrorMessage()` for AI-understandable error context
- **Standalone**: No dependency on `@langchain/core` (community package pattern)

### AI Tool vs Regular Node Comparison

| Feature        | Regular Node                    | AI Tool Node                          |
| -------------- | ------------------------------- | ------------------------------------- |
| **Parameters** | Dynamic dropdowns, loadOptions  | Simple, direct types (number, string) |
| **Operations** | Multiple resources & operations | Single-purpose, focused actions       |
| **Response**   | Complex nested data             | Flat, AI-parseable JSON               |
| **Use Case**   | Human workflow building         | AI agent automation                   |
| **Discovery**  | Manual configuration            | AI can infer usage from description   |

### Creating an AI Tool Node

**Directory Structure:**

```
nodes/
  PterodactylApplicationTool/
    PterodactylServerManagementTool.node.ts
    PterodactylUserManagementTool.node.ts
    pterodactylApplication.svg (icon)
```

**Node Pattern (IMPORTANT - REUSE existing operations!):**

```typescript
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { enhanceErrorMessage } from '../../shared/utils/errorHandling';
// CRITICAL: Import and REUSE existing operation functions - DON'T duplicate logic!
import { suspendServer } from '../PterodactylApplication/actions/server/suspendServer.operation';
import { unsuspendServer } from '../PterodactylApplication/actions/server/unsuspendServer.operation';

export class PterodactylServerManagementTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pterodactyl Server Management Tool',
		name: 'pterodactylServerManagementTool',
		icon: 'file:pterodactylApplication.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'AI-optimized server management for Pterodactyl Panel',
		defaults: {
			name: 'Pterodactyl Server Management',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pterodactylApplicationApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Suspend Server',
						value: 'suspend',
						description: 'Suspend a server to prevent it from running',
						action: 'Suspend a server',
					},
					// ... more actions
				],
				default: 'suspend',
				description: 'The server management action to perform',
			},
			{
				displayName: 'Server ID',
				name: 'serverId',
				type: 'number', // AI-friendly: direct number input, no dropdown
				required: true,
				default: 0,
				description: 'The numeric ID of the server to manage',
				hint: 'Use the Pterodactyl Application node to list servers and get IDs',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const action = this.getNodeParameter('action', i) as string;

				let response: any;

				// REUSE existing operation functions - this is the key pattern!
				if (action === 'suspend') {
					response = await suspendServer.call(this, i);
				} else if (action === 'unsuspend') {
					response = await unsuspendServer.call(this, i);
				}

				// Transform to AI-friendly structured response
				const json = {
					success: true,
					serverId: this.getNodeParameter('serverId', i),
					action: action === 'suspend' ? 'suspended' : 'unsuspended',
					timestamp: new Date().toISOString(),
				};

				returnData.push({ json, pairedItem: i });
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message || 'Unknown error occurred',
						},
						pairedItem: i,
					});
					continue;
				}

				// Enhanced error messages for AI understanding
				const baseMessage = `Failed to execute action: ${error.message || 'Unknown error'}`;
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
```

### Key AI Tool Design Principles

1. **REUSE, Don't Duplicate**: Always import and call existing operation functions from `nodes/PterodactylApplication/actions/`. Never duplicate API logic.
2. **Direct Parameters**: Use simple types (number, string, boolean) instead of loadOptions dropdowns
3. **Clear Descriptions**: Write descriptions that explain what the action does and when to use it
4. **Structured Output**: Always return consistent JSON with `success`, `action`, `timestamp` fields
5. **Enhanced Errors**: Use `enhanceErrorMessage()` for context-rich error messages
6. **Single Purpose**: Each AI Tool should focus on one category (e.g., server management, user management)
7. **Hints**: Add `hint` property to guide AI agents on parameter usage

**Why Reuse?**

- ✅ **DRY (Don't Repeat Yourself)**: Single source of truth for business logic
- ✅ **Consistency**: Same validation, error handling, and API calls across nodes
- ✅ **Maintainability**: Bug fixes in operations automatically apply to AI Tools
- ✅ **Testing**: Test coverage for operations covers AI Tool behavior
- ❌ **Avoid**: Duplicating API request code, validation logic, or error handling

### Testing AI Tool Nodes

AI Tool nodes follow the same testing patterns as regular nodes but focus on:

```typescript
describe('PterodactylServerManagementTool', () => {
	// Test node description and metadata
	it('should have AI-optimized description', () => {
		expect(node.description.description).toBe(
			'AI-optimized server management for Pterodactyl Panel',
		);
	});

	// Test all actions
	it('should have all server management actions', () => {
		const actionProperty = node.description.properties.find((p) => p.name === 'action');
		expect(actionProperty?.type).toBe('options');
		expect(options).toHaveLength(5);
	});

	// Test structured output
	it('should return AI-friendly structured response', async () => {
		const result = await node.execute.call(mockExecuteFunctions);
		expect(result[0][0].json).toMatchObject({
			success: true,
			serverId: 123,
			action: 'suspended',
			timestamp: expect.any(String),
		});
	});

	// Test error handling with enhanced messages
	it('should provide enhanced error messages for AI', async () => {
		mockExecuteFunctions.helpers.httpRequest.mockRejectedValue(
			Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
		);
		await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
	});
});
```

### Registering AI Tool Nodes

Add to `package.json`:

```json
{
	"n8n": {
		"nodes": [
			"dist/nodes/PterodactylApplication/PterodactylApplication.node.js",
			"dist/nodes/PterodactylApplicationTool/PterodactylServerManagementTool.node.js"
		]
	}
}
```

### AI Tool Node Categories

**Application API Tools** (`nodes/PterodactylApplicationTool/`):

1. **PterodactylServerManagementTool**
   - Actions: suspend, unsuspend, reinstall, delete, forceDelete
   - Purpose: Server lifecycle management for AI agents
   - Credentials: `pterodactylApplicationApi`
   - Status: ✅ Implemented

2. **PterodactylUserManagementTool**
   - Actions: create, update, delete
   - Purpose: User account management for AI agents
   - Credentials: `pterodactylApplicationApi`
   - Status: ✅ Implemented

3. **PterodactylLocationManagementTool**
   - Actions: create, update, delete
   - Purpose: Location management for organizing infrastructure
   - Credentials: `pterodactylApplicationApi`
   - Status: ✅ Implemented

4. **PterodactylNodeManagementTool**
   - Actions: create, update, delete, createAllocations, deleteAllocation
   - Purpose: Infrastructure node management (servers that host game servers)
   - Credentials: `pterodactylApplicationApi`
   - Status: ✅ Implemented

5. **PterodactylNestManagementTool**
   - Actions: getNest, listNests, getNestEgg, listNestEggs
   - Purpose: Read-only nest and egg information (game templates)
   - Credentials: `pterodactylApplicationApi`
   - Status: ✅ Implemented

**Client API Tools** (`nodes/PterodactylClientTool/`):

1. **PterodactylServerControlTool**
   - Actions: start, stop, restart, kill, sendCommand
   - Purpose: AI-friendly server power control and command execution
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string UUID), `command` (string, for sendCommand action)
   - Status: ✅ Implemented

2. **PterodactylBackupManagementTool**
   - Actions: create, restore, delete
   - Purpose: Automated backup management for game servers
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `backupId` (string UUID), `name`, `ignored`, `deleteFiles`
   - Status: ✅ Implemented

3. **PterodactylFileManagementTool**
   - Actions: read, write, delete, createFolder, compress, decompress
   - Purpose: AI-friendly file operations for server configuration
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `path`, `content`, `files`, `folderName`, `root`
   - Status: ✅ Implemented

4. **PterodactylNetworkManagementTool**
   - Actions: assign, delete, setPrimary, updateNotes
   - Purpose: Network allocation management for game servers
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `allocationId` (number), `notes`
   - Status: ✅ Implemented

5. **PterodactylScheduleManagementTool**
   - Actions: createSchedule, updateSchedule, deleteSchedule, executeSchedule, createTask, updateTask, deleteTask
   - Purpose: Task scheduling and automation for game servers
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `scheduleId` (number), `taskId` (number), `name`, `cron`, `isActive`, `taskAction`, `payload`, `timeOffset`
   - Status: ✅ Implemented

6. **PterodactylStartupManagementTool**
   - Actions: get, update
   - Purpose: Startup variable management for server configuration
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `key`, `value`
   - Status: ✅ Implemented

7. **PterodactylSubuserManagementTool**
   - Actions: create, update, delete
   - Purpose: Subuser permission management for server access control
   - Credentials: `pterodactylClientApi`
   - Parameters: `serverId` (string), `subuserId` (string UUID), `email`, `permissions`
   - Status: ✅ Implemented

**Key Differences Between API Types:**

| Feature          | Application API Tools             | Client API Tools                       |
| ---------------- | --------------------------------- | -------------------------------------- |
| **Credentials**  | `pterodactylApplicationApi`       | `pterodactylClientApi`                 |
| **Server IDs**   | Numeric IDs (`serverId: number`)  | String UUIDs (`serverId: string`)      |
| **Access Level** | Admin operations (infrastructure) | User operations (own servers)          |
| **Use Cases**    | Panel management, provisioning    | Server control, backups, configuration |
| **Typical User** | Panel administrators              | Server owners/users                    |

**Summary:**

- **Total AI Tool Nodes**: 12 (5 Application API + 7 Client API)
- **Coverage**: Complete coverage of all major Pterodactyl Panel operations
- **Pattern**: All nodes reuse existing operation functions following DRY principles
- **AI-Optimized**: Simplified parameters, structured responses, enhanced error messages

### When to Create an AI Tool Node

Create an AI Tool node when:

1. **AI agents need simple, direct control** over Pterodactyl resources
2. **Operations are commonly grouped** (e.g., all server power actions)
3. **Parameters can be simplified** (numeric IDs instead of dropdown selections)
4. **Response needs to be AI-parseable** (simple JSON structure)
5. **The use case is automation-heavy** (batch operations, scheduled tasks)

**Don't create AI Tool nodes for:**

- Complex, human-decision-heavy workflows
- Operations requiring rich UI interactions (file browsers, visual editors)
- One-off operations rarely used by AI agents

### AI Tool Workflow Integration

AI agents can use AI Tool nodes in two ways:

**1. Direct Tool Calling (with n8n AI Agent):**

- AI Agent node calls AI Tool nodes directly
- AI determines when to use based on descriptions
- Parameters passed as structured data

**2. Sub-workflow Pattern:**

- Create workflows that use AI Tool nodes
- AI Agent calls workflows via "Call n8n Workflow Tool"
- Workflows can combine multiple AI Tool operations

## Resources

- [n8n Node Development Docs](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n AI Agent Documentation](https://docs.n8n.io/advanced-ai/langchain/)
- [Pterodactyl API Docs](https://pterodactyl-api-docs.netvpx.com/)
- [Project README](README.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)

## Notes for Agents

- **Coverage is critical**: Maintain 80%+ test coverage on all changes
- **Type safety**: Leverage TypeScript strict mode; avoid `any` when possible
- **Consistency**: Follow existing patterns in similar operations
- **User-first errors**: Error messages should guide users to solutions
- **AI-friendly design**: When creating AI Tool nodes, prioritize simplicity and clarity
- **Test in n8n**: Always verify changes work in an actual n8n instance when possible
