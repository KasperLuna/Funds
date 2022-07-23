import { Model } from "objection";

class Accounts extends Model {
  static get tableName() {
    return "accounts";
  }
}

export default Accounts;
