var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('backbone'),
    async = require('async'),
    enquire = require('enquire.js'),
    Handlebars = require('handlebars'),
    slick = require('slick-carousel-browserify');

var Countries = require('../../collections/countries.js'),
    Years = require('../../collections/years.js'),
    IndicatorsNames = require('../../collections/indicator_configs.js'),
    Indicators = require('../../collections/indicators.js');

var IndicatorsPresenter = require('../../presenters/indicators.js');
    CountriesPresenter = require('../../presenters/countries.js');

var IndicatorService = require('../../lib/services/indicator.js');

var FunctionHelper = require('../../helpers/functions.js');

var template = Handlebars.compile(require('../../templates/compare/compare.hbs')),
    indicatorsTemplate = Handlebars.compile(require('../../templates/compare/compare-indicators.hbs')),
    countryScoresTemplate = Handlebars.compile(require('../../templates/compare/compare-country-scores.hbs'));

var templateMobile = Handlebars.compile(require('../../templates/compare/mobile/compare-mobile.hbs')),
    templateMobileSlide = Handlebars.compile(require('../../templates/compare/mobile/compare-mobile-slide.hbs')),
    templateMobileScores = Handlebars.compile(require('../../templates/compare/mobile/compare-country-scores-mobile.hbs'));

var CompareSelectorsView = require('./compare_selectors.js'),
    CountrySelectorView = require('./compare_country_selector.js'),
    YearSelectorView = require('../common/year_selector.js'),
    ModalWindowView = require('../common/infowindow_view.js'),
    ToolbarUtilsView = require('../common/toolbar_utils_view.js'),
    TooltipView = require('../common/tooltip_view.js'),
    WrapperHeaderView = require('../common/wrapper_header_view.js');

var compareStatus = new (Backbone.Model.extend({
      defaults: {
        countries: {}
      }
    }));

var CompareView = Backbone.View.extend({

  events: {},

  initialize: function(options) {
    options = options || {};

    enquire.register("screen and (max-width:767px)", {
      match: _.bind(function(){
        this.mobile = true;

        _.extend(this.events, {
          'click .btn-info': 'showModalWindow'
        });

      },this)
    });

    enquire.register("screen and (min-width:768px)", {
      match: _.bind(function(){
        this.mobile = false;
      },this)
    });

    this.setListeners();

    new WrapperHeaderView();

    if (options && options.countries != null) {
      this.countryIds = _.uniq(options.countries);
    };

    this.setParams(options.countries, options.year);
  },

  setListeners: function() {
    Backbone.Events.on('country:selected', (this.countryRecived).bind(this));
    Backbone.Events.on('year:selected', (this.yearRecived).bind(this));
    Backbone.Events.on('breakpoints:loaded', this._onScroll.bind(this));
  },

  render: function() {

    if (this.mobile) {
      this.renderYearSelector();
      this.$el.html(templateMobile());
      this.renderSlides();
      this.calculateLimitPoint();
    } else {
      this.renderIndicators();
      this.$el.html(template());
      this.calculateLimitPoint();
      this.renderSelectors();
    }

    this.renderToolbar();
    this._setResize();
    return this;
  },

  _setTooltips: function() {
    var tooltips = this.$el.find('.c-tooltip');

    for (var i = 0; i < tooltips.length; i++) {
      new TooltipView({el: tooltips[i]});
    }
  },

  /*
   * Render indicators names
   */
  renderSlides: function() {
    var indicatorsNames = new IndicatorsNames();
    indicatorsNames.fetch().done(function(indicators) {

      this.indicatorsOrdered = _.sortByOrder(indicators.rows, ['short_name']);
      for (var i = 1 ; i <= 3; i++) {
        this.$('#compareSlider').append(templateMobileSlide({ 'index':i }));

        this.$('#country-'+ i + ' .country').append(templateMobileScores({ 'indicators': this.indicatorsOrdered, 'index':i }));

        this.renderCountrySelector(this.$('#country-'+ i + ' .js--compare-selectors'), i);
      }
      this.calculateEndScrollPoint();
      this.initSlide();

    }.bind(this));
  },

  initSlide: function(){
    var self = this;

    //swipe false to avoid strange behaviour on iOS.
    this.slide = $('#compareSlider').slick({
      dots: true,
      useTransform: false,
      adaptiveHeight: true,
      swipe: false
    });

    this.currentSlide = 0;
    this.slide.on('afterChange', function(ev, slick, current){
      self.currentSlide = current;
      self._onScroll();
    });
  },

  /*
   * Render indicators names
   */
  renderIndicators: function() {
    var indicatorsNames = new IndicatorsNames();
    indicatorsNames.fetch().done(function(indicators) {
      var indicators = _.sortByOrder(indicators.rows, ['short_name']);
      this.$('.js--comparison-indicators').html(indicatorsTemplate({ 'indicators': indicators }))
      this.calculateEndScrollPoint();
      this._setTooltips();
    }.bind(this))
  },

  calculateEndScrollPoint: function() {
    this.breakPoints = this.breakPoints || {};
    this.$el.find('.js--compare-toolbar').ready(function() {
      this.breakPoints['endPoint'] = this.$el.find('.js--compare-toolbar').offset().top;
      Backbone.Events.trigger('breakpoints:loaded');
    }.bind(this));
  },

  calculateLimitPoint: function() {
    this.breakPoints = {};

    this.$el.find('.js--compare-selectors').ready(function() {
      if (this.mobile) {
        var selectorsHeight = this.$('.l-toolbar').height();
        this.breakPoints['startPoint'] = this.$el.find('#compareSlider').offset().top + selectorsHeight;
      } else {
        this.breakPoints['startPoint'] = this.$el.find('.js--compare-selectors').offset().top;
      }
    }.bind(this));

    this._setScroll();
  },

  _setResize: function() {
    var debouncedResize = FunctionHelper.debounce(this._onResize, 250, true);
    window.addEventListener('resize', _.bind(debouncedResize, this));
  },

  _onResize: function() {
    var isMobile = (window.innerWidth || document.body.clientWidth) < 768 ? true:false;
    if (this.mobile != isMobile) {
      this.render();
    }
  },

  _setScroll: function() {
    var debouncedScroll = FunctionHelper.debounce(this._onScroll, 10, true);
    window.addEventListener('scroll', _.bind(debouncedScroll, this));
  },

  _onScroll: function() {
    var $bar = $('.-selectors'),
        $content = $('.l-content'),
        barHeight = $bar.height(),
        contentHeight = $content.height(),
        posY = window.pageYOffset;

    if (posY >= this.breakPoints['startPoint']) {
      if (this.mobile) {
        $bar.removeClass('-fixed');
        $bar = this.$('#country-'+(this.currentSlide+1)+' .-selectors');
      }
      $bar.addClass('-fixed');
      $content.addClass('-fixed');
    }

    if (posY >= this.breakPoints['endPoint'] && $bar.hasClass('-fixed')) {
      $bar.addClass('-hide-transition');
    }

    if (posY < this.breakPoints['endPoint'] && $bar.hasClass('-hide-transition')) {
      $bar.removeClass('-hide-transition');
    }

    if (posY > this.breakPoints['startPoint'] + barHeight && posY < this.breakPoints['startPoint'] + barHeight && $content.hasClass('-fixed') ||
      posY < this.breakPoints['startPoint'] && $content.hasClass('-fixed') ||
      posY > this.breakPoints['startPoint'] + contentHeight && $content.hasClass('-fixed')) {
      $bar.removeClass('-fixed');
      $content.removeClass('-fixed');
    }
  },

  renderToolbar: function() {
    this.$el.find('.js--compare-toolbar').find('.wrap').append(new ToolbarUtilsView({
      el: this.$el.find('.js--toolbar-utils')
    }).render().el);

    setTimeout(function() {
      new TooltipView({el: '.m-legend'});
    }, 10);
  },

  getDataForCountry: function(iso, order) {
    var indicators = new Indicators();
    indicators.forCountryAndYear(iso, this.year).done(function() {
      this.renderCountryScores(indicators, iso, order)
    }.bind(this));
  },

  renderCountryScores: function(indicators, iso, order) {
    this.indicatorsOrdered = _.sortByOrder(indicators.toJSON(), ['short_name']);
    if (this.mobile) {
      this.$('#'+order+ ' .country').html(templateMobileScores({ 'indicators': this.indicatorsOrdered, 'content': true }));
    } else {
      for (var i = 1 ; i <= 3; i++) {
        if ('country-' + i == order) {
          iso = iso == 'no_data' ? null: iso;
          this.$('.js--' + order).html(countryScoresTemplate({ 'scores': this.indicatorsOrdered, 'iso': iso }));
        } else {

          if (!$.trim(this.$('.js--country-' + i).html())) {
            this.$('.js--country-' + i).html(countryScoresTemplate({ 'scores': this.indicatorsOrdered}));
          }

        }
      }
    }

    if (!$('.m-advise').hasClass('is-hidden')) {
      $('.m-advise').addClass('is-hidden');
    }

  },

  renderSelectors: function() {
    this.renderYearSelector();
    this.renderComparesSelector();
  },

  renderYearSelector: function() {
    //TODO -- Add view manager.
    this.getYears().done(function(years) {
      var yearSelectors = new YearSelectorView({ el: this.$('.js--year-selector-compare'), 'years': years.rows, 'actualYear': this.year });
    }.bind(this));
  },

  renderComparesSelector: function() {
    var selectors = new CompareSelectorsView({ el: this.$('.js--compare-selectors'), 'countries': this.countryIds });
  },

  renderCountrySelector: function(el, index) {
    el = el || '.js--compare-selectors';
    var selectors = new CountrySelectorView({ el: this.$(el), 'countries': this.countryIds, index: index });
  },

  getYears: function() {
    var years = new Years();
    return years.totalYears()
  },

  setParams: function(countries, year) {
     this.countryIds = countries || [];
     this.year = year || (new Date).getFullYear() - 1;
   },

  countryRecived: function(iso, order) {
    var order = 'country-'+ order
    compareStatus.get('countries')[order] = iso;
    this.getDataForCountry(iso, order);
  },

  yearRecived: function(year) {
    compareStatus.set('year', year);
    this.year = year || '2015';

    var countries = compareStatus.get('countries');

    _.each(countries, function(country, order) {
      this.getDataForCountry(country, order);
    }.bind(this))
  },

  show: function() {
    this.render();
  },

  hide: function() {},

  showModalWindow: function(e) {
    var data = $(e.currentTarget).data('info');
    var modalWindowView = new ModalWindowView().render(data)
  }
});

module.exports = CompareView;
