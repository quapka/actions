const mockLoadSecret = jest.fn();
jest.mock('../../gcp-secret-manager/src/secrets', () => ({
  loadSecret: mockLoadSecret,
}));

const prepareEnvConfig = require('../src/env-config');

describe('env-config', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  beforeEach(() => {
    mockLoadSecret.mockResolvedValueOnce('localhost')
      .mockResolvedValueOnce('my-password')
      .mockResolvedValueOnce('my-pg-password')
      .mockResolvedValueOnce('my-launch-darkly-access-key');
  });

  test('It creates config variables', async () => {
    const { replaceTokens, configMap, secrets } = await prepareEnvConfig(
      'deploy-secret-key',
      'test-prod-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
    );

    expect(replaceTokens).toEqual({
      NAMESPACE: 'testrunner-se-txengine',
      CONTAINER_IMAGE: 'eu.gcr.io/extenda/test:v1.0.0',
      TENANT_NAME: 'testrunner-se',
    });

    expect(configMap).toEqual({
      DATABASE_USER: 'postgres',
      SERVICE_PROJECT_ID: 'test-prod-project',
      SERVICE_ENVIRONMENT: 'prod',
    });

    expect(secrets).toEqual({
      DATABASE_HOST: 'localhost',
      DATABASE_PASSWORD: 'my-password',
      PGPASSWORD: 'my-pg-password',
      LAUNCH_DARKLY_ACCESS_KEY: 'my-launch-darkly-access-key',
    });

    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_SE_postgresql_private_address');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_SE_postgresql_master_password');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_SE_postgresql_master_password');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'launchdarkly-sdk-key');
  });

  test('It can handle optional country code', async () => {
    const { replaceTokens } = await prepareEnvConfig(
      'deploy-secret-key',
      'test-staging-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
    );

    expect(replaceTokens).toMatchObject({
      NAMESPACE: 'testrunner-txengine',
    });
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_postgresql_private_address');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_postgresql_master_password');
  });

  test('It can handle empty country code', async () => {
    const { replaceTokens } = await prepareEnvConfig(
      'deploy-secret-key',
      'test-staging-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      '',
    );

    expect(replaceTokens).toMatchObject({
      NAMESPACE: 'testrunner-txengine',
    });
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_postgresql_private_address');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_postgresql_master_password');
  });

  test('It can detect staging environment', async () => {
    const { configMap } = await prepareEnvConfig(
      'deploy-secret-key',
      'test-staging-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
    );

    expect(configMap).toMatchObject({
      SERVICE_ENVIRONMENT: 'staging',
    });
  });

  test('It handles additional environment with secrets', async () => {
    mockLoadSecret.mockResolvedValueOnce('my-first-secret')
      .mockResolvedValueOnce('my-second-secret');
    const { replaceTokens, configMap, secrets } = await prepareEnvConfig(
      'deploy-secret-key',
      'test-prod-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
      'MY_CONFIG: my-value\nMY_SECRET1: sm://*/secret1\nMY_SECRET2: sm://test-prod-project/secret2',
    );

    expect(replaceTokens).toEqual({
      NAMESPACE: 'testrunner-se-txengine',
      CONTAINER_IMAGE: 'eu.gcr.io/extenda/test:v1.0.0',
      TENANT_NAME: 'testrunner-se',
    });

    expect(configMap).toEqual({
      DATABASE_USER: 'postgres',
      SERVICE_PROJECT_ID: 'test-prod-project',
      SERVICE_ENVIRONMENT: 'prod',
      MY_CONFIG: 'my-value',
    });

    expect(secrets).toEqual({
      DATABASE_HOST: 'localhost',
      DATABASE_PASSWORD: 'my-password',
      MY_SECRET1: 'my-first-secret',
      MY_SECRET2: 'my-second-secret',
      PGPASSWORD: 'my-pg-password',
      LAUNCH_DARKLY_ACCESS_KEY: 'my-launch-darkly-access-key',
    });

    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_SE_postgresql_private_address');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'testrunner_SE_postgresql_master_password');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'secret1');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'secret2');
    expect(mockLoadSecret).toHaveBeenCalledWith('deploy-secret-key', 'launchdarkly-sdk-key');
  });

  test('It throws if accessing secrets from wrong project', async () => {
    await expect(prepareEnvConfig(
      'deploy-secret-key',
      'test-prod-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
      'MY_SECRET2: sm://invalid-project/secret',
    )).rejects.toEqual(new Error('Secrets can only be loaded from target project: test-prod-project'));
  });

  test('It throws if failing to resolve secret', async () => {
    mockLoadSecret.mockRejectedValueOnce(new Error('Unknown secret'));
    await expect(prepareEnvConfig(
      'deploy-secret-key',
      'test-prod-project',
      'eu.gcr.io/extenda/test:v1.0.0',
      'testrunner',
      'SE',
      'MY_SECRET2: sm://*/secret',
    )).rejects.toEqual(new Error("Failed to access secret 'secret'. Reason: Unknown secret"));
  });
});
