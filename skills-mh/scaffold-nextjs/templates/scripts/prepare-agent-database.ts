/**
 * Prepares the database the `agent-dev` server runs on, before supervisord starts it. It sees
 * both DATABASE_URL (live) and AGENT_DATABASE_URL; `next dev` then gets the agent one as its
 * DATABASE_URL.
 *
 * Not implemented yet — seeding is this project's to design (e.g. reset a Neon branch from the
 * live one, run the migrations, insert a fixture the agent can browse). Until then `agent-dev`
 * fails to start with the error below, which is harmless: it only runs when asked.
 *
 * Keep the guard when you implement it: the agent server exists so an agent can click through the
 * app without writing to the live database.
 */
function prepareAgentDatabase() {
  const live = process.env.DATABASE_URL;
  const agent = process.env.AGENT_DATABASE_URL;

  if (!agent) throw new Error('AGENT_DATABASE_URL is not defined');
  if (agent === live) throw new Error('The agent database must not be the live database');

  throw new Error(
    'Not implemented: seed the agent database in scripts/prepare-agent-database.ts before starting agent-dev'
  );
}

prepareAgentDatabase();
