jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('../src/deploy');
jest.mock('../src/kubectl');
jest.mock('../src/manifests');
jest.mock('../src/env-config');
jest.mock('../src/configure-domains');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const kubectl = require('../src/kubectl');
const createManifests = require('../src/manifests');
const prepareEnvConfig = require('../src/env-config');
const deploy = require('../src/deploy');

const action = require('../src/index');

describe('txengine-deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can deploy txengine', async () => {
    core.getInput.mockReturnValueOnce('deploy-account')
      .mockReturnValueOnce('secret-account')
      .mockReturnValueOnce('image')
      .mockReturnValueOnce('tenant')
      .mockReturnValueOnce('SE');

    prepareEnvConfig.mockResolvedValueOnce({
      replaceTokens: { NAMESPACE: 'test' },
      configMap: {},
      secrets: {},
    });

    kubectl.configure.mockResolvedValueOnce('test-staging-project');
    createManifests.mockResolvedValueOnce(({
      file: 'file.yaml',
      content: 'test',
      namespace: 'test-namespace',
    }));

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(kubectl.configure).toHaveBeenCalledWith('deploy-account');
    expect(createManifests).toHaveBeenCalledTimes(1);
    expect(deploy).toHaveBeenCalledTimes(1);
  });
});
