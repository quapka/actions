const yaml = require('yaml');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const createReplaceTokens = (projectId, image, tenantName, countryCode) => {
  const tenantLowerCase = tenantName.toLowerCase();
  const namespace = [tenantLowerCase];
  if (countryCode) {
    namespace.push(countryCode.toLowerCase());
  }
  namespace.push('txengine');

  return {
    NAMESPACE: namespace.join('-'),
    TENANT_NAME: tenantLowerCase,
    CONTAINER_IMAGE: image,
  };
};

const parseEnvironment = (environment, projectId) => {
  if (!environment) {
    return {};
  }
  return yaml.parse(environment.replace(/sm:\/\/\*\//g, `sm://${projectId}/`));
};

const defaultEnvironment = (projectId, tenantName) => ({
  DATABASE_HOST: `sm://${projectId}/${tenantName}_postgresql_private_address`,
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: `sm://${projectId}/${tenantName}_postgresql_master_password`,
  SERVICE_PROJECT_ID: projectId,
  SERVICE_ENVIRONMENT: projectId.includes('-staging-') ? 'staging' : 'prod',
});

const loadAllSecrets = async (serviceAccountKey, secrets) => {
  const results = [];
  const resolvedSecrets = {};
  Object.entries(secrets).forEach(([name, value]) => {
    results.push(loadSecret(serviceAccountKey, value)
      .then((secret) => {
        resolvedSecrets[name] = secret;
      }).catch((err) => {
        throw new Error(`Failed to access secret '${value}'. Reason: ${err.message}`);
      }));
  });
  await Promise.all(results);
  return resolvedSecrets;
};

const prepareEnvConfig = async (
  deployServiceAccountKey,
  projectId,
  image,
  tenantName,
  countryCode,
  environmentString = '',
) => {
  const replaceTokens = createReplaceTokens(projectId, image, tenantName, countryCode);
  const environment = {
    ...defaultEnvironment(projectId, tenantName.toLowerCase()),
    ...parseEnvironment(environmentString, projectId),
  };

  const configMap = {};
  const secretsAsNames = {};
  Object.entries(environment).forEach(([name, value]) => {
    if (value.startsWith('sm://')) {
      if (!value.includes(projectId)) {
        throw new Error(`Secrets can only be loaded from target project: ${projectId}`);
      }
      secretsAsNames[name] = value.split('/').pop();
    } else {
      configMap[name] = value;
    }
  });

  const secrets = await loadAllSecrets(deployServiceAccountKey, secretsAsNames);

  return {
    replaceTokens,
    configMap,
    secrets,
  };
};

module.exports = prepareEnvConfig;