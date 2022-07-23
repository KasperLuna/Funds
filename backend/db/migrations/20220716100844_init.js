/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.updateTable("accounts", (table) => {
    table.increments();
    table.string("name").notNullable();
    table.string("email").notNullable();
    table.specificType("tables", "STRING[]").notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (_knex) {
  return;
};
