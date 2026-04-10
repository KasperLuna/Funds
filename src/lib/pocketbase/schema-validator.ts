import type PocketBase from "pocketbase";
import { collections, type CollectionSchema } from "./schema";

interface ValidationResult {
  valid: boolean;
  missing: string[];
  errors: string[];
}

/**
 * Validates that all required collections exist in PocketBase and have the
 * expected fields. This is a development/setup utility — not used at runtime.
 */
export async function validateSchema(pb: PocketBase): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, missing: [], errors: [] };

  for (const schema of collections) {
    try {
      const collection = await pb.collections.getOne(schema.name);
      const existingFieldNames = new Set(
        (collection.fields as Array<{ name: string }>).map((f) => f.name),
      );

      for (const field of schema.fields) {
        if (!existingFieldNames.has(field.name)) {
          result.valid = false;
          result.errors.push(`Collection "${schema.name}" is missing field "${field.name}"`);
        }
      }
    } catch {
      result.valid = false;
      result.missing.push(schema.name);
    }
  }

  return result;
}

/**
 * Creates any missing collections in PocketBase using the admin API.
 * Existing collections are left untouched.
 *
 * Requires the PocketBase client to be authenticated as an admin
 * (e.g. via `pb.admins.authWithPassword()`).
 */
export async function validateAndCreateCollections(
  pb: PocketBase,
): Promise<{ created: string[]; errors: string[] }> {
  const created: string[] = [];
  const errors: string[] = [];

  for (const schema of collections) {
    try {
      await pb.collections.getOne(schema.name);
      // Collection already exists — skip
    } catch {
      // Collection doesn't exist — create it
      try {
        await pb.collections.create(toCollectionPayload(schema));
        created.push(schema.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to create "${schema.name}": ${message}`);
      }
    }
  }

  return { created, errors };
}

/** Maps our schema definition to the PocketBase collection create payload. */
function toCollectionPayload(schema: CollectionSchema) {
  return {
    name: schema.name,
    type: schema.type,
    fields: schema.fields.map((f) => ({
      name: f.name,
      type: f.type,
      required: f.required ?? false,
      options: f.options ?? {},
    })),
    listRule: schema.listRule,
    viewRule: schema.viewRule,
    createRule: schema.createRule,
    updateRule: schema.updateRule,
    deleteRule: schema.deleteRule,
  };
}
