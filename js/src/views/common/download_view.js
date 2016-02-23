var _ = require('lodash'),
  $ = require('jquery'),
  Backbone = require('backbone'),
  Handlebars = require('handlebars');

var indicators = require('../../collections/indicators'),
  countries = require('../../collections/countries');

var tpl = Handlebars.compile(require('../../templates/common/download_tpl.hbs'));

var DownloadView = Backbone.View.extend({

  template: tpl,

  events: {
    'click .btn-close-modal': 'hide',
    'click .modal-background': 'hide',
    'click .js--download-btn': '_getDownload',
    'click .js--cancel-btn': '_cancel'
  },

  el: 'body',

  initialize: function(settings) {
    var options = settings && settings.options ? settings.options : settings;
    this.options = _.extend({}, options);

    this.indicatorsCollection = new indicators();
    this.countriesCollection  = new countries();

    $('.modal-background').on('click', _.bind(this.hide));
  },

  render: function() {
    this.$el.append(this.template({
      csv: this._getCSV(),
      siteURL: SITEURL
    }));

    this.$el.find('.modal-container').removeClass('is-loading-share');
  },

  _getCSV: function() {

    if (this.options.id) {
      return this.countriesCollection.downloadCountriesForIndicator(
        this.options.id, this.options.year, this.options.categoryGroup, this.options.categoryName);
    } else {
      return this.indicatorsCollection.downloadForCountry(this.options.iso);
    }

  },

  _cancel: function(e) {
    e.preventDefault();
    this.hide();
  },

  show: function() {
    this.render();
  },

  hide: function() {
    this._enableScroll();
    this.$el.find('.m-modal-window').remove();
  },

  _enableScroll: function() {
    $('html').removeClass('is-inmobile');
    $('body').removeClass('is-inmobile');
  }

});

module.exports = DownloadView;
