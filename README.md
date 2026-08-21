# Dataform - Google Apps Script

Standalone Google Apps Script project that handles all Dataform operations previously served by the Flask pipeline manager.

## Architecture

```
gas/
  Code.gs              → doGet (serves dataform page) + doPost (API router) + email whitelist auth
  Config.gs            → Script Properties wrapper for GCP config
  Utility.gs           → httpFetch with OAuth, jsonResponse, helpers
  DataformService.gs   → All Dataform API calls
  Tests.gs             → Server-side test suite
  dataform.html        → Combined HTML+CSS+JS: release configs, workflow configs, invocations
```

- **Backend + Frontend**: GAS web app serves both the HTML page (doGet) and the API (doPost).
- **Auth**: Deploy GAS as "Anyone within [Google Workspace org]". Check `Session.getActiveUser().getEmail()` against a whitelist in Script Properties.
- **API calls**: Client-side JS uses `google.script.run` (same-origin, no CORS).
- **HTML files**: Single self-contained HTML file with CSS and JS inlined (< 50KB). Copy directly into the GAS editor.

## Deploy

### 1. Create Apps Script project

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Rename it (e.g., "Pipeline Manager - Dataform")

### 2. Copy the source files

Create these files in the Apps Script editor:

| Local file | GAS editor file name | Type |
|---|---|---|
| `Code.gs` | `Code` | Script |
| `Config.gs` | `Config` | Script |
| `Utility.gs` | `Utility` | Script |
| `DataformService.gs` | `DataformService` | Script |
| `Tests.gs` | `Tests` | Script |
| `dataform.html` | `dataform` | HTML |

Delete any auto-generated files (e.g., `myFunction.gs`).

### 3. Add OAuth scopes

In the Apps Script editor → **Project Settings** → check **Show 'appsscript.json' manifest file** → add:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/cloud-platform"
]
```

### 4. Enable required APIs

In the GCP project linked to your Apps Script:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Library**
3. Enable: **Cloud Dataform API**

### 5. Set Script Properties

In the Apps Script editor → **Project Settings** → **Script Properties**:

| Key | Value |
|---|---|
| `GCLOUD_PROJECT` | Your GCP project ID |
| `GCLOUD_REGION` | `europe-west1` (or your region) |
| `DATAFORM_REPO` | `tableau-data-pipelines` (or your repo) |
| `ALLOWED_USERS` | Comma-separated email addresses (optional, allows all if empty) |

### 6. Deploy as Web App

1. **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone within [your Google Workspace org]**
5. Click **Deploy**
6. Copy the web app URL

### 7. Verify

1. Run `TestRunAll` in the Apps Script editor (Executions tab → check log)
2. Open the web app URL in your browser
3. Google login → Dataform page loads with releases, workflows, and invocations

## Actions

| Action | Parameters | Description |
|---|---|---|
| `listInvocations` | none | List all workflow invocations |
| `listReleases` | none | List all release configs |
| `listReleaseCompilations` | `releaseId` | Compilations for a specific release |
| `restoreReleaseVars` | `releaseId`, `compilationId` | Restore vars from a past compilation to a release |
| `recompile` | none | Recompile all releases |
| `listWorkflowConfigs` | none | List all workflow configurations |
| `getWorkflowScripts` | `configId` | Get scripts for a workflow config |
| `listCompilations` | none | List all compilations with metadata |

## Debugging

- GAS logs: **Executions** tab in the Apps Script editor
- Browser console for client-side errors
- Run `TestRunAll` to verify all API connections
