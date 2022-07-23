import { knexSnakeCaseMappers } from "objection";

export const development = {
  client: "postgresql",
  connection: {
    database: "finance",
    user: "kasperluna",
    password: null,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./seeds",
  },
  ...knexSnakeCaseMappers,
};
