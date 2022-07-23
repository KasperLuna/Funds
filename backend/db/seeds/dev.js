/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const dev = async function (knex) {
  await knex.raw('TRUNCATE TABLE "accounts" CASCADE');

  await knex("accounts").insert([
    {
      id: "1",
      name: "KasperLuna",
      email: "mail@kasperluna.com",
      hash: "123456789",
      tables: ["KasperLuna_BPI", "KasperLuna_BDO"],
    },
  ]);
};

export default dev;
