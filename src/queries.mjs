import { asyncPipe } from './util.mjs';

export default ({ schema, sql }) => {
  const createMigrationsTable = async () => {
    await sql`create table if not exists ${sql(schema)}.migrations(
        id int primary key generated always as identity,
        name text not null,
        batch int not null,
        migration_time timestamptz not null default current_timestamp
      )`;
  };
  const createMigrationsLockTable = async () => {
    await sql`create table if not exists ${sql(schema)}.migrations_lock(
        index int primary key not null, 
        is_locked boolean not null
      )`;
  };

  /**
     * Select everything from the migrations lock table to check if the lock row exists or not.
     * It should really only ever be empty on a first run. Otherwise, there should always be
     * exactly 1 row.
     */
  const selectLockRows = async () => {
    const rows = await sql`select * from ${sql(schema)}.migrations_lock`;
    return rows;
  };

  const insertLockRow = async () => {
    const result = await sql`insert into ${sql(schema)}.migrations_lock(index, is_locked) values (1, false)`;
    return result;
  };

  const insertLockRowIfNeeded = async (lockRows) => {
    if (lockRows.length > 1) {
      throw new Error('Unexpected state. The number of lock rows should never exceed 1.');
    }

    if (lockRows.length === 0) {
      await insertLockRow();
    }
  };

  const ensureRequiredTablesExist = asyncPipe(
    createMigrationsTable,
    createMigrationsLockTable,
  );

  const ensureLockRowExists = asyncPipe(
    selectLockRows,
    insertLockRowIfNeeded,
  );

  /**
     * Acquires a lock from the database.
     * Returns 1 if lock is acquired, or throws if could not be acquired
     * @returns {Number}
     * @throws
     */
  const acquireLock = async () => {
    const lock = await sql`update ${sql(schema)}.migrations_lock set is_locked = true where is_locked = false`.then((x) => x.count);
    if (lock !== 1) {
      throw new Error('Postgres migrator could not acquire lock for migrations.');
    }

    return lock;
  };
  const releaseLock = async () => sql`update ${sql(schema)}.migrations_lock set is_locked = false`;

  const insertMigrations = async (migrations) => {
    await sql`insert into ${sql(schema)}.migrations ${sql(migrations, 'name', 'batch')}`;
  };

  const getCompletedMigrations = async () => {
    const completedMigrations = await sql`select id, name, batch from ${sql(schema)}.migrations order by id asc`;
    return completedMigrations;
  };

  const deleteMigration = async (id) => {
    await sql`delete from ${sql(schema)}.migrations where id = ${id}`;
  };

  return {
    createMigrationsTable,
    createMigrationsLockTable,
    selectLockRows,
    insertLockRow,
    insertLockRowIfNeeded,
    ensureRequiredTablesExist,
    ensureLockRowExists,
    acquireLock,
    releaseLock,
    insertMigrations,
    getCompletedMigrations,
    deleteMigration,
  };
};
