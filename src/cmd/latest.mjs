/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import queriesFactory from '../queries.mjs';

/**
 *
 * @param {Migration[]} allMigrations
 * @param {Migration} latestMigration
 * @returns {Migration[]}
 */
const getNewMigrations = (allMigrations, latestMigration) => {
  const { name: latestMigrationName } = latestMigration;
  const latestMigrationIndex = allMigrations.findIndex((x) => x.name === latestMigrationName);
  const newMigrations = allMigrations.slice(latestMigrationIndex + 1);
  return newMigrations;
};

/**
 * @typedef {import('../index.mjs').Migration} Migration
 *
 * @param {Object} data
 * @param {*} data.sql a transaction object.
 * @param {Migration[]} data.allMigrations
 */
const latestCmd = async ({
  sql, schema, allMigrations, latestMigration = {}, batch,
}) => {
  const queries = queriesFactory({ schema, sql });
  const newMigrations = getNewMigrations(allMigrations, latestMigration);
  if (newMigrations.length < 1) {
    console.log(`No migrations to run. Already at latest ${latestMigration.name}`);
    return;
  }

  for (const m of newMigrations) {
    const { name, migration: { up } } = m;
    console.log('running migration ', name);
    await up(sql);
  }

  await queries.insertMigrations(newMigrations.map(({ name }) => ({ name, batch })));
  console.log(`Ran ${newMigrations.length} migrations. Batch ${batch}`);
};

export default latestCmd;
