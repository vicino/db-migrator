import { expect } from 'chai';
import postgres from 'postgres';
import queriesFactory from './queries.mjs';

describe('queries', () => {
  let sql;
  let queries;

  before(() => {
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

  beforeEach(() => {
    queries = queriesFactory({ schema: 'public', sql });
  });

  it('should create migrations table', async () => {
    await queries.createMigrationsTable();
  });

  it('should create migrations lock table', async () => {
    await queries.createMigrationsLockTable();
  });

  describe('after create tables', () => {
    beforeEach(async () => {
      await sql`drop table public.migrations;`;
      await sql`drop table public.migrations_lock;`;
      await queries.createMigrationsTable();
      await queries.createMigrationsLockTable();
    });

    it('should select lock rows', async () => {
      await queries.selectLockRows();
    });

    it('should insert lock row', async () => {
      await queries.insertLockRow();
    });

    describe('after insert lock row', async () => {
      beforeEach(async () => {
        await queries.insertLockRow();
      });

      it('should acquire lock', async () => {
        await queries.acquireLock();
      });

      it('should throw when cannot acquire lock', async () => {
        await queries.acquireLock();
        try {
          await queries.acquireLock();
        } catch (err) {
          return;
        }

        // the test should return in the cath{} block above, so fail if we ever get here
        expect(false).to.equal(true);
      });

      it('should release lock', async () => {
        await queries.releaseLock();
      });

      it('should insert a single migration', async () => {
        await queries.insertMigrations([{ name: 'create_tables', batch: 3 }]);
        expect((await queries.getCompletedMigrations()).length).to.equal(1);
      });

      it('should insert multiple migrations', async () => {
        await queries.insertMigrations(
          [
            { name: 'create_tables', batch: 3 },
            { name: 'create_tables_again', batch: 3 },
            { name: 'create_tables_again_again', batch: 3 },
          ],
        );
        expect((await queries.getCompletedMigrations()).length).to.equal(3);
      });

      it('should get completed migrations', async () => {
        await queries.insertMigrations(
          [
            { name: 'create_tables', batch: 3 },
            { name: 'create_tables_again', batch: 3 },
            { name: 'create_tables_again_again', batch: 3 },
          ],
        );
        const completedMigrations = await queries.getCompletedMigrations();
        expect(completedMigrations[0].name).to.equal('create_tables');
        expect(completedMigrations[0].batch).to.equal(3);
        expect(completedMigrations[1].name).to.equal('create_tables_again');
        expect(completedMigrations[1].batch).to.equal(3);
        expect(completedMigrations[2].name).to.equal('create_tables_again_again');
        expect(completedMigrations[2].batch).to.equal(3);
      });
    });
  });
});
