// eslint-disable-next-line import/prefer-default-export
export const up = async (sql) => {
  await sql`create table main_cmd_test.users_v2 (id int primary key, name text)`;
};

export const down = async (sql) => {
  await sql`drop table main_cmd_test.users_v2`;
};
