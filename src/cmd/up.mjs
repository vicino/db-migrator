/*
eslint-disable no-await-in-loop, import/no-dynamic-require, global-require, no-restricted-syntax
*/

import queriesFactory from '../queries.mjs';

const getNextMigration = (allMigrations, latestMigration) => {
  const { name: latestMigrationName } = latestMigration;
  const latestMigrationIndex = allMigrations.findIndex((x) => x.name === latestMigrationName);
  const nextMigration = allMigrations[latestMigrationIndex + 1];
  return nextMigration;
};

const upCmd = async ({
  sql, schema, allMigrations, latestMigration = {}, batch,
}) => {
  const queries = queriesFactory({ schema, sql });
  const nextMigration = getNextMigration(allMigrations, latestMigration);
  if (!nextMigration) {
    console.log(`No migration to up. Already at latest ${latestMigration.name}`);
    return;
  }

  const { name, migration: { up } } = nextMigration;
  await up(sql);
  await queries.insertMigrations([{ name, batch }]);
  console.log(`Successfully ran ${name} migration.`);
};

export default upCmd;
