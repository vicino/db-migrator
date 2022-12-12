// eslint-disable-next-line import/prefer-default-export
export const up = async (sql) => {
  await sql`create table users_v2 (id int primary key, name text)`;
};
