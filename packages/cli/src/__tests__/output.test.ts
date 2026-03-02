// --------------------------------------------------------------------------
// CLI tests — Output formatting & Exit codes
// --------------------------------------------------------------------------
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { printSuccess, printError, printWarning, printInfo, printHeader, fmt } from '../output.js';
import { EXIT } from '../exitCodes.js';

describe('Exit codes', () => {
  it('exports SUCCESS as 0', () => {
    expect(EXIT.SUCCESS).toBe(0);
  });

  it('exports DRIFT_UNSAFE_LINT as 1', () => {
    expect(EXIT.DRIFT_UNSAFE_LINT).toBe(1);
  });

  it('exports CONFIG_USAGE as 2', () => {
    expect(EXIT.CONFIG_USAGE).toBe(2);
  });

  it('exports DB_CONNECTIVITY as 3', () => {
    expect(EXIT.DB_CONNECTIVITY).toBe(3);
  });
});

describe('Output formatting', () => {
  let consoleSpy: MockInstance;
  let stderrSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    stderrSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('printSuccess writes to stdout', () => {
    printSuccess('done');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]![0] as string;
    expect(output).toContain('done');
  });

  it('printError writes to stderr', () => {
    printError('oops');
    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls[0]![0] as string;
    expect(output).toContain('oops');
  });

  it('printWarning writes to stderr via console.warn', () => {
    printWarning('careful');
    expect(warnSpy).toHaveBeenCalled();
    const output = warnSpy.mock.calls[0]![0] as string;
    expect(output).toContain('careful');
  });

  it('printInfo writes to stdout', () => {
    printInfo('info');
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]![0] as string;
    expect(output).toContain('info');
  });

  it('printHeader writes title and separator', () => {
    printHeader('Test Header');
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  it('fmt.bold returns a string', () => {
    expect(typeof fmt.bold('test')).toBe('string');
    expect(fmt.bold('test')).toContain('test');
  });

  it('fmt.red returns a string containing the text', () => {
    expect(fmt.red('error')).toContain('error');
  });
});
