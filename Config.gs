const Config = {
  get project() {
    return PropertiesService.getScriptProperties().getProperty('GCLOUD_PROJECT');
  },
  get region() {
    return PropertiesService.getScriptProperties().getProperty('GCLOUD_REGION') || 'europe-west1';
  },
  get repo() {
    return PropertiesService.getScriptProperties().getProperty('DATAFORM_REPO') || 'tableau-data-pipelines';
  },
  get repoPath() {
    return `projects/${this.project}/locations/${this.region}/repositories/${this.repo}`;
  }
};
