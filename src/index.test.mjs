import postgres from 'postgres';
import { expect } from 'chai';
import main from './index.mjs';

const isCompletedMigrationAsExpected = (completedMigration, { id, name, batch }) => {
  expect(completedMigration.id).to.equal(id);
  expect(completedMigration.name).to.equal(name);
  expect(completedMigration.batch).to.equal(batch);
  // eslint-disable-next-line no-unused-expressions
  expect(completedMigration.migration_time).to.not.be.null;
};

const isLockUnlocked = (migrationsLock) => {
  expect(migrationsLock.length).to.equal(1);
  expect(migrationsLock[0].index).to.equal(1);
  expect(migrationsLock[0].is_locked).to.equal(false);
};

describe('main cmd', () => {
  const schema = 'main_cmd_test';
  let sql;

  before(async () => {
    sql = postgres({
      host: '127.0.0.1',
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: 'supersecret',
    });
  });

  after(async () => {
    await sql.end();
  });

  beforeEach(async () => {
    await sql`create schema ${sql(schema)};`;
  });

  afterEach(async () => {
    await sql`drop schema ${sql(schema)} cascade`;
  });

  it('should run the latest command successfully', async () => {
    await main({ command: 'latest', schema });

    const completedMigrations = await sql`select * from ${sql(schema)}.migrations`;
    expect(completedMigrations.length).to.equal(2);
    isCompletedMigrationAsExpected(completedMigrations[0], { id: 1, name: '000-create-tables.mjs', batch: 1 });
    isCompletedMigrationAsExpected(completedMigrations[1], { id: 2, name: '001-create-more-tables.mjs', batch: 1 });

    const migrationsLock = await sql`select * from ${sql(schema)}.migrations_lock`;
    isLockUnlocked(migrationsLock);
  });

  it('should run the up command successfully', async () => {
    await main({ command: 'up', schema });
    await main({ command: 'up', schema });

    const completedMigrations = await sql`select * from ${sql(schema)}.migrations`;
    expect(completedMigrations.length).to.equal(2);
    isCompletedMigrationAsExpected(completedMigrations[0], { id: 1, name: '000-create-tables.mjs', batch: 1 });
    isCompletedMigrationAsExpected(completedMigrations[1], { id: 2, name: '001-create-more-tables.mjs', batch: 2 });

    const migrationsLock = await sql`select * from ${sql(schema)}.migrations_lock`;
    isLockUnlocked(migrationsLock);
  });

  it('should run the down command successfully', async () => {
    await main({ command: 'up', schema });
    await main({ command: 'up', schema });
    await main({ command: 'down', schema });

    const completedMigrations = await sql`select * from ${sql(schema)}.migrations`;
    expect(completedMigrations.length).to.equal(1);
    isCompletedMigrationAsExpected(completedMigrations[0], { id: 1, name: '000-create-tables.mjs', batch: 1 });

    const migrationsLock = await sql`select * from ${sql(schema)}.migrations_lock`;
    isLockUnlocked(migrationsLock);
  });
});
