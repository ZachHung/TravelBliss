// `node dist/config/check-env.js`: exits 1, naming every problem, when this environment can't run the API.
// deploy.sh runs it in the new image with the VM's settings, before backing up or migrating (#215).
import { envProblems } from './env';

const problems = envProblems();
for (const problem of problems) {
  process.stderr.write(`${problem}\n`);
}
process.exitCode = problems.length ? 1 : 0;
