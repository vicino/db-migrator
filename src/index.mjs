/* eslint-disable no-underscore-dangle */
/**
 * @typedef {Object} Migration
 * @property {string} name - The name of the migration
 * @property {Object} migration - The up/down functions to run
 */

import fs from 'fs/promises';
import path from 'path';
import postgres from 'postgres';
import queriesFactory from './queries.mjs';
import latest from './cmd/latest.mjs';
import up from './cmd/up.mjs';
import down from './cmd/down.mjs';

const commands = {
  latest,
  up,
  down,
};

/**
 * @param {string} dir - Absolute path to directory containing migrations files.
 * @returns {Migration} Migration objects from the files in the directory.
 */
const getAllMigrationsFromDir = async (dir) => {
  const fileNames = await fs.readdir(dir);
  const modules = await Promise.all(
    fileNames.map(async (file) => {
      const mod = await import(path.join(dir, file));
      return { name: file, migration: mod };
    }),
  );
  return modules;
};

const main = async ({ command = 'latest', schema = 'public' }) => {
  const cmd = commands[command];
  if (!cmd) {
    throw new Error(`Command ${command} not found.`);
  }
  const sql = postgres({
    host: '127.0.0.1',
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: 'supersecret',
  });
  const queries = queriesFactory({ schema, sql });
  let didAcquireLock = false;

  try {
    await queries.ensureRequiredTablesExist();
    await queries.ensureLockRowExists();
    await queries.acquireLock();
    didAcquireLock = true;

    const migrationsDir = new URL(`${path.dirname(import.meta.url)}../../migrations`).pathname;
    const allRunnableMigrations = await getAllMigrationsFromDir(migrationsDir);
    const completedMigrations = await queries.getCompletedMigrations({ schema, sql });
    const latestMigration = completedMigrations[completedMigrations.length - 1];
    const batch = (latestMigration?.batch ?? 0) + 1;

    await sql.begin(async (t) => {
      await cmd({
        sql: t,
        schema,
        allMigrations: allRunnableMigrations,
        completedMigrations,
        latestMigration,
        batch,
      });
    });
  } catch (err) {
    console.error(err);
  } finally {
    if (didAcquireLock) { await queries.releaseLock(); }
    sql.end();
  }
};

export default main;
