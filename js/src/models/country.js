var CartoDBModel = require('../lib/cartodb_model.js');

var CONFIG = require('../../config.json');

var Country = CartoDBModel.extend({
  user_name: CONFIG.cartodb.user_name,
  table: CONFIG.cartodb.country_table_name
});

module.exports = Country;
