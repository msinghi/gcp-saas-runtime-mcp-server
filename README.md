# GCP SaaS Runtime MCP Server

This MCP (Model Context Protocol) server provides access to Google Cloud Platform's SaaS Runtime APIs, allowing you to manage SaaS offerings, unit kinds, units, tenants, releases, and rollouts programmatically.

## Prerequisites

- Node.js 18+ installed
- Google Cloud SDK (gcloud) installed and configured
- Either:
  - A service account key file, OR
  - Local Google Cloud credentials configured via `gcloud auth application-default login`

## Installation

1. **Clone repo
```bash
git clone git@github.com:msinghi/gcp-saas-runtime-mcp-server.git
cd gcp-saas-runtime-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

## Authentication Setup

### Option 1: Service Account (Recommended for production)

1. **Create a service account:**
```bash
gcloud iam service-accounts create saas-runtime-mcp \
    --description="Service account for SaaS Runtime MCP server" \
    --display-name="SaaS Runtime MCP"
```

2. **Grant necessary permissions:**
```bash
# Replace YOUR_PROJECT_ID with your actual project ID
export PROJECT_ID="YOUR_PROJECT_ID"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:saas-runtime-mcp@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/saasservicemgmt.admin"

# If the above role doesn't exist (SaaS Runtime is in beta), you can use broader permissions:
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:saas-runtime-mcp@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/editor"
```

3. **Create and download service account key:**
```bash
gcloud iam service-accounts keys create ~/saas-runtime-key.json \
    --iam-account=saas-runtime-mcp@$PROJECT_ID.iam.gserviceaccount.com
```

4. **Set environment variable:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/saas-runtime-key.json"
```

### Option 2: Local Credentials (Recommended for development)

1. **Login with your user account:**
```bash
gcloud auth application-default login
```

2. **Set your project:**
```bash
gcloud config set project YOUR_PROJECT_ID
```

## Enable Required APIs

```bash
# Enable the SaaS Runtime API
gcloud services enable saasservicemgmt.googleapis.com

# Enable other required APIs
gcloud services enable artifactregistry.googleapis.com
gcloud services enable config.googleapis.com
gcloud services enable storage.googleapis.com
```

## Running the MCP Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running as a standalone executable
```bash
# After building
node dist/index.js
```

## Usage Examples

The MCP server provides tools for all SaaS Runtime API operations. Here are some example usage patterns:

### 1. Create a SaaS Offering
```json
{
  "name": "create_saas_offering",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "saasOffering": {
      "displayName": "My SaaS Application",
      "description": "A sample SaaS application",
      "regions": ["us-central1", "us-east1"],
      "labels": {
        "environment": "development"
      }
    }
  }
}
```

### 2. List SaaS Offerings
```json
{
  "name": "list_saas_offerings",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "pageSize": 10
  }
}
```

### 3. Create a Unit Kind
```json
{
  "name": "create_unit_kind",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "unitKind": {
      "displayName": "VM Unit Kind",
      "description": "Unit kind for VM deployment",
      "saasOffering": "projects/my-project/locations/us-central1/saas/my-saas-offering",
      "blueprint": {
        "artifactRegistry": {
          "repository": "projects/my-project/locations/us-central1/repositories/my-repo",
          "artifact": "vm-blueprint",
          "tag": "latest"
        }
      }
    }
  }
}
```

### 4. Create a Tenant
```json
{
  "name": "create_tenant",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "tenant": {
      "displayName": "Customer A",
      "description": "Tenant for Customer A",
      "labels": {
        "customer": "company-a",
        "tier": "premium"
      }
    }
  }
}
```

### 5. Create a Unit (Deploy Infrastructure)
```json
{
  "name": "create_unit",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "unit": {
      "displayName": "Customer A VM",
      "description": "VM deployment for Customer A",
      "unitKind": "projects/my-project/locations/us-central1/unitKinds/vm-unit-kind",
      "tenant": "projects/my-project/locations/us-central1/tenants/customer-a",
      "inputVariables": {
        "actuation_sa": "actuation-sa@my-project.iam.gserviceaccount.com",
        "machine_type": "e2-medium",
        "zone": "us-central1-a"
      }
    }
  }
}
```

### 6. Create a Release
```json
{
  "name": "create_release",
  "arguments": {
    "parent": "projects/my-project/locations/us-central1",
    "release": {
      "displayName": "v1.0.0",
      "description": "Initial release",
      "unitKinds": [
        "projects/my-project/locations/us-central1/unitKinds/vm-unit-kind"
      ]
    }
  }
}
```

## Configuration with Claude Desktop

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gcp-saas-runtime": {
      "command": "node",
      "args": ["/path/to/your/gcp-saas-runtime-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your/service-account-key.json"
      }
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gcp-saas-runtime": {
      "command": "node",
      "args": ["C:\\path\\to\\your\\gcp-saas-runtime-mcp-server\\dist\\index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "C:\\path\\to\\your\\service-account-key.json"
      }
    }
  }
}
```

### Using Local Credentials (Alternative)
If you're using local credentials instead of a service account key, omit the `env` section:

```json
{
  "mcpServers": {
    "gcp-saas-runtime": {
      "command": "node",
      "args": ["/path/to/your/gcp-saas-runtime-mcp-server/dist/index.js"]
    }
  }
}
```

## Important Notes

1. **Beta Service**: SaaS Runtime is currently in beta, so API endpoints and behavior may change.

2. **Permissions**: The service account or user needs appropriate permissions for SaaS Runtime operations. In production, use the principle of least privilege.

3. **Resource Names**: All resource names follow the pattern:
   - `projects/{project}/locations/{location}/saas/{saas}`
   - `projects/{project}/locations/{location}/unitKinds/{unitKind}`
   - `projects/{project}/locations/{location}/units/{unit}`
   - `projects/{project}/locations/{location}/tenants/{tenant}`
   - `projects/{project}/locations/{location}/releases/{release}`
   - `projects/{project}/locations/{location}/rollouts/{rollout}`

4. **Error Handling**: The server includes comprehensive error handling and will return detailed error messages for debugging.

5. **Terraform Dependencies**: SaaS Runtime manages Terraform deployments, so your unit kinds need proper Terraform configurations in Artifact Registry.

## Troubleshooting

### Authentication Issues
- Verify your service account has the correct permissions
- Check that the `GOOGLE_APPLICATION_CREDENTIALS` environment variable points to a valid key file
- Ensure the SaaS Runtime API is enabled in your project

### API Errors
- Check that the resource names are correctly formatted
- Verify that parent resources (like SaaS offerings) exist before creating child resources
- Review the Google Cloud Console for any quota or billing issues

### Permission Errors
- Ensure your service account or user has the `roles/saasservicemgmt.admin` role or equivalent permissions
- Check that your project has the SaaS Runtime API enabled

## Support

For issues with the SaaS Runtime API itself, refer to the [Google Cloud SaaS Runtime documentation](https://cloud.google.com/saas-runtime/docs).

For issues with this MCP server implementation, check the error messages returned by the tools for debugging information.