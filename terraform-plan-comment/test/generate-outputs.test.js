const mockFs = require('mock-fs');
const exec = require('@actions/exec');
const generateOutputs = require('../src/generate-outputs');

const terragruntFs = {
  '/work': {
    moduleA: {
      '.terragrunt-cache': {
        'plan.out': 'moduleA',
      },
    },
    moduleB: {
      '.terragrunt-cache': {
        'plan.out': 'moduleB',
      },
    },
  },
};

jest.mock('@actions/exec');

const mockOutput = async (data, opts, success = true) => {
  if (opts && opts.listeners) {
    opts.listeners.stdout(Buffer.from(`${data}\n`, 'utf8'));
    if (!success) {
      opts.listeners.stderr(Buffer.from('Error\n', 'utf8'));
    }
  }
  if (success) {
    return Promise.resolve(0);
  }
  return Promise.reject(new Error('Exit with error'));
};


describe('Generate Terraform plan output', () => {
  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It can process nested terragrunt plans', async () => {
    mockFs(terragruntFs);
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('Module A changes', opts))
      .mockImplementationOnce((bin, args, opts) => mockOutput('Module B changes', opts));

    const outputs = await generateOutputs('/work', 'plan.out');
    expect(outputs).toEqual([
      { module: 'moduleA', output: 'Module A changes', status: 0 },
      { module: 'moduleB', output: 'Module B changes', status: 0 },
    ]);
    expect(exec.exec.mock.calls[0][1]).toEqual(['show', '-no-color', 'plan.out']);
    expect(exec.exec.mock.calls[0][2]).toMatchObject({
      cwd: '/work/moduleA/.terragrunt-cache',
    });
    expect(exec.exec.mock.calls[1][1]).toEqual(['show', '-no-color', 'plan.out']);
    expect(exec.exec.mock.calls[1][2]).toMatchObject({
      cwd: '/work/moduleB/.terragrunt-cache',
    });
  });

  test('It can process a single plan file', async () => {
    mockFs({
      '/work/plan.out': 'single-plan',
    });
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('Changed terraform plan.', opts));
    const outputs = await generateOutputs('/work', 'plan.out');
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      { module: '/work', output: 'Changed terraform plan.', status: 0 },
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will filter unchanged plans', async () => {
    mockFs(terragruntFs);
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput(
      'Module A unchanged. 0 to add, 0 to change, 0 to destroy.\n',
      opts,
    )).mockImplementationOnce((bin, args, opts) => mockOutput('Module B changes', opts));
    const outputs = await generateOutputs('/work', 'plan.out');
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      { module: 'moduleB', output: 'Module B changes', status: 0 },
    ]);
  });

  test('It will swallow and report terraform error', async () => {
    mockFs({
      '/work/plan.out': 'bad-plan',
    });
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('Terraform output', opts, false));
    const outputs = await generateOutputs('/work', 'plan.out');
    expect(outputs).toHaveLength(1);
    expect(outputs).toEqual([
      { module: '/work', output: 'Terraform output\nError', status: 1 },
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});