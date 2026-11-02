import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
for (const [command, args] of [
  ['node', ['--test', 'tests/client.test.mjs']],
  ['python3', ['-B', '-m', 'unittest', 'discover', '-s', 'tests', '-v']],
  ['bash', ['-n', 'examples/curl/quickstart.sh']],
]) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(result.status, 0, command + ' validation failed');
}
