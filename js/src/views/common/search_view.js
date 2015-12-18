var Backbone = require('backbone'),
    Handlebars = require('handlebars'),
    _ = require('lodash');
    $ = require('jquery');

var templateSuggestions = Handlebars.compile(require('../../templates/common/search_suggestions_tpl.hbs'));

var SearchCollection = require('../../collections/countries.js');

var SearchView = Backbone.View.extend({

  el: "#searchBox",

  defaults: {
    elContent: '#searchContent',
    elInput: '#searchMap',
    elSearchParent: '#searchBox',
    elSuggestions: '.search-suggestions',
    closeOnClick: true
  },

  events: {
    'keyup #searchMap' : 'onSearch',
    'focus #searchMap' : 'highlight',
    'keydown #searchMap': 'highlightResultsBox',
  },

  initialize: function(settings) {
    var self = this;
    var options = settings && settings.options ? settings.options : settings;
    this.options = _.extend(this.defaults, options);

    this.searchCollection = new SearchCollection();
    this.elContent = this.options.elContent;
    this.elInput = this.options.elInput;
    this.elSearchParent = this.options.elSearchParent;
    this.elSuggestions = this.options.elSuggestions;

    this.closeOnClick = this.options.closeOnClick;
    this.getData();
  },

  setListeners: function() {
    if(this.closeOnClick) {
      $('body').on('click', this.unHighlight.bind(this));
    }
  },

  getData: function() {
    var self = this;

    this.searchCollection.fetch().done(function(data) {
      self.setListeners();
    });
  },

  onSearch: function(ev) {
    var target = ev ? ev.currentTarget : this.elInput;
    var $ele = $(target);
    var $searchBox = this.$('.search-content');
    var value = $ele.val();
    var key = ev && ev.keyCode ? ev.keyCode : 0;

    if(key !== 40 || key !== 38) {
      if(value.length > 0) {
        $searchBox.addClass('searching');
        this.showSuggestions(value);
      } else {
        $searchBox.removeClass('searching');
        this.clearSuggestions();
      }
    }
  },

  highlight: function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    this.$(this.elInput).addClass('focus');

    if(this.closeOnClick) {
      this.$(this.elSuggestions +' li').removeClass('selected');
    }
  },

  unHighlight: function(ev) {
    var $target = ev ? $(ev.target) : null;
    var id = null

    if($target) {
      id = $target.closest(this.elSearchParent).attr('id');
    }

    if(!id) {
      this.unFocus();
    }
  },

  unFocus: function() {
    var $input = this.$(this.elInput);
    $input.removeClass('focus');
    $input.blur();
    this.clearSearch();
  },

  showSuggestions: function(text) {
    text = text.toLowerCase();
    var search = this.searchCollection.toJSON();
    if(this.searchTimer) {
      clearTimeout(this.timer);
    }
    this.searchTimer = setTimeout(_.bind(function() {
      search = _.filter(search, function(item) {
        var name = item['name'].toLowerCase().replace(/-/gi, ' ');
        var index = name.indexOf(text);
        if(index >= 0) {
          var start = item.name.substring(0, index);
          var substr = item.name.substring(index, index+text.length);
          var end = item.name.substring(index+text.length);
          item.title = item.name;
          item.iso = item.iso;
          item.name = start + '<span>' + substr + '</span>' + end;
          item.selected = item.selected || false;
          return item;
        }
      });

      this.trigger('results', search);
      this.$(this.elSuggestions).html(templateSuggestions({'data': search, 'mainUrl': main_url}));
      this.$(this.elContent).addClass('visible');
    }, this), 100);
  },

  clearSuggestions: function() {
    var $searchSuggestions = this.$(this.elSuggestions);
    $searchSuggestions.html('');
    this.$(this.elContent).removeClass('visible');
    this.trigger('results', []);
  },

  clearSearch: function() {
    var $input = this.$(this.elInput);
    $input.val('');
    this.onSearch();
  },

  highlightResultsBox: function(ev) {
    var key = ev.keyCode || 0;

    if(key === 27) {
      this.unHighlight();
    }
  }

});

module.exports = SearchView;