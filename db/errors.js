/* Error for no record found */
class RecordNotFound {
  constructor(message) {
    this.name = "RecordDoesNotExist";
    this.message = message || "Record does not exist";
    this.stack = new Error().stack;
  }
}

module.exports = {
  RecordNotFound
};
