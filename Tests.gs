function TestConfig() {
  Logger.log('=== TestConfig ===');
  var project = Config.project;
  var region = Config.region;
  var repo = Config.repo;

  Logger.log('project: ' + project);
  Logger.log('region: ' + region);
  Logger.log('repo: ' + repo);
  Logger.log('repoPath: ' + Config.repoPath);

  if (!project || !region || !repo) {
    Logger.log('[FAIL] One or more Script Properties are null');
    return false;
  }
  Logger.log('[PASS] All Script Properties loaded');
  return true;
}

function TestAuth() {
  Logger.log('=== TestAuth ===');
  var url = 'https://dataform.googleapis.com/v1/projects/' + Config.project
    + '/locations/' + Config.region
    + '/repositories/' + Config.repo
    + '/releaseConfigs';

  Logger.log('URL: ' + url);
  var res = httpFetch(url);
  var code = res.getResponseCode();
  Logger.log('Status: ' + code);

  if (code === 200) {
    Logger.log('[PASS] Authenticated OK');
    return true;
  }
  Logger.log('[FAIL] HTTP ' + code + ': ' + res.getContentText().substring(0, 500));
  return false;
}

function TestListReleases() {
  Logger.log('=== TestListReleases ===');
  var result = DataformService.listReleaseConfigs();
  Logger.log('ok: ' + result.ok);
  if (!result.ok) {
    Logger.log('[FAIL] ' + JSON.stringify(result.data).substring(0, 500));
    return false;
  }
  var releases = result.data.releaseConfigs || [];
  Logger.log('Count: ' + releases.length);
  releases.forEach(function(r) { Logger.log('  - ' + (r.name || '').split('/').pop()); });
  Logger.log('[PASS] listReleaseConfigs');
  return true;
}

function TestListWorkflows() {
  Logger.log('=== TestListWorkflows ===');
  var result = DataformService.listWorkflowConfigs();
  if (result.error) {
    Logger.log('[FAIL] ' + result.error);
    return false;
  }
  var configs = result.workflowConfigs || [];
  Logger.log('Count: ' + configs.length);
  configs.forEach(function(c) { Logger.log('  - ' + (c.name || '').split('/').pop()); });
  Logger.log('[PASS] listWorkflowConfigs');
  return true;
}

function TestListInvocations() {
  Logger.log('=== TestListInvocations ===');
  var result = DataformService.listWorkflowInvocations();
  Logger.log('ok: ' + result.ok);
  if (!result.ok) {
    Logger.log('[FAIL] ' + JSON.stringify(result.data).substring(0, 500));
    return false;
  }
  var invocations = result.data.workflowInvocations || [];
  Logger.log('Count: ' + invocations.length);
  invocations.slice(0, 5).forEach(function(inv) {
    Logger.log('  - ' + (inv.name || '').split('/').pop() + ' [' + (inv.state || '?') + ']');
  });
  if (invocations.length > 5) Logger.log('  ... and ' + (invocations.length - 5) + ' more');
  Logger.log('[PASS] listWorkflowInvocations');
  return true;
}

function TestRunAll() {
  Logger.log('========== TEST SUITE ==========');
  var tests = [
    TestConfig,
    TestAuth,
    TestListReleases,
    TestListWorkflows,
    TestListInvocations
  ];
  var passed = 0;
  var failed = 0;
  tests.forEach(function(test) {
    try {
      if (test()) passed++; else failed++;
    } catch (e) {
      Logger.log('[FAIL] ' + test.name + ' threw: ' + e.message);
      failed++;
    }
    Logger.log('');
  });
  Logger.log('========== RESULTS: ' + passed + '/' + (passed + failed) + ' passed ==========');
}
