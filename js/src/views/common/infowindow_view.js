var _ = require('lodash'),
  $ = require('jquery'),
  Backbone = require('backbone'),
  Handlebars = require('handlebars');

var modalWindowtemplate = Handlebars.compile(require('../../templates/common/modal_window_tpl.hbs'));

var ModalWindowView = Backbone.View.extend({

  el: 'body',

  options: {
    'type': 'legend'
  },

  events: function() {
    if (window.ontouchstart) {
      return  {
        'touchstart .btn-close-modal': 'close',
        'touchstart .modal-background': 'close'
      };
    }
    return {
      'click .btn-close-modal': 'close',
      'click .modal-background': 'close'
    };
  },

  initialize: function(data) {
    if (data) {
      this.render(data);
    }

    $(document).keyup(_.bind(this.onKeyUp, this));
  },

  render: function(info) {
    this.fixed = true;
    this.$el.append(modalWindowtemplate({'info': info}));
    this.toogleState();
  },

  onKeyUp: function(e) {
    // press esc
    if (e.keyCode === 27) {
      this.close(e);
    }
  },

  close: function(e) {
    e && e.stopPropagation();
    this.fixed = false;

    $('.m-modal-window').remove();
    this.toogleState();
  },

  toogleState: function() {
    this.$el.toggleClass('is-inmobile', this.fixed);
    $('html').toggleClass('is-inmobile', this.fixed);
  }

});

module.exports = ModalWindowView;
