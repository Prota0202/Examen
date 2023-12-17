import mysql from 'mysql2/promise';
import bluebird from 'bluebird';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Abdelbadi',
  Promise: bluebird,
});

/**
 * @typedef {{ [field: string]: any }} Payload
 */

/**
 * Wrapper to prepare and execute a MySQL query
 * @param {string} prefix - SELECT FROM/UPDATE/DELETE FROM
 * @param {Payload} set - Object containing values to update or insert in a record
 * @param {Payload} where - Object describing the where clause
 * @returns {Promise<Payload[]>}
 */
async function query(prefix, set = {}, where = {}) {
  let query = prefix;
  let values = [];

  if (Object.keys(set).length) {
    query += ' SET';
    query += Object.keys(set).map(key => {
      values.push(set[key]);
      return ` \`${key}\` = ?`
    }).join(', ');
  }

  if (Object.keys(where).length) {
    query += ' WHERE';
    query += Object.keys(where).map(key => {
      values.push(where[key]);
      return ` \`${key}\` = ?`
    }).join(' AND');
  }
  console.log('Executing query', query, values);
  try {
    const [rows] = await connection.execute(query, values);
    return /** @type{Payload[]} */ (rows);
  } catch(error) {
    console.error(error);
    return [];
  }
}

export default class Model {

  /**
   * MySQL Table name
   * @type {string}
   */
  static table = "";

  /**
   * Primary key as a list of fields (in case it's a composite primary key)
   * @type {string[]}
   */
  static primary = [];

  /**
   * Primary key, as set on the model
   * @type {string[]}
   */
  get _primary() {
    if (!('primary' in this.constructor) || !this.constructor.primary) {
      throw new Error('Please specify the primary key');
    }
    return /** @type{string[]} */ (this.constructor.primary);
  }

  /**
   * Lists of fields to avoid because they are not MySQL columns
   * @type {string[]}
   */
  static blacklist = [];

  /**
   * Apply changes to the record but does not commit them to the database
   * @param {Payload} payload - Changes to apply to the record
   */
  update(payload = {}) {
    for (const key in payload) {
      this[key] = payload[key];
    }
  }

  /**
   * Flag to determine whether the record already exists in the database
   * @type {boolean}
   */
  get _isNew() {
    for (const key of this._primary) {
      if (this[key] === undefined) {
        return true;
      }
    }
    return false;
  }

  /**
   * Object associated with the record - without the primary key fields
   * @type {Payload}
   */
  get _payload() {
    /** @type {Payload} */
    const payload = {};
    for (const key in this) {
      if (!key.startsWith('_') && !this._primary.includes(key)) {
        payload[key] = this[key];
      }
    }
    return payload
  }

  /**
   * Primary key as an object
   * @type {Payload}
   */
  get _primaryKey() {
    return Object.fromEntries(this._primary.map(f => [f, this[f]]))
  }

  /**
   * Delete the record from the database
   * @param {Payload} where - Object to narrow the delete query
   */
  static async delete(where) {
    await query(`DELETE from ${this.table}`, {}, where);
  }

  /**
   * Load one record from the database
   * @param {Payload} where - Object to narrow the select query
   * @returns {Promise<Model>}
   */
  static async load(where) {
    const rows = await this.loadMany(where);
    const record = new this();
    record.update(rows[0]);
    return record;
  }

  /**
   * Load records from the database
   * @param {Payload} where - Object to narrow the select query
   * @returns {Promise<Payload[]>}
   */
  static async loadMany(where = {}) {
    return await query(`SELECT * FROM ${this.table}`, {}, where);
  }

  /**
   * Save (INSERT/UPDATE) the record in the database
   * @returns {Promise<void>}
   */
  async save() {
    if (!('table' in this.constructor) || !this.constructor.table) {
      throw new Error("You need to specify a table");
    }
    if (this._isNew) {
      const fields = Object.keys(this._payload);
      let query = `INSERT INTO ${this.constructor.table} (${fields.join(', ')})`;
      query += ` VALUES (${fields.map(_ => '?').join(', ')})`
      const values = fields.map(field => this[field]);
      await connection.execute(query, values);
    } else {
      await query(`UPDATE ${this.constructor.table}`, this._payload, this._primaryKey);
    }
  }
}