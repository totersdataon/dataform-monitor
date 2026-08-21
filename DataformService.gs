const DataformService = {
  listWorkflowInvocations: function() {
    const url = _baseUrl() + '/workflowInvocations?orderBy=create_time%20desc';
    const res = httpFetch(url);
    return { ok: res.getResponseCode() === 200, data: JSON.parse(res.getContentText()) };
  },

  listReleaseConfigs: function() {
    const url = _baseUrl() + '/releaseConfigs';
    const res = httpFetch(url);
    return { ok: res.getResponseCode() === 200, data: JSON.parse(res.getContentText()) };
  },

  listCompilationResults: function() {
    const allResults = {};
    let pageToken = null;
    while (true) {
      let endpoint = 'compilationResults';
      if (pageToken) endpoint += '?pageToken=' + pageToken;
      const res = httpFetch(_baseUrl() + '/' + endpoint);
      if (res.getResponseCode() !== 200) break;
      const data = JSON.parse(res.getContentText());
      for (const cr of (data.compilationResults || [])) {
        allResults[extractId(cr.name)] = cr;
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return allResults;
  },

  listReleaseCompilations: function(releaseId) {
    const allResults = this.listCompilationResults();
    const compilations = [];
    for (const [compId, cr] of Object.entries(allResults)) {
      const releaseConfig = cr.releaseConfig || '';
      if (releaseConfig.endsWith('/releaseConfigs/' + releaseId)) {
        compilations.push({
          name: compId,
          createTime: cr.createTime || '',
          vars: ((cr.codeCompilationConfig || {}).vars || {}),
          schemaSuffix: (cr.codeCompilationConfig || {}).schemaSuffix || ''
        });
      }
    }
    compilations.sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
    return { compilations: compilations };
  },

  restoreReleaseVars: function(releaseId, compilationId) {
    const compRes = httpFetch(_baseUrl() + '/compilationResults/' + compilationId);
    if (compRes.getResponseCode() !== 200) {
      return { error: 'Failed to fetch compilation: ' + compRes.getContentText() };
    }
    const compData = JSON.parse(compRes.getContentText());
    const compVars = ((compData.codeCompilationConfig || {}).vars || {});

    const fetchRes = httpFetch(_baseUrl() + '/releaseConfigs/' + releaseId);
    if (fetchRes.getResponseCode() !== 200) {
      return { error: 'Failed to fetch release: ' + fetchRes.getContentText() };
    }
    const releaseData = JSON.parse(fetchRes.getContentText());
    const currentGit = releaseData.gitCommitish || 'main';

    const patchBody = {
      releaseCompilationResult: Config.repoPath + '/compilationResults/' + compilationId,
      gitCommitish: currentGit,
      codeCompilationConfig: { vars: compVars }
    };

    const patchRes = httpFetch(_baseUrl() + '/releaseConfigs/' + releaseId, {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(patchBody)
    });

    if (patchRes.getResponseCode() !== 200) {
      return { error: 'Failed to update release: ' + patchRes.getContentText() };
    }
    return { status: 'ok', release: releaseId, compilation: compilationId, vars: compVars };
  },

  recompileAll: function() {
    const releasesRes = httpFetch(_baseUrl() + '/releaseConfigs');
    if (releasesRes.getResponseCode() !== 200) {
      return { results: [{ status: 'error', error: 'Failed to list releases' }] };
    }
    const releases = (JSON.parse(releasesRes.getContentText()).releaseConfigs || []);
    const results = [];

    for (const release of releases) {
      const releaseName = release.name || '';
      const releaseId = extractId(releaseName);
      if (!releaseId) continue;

      const currentVars = ((release.codeCompilationConfig || {}).vars || {});
      const schemaSuffix = (release.codeCompilationConfig || {}).schemaSuffix || '';

      const compileRes = httpFetch(_baseUrl() + '/compilationResults', {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ releaseConfig: releaseName })
      });

      if (compileRes.getResponseCode() !== 200) {
        results.push({ release: releaseId, status: 'error', error: 'compile failed: ' + compileRes.getResponseCode() });
        continue;
      }

      const compData = JSON.parse(compileRes.getContentText());
      const newCompResult = compData.name;
      if (!newCompResult) {
        results.push({ release: releaseId, status: 'error', error: 'no compilation result returned' });
        continue;
      }

      const patchBody = {
        releaseCompilationResult: newCompResult,
        gitCommitish: 'main',
        codeCompilationConfig: { vars: currentVars, schemaSuffix: schemaSuffix }
      };

      const patchRes = httpFetch(_baseUrl() + '/releaseConfigs/' + releaseId, {
      method: 'patch',
      contentType: 'application/json',
      payload: JSON.stringify(patchBody)
    });

    if (patchRes.getResponseCode() === 200) {
      results.push({ release: releaseId, status: 'ok', compilationResult: newCompResult });
      } else {
        results.push({ release: releaseId, status: 'error', error: 'patch failed: ' + patchRes.getResponseCode() });
      }
    }
    return { results: results };
  },

  listWorkflowConfigs: function() {
    const res = httpFetch(_baseUrl() + '/workflowConfigs');
    if (res.getResponseCode() !== 200) {
      return { error: 'API error: ' + res.getResponseCode() + ': ' + res.getContentText() };
    }
    const data = JSON.parse(res.getContentText());
    const configs = (data.workflowConfigs || []).map(wc => {
      const name = wc.name || '';
      return {
        id: extractId(name),
        name: wc.displayName || extractId(name),
        releaseConfig: wc.releaseConfig || '',
        cronSchedule: wc.cronSchedule || '',
        state: wc.state || '',
        gcpUrl: buildGcpConsoleUrl('workflow', name),
        includedTargets: ((wc.invocationConfig || {}).includedTargets || [])
      };
    });
    return { workflowConfigs: configs };
  },

  getWorkflowScripts: function(configId) {
    const wcRes = httpFetch(_baseUrl() + '/workflowConfigs/' + configId);
    if (wcRes.getResponseCode() !== 200) {
      return { error: 'Failed to fetch workflow config: ' + wcRes.getContentText() };
    }
    const wcData = JSON.parse(wcRes.getContentText());
    const releaseConfigPath = wcData.releaseConfig || '';

    if (!releaseConfigPath) {
      return { error: 'Workflow config has no releaseConfig' };
    }

    const releaseId = extractId(releaseConfigPath);
    const releaseRes = httpFetch(_baseUrl() + '/releaseConfigs/' + releaseId);
    if (releaseRes.getResponseCode() !== 200) {
      return { error: 'Failed to fetch release config: ' + releaseRes.getContentText() };
    }
    const releaseData = JSON.parse(releaseRes.getContentText());
    const compilationPath = releaseData.releaseCompilationResult || '';
    if (!compilationPath) {
      return { error: 'Release config has no releaseCompilationResult' };
    }

    const compilationId = extractId(compilationPath);
    const compResult = this._queryCompilationResult(compilationId);
    if (!compResult.success && compResult.actions.length === 0 && compResult.error) {
      return { error: 'Failed to query compilation result: ' + compResult.error };
    }

    const invocationConfig = wcData.invocationConfig || {};
    const includedTargets = invocationConfig.includedTargets || [];
    const includedSet = new Set(
      includedTargets.map(t => (t.database || '') + '|' + (t.schema || '') + '|' + (t.name || ''))
    );

    const scripts = includedSet.size > 0
      ? compResult.actions.filter(action => {
          const t = action.target || {};
          return includedSet.has((t.database || '') + '|' + (t.schema || '') + '|' + (t.name || ''));
        })
      : compResult.actions;

    return {
      configId: configId,
      configName: wcData.displayName || configId,
      releaseConfig: releaseConfigPath,
      compilationId: compilationId,
      state: wcData.state || '',
      cronSchedule: wcData.cronSchedule || '',
      includedTargets: includedTargets,
      transitiveDependenciesIncluded: invocationConfig.transitiveDependenciesIncluded || false,
      transitiveDependentsIncluded: invocationConfig.transitiveDependentsIncluded || false,
      scripts: scripts,
      totalScripts: scripts.length
    };
  },

  _queryCompilationResult: function(compilationResultId) {
    let url = _v1beta1Url() + '/compilationResults/' + compilationResultId + ':query';
    const res = httpFetch(url);
    if (res.getResponseCode() !== 200) {
      return { error: 'API error: ' + res.getResponseCode() + ': ' + res.getContentText() };
    }
    const data = JSON.parse(res.getContentText());
    const actions = parseCompilationActions(data.compilationResultActions || []);
    const success = actions.length > 0;
    return {
      compilationId: compilationResultId,
      actions: actions,
      success: success,
      error: success ? null : 'Compilation returned no actions (possible syntax error)'
    };
  }
};

function _baseUrl() {
  return 'https://dataform.googleapis.com/v1/' + Config.repoPath;
}

function _v1beta1Url() {
  return 'https://dataform.googleapis.com/v1beta1/' + Config.repoPath;
}
