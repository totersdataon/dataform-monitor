function httpFetch(url, options) {
  options = options || {};
  options.muteHttpExceptions = true;
  options.headers = options.headers || {};
  options.headers['Authorization'] = 'Bearer ' + ScriptApp.getOAuthToken();
  return UrlFetchApp.fetch(url, options);
}

function httpFetchJson(url) {
  const res = httpFetch(url);
  return JSON.parse(res.getContentText());
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function extractId(name) {
  if (!name) return '';
  var parts = name.split('/');
  return parts[parts.length - 1] || '';
}

function extractIdFromPath(name, index) {
  if (!name) return '';
  var parts = name.split('/');
  return parts[index] || '';
}

function parseCompilationActions(actions) {
  return (actions || []).map(function(action) {
    var target = action.target || {};
    return {
      type: action.type || '',
      target: {
        database: target.database || '',
        schema: target.schema || '',
        name: target.name || ''
      },
      filePath: action.filePath || '',
      selectQuery: action.selectQuery || '',
      bytesScanned: action.bytesScanned || 0
    };
  });
}

function buildGcpConsoleUrl(resourceType, name) {
  if (!name) return '#';
  var parts = name.split('/');
  if (parts.length < 6) return '#';
  var project = parts[1];
  var region = parts[3];
  var repo = parts[5];
  var id = parts[parts.length - 1];
  var path = resourceType === 'release'
    ? '/release-configurations/' + id
    : '/workflows/' + id;
  return 'https://console.cloud.google.com/bigquery/dataform/locations/' + region + '/repositories/' + repo + path + '?project=' + project;
}
