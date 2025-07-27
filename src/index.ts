#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleAuth } from 'google-auth-library';

// @ts-ignore
import fetch from 'node-fetch';

// Types for SaaS Runtime API resources
interface SaaSOffering {
  name?: string;
  displayName?: string;
  description?: string;
  regions?: string[];
  labels?: Record<string, string>;
}

interface UnitKind {
  name?: string;
  displayName?: string;
  description?: string;
  saasOffering?: string;
  blueprint?: {
    artifactRegistry?: {
      repository?: string;
      artifact?: string;
      tag?: string;
    };
  };
  labels?: Record<string, string>;
}

interface Unit {
  name?: string;
  displayName?: string;
  description?: string;
  unitKind?: string;
  tenant?: string;
  inputVariables?: Record<string, any>;
  labels?: Record<string, string>;
}

interface Tenant {
  name?: string;
  displayName?: string;
  description?: string;
  labels?: Record<string, string>;
}

interface Release {
  name?: string;
  displayName?: string;
  description?: string;
  unitKinds?: string[];
  labels?: Record<string, string>;
}

interface Rollout {
  name?: string;
  displayName?: string;
  description?: string;
  release?: string;
  rolloutKind?: string;
  labels?: Record<string, string>;
}

class SaaSRuntimeMCPServer {
  private server: Server;
  private auth: GoogleAuth;
  private baseUrl = 'https://saasservicemgmt.googleapis.com/v1beta1';

  constructor() {
    this.server = new Server({
      name: 'gcp-saas-runtime-server',
      version: '1.0.0',
    });

    // Initialize Google Auth
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      // Will use service account if GOOGLE_APPLICATION_CREDENTIALS is set,
      // otherwise will use local credentials
    });

    this.setupToolHandlers();
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    
    return {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} ${error}`);
    }

    if (response.status === 204) {
      return {}; // No content
    }

    return response.json();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // SaaS Offerings
          {
            name: 'create_saas_offering',
            description: 'Create a new SaaS offering',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string', description: 'Parent project and location (projects/{project}/locations/{location})' },
                saasOffering: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    regions: { type: 'array', items: { type: 'string' } },
                    labels: { type: 'object' }
                  },
                  required: ['displayName']
                }
              },
              required: ['parent', 'saasOffering']
            }
          },
          {
            name: 'get_saas_offering',
            description: 'Get a SaaS offering',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Full resource name (projects/{project}/locations/{location}/saas/{saas})' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_saas_offerings',
            description: 'List SaaS offerings',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string', description: 'Parent project and location (projects/{project}/locations/{location})' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_saas_offering',
            description: 'Update a SaaS offering',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Resource name' },
                saasOffering: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'saasOffering']
            }
          },
          {
            name: 'delete_saas_offering',
            description: 'Delete a SaaS offering',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Resource name to delete' }
              },
              required: ['name']
            }
          },

          // Unit Kinds
          {
            name: 'create_unit_kind',
            description: 'Create a new unit kind',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string', description: 'Parent project and location (projects/{project}/locations/{location})' },
                unitKind: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    saasOffering: { type: 'string' },
                    blueprint: { type: 'object' },
                    labels: { type: 'object' }
                  },
                  required: ['displayName', 'saasOffering']
                }
              },
              required: ['parent', 'unitKind']
            }
          },
          {
            name: 'get_unit_kind',
            description: 'Get a unit kind',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Full resource name' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_unit_kinds',
            description: 'List unit kinds',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string', description: 'Parent project and location' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_unit_kind',
            description: 'Update a unit kind',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                unitKind: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'unitKind']
            }
          },
          {
            name: 'delete_unit_kind',
            description: 'Delete a unit kind',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },

          // Units
          {
            name: 'create_unit',
            description: 'Create a new unit',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string', description: 'Parent project and location' },
                unit: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    unitKind: { type: 'string' },
                    tenant: { type: 'string' },
                    inputVariables: { type: 'object' },
                    labels: { type: 'object' }
                  },
                  required: ['displayName', 'unitKind']
                }
              },
              required: ['parent', 'unit']
            }
          },
          {
            name: 'get_unit',
            description: 'Get a unit',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_units',
            description: 'List units',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_unit',
            description: 'Update a unit',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                unit: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'unit']
            }
          },
          {
            name: 'delete_unit',
            description: 'Delete a unit',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },

          // Tenants
          {
            name: 'create_tenant',
            description: 'Create a new tenant',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                tenant: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    labels: { type: 'object' }
                  },
                  required: ['displayName']
                }
              },
              required: ['parent', 'tenant']
            }
          },
          {
            name: 'get_tenant',
            description: 'Get a tenant',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_tenants',
            description: 'List tenants',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_tenant',
            description: 'Update a tenant',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                tenant: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'tenant']
            }
          },
          {
            name: 'delete_tenant',
            description: 'Delete a tenant',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },

          // Releases
          {
            name: 'create_release',
            description: 'Create a new release',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                release: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    unitKinds: { type: 'array', items: { type: 'string' } },
                    labels: { type: 'object' }
                  },
                  required: ['displayName']
                }
              },
              required: ['parent', 'release']
            }
          },
          {
            name: 'get_release',
            description: 'Get a release',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_releases',
            description: 'List releases',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_release',
            description: 'Update a release',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                release: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'release']
            }
          },
          {
            name: 'delete_release',
            description: 'Delete a release',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },

          // Rollouts
          {
            name: 'create_rollout',
            description: 'Create a new rollout',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                rollout: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string' },
                    description: { type: 'string' },
                    release: { type: 'string' },
                    rolloutKind: { type: 'string' },
                    labels: { type: 'object' }
                  },
                  required: ['displayName', 'release']
                }
              },
              required: ['parent', 'rollout']
            }
          },
          {
            name: 'get_rollout',
            description: 'Get a rollout',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          },
          {
            name: 'list_rollouts',
            description: 'List rollouts',
            inputSchema: {
              type: 'object',
              properties: {
                parent: { type: 'string' },
                pageSize: { type: 'number' },
                pageToken: { type: 'string' }
              },
              required: ['parent']
            }
          },
          {
            name: 'update_rollout',
            description: 'Update a rollout',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                rollout: { type: 'object' },
                updateMask: { type: 'string' }
              },
              required: ['name', 'rollout']
            }
          },
          {
            name: 'delete_rollout',
            description: 'Delete a rollout',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          }
        ] as Tool[],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No arguments provided',
            },
          ],
          isError: true,
        };
      }

      try {
        let result: any;
        
        switch (name) {
          // SaaS Offerings
          case 'create_saas_offering':
            result = await this.makeRequest('POST', `/${args.parent}/saas`, args.saasOffering);
            break;
          case 'get_saas_offering':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_saas_offerings':
            const saasParams = new URLSearchParams();
            if (args.pageSize) saasParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) saasParams.append('pageToken', args.pageToken as string);
            const saasQuery = saasParams.toString() ? `?${saasParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/saas${saasQuery}`);
            break;
          case 'update_saas_offering':
            const saasUpdateParams = new URLSearchParams();
            if (args.updateMask) saasUpdateParams.append('updateMask', args.updateMask as string);
            const saasUpdateQuery = saasUpdateParams.toString() ? `?${saasUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${saasUpdateQuery}`, args.saasOffering);
            break;
          case 'delete_saas_offering':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          // Unit Kinds
          case 'create_unit_kind':
            result = await this.makeRequest('POST', `/${args.parent}/unitKinds`, args.unitKind);
            break;
          case 'get_unit_kind':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_unit_kinds':
            const unitKindParams = new URLSearchParams();
            if (args.pageSize) unitKindParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) unitKindParams.append('pageToken', args.pageToken as string);
            const unitKindQuery = unitKindParams.toString() ? `?${unitKindParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/unitKinds${unitKindQuery}`);
            break;
          case 'update_unit_kind':
            const unitKindUpdateParams = new URLSearchParams();
            if (args.updateMask) unitKindUpdateParams.append('updateMask', args.updateMask as string);
            const unitKindUpdateQuery = unitKindUpdateParams.toString() ? `?${unitKindUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${unitKindUpdateQuery}`, args.unitKind);
            break;
          case 'delete_unit_kind':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          // Units
          case 'create_unit':
            result = await this.makeRequest('POST', `/${args.parent}/units`, args.unit);
            break;
          case 'get_unit':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_units':
            const unitParams = new URLSearchParams();
            if (args.pageSize) unitParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) unitParams.append('pageToken', args.pageToken as string);
            const unitQuery = unitParams.toString() ? `?${unitParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/units${unitQuery}`);
            break;
          case 'update_unit':
            const unitUpdateParams = new URLSearchParams();
            if (args.updateMask) unitUpdateParams.append('updateMask', args.updateMask as string);
            const unitUpdateQuery = unitUpdateParams.toString() ? `?${unitUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${unitUpdateQuery}`, args.unit);
            break;
          case 'delete_unit':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          // Tenants
          case 'create_tenant':
            result = await this.makeRequest('POST', `/${args.parent}/tenants`, args.tenant);
            break;
          case 'get_tenant':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_tenants':
            const tenantParams = new URLSearchParams();
            if (args.pageSize) tenantParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) tenantParams.append('pageToken', args.pageToken as string);
            const tenantQuery = tenantParams.toString() ? `?${tenantParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/tenants${tenantQuery}`);
            break;
          case 'update_tenant':
            const tenantUpdateParams = new URLSearchParams();
            if (args.updateMask) tenantUpdateParams.append('updateMask', args.updateMask as string);
            const tenantUpdateQuery = tenantUpdateParams.toString() ? `?${tenantUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${tenantUpdateQuery}`, args.tenant);
            break;
          case 'delete_tenant':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          // Releases
          case 'create_release':
            result = await this.makeRequest('POST', `/${args.parent}/releases`, args.release);
            break;
          case 'get_release':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_releases':
            const releaseParams = new URLSearchParams();
            if (args.pageSize) releaseParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) releaseParams.append('pageToken', args.pageToken as string);
            const releaseQuery = releaseParams.toString() ? `?${releaseParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/releases${releaseQuery}`);
            break;
          case 'update_release':
            const releaseUpdateParams = new URLSearchParams();
            if (args.updateMask) releaseUpdateParams.append('updateMask', args.updateMask as string);
            const releaseUpdateQuery = releaseUpdateParams.toString() ? `?${releaseUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${releaseUpdateQuery}`, args.release);
            break;
          case 'delete_release':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          // Rollouts
          case 'create_rollout':
            result = await this.makeRequest('POST', `/${args.parent}/rollouts`, args.rollout);
            break;
          case 'get_rollout':
            result = await this.makeRequest('GET', `/${args.name}`);
            break;
          case 'list_rollouts':
            const rolloutParams = new URLSearchParams();
            if (args.pageSize) rolloutParams.append('pageSize', args.pageSize.toString());
            if (args.pageToken) rolloutParams.append('pageToken', args.pageToken as string);
            const rolloutQuery = rolloutParams.toString() ? `?${rolloutParams.toString()}` : '';
            result = await this.makeRequest('GET', `/${args.parent}/rollouts${rolloutQuery}`);
            break;
          case 'update_rollout':
            const rolloutUpdateParams = new URLSearchParams();
            if (args.updateMask) rolloutUpdateParams.append('updateMask', args.updateMask as string);
            const rolloutUpdateQuery = rolloutUpdateParams.toString() ? `?${rolloutUpdateParams.toString()}` : '';
            result = await this.makeRequest('PATCH', `/${args.name}${rolloutUpdateQuery}`, args.rollout);
            break;
          case 'delete_rollout':
            result = await this.makeRequest('DELETE', `/${args.name}`);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GCP SaaS Runtime MCP server running on stdio');
  }
}

const server = new SaaSRuntimeMCPServer();
server.run().catch(console.error);