import queriesFactory from '../queries.mjs';

const downCmd = async ({
  sql, schema, latestMigration, allMigrations = [],
}) => {
  const queries = queriesFactory({ schema, sql });
  if (!latestMigration) {
    console.log('Postgres migrator: No migrations to down.');
    return;
  }

  const {
    name,
    migration: { down },
  } = allMigrations.find((x) => x.name === latestMigration.name);
  await down(sql);
  await queries.deleteMigration(latestMigration.id);
  console.log(`Successfully ran down: ${name}.`);
};

export default downCmd;
