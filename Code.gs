const ACTIONS = {
  listInvocations:           () => DataformService.listWorkflowInvocations(),
  listReleases:              () => DataformService.listReleaseConfigs(),
  listReleaseCompilations:   (p) => DataformService.listReleaseCompilations(p.releaseId),
  restoreReleaseVars:        (p) => DataformService.restoreReleaseVars(p.releaseId, p.compilationId),
  listCompilations:          () => ({ compilates: DataformService.listCompilationResults() }),
  recompile:                 () => DataformService.recompileAll(),
  listWorkflowConfigs:       () => DataformService.listWorkflowConfigs(),
  getWorkflowScripts:        (p) => DataformService.getWorkflowScripts(p.configId),
};

function runAction(action, params) {
  const handler = ACTIONS[action];
  if (!handler) throw new Error('Unknown action: ' + action);
  return handler(params || {});
}

function doGet(e) {
  const email = Session.getActiveUser().getEmail();
  const allowed = (PropertiesService.getScriptProperties()
    .getProperty('ALLOWED_USERS') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && allowed.indexOf(email) === -1) {
    return HtmlService.createHtmlOutput('<h1>Unauthorized</h1><p>You do not have access.</p>');
  }
  return HtmlService.createHtmlOutputFromFile('dataform')
    .setTitle('Pipeline Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const email = Session.getActiveUser().getEmail();
  const allowed = (PropertiesService.getScriptProperties()
    .getProperty('ALLOWED_USERS') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && allowed.indexOf(email) === -1) {
    return jsonResponse({ error: 'Unauthorized' });
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const handler = ACTIONS[payload.action];
    if (!handler) return jsonResponse({ error: 'Unknown action: ' + payload.action });
    return jsonResponse(handler(payload));
  } catch (err) {
    return jsonResponse({ error: err.message });
  } finally {
    lock.releaseLock();
  }
}
