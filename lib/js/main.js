/**
 * Copyright (c) 2013-2015, Thomas J. Otterson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * @license
 */
var join$ = [].join;
(function(factory){
  var jquery, core, widget;
  if (typeof define === 'function' && define.amd) {
    define(['jquery', 'jquery-ui/core', 'jquery-ui/widget'], factory);
  } else if (typeof exports === 'object') {
    jquery = require('jquery');
    core = require('jquery-ui/core');
    widget = require('jquery-ui/widget');
    module.exports = factory(jquery, core, widget);
  } else {
    factory(jQuery);
  }
})(function($){
  var _old;
  _old = $.fn.attr;
  $.fn.attr = function(){
    var map, attributes, i$, len$, attribute;
    if (this[0] && arguments.length === 0) {
      map = {};
      attributes = this[0].attributes;
      for (i$ = 0, len$ = attributes.length; i$ < len$; ++i$) {
        attribute = attributes[i$];
        map[attribute.name.toLowerCase()] = attribute.value;
      }
      return map;
    } else {
      return _old.apply(this, arguments);
    }
  };
  $.widget('barandis.selectplus', {
    options: {
      data: null,
      disabled: false,
      width: 0,
      inherit: false,
      rtl: false,
      deselectable: false,
      multiSelect: null,
      quickDeselect: false,
      maxSelected: Infinity,
      searchable: false,
      threshold: 0,
      anchoredSearch: true,
      splitSearch: true,
      defaultText: 'Select an item',
      notFoundText: 'No results match',
      change: null,
      blur: null,
      focus: null,
      resize: null,
      open: null,
      close: null
    },
    _setOption: function(key, value){
      var oldWidth, ddWidth;
      switch (key) {
      case 'rtl':
        if (value) {
          this.container.addClass('bar-sp-rtl');
        } else {
          this.container.removeClass('bar-sp-rtl');
        }
        this._super(key, value);
        break;
      case 'deselectable':
        if (!this.multiple) {
          if (value) {
            if (this.selectedOption) {
              this._buildDeselectControl();
            }
          } else {
            this.selection.find('.bar-sp-deselect').remove();
          }
        }
        this._super(key, value);
        break;
      case 'searchable':
        if (!this.multiple) {
          if (value) {
            this.searchField.removeClass('ui-helper-hidden-accessible');
          } else {
            this.searchField.addClass('ui-helper-hidden-accessible');
          }
        }
        this._super(key, value);
        break;
      case 'data':
        this._super(key, value);
        this._buildOptions();
        break;
      case 'threshold':
        if (!this.multiple) {
          if (!this.options.searchable || this.model.length <= value) {
            this.searchField.addClass('ui-helper-hidden-accessible');
          } else {
            this.searchField.removeClass('ui-helper-hidden-accessible');
          }
        }
        this._super(key, value);
        break;
      case 'disabled':
        this._super(key, value);
        this._setDisabledState();
        break;
      case 'width':
        oldWidth = this.width;
        this.width = value || this.element.outerWidth();
        if (oldWidth !== this.width) {
          this.container.css('width', this.width + "px");
          ddWidth = this.width - this._getBorderAndSideWidth(this.dropdown);
          this.dropdown.css('width', ddWidth + "px");
          this._resizeSearchField();
          this._trigger('resize', null, {
            item: this.selection,
            data: {
              height: this.selection.outerHeight(),
              width: this.selection.outerWidth()
            }
          });
          this._super(key, value);
        }
        break;
      case 'multiSelect':
      case 'inherit':
        break;
      default:
        this._super(key, value);
      }
    },
    _create: function(){
      var ref$, containerClasses, containerProps, ddWidth, this$ = this;
      this.multiple = (ref$ = this.options.multiSelect) != null
        ? ref$
        : !!this.element[0].multiple;
      this.active = false;
      this.clicked = false;
      this.open = false;
      this.destructionPending = false;
      this.highlightedOption = null;
      this.selectedOption = null;
      this.selections = 0;
      this.width = this.options.width || this.element.outerWidth();
      this.currentValue = this.multiple ? [] : null;
      this.containerId = (this.element.attr('id')
        ? this.element.attr('id').replace(/[^\w]/g, '-')
        : this._generateContainerId()) + '-selectplus';
      this.container = null;
      this.dropdown = null;
      this.selectOptions = null;
      this.searchContainer = null;
      this.searchField = null;
      this.selection = null;
      this.containerClickAction = null;
      this.documentClickAction = null;
      this.backspaceAction = null;
      containerClasses = ['ui-widget', 'bar-sp'];
      containerClasses.push('bar-sp-' + (this.multiple ? 'multi' : 'single'));
      if (this.options.inherit && $.trim(this.element.attr('class')).length) {
        containerClasses.push(this.element.attr('class'));
      }
      if (this.options.rtl) {
        containerClasses.push('bar-sp-rtl');
      }
      containerProps = {
        id: this.containerId,
        'class': join$.call(containerClasses, ' '),
        style: "width:" + this.width + "px;",
        title: this.element.attr('title')
      };
      this.container = $('<div>', containerProps);
      if (this.multiple) {
        this.container.html("<ul class=\"ui-corner-all bar-sp-selections\" tabindex=\"-1\" role=\"combobox\" aria-activedescendant=\"\" aria-owns=\"" + this.containerId + "-drop\"><li class=\"bar-sp-search\" role=\"presentation\"><input type=\"text\" value=\"" + this.options.defaultText + "\" class=\"bar-sp-default\" autocomplete=\"off\" role=\"textbox\"></li></ul><div id=\"" + this.containerId + "-drop\" class=\"ui-widget-content ui-front ui-menu ui-corner-bottom ui-helper-hidden-accessible bar-sp-drop\"><ul class=\"bar-sp-options\" role=\"listbox\" aria-live=\"polite\" tabindex=\"-1\"></ul></div>");
      } else {
        this.container.html("<a href=\"javascript:void(0)\" class=\"ui-widget ui-state-default ui-corner-all bar-sp-selection\" tabindex=\"-1\" role=\"combobox\" aria-activedescendant=\"\"><span class=\"ui-priority-secondary\">" + this.options.defaultText + "</span><div class=\"ui-icon ui-icon-triangle-1-s\" role=\"presentation\"></div></a><div class=\"ui-widget-content ui-front ui-menu ui-corner-bottom ui-helper-hidden-accessible bar-sp-drop\" role=\"presentation\"><div class=\"bar-sp-search\" role=\"presentation\"><input type=\"text\" class=\"ui-corner-all\" autocomplete=\"off\" role=\"textbox\"></div><ul class=\"bar-sp-options\" role=\"listbox\" aria-live=\"polite\" tabindex=\"-1\"/></div>");
      }
      this.element.hide().after(this.container);
      this.dropdown = this.container.find('div.bar-sp-drop').first();
      ddWidth = this.width - this._getBorderAndSideWidth(this.dropdown);
      this.dropdown.css({
        width: ddWidth + 'px'
      });
      this.searchField = this.container.find('input').first();
      this.selectOptions = this.container.find('ul.bar-sp-options').first();
      if (this.multiple) {
        this.searchContainer = this.container.find('li.bar-sp-search').first();
        this.selection = this.container.find('ul.bar-sp-selections').first();
      } else {
        this.searchContainer = this.container.find('div.bar-sp-search').first();
        this.selection = this.container.find('a.bar-sp-selection').first();
      }
      $.each(this.element.attr(), function(name, value){
        if (/^aria-/.exec(name)) {
          this$.selection.attr(name, value);
        }
      });
      this._resizeSearchField();
      this._buildOptions();
      this._setTabIndex();
      this._trigger('resize', null, {
        item: this.selection,
        data: {
          height: this.selection.outerHeight(),
          width: this.selection.outerWidth()
        }
      });
      this.containerClickAction = function(event){
        var deselect;
        event.preventDefault();
        if (!this$.options.disabled) {
          deselect = event != null ? $(event.target).hasClass('bar-sp-deselect') : false;
          if (!this$.multiple && deselect) {
            this$._resetOptions(event);
          } else if (this$.multiple && this$.destructionPending) {
            this$.destructionPending = false;
          } else {
            if (!this$.active) {
              if (this$.multiple) {
                this$.searchField.val('');
              }
              $(document).click(this$.documentClickAction);
              this$._openDropdown();
            } else if (!this$.multiple && event != null && (event.target === this$.selection[0] || $(event.target).parents('a.bar-sp-selection').length)) {
              this$._toggleDropdown();
            }
            this$._activateWidget(event);
          }
        }
      };
      this.mousewheelAction = function(event){
        var origEvent, delta;
        origEvent = event.originalEvent;
        delta = origEvent.detail < 0 || origEvent.wheelDelta > 0
          ? 1
          : -1;
        if (delta > 0 && this$.selectOptions.scrollTop() === 0) {
          event.preventDefault();
        } else if (delta < 0 && this$.selectOptions.scrollTop() === this$.selectOptions.get(0).scrollHeight - this$.selectOptions.innerHeight()) {
          event.preventDefault();
        }
      };
      this.documentClickAction = function(event){
        if ($(event.target).parents("#" + this$.containerId).length) {
          this$.active = true;
        } else {
          this$._deactivateWidget(event);
        }
      };
      this.backspaceAction = function(event){
        var pos, nextAvailable;
        if (this.pendingDeselection) {
          pos = this._getModelIndex(this.pendingDeselection);
          this._deselectOption(event, $("#" + this._generateDomId('option', pos)));
          this._clearBackspace();
        } else {
          nextAvailable = this.searchContainer.siblings('li.bar-sp-selection').last();
          if (nextAvailable.length && !nextAvailable.hasClass('ui-state-disabled')) {
            this.pendingDeselection = nextAvailable;
            if (this.options.quickDeselect) {
              this.backspaceAction(event);
            } else {
              this.pendingDeselection.addClass('ui-state-focus');
            }
          }
        }
      };
      this._on(this.container, {
        click: this.containerClickAction,
        mousewheel: this.mousewheelAction,
        DOMMouseScroll: this.mousewheelAction,
        MozMousePixelScroll: this.mousewheelAction,
        mousedown: function(){
          this$.clicked = true;
        },
        mouseup: function(){
          this$.clicked = false;
        },
        mouseenter: function(){
          if (!this$.open && !this$.multiple) {
            this$.selection.addClass('ui-state-hover');
          }
        },
        mouseleave: function(){
          if (!this$.multiple) {
            this$.selection.removeClass('ui-state-hover');
          }
        }
      });
      this._on(this.selectOptions, {
        click: function(event){
          var eventTarget, target;
          eventTarget = $(event.target);
          target = eventTarget.hasClass('bar-sp-option')
            ? eventTarget
            : eventTarget.parents('.bar-sp-option').first();
          if (target.length) {
            this$.highlightedOption = target;
            this$._selectOption(event, target);
            this$.searchField.focus();
          }
        },
        mouseover: function(event){
          var eventTarget, target;
          eventTarget = $(event.target);
          target = eventTarget.hasClass('bar-sp-option')
            ? eventTarget
            : eventTarget.parents('.bar-sp-option').first();
          if (target.length) {
            this$._highlightOption(target);
          }
        },
        mouseout: function(event){
          var eventTarget;
          eventTarget = $(event.target);
          if (eventTarget.hasClass('bar-sp-option') || eventTarget.parents('.bar-sp-option').length) {
            this$._clearHighlight();
          }
        }
      });
      this._on(this.searchField, {
        blur: function(event){
          if (!this$.clicked) {
            this$._trigger('blur', event, {
              item: this$.container
            });
            this$._deactivateWidget(event);
          }
        },
        focus: function(event){
          if (!this$.active) {
            this$._activateWidget(event);
            this$._setSearchFieldDefault();
            this$._trigger('focus', event, {
              item: this$.container
            });
          }
        },
        keydown: function(event){
          var keyCode, ref$, prevSiblings, firstActive, nextSiblings;
          if (!this$.options.disabled) {
            keyCode = (ref$ = event.which) != null
              ? ref$
              : event.keyCode;
            this$._resizeSearchField();
            if (keyCode !== 8 && this$.pendingDeselection) {
              this$._clearBackspace();
            }
            switch (keyCode) {
            case 8:
              this$.backspaceLength = this$.searchField.val().length;
              break;
            case 9:
              if (this$.open) {
                this$._selectOption(event, this$.highlightedOption);
              }
              break;
            case 13:
              event.preventDefault();
              break;
            case 37:
            case 38:
              event.preventDefault();
              if (this$.open && this$.highlightedOption) {
                prevSiblings = this$.highlightedOption.parent().prevAll('li:not(.ui-helper-hidden)').children('a:not(.bar-sp-option-group)');
                if (prevSiblings.length) {
                  this$._highlightOption(prevSiblings.first());
                } else {
                  this$._clearHighlight();
                  this$._deactivateWidget(event);
                }
              }
              break;
            case 39:
            case 40:
              if (!this$.highlightedOption) {
                firstActive = this$.selectOptions.find('li:not(.ui-helper-hidden)').children('a:not(.bar-sp-option-group)').first();
                if (firstActive.length) {
                  this$._highlightOption(firstActive);
                }
              } else if (this$.open) {
                nextSiblings = this$.highlightedOption.parent().nextAll('li:not(.ui-helper-hidden)').children('a:not(.bar-sp-option-group)');
                if (nextSiblings.length) {
                  this$._highlightOption(nextSiblings.first());
                }
              }
              if (!this$.open) {
                this$._openDropdown();
              }
            }
          }
        },
        keyup: function(event){
          var keyCode, ref$;
          if (!this$.options.disabled) {
            keyCode = (ref$ = event.which) != null
              ? ref$
              : event.keyCode;
            switch (keyCode) {
            case 8:
              if (this$.multiple && this$.backspaceLength < 1 && this$.selections > 0) {
                this$.backspaceAction(event);
              } else if (!this$.pendingDeselection) {
                this$._clearHighlight();
                if (this$.open) {
                  this$._filterOptions();
                } else if (this$.searchField.val() !== '') {
                  this$._openDropdown();
                } else if (!this$.multiple && this$.selection.find('.bar-sp-deselect').length) {
                  this$._resetOptions(event);
                }
              }
              break;
            case 13:
              event.preventDefault();
              if (this$.open) {
                this$._selectOption(event, this$.highlightedOption);
              } else {
                this$._openDropdown();
              }
              break;
            case 27:
              if (this$.open) {
                this$._closeDropdown();
              }
              break;
            case 9:
            case 16:
            case 17:
            case 37:
            case 38:
            case 39:
            case 40:
            case 91:
              break;
            default:
              if (this$.open) {
                this$._filterOptions();
              } else {
                this$._openDropdown();
              }
            }
          }
        }
      });
      if (this.multiple) {
        this._on(this.selection, {
          click: function(event){
            event.preventDefault();
            if (this$.active && !($(event.target).hasClass('bar-sp-selection') || $(event.target).parents('bar-sp-selection').length) && !this$.open) {
              this$._openDropdown();
            }
          }
        });
      }
    },
    _destroy: function(){
      this._revertTabIndex();
      this.container.remove();
      this.element.show();
    },
    value: function(){
      var i$, ref$, len$, item, results$ = [];
      switch (false) {
      case !this.multiple:
        for (i$ = 0, len$ = (ref$ = this.currentValue).length; i$ < len$; ++i$) {
          item = ref$[i$];
          results$.push(this._sanitizeItem(item));
        }
        return results$;
        break;
      case !!this.currentValue:
        return null;
      default:
        return this._sanitizeItem(this.currentValue);
      }
    },
    widget: function(){
      return this.container;
    },
    disable: function(){
      this.options.disabled = true;
      this._setDisabledState();
    },
    enable: function(){
      this.options.disabled = false;
      this._setDisabledState();
    },
    refresh: function(){
      this._buildOptions();
    },
    clear: function(){
      this._resetOptions();
    },
    _buildOptions: function(){
      var content, i$, ref$, len$, option, ref1$, id;
      this.model = this._parse();
      if (this.multiple) {
        if (this.selections > 0) {
          this.selection.find('li.bar-sp-selection').remove();
          this.selections = 0;
        }
      } else {
        this.selection.find('span').addClass('ui-priority-secondary').text(this.options.defaultText);
        if (!this.options.searchable || this.model.length <= this.options.threshold) {
          this.searchField.addClass('ui-helper-hidden-accessible');
        } else {
          this.searchField.removeClass('ui-helper-hidden-accessible');
        }
      }
      content = '';
      for (i$ = 0, len$ = (ref$ = this.model).length; i$ < len$; ++i$) {
        option = ref$[i$];
        if (option.group) {
          content += this._createGroup(option);
        } else if (!option.empty) {
          content += this._createOption(option);
          if (option.selected) {
            if (this.multiple) {
              this._buildSelection(option);
              (ref1$ = this.currentValue)[ref1$.length] = option;
            } else {
              this.selection.find('span').removeClass('ui-priority-secondary').text(option.text);
              this.currentValue = option;
              if (this.options.deselectable) {
                this._buildDeselectControl();
              }
            }
          }
        }
      }
      this._setDisabledState();
      this._setSearchFieldDefault();
      this._resizeSearchField();
      this.selectOptions.html(content);
      if (!this.multiple && this.currentValue) {
        id = this._generateDomId('option', this.currentValue._nodeIndex);
        this.selectedOption = $("#" + id);
      }
    },
    _createGroup: function(group){
      if (!group.disabled) {
        group._domId = this._generateDomId('group', group._nodeIndex);
        return "<li class=\"ui-menu-item\" role=\"presentation\"><a id=\"" + group._domId + "\" href=\"javascript:void(0)\" class=\"ui-priority-primary bar-sp-option-group\"role=\"group\" aria-hidden=\"false\" tabindex=\"-1\">" + $('<div>').text(group.label).html() + "</a></li>";
      } else {
        return '';
      }
    },
    _createOption: function(option){
      var classes, style, wrapperClass;
      if (!option.disabled) {
        option._domId = this._generateDomId('option', option._nodeIndex);
        classes = ['ui-corner-all', 'bar-sp-option'];
        if (option.selected) {
          classes[classes.length] = 'bar-sp-selected';
        }
        if (option._groupIndex != null) {
          classes[classes.length] = 'bar-sp-grouped-option';
        }
        if (this.options.inherit && option.classes !== '') {
          classes[classes.length] = option.classes;
        }
        style = this.options.inherit && option.style !== '' ? " style=\"" + option.style + "\"" : '';
        wrapperClass = 'ui-menu-item' + (option.selected ? ' ui-helper-hidden' : '');
        return "<li class=\"" + wrapperClass + "\" role=\"presentation\"><a id=\"" + option._domId + "\" href=\"javascript:void(0)\" class=\"" + join$.call(classes, ' ') + "\"" + style + " role=\"option\"aria-hidden=\"false\" tabindex=\"-1\">" + option.html + "</a></li>";
      } else {
        return '';
      }
    },
    _buildDeselectControl: function(){
      if (!this.selection.find('div.bar-sp-deselect').length) {
        this.selection.find('span').first().after('<div class="ui-icon ui-icon-close bar-sp-deselect"/>');
      }
    },
    _buildSelection: function(option){
      var selectionId, html, link, this$ = this;
      if (this.options.maxSelected <= this.selections) {
        return;
      }
      selectionId = this._generateDomId('selection', option._nodeIndex);
      this.selections += 1;
      if (option.disabled) {
        html = "<li class=\"ui-corner-all ui-state-disabled bar-sp-selection\" id=\"" + selectionId + "\"><span>" + option.html + "</span></li>";
      } else {
        html = "<li class=\"ui-corner-all ui-state-default bar-sp-selection\" id=\"" + selectionId + "\"><span>" + option.html + "</span><a href=\"javascript:void(0)\" class=\"ui-icon ui-icon-closethick bar-sp-selection-close\" tabindex=\"-1\"></a></li>";
      }
      this.searchContainer.before(html);
      link = $("#" + selectionId).find('a').first();
      link.mousedown(function(event){
        event.preventDefault();
        if (this$.options.disabled) {
          event.stopPropagation();
        } else {
          this$.clicked = true;
          this$.destructionPending = true;
          this$._deselectOption(event, $("#" + this$._generateDomId('option', option._nodeIndex)));
        }
      });
      link.mouseup(function(){
        this$.clicked = false;
      });
    },
    _openDropdown: function(){
      var ddTop;
      if (!this.multiple) {
        this.selection.addClass('ui-state-active bar-sp-with-drop');
        this.selection.find('div').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-n');
        if (this.selectedOption) {
          this._highlightOption(this.selectedOption);
        }
      } else if (this.options.maxSelected <= this.selections) {
        return;
      } else {
        this.selection.addClass('bar-sp-with-drop');
      }
      ddTop = this.container.height();
      this.dropdown.css({
        top: ddTop + 'px'
      }).removeClass('ui-helper-hidden-accessible');
      this.searchField.focus();
      this.searchField.val(this.searchField.val());
      this._filterOptions();
      if (!this.open) {
        this._trigger('open', null, {
          item: this.container
        });
      }
      this.open = true;
    },
    _selectItem: function(item){
      var $element;
      item.selected = true;
      if (item._element != null) {
        $element = $(item._element);
        $element.prop('selected', true);
        $element.parents('select').trigger('change');
      }
    },
    _deselectItem: function(item){
      var $element;
      item.selected = false;
      if (item._element != null) {
        $element = $(item._element);
        $element.prop('selected', false);
        if (this.multiple) {
          $element.parents('select').trigger('change');
        }
      }
    },
    _closeDropdown: function(){
      if (this.multiple) {
        this.selection.removeClass('bar-sp-with-drop');
      } else {
        this.selection.removeClass('ui-state-active bar-sp-with-drop');
        this.selection.find('div').removeClass('ui-icon-triangle-1-n').addClass('ui-icon-triangle-1-s');
      }
      this._clearHighlight();
      this.dropdown.addClass('ui-helper-hidden-accessible');
      if (this.open) {
        this._trigger('close', null, {
          item: this.container
        });
      }
      this.open = false;
    },
    _toggleDropdown: function(){
      if (this.open) {
        this._closeDropdown();
      } else {
        this._openDropdown();
      }
    },
    _resetOptions: function(event){
      var indices, res$, i$, ref$, len$, item, index, option, oldValue, oldItem;
      if (this.multiple) {
        res$ = [];
        for (i$ = 0, len$ = (ref$ = this.currentValue).length; i$ < len$; ++i$) {
          item = ref$[i$];
          res$.push(item._nodeIndex);
        }
        indices = res$;
        for (i$ = 0, len$ = indices.length; i$ < len$; ++i$) {
          index = indices[i$];
          option = $("#" + this._generateDomId('option', index));
          this._deselectOption(event, option);
        }
      } else {
        this.selection.find('span').text(this.options.defaultText).addClass('ui-priority-secondary');
        oldValue = this.currentValue;
        oldItem = this.selectedOption;
        if (oldItem != null) {
          this._deselectItem(oldItem);
        }
        this.currentValue = null;
        this.selectedOption = null;
        this.selection.find('.bar-sp-deselect').remove();
        this._activateOption(this.selectOptions.find('.bar-sp-selected').removeClass('bar-sp-selected'));
        if (this.active) {
          this._closeDropdown();
        }
        if (oldValue !== null) {
          this._trigger('change', event, {
            item: null,
            data: null
          });
        }
      }
    },
    _selectOption: function(event, option){
      var position, value, pos, group, visible, i$, to$, index, sHeight, sWidth, newHeight, newWidth, ref$, oldValue;
      if (option != null) {
        this._clearHighlight();
        position = this._getModelIndex(option);
        value = this.model[position];
        if (value.selected) {
          return;
        }
        if (this.multiple) {
          this._deactivateOption(option);
          if (pos = value._groupIndex) {
            group = this.model[pos];
            visible = false;
            for (i$ = pos + 1, to$ = pos + group._children; i$ < to$; ++i$) {
              index = i$;
              if (!this.model[index].selected) {
                visible = true;
                break;
              }
            }
            if (!visible) {
              this._deactivateOption($("#" + group._domId));
            }
          }
        } else {
          this._activateOption(this.selectOptions.find('a.bar-sp-selected').removeClass('bar-sp-selected'));
          this.selectedOption = option;
          this.selection.find('span').removeClass('ui-priority-secondary');
        }
        option.addClass('bar-sp-selected');
        this._selectItem(value);
        if (this.multiple) {
          sHeight = this.selection.outerHeight();
          sWidth = this.selection.outerWidth();
          this._buildSelection(value);
          newHeight = this.selection.outerHeight();
          newWidth = this.selection.outerWidth();
        } else {
          this.selection.find('span').first().text(value.text);
          if (this.options.deselectable) {
            this._buildDeselectControl();
          }
        }
        if (!(this.multiple && ((event != null && event.metaKey) || (event != null && event.ctrlKey)))) {
          this._closeDropdown();
        }
        this.searchField.val('');
        if (this.multiple && (sHeight !== newHeight || sWidth !== newWidth)) {
          this._trigger('resize', event, {
            item: this.selection,
            data: {
              height: newHeight,
              width: newWidth
            }
          });
        }
        if (this.multiple && $.inArray(value, this.currentValue === -1)) {
          (ref$ = this.currentValue)[ref$.length] = value;
          this._trigger('change', event, {
            item: option,
            data: value
          });
        }
        if (!this.multiple && value !== this.currentValue) {
          oldValue = this.currentValue;
          if (oldValue != null) {
            this._deselectItem(oldValue);
          }
          this.currentValue = value;
          this._trigger('change', event, {
            item: option,
            data: value
          });
        }
        this._resizeSearchField();
      }
    },
    _deselectOption: function(event, option){
      var pos, value, index, selection, sHeight, sWidth, newHeight, newWidth;
      pos = this._getModelIndex(option);
      value = this.model[pos];
      if (!value.disabled) {
        this._deselectItem(value);
        this._activateOption(option);
        if (value._groupIndex) {
          this._activateOption($("#" + this._generateDomId('group', value._groupIndex)));
        }
        this._clearHighlight();
        this._filterOptions();
        index = $.inArray(value, this.currentValue);
        this.currentValue.splice(index, 1);
        selection = $("#" + this._generateDomId('selection', pos));
        this.selections -= 1;
        if (this.selections > 0 && this.searchField.val().length === 0) {
          this._closeDropdown();
        }
        sHeight = this.selection.outerHeight();
        sWidth = this.selection.outerWidth();
        selection.remove();
        newHeight = this.selection.outerHeight();
        newWidth = this.selection.outerHeight();
        this.searchField.focus();
        this._setSearchFieldDefault();
        this._resizeSearchField();
        if (sHeight !== newHeight || sWidth !== newWidth) {
          this._trigger('resize', event, {
            item: this.selection,
            data: {
              height: newHeight,
              width: newWidth
            }
          });
        }
        this._trigger('change', event, {
          item: null,
          data: null
        });
      }
    },
    _highlightOption: function(option){
      var maxHeight, visibleTop, visibleBottom, highlightTop, highlightBottom;
      if (option.length) {
        this._clearHighlight();
        this.highlightedOption = option;
        this.highlightedOption.addClass('ui-state-focus');
        this.selection.attr('aria-activedescendant', this.highlightedOption.attr('id'));
        maxHeight = parseInt(this.selectOptions.css('maxHeight'));
        visibleTop = this.selectOptions.scrollTop();
        visibleBottom = maxHeight + visibleTop;
        highlightTop = this.highlightedOption.position().top + this.selectOptions.scrollTop();
        highlightBottom = highlightTop + this.highlightedOption.outerHeight();
        if (highlightBottom >= visibleBottom) {
          this.selectOptions.scrollTop(highlightBottom - maxHeight > 0 ? highlightBottom - maxHeight : 0);
        } else if (highlightTop < visibleTop) {
          this.selectOptions.scrollTop(highlightTop);
        }
      }
    },
    _clearHighlight: function(){
      if (this.highlightedOption) {
        this.highlightedOption.removeClass('ui-state-focus');
      }
      this.highlightedOption = null;
    },
    _activateOption: function(option){
      option.parent().removeClass('ui-helper-hidden');
      option.attr('aria-hidden', 'false');
    },
    _deactivateOption: function(option){
      option.parent().addClass('ui-helper-hidden');
      option.attr('aria-hidden', 'true');
    },
    _activateWidget: function(event){
      this.container.addClass('bar-sp-active');
      if (!this.multiple) {
        this.selection.addClass('ui-state-focus');
      }
      this.active = true;
      this.searchField.val(this.searchField.val());
      this.searchField.focus();
    },
    _deactivateWidget: function(event){
      $(document).unbind('click', this.documentClickAction);
      this.active = false;
      this._closeDropdown();
      this.container.removeClass('bar-sp-active');
      if (!this.multiple) {
        this.selection.removeClass('ui-state-focus');
      }
      this._clearOptionsFilter();
      this._clearBackspace();
      this._setSearchFieldDefault();
      this._resizeSearchField();
    },
    _filterOptions: function(){
      var count, searchText, regexAnchor, escapedSearch, regex, partRegex, i$, ref$, len$, option, found, resultId, result, start, parts, j$, len1$, part, text;
      this._clearNotFound();
      count = 0;
      searchText = $('<div>').text($.trim(this.searchField.val())).html();
      regexAnchor = this.options.anchoredSearch ? '^' : '';
      escapedSearch = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      regex = new RegExp(regexAnchor + escapedSearch, 'i');
      partRegex = new RegExp('\\s' + escapedSearch, 'i');
      for (i$ = 0, len$ = (ref$ = this.model).length; i$ < len$; ++i$) {
        option = ref$[i$];
        if (!option.disabled && !option.empty) {
          if (option.group) {
            this._deactivateOption($("#" + option._domId));
          } else if (!(this.multiple && option.selected)) {
            found = false;
            resultId = option._domId;
            result = $("#" + resultId);
            if ((start = option.html.search(regex)) !== -1) {
              found = true;
              count += 1;
            } else if (this.options.splitSearch && (option.html.indexOf(' ') !== -1 || option.html.indexOf('[') === 0)) {
              parts = option.html.replace(/\[|\]/g, '').split(' ');
              if (parts.length) {
                for (j$ = 0, len1$ = parts.length; j$ < len1$; ++j$) {
                  part = parts[j$];
                  if (regex.test(part)) {
                    found = true;
                    count += 1;
                    start = option.html.search(partRegex) + 1;
                    break;
                  }
                }
              }
            }
            if (found) {
              if (searchText.length) {
                text = option.html.substr(0, start + searchText.length) + "</span>" + option.html.substr(start + searchText.length);
                text = text.substr(0, start) + "<span class=\"ui-priority-primary\">" + text.substr(start);
              } else {
                text = option.html;
              }
              result.html(text);
              this._activateOption(result);
              if (option._groupIndex != null) {
                this._activateOption($("#" + this.model[option._groupIndex]._domId));
              }
            } else {
              if (this.highlightedOption && resultId === this.highlightedOption.attr('id')) {
                this._clearHighlight();
              }
              this._deactivateOption(result);
            }
          }
        }
      }
      if (count < 1 && searchText.length) {
        this._notFound(searchText);
      } else {
        this._setFilterHighlight();
      }
    },
    _clearOptionsFilter: function(){
      var links, i$, len$, a, link;
      this.searchField.val('');
      links = this.selectOptions.find('a');
      for (i$ = 0, len$ = links.length; i$ < len$; ++i$) {
        a = links[i$];
        link = $(a);
        if (!this.multiple || link.hasClass('bar-sp-option-group') || !link.hasClass('bar-sp-selected')) {
          this._activateOption(link);
        }
      }
    },
    _setFilterHighlight: function(){
      var selected, highlighted;
      if (!this.highlightedOption) {
        selected = this.multiple
          ? []
          : this.selectOptions.find('.bar-sp-selected');
        highlighted = selected.length
          ? selected.first()
          : this.selectOptions.find('.bar-sp-option').first();
        if (highlighted.length) {
          this._highlightOption(highlighted);
        }
      }
    },
    _notFound: function(text){
      var html;
      html = $("<li class=\"bar-sp-not-found ui-menu-item\"><a href=\"javascript:void(0)\">" + this.options.notFoundText + " \"" + text + "\"</a></li>");
      this.selectOptions.append(html);
    },
    _clearNotFound: function(){
      this.selectOptions.find('.bar-sp-not-found').remove();
    },
    _setDisabledState: function(){
      if (this.options.disabled) {
        this.container.addClass('bar-sp-disabled ui-state-disabled');
        this.searchField[0].disabled = true;
        this._deactivateWidget();
      } else {
        this.container.removeClass('bar-sp-disabled ui-state-disabled');
        this.searchField[0].disabled = false;
      }
    },
    _setSearchFieldDefault: function(){
      if (this.multiple && this.selections < 1 && !this.active) {
        this.searchField.val(this.options.defaultText).addClass('bar-sp-default');
      } else {
        this.searchField.val('').removeClass('bar-sp-default');
      }
    },
    _resizeSearchField: function(){
      var sfWidth, styleText, styles, i$, len$, style, tempDiv, ddWidth, ddTop;
      if (this.multiple) {
        sfWidth = 0;
        styleText = 'position:absolute;left:-1000px;top:-1000px;display:none;';
        styles = ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height', 'text-transform', 'letter-spacing'];
        for (i$ = 0, len$ = styles.length; i$ < len$; ++i$) {
          style = styles[i$];
          styleText += style + ":" + this.searchField.css(style) + ";";
        }
        tempDiv = $('<div>', {
          style: styleText
        });
        tempDiv.text(this.searchField.val());
        $('body').append(tempDiv);
        sfWidth = tempDiv.width + 25;
        if (sfWidth > this.width - 10) {
          sfWidth = this.width - 10;
        }
        tempDiv.remove();
      } else {
        ddWidth = this.width - this._getBorderAndSideWidth(this.dropdown);
        sfWidth = ddWidth - this._getBorderAndSideWidth(this.searchContainer) - this._getBorderAndSideWidth(this.searchField);
      }
      ddTop = this.container.height();
      this.searchField.css({
        width: sfWidth + 'px'
      });
      this.dropdown.css({
        top: ddTop + 'px'
      });
    },
    _setTabIndex: function(){
      var index;
      index = this.element.attr('tabindex');
      if (index) {
        this.element.attr('tabindex', -1);
        this.searchField.attr('tabindex', index);
      }
    },
    _revertTabIndex: function(){
      var index;
      index = this.searchField.attr('tabindex');
      if (index) {
        this.searchField.attr('tabindex', -1);
        this.element.attr('tabindex', index);
      }
    },
    _clearBackspace: function(){
      if (this.pendingDeselection) {
        this.pendingDeselection.removeClass('ui-state-focus');
      }
      this.pendingDeselection = null;
    },
    _generateContainerId: function(){
      var result, i;
      result = 'sp-' + (function(){
        var i$, results$ = [];
        for (i$ = 1; i$ <= 6; ++i$) {
          i = i$;
          results$.push(this._generateChar());
        }
        return results$;
      }.call(this)).join('');
      while ($("#" + result).length) {
        result += this._generateChar();
      }
      return result;
    },
    _generateChar: function(){
      var chars, rand;
      chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      rand = Math.floor(Math.random() * chars.length);
      return chars.charAt(rand);
    },
    _generateDomId: function(type, index){
      return type + "-" + this.containerId + "-" + index;
    },
    _getBorderAndSideWidth: function(element){
      return element.outerWidth() - element.width();
    },
    _getModelIndex: function(option){
      var id;
      id = option.attr('id');
      return id.substr(id.lastIndexOf('-') + 1);
    },
    _sanitizeItem: function(item){
      var result, key, value, own$ = {}.hasOwnProperty;
      result = {};
      for (key in item) if (own$.call(item, key)) {
        value = item[key];
        if (key.indexOf('_') !== 0) {
          result[key] = value;
        }
      }
      return result;
    },
    _parse: function(){
      if (this.options.data) {
        return this._parseData(this.options.data);
      } else if (this.element[0].nodeName.toLowerCase() === 'select') {
        return this._parseOptions(this.element[0]);
      } else {
        return [];
      }
    },
    _parseData: function(data){
      var optionIndex, model, addNode, addGroup, addOption, i$, len$, node;
      optionIndex = 0;
      model = [];
      addNode = function(node){
        var ref$;
        if ((ref$ = node.children) != null && ref$.length) {
          addGroup(node);
        } else {
          addOption(node);
        }
      };
      addGroup = function(node){
        var position, newNode, ref$, key, val, i$, len$, option, own$ = {}.hasOwnProperty;
        position = model.length;
        newNode = {
          _nodeIndex: position,
          group: true,
          label: (ref$ = node.label) != null
            ? ref$
            : (ref$ = node.text) != null ? ref$ : '',
          _children: 0,
          disabled: (ref$ = node.disabled) != null ? ref$ : false
        };
        for (key in node) if (own$.call(node, key)) {
          val = node[key];
          if (!$.inArray(key, ['_nodeIndex', 'group', 'label', '_children', 'disabled'])) {
            newNode[key] = val;
          }
        }
        model[model.length] = newNode;
        for (i$ = 0, len$ = (ref$ = node.children).length; i$ < len$; ++i$) {
          option = ref$[i$];
          addOption(option, position, node.disabled);
        }
      };
      addOption = function(node, groupPosition, groupDisabled){
        var ref$, newNode, ref1$, key, val, own$ = {}.hasOwnProperty;
        if (!((ref$ = node.children) != null && ref$.length)) {
          if (node.text !== '') {
            if (groupPosition != null) {
              model[groupPosition]._children += 1;
            }
            newNode = {
              _nodeIndex: model.length,
              _optionIndex: optionIndex,
              value: (ref1$ = node.value) != null
                ? ref1$
                : node.text,
              text: node.text,
              html: (ref1$ = node.html) != null
                ? ref1$
                : node.text,
              selected: (ref1$ = node.selected) != null ? ref1$ : false,
              disabled: groupDisabled
                ? groupDisabled
                : (ref1$ = node.disabled) != null ? ref1$ : false,
              _groupIndex: groupPosition,
              classes: node.classes,
              style: node.style
            };
          } else {
            newNode = {
              _nodeIndex: model.length,
              _optionIndex: optionIndex,
              empty: true
            };
          }
          for (key in node) if (own$.call(node, key)) {
            val = node[key];
            if (!$.inArray(key, ['_nodeIndex', '_optionIndex', 'value', 'text', 'html', 'selected', 'disabled', '_groupIndex', 'classes', 'style'])) {
              newNode[key] = val;
            }
          }
          optionIndex += 1;
          model[model.length] = newNode;
        }
      };
      for (i$ = 0, len$ = data.length; i$ < len$; ++i$) {
        node = data[i$];
        addNode(node);
      }
      return model;
    },
    _parseOptions: function(element){
      var optionIndex, model, addNode, addGroup, addOption, i$, ref$, len$, node;
      optionIndex = 0;
      model = [];
      addNode = function(node){
        if (node.nodeName.toLowerCase() === 'optgroup') {
          addGroup(node);
        } else {
          addOption(node);
        }
      };
      addGroup = function(node){
        var position, newNode, i$, ref$, len$, option;
        position = model.length;
        newNode = {
          _element: node,
          _nodeIndex: position,
          group: true,
          label: node.label,
          _children: 0,
          disabled: node.disabled
        };
        model[model.length] = newNode;
        for (i$ = 0, len$ = (ref$ = node.childNodes).length; i$ < len$; ++i$) {
          option = ref$[i$];
          addOption(option, position, node.disabled);
        }
      };
      addOption = function(node, groupPosition, groupDisabled){
        var newNode;
        if (node.nodeName.toLowerCase() === 'option') {
          if (node.text !== '') {
            if (groupPosition != null) {
              model[groupPosition]._children += 1;
            }
            newNode = {
              _element: node,
              _nodeIndex: model.length,
              _optionIndex: optionIndex,
              value: node.value,
              text: node.text,
              html: node.innerHTML,
              selected: node.selected,
              disabled: groupDisabled
                ? groupDisabled
                : node.disabled,
              _groupIndex: groupPosition,
              classes: node.className,
              style: node.style.cssText
            };
          } else {
            newNode = {
              _nodeIndex: model.length,
              _optionIndex: optionIndex,
              empty: true
            };
          }
          optionIndex += 1;
          model[model.length] = newNode;
        }
      };
      for (i$ = 0, len$ = (ref$ = element.childNodes).length; i$ < len$; ++i$) {
        node = ref$[i$];
        addNode(node);
      }
      return model;
    }
  });
  $.barandis.selectplus;
});
//# sourceMappingURL=data:application/json;base64,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QUFDLEtBQUssQ0FBQztZQVZsQjtXQVdKO1lBQ0UsT0FBUyxDQUFBLENBQUEsQ0FDUDtjQUFBLFlBQWEsS0FBSyxDQUFDO2NBQ25CLGNBQWU7Y0FDZixPQUFPO1lBRlA7O1VBR0osV0FBYSxDQUFBLEVBQUEsQ0FBRzs2QkFDUCxDQUFBLENBQUEsQ0FBRTs7O01BRWYsdUVBQUE7UUFBSTtRQUNGLFFBQVMsSUFBQTs7YUFDWDs7RUEvM0NGLENBWk87RUFtNUNULENBQUMsQ0FBQyxRQUFRLENBQUMiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAxNSwgVGhvbWFzIEouIE90dGVyc29uXHJcbiAqXHJcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcclxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxyXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXHJcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcclxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXHJcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XHJcbiAqXHJcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXHJcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxyXG4gKlxyXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXHJcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxyXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcclxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxyXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxyXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXHJcbiAqIFRIRSBTT0ZUV0FSRS5cclxuICogQGxpY2Vuc2VcclxuICovXHJcblxyXG4kIDwtISAoKGZhY3RvcnkpICEtPlxyXG4gIGlmIHR5cGVvZiBkZWZpbmUgaXMgXFxmdW5jdGlvbiBhbmQgZGVmaW5lLmFtZFxyXG4gICAgZGVmaW5lIDxbIGpxdWVyeSBqcXVlcnktdWkvY29yZSBqcXVlcnktdWkvd2lkZ2V0IF0+IGZhY3RvcnlcclxuICBlbHNlIGlmIHR5cGVvZiBleHBvcnRzIGlzIFxcb2JqZWN0XHJcbiAgICByZXF1aXJlISA8WyBqcXVlcnkganF1ZXJ5LXVpL2NvcmUganF1ZXJ5LXVpL3dpZGdldCBdPlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5IGpxdWVyeSwgY29yZSwgd2lkZ2V0XHJcbiAgZWxzZVxyXG4gICAgZmFjdG9yeSBqUXVlcnkpXHJcblxyXG4jIFRoaXMgYWRkcyBzb21lIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIGNvcmUgalF1ZXJ5IC5hdHRyKCkgbWV0aG9kLiBOYW1lbHksIGl0IFxyXG4jIHJldHVybnMgYSBtYXAgb2YgYWxsIGF0dHJpYnV0ZSBuYW1lcyB0byB2YWx1ZXMgaWYgbm8gYXJndW1lbnRzIGFyZSBwYXNzZWQgXHJcbiMgdG8gaXQuIFRoaXMgbWF5IGJlIHVudXN1YWwgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUgKDggYW5kIGJlZm9yZSksIHdoaWNoIFxyXG4jIGFwcGFyZW50bHkgcmV0dXJuIHRoZSBuYW1lcyBvZiBhbGwgcG9zc2libGUgYXR0cmlidXRlcywgcmF0aGVyIHRoYW4gc2ltcGx5IFxyXG4jIHRoZSBuYW1lcyBvZiBhbGwgc2V0IGF0dHJpYnV0ZXMgdGhhdCBvdGhlciBicm93c2VycyByZXR1cm4uXHJcbiNcclxuIyBUaGlzIGlzIHVzZWQgbGF0ZXIgdG8gY29weSBvdmVyIGFyaWEgYXR0cmlidXRlcywgaW5jaWRlbnRhbGx5LlxyXG5fb2xkID0gJC5mbi5hdHRyXHJcbiQuZm4uYXR0ciA9IC0+XHJcbiAgaWYgQDAgYW5kIGFyZ3VtZW50cy5sZW5ndGggaXMgMFxyXG4gICAgbWFwID0ge31cclxuICAgIGF0dHJpYnV0ZXMgPSBAMC5hdHRyaWJ1dGVzXHJcbiAgICBmb3IgYXR0cmlidXRlIGluIGF0dHJpYnV0ZXNcclxuICAgICAgbWFwW2F0dHJpYnV0ZS5uYW1lLnRvLWxvd2VyLWNhc2UhXSA9IGF0dHJpYnV0ZS52YWx1ZVxyXG4gICAgbWFwXHJcbiAgZWxzZVxyXG4gICAgX29sZC5hcHBseSBALCBhcmd1bWVudHNcclxuXHJcbiQud2lkZ2V0IFxcYmFyYW5kaXMuc2VsZWN0cGx1cyxcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBXSURHRVQgT1BUSU9OU1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMgUmVtZW1iZXIgdGhhdCB0aGlzIGlzIExpdmVTY3JpcHQsIGFuZCB3aGVuIGl0J3MgY29tcGlsZWQgaW50byBKYXZhU2NyaXB0LCBcclxuICAjIGRhc2hlZCBpZGVudGlmaWVycyBhcmUgcmVwbGFjZWQgd2l0aCBjYW1lbC1jYXNlZCBvbmVzLiBUaGVyZWZvcmUsIGZvciBcclxuICAjIGluc3RhbmNlLCB0aGUgcHJvcGVydHkgd2lsbCBiZSBtYXhTZWxlY3RlZCByYXRoZXIgdGhhbiB0aGUgbWF4LXNlbGVjdGVkIFxyXG4gICMgc2hvd24gYmVsb3cuXHJcbiAgb3B0aW9uczpcclxuICAgICMgUmF3IEpTT04gZGF0YSBmb3IgdXNlIGluIHRoZSBtb2RlbC4gSWYgdGhpcyBpcyBudWxsLCB0aGUgd2lkZ2V0IGluc3RlYWRcclxuICAgICMgcGFyc2VzIHRoZSBzZWxlY3QgY29udHJvbCB0aGF0IGl0J3MgYXR0YWNoZWQgdG8uIElmIHRoaXMgb3B0aW9uIGlzIFxyXG4gICAgIyBjaGFuZ2VkIGFmdGVyIGNyZWF0aW9uLCBpdCB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LlxyXG4gICAgZGF0YTogbnVsbFxyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCB0aGUgd2lkZ2V0IGlzIGRpc2FibGVkLiBQb3N0LWNyZWF0aW9uIGNoYW5nZXMgb2YgdGhpcyBcclxuICAgICMgb3B0aW9uIChvciB1c2luZyB0aGUgZW5hYmxlIG9yIGRpc2FibGUgbWV0aG9kKSB3aWxsIHRha2UgZWZmZWN0IFxyXG4gICAgIyBpbW1lZGlhdGVseS5cclxuICAgIGRpc2FibGVkOiBub1xyXG4gICAgIyBUaGUgd2lkdGggb2YgdGhlIHdpZGdldCwgaW4gcGl4ZWxzLiBJZiB0aGlzIGlzIHNldCB0byAwICh0aGUgZGVmYXVsdCksIFxyXG4gICAgIyB0aGVuIHRoZSB3aWR0aCBvZiB0aGUgdW5kZXJseWluZyBIVE1MIGNvbnRyb2wuIENoYW5nZXMgdG8gdGhpcyBvcHRpb24gXHJcbiAgICAjIG1hZGUgYWZ0ZXIgY3JlYXRpb24gd2lsbCB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseS4gTk9URTogV2hpbGUgdGhlIHdpZHRoIFxyXG4gICAgIyBjYW4gY29uY2VpdmFibHkgc2V0IGluIGEgQ1NTIGZpbGUgd2l0aCBhbiAhaW1wb3J0YW50IGRpcmVjdGl2ZSwgdGhpcyBpcyBcclxuICAgICMgbm90IHJlY29tbWVuZGVkLiBUaGUgd2lkdGhzIG9mIG11bHRpcGxlIHBhcnRzIG9mIHRoZSB3aWRnZXQgYXJlIHNldCBcclxuICAgICMgc3BlY2lmaWNhbGx5LCBhbmQgY2hhbmdpbmcgdGhlIHdpZHRoIHZpYSBDU1Mgd2lsbCBub3QgdXBkYXRlIGFsbCBvZiBcclxuICAgICMgdGhvc2UgcGFydHMgYXV0b21hdGljYWxseS4gQWRkaXRpb25hbGx5LCBhIHJlc2l6ZSBldmVudCB3aWxsIG5vdCBiZSBcclxuICAgICMgZmlyZWQgaWYgdGhlIHdpZHRoIG9mIHRoZSB3aWRnZXQgaXMgY2hhbmdlZCB2aWEgQ1NTLlxyXG4gICAgd2lkdGg6IDBcclxuICAgICMgV2hldGhlciBvciBub3QgY2xhc3MgYW5kIHN0eWxlIGF0dHJpYnV0ZXMgYXJlIGluaGVyaXRlZCBmcm9tIHRoZSBcclxuICAgICMgdW5kZXJseWluZyBzZWxlY3QgYW5kIG9wdGlvbnMuIElmIGRhdGEgaXMgbm90IG51bGwsIHRoaXMgZGV0ZXJtaW5lcyBcclxuICAgICMgd2hldGhlciB0aGUgZGF0YSdzIGNsYXNzZXMgYW5kIHN0eWxlIHZhbHVlcyBhcmUgdXNlZC4gQ2hhbmdpbmcgdGhpcyBcclxuICAgICMgYWZ0ZXIgY3JlYXRpb24gd2lsbCBoYXZlIG5vIGVmZmVjdCBzaW5jZSBpdCB3b3VsZCByZXF1aXJlIHJlY2FsY3VsYXRpb24gXHJcbiAgICAjIG9mIGEgbG90IG9mIHRoZSBkaW1lbnNpb25zIG9mIHRoZSB3aWRnZXQuIFRvIGNoYW5nZSB0aGlzIG9uIHRoZSBmbHksIFxyXG4gICAgIyBkZXN0cm95IHRoZSB3aWRnZXQgYW5kIGNyZWF0ZSBhbm90aGVyIG9uZSB3aXRoIHRoaXMgb3B0aW9uIGVuYWJsZWQuXHJcbiAgICBpbmhlcml0OiBub1xyXG4gICAgIyBSaWdodC10by1sZWZ0IHN1cHBvcnQuIFBvc3QtY3JlYXRpb24gY2hhbmdlcyB0byB0aGlzIG9wdGlvbiB0YWtlIGVmZmVjdCBcclxuICAgICMgaW1tZWRpYXRlbHkuXHJcbiAgICBydGw6IG5vXHJcbiAgICAjIFdoZXRoZXIgb3Igbm90IGEgdmFsdWUgY2FuIGJlIGRlc2VsZWN0ZWQgKGxlYXZpbmcgdGhlIGN1cnJlbnQgdmFsdWUgYXMgXHJcbiAgICAjIG51bGwpLiBUaGlzIGlzIG9ubHkgYXBwbGljYWJsZSB0byBzaW5nbGUtc2VsZWN0IHdpZGdldHMsIGFzIFxyXG4gICAgIyBtdWx0aXBsZS1zZWxlY3Qgd2lkZ2V0cyBhcmUgaW5oZXJlbnRseSBkZXNlbGVjdGFibGUuIEEgZGVzZWxlY3RhYmxlIFxyXG4gICAgIyBzaW5nbGUtc2VsZWN0IHdpZGdldCB3aWxsIGhhdmUgYW4gWCBkaXNwbGF5ZWQgbmV4dCB0byB0aGUgdXAvZG93biBhcnJvdyBcclxuICAgICMgd2hlbiBhIHNlbGVjdGlvbiBpcyBtYWRlLCBhbGxvd2luZyB0aGF0IHNlbGVjdGlvbiB0byBiZSB1bi1tYWRlLiBcclxuICAgICMgQ2hhbmdlcyB0byB0aGlzIG9wdGlvbiBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LlxyXG4gICAgZGVzZWxlY3RhYmxlOiBub1xyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCBtdWx0aXBsZSBzZWxlY3Rpb25zIGFyZSBhbGxvd2VkLiBTaW5nbGUgc2VsZWN0aW9uIGlzIHRoZSBcclxuICAgICMgZGVmYXVsdC4gSWYgdGhpcyBpcyB5ZXMsIHRoZSB3aWRnZXQgd2lsbCBiZSBtdWx0aXBsZS1zZWxlY3QuIElmIGl0IGlzIFxyXG4gICAgIyBudWxsLCBpdCB3aWxsIGRlcGVuZCBvbiB3aGV0aGVyIHRoZSB1bmRlcmx5aW5nIHNlbGVjdCBoYXMgdGhlIG11bGlwbGUgXHJcbiAgICAjIGF0dHJpYnV0ZSAoaWYgdGhlcmUgaXMgbm8gdW5kZXJseWluZyBzZWxlY3QsIHRoZW4gaXQgd2lsbCBiZSBcclxuICAgICMgc2luZ2xlLXNlbGVjdCkuIFRoaXMgb3B0aW9uIGNhbm5vdCBiZSBjaGFuZ2VkIGFmdGVyIGNyZWF0aW9uIHNpbmNlIHRoZSBcclxuICAgICMgSFRNTCBzdHJ1Y3R1cmUgaXMgY29tcGxldGVseSBkaWZmZXJlbnQ7IHRvIGRvIHRoaXMsIGRlc3Ryb3kgdGhlIFxyXG4gICAgIyBzaW5nbGUtc2VsZWN0IHdpZGdldCBhbmQgY3JlYXRlIGEgbmV3IG11bHRpLXNlbGVjdCB3aWRnZXQgd2l0aCB0aGUgc2FtZSBcclxuICAgICMgZGF0YS5cclxuICAgIG11bHRpLXNlbGVjdDogbnVsbFxyXG4gICAgIyBEZXNlbGVjdGluZyBieSBrZXlib2FyZCAoYmFja3NwYWNlL2RlbGV0ZSkgaW4gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0IFxyXG4gICAgIyBub3JtYWxseSByZXF1aXJlcyB0d28ga2V5c3Ryb2tlcy4gVGhlIGZpcnN0IHdpbGwgaGlnaGxpZ2h0IHRoZSBcclxuICAgICMgc2VsZWN0aW9uIGFuZCB0aGUgc2Vjb25kIHdpbGwgZGVzZWxlY3QgaXQuIFRoaXMgYWxsb3dzIGRlc2VsZWN0aW9uIHRvIFxyXG4gICAgIyBvY2N1ciBpbiBvbmUga2V5c3Ryb2tlIGluc3RlYWQuIEl0IGRvZXMgbm90IGFwcGx5IHRvIHNpbmdsZS1zZWxlY3QgXHJcbiAgICAjIHdpZGdldHMuIENoYW5nZXMgdG8gdGhpcyBvcHRpb24gYWZ0ZXIgY3JlYXRpb24gd2lsbCB0YWtlIGVmZmVjdCBcclxuICAgICMgaW1tZWRpYXRlbHkuXHJcbiAgICBxdWljay1kZXNlbGVjdDogbm8gICAgICAgICAgICAgXHJcbiAgICAjIFRoZSBtYXhpbXVtIG51bWJlciBvZiBzZWxlY3Rpb25zIHRoYXQgY2FuIGJlIG1hZGUgaW4gYSBtdWx0aS1zZWxlY3QgXHJcbiAgICAjIHdpZGdldC4gSXQgZG9lcyBub3QgYXBwbHkgdG8gc2luZ2xlLXNlbGVjdCB3aWRnZXRzLiBDaGFuZ2VzIHRvIHRoaXMgXHJcbiAgICAjIG9wdGlvbiB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LCB0aG91Z2ggaWYgdGhlIG5ldyBtYXggaXMgbGVzcyBcclxuICAgICMgdGhhbiB0aGUgYW1vdW50IG9mICBzZWxlY3Rpb25zIGFscmVhZHkgbWFkZSwgdGhlIGV4dHJhIHNlbGVjdGlvbnMgd2lsbCBcclxuICAgICMgbm90IGJlIGRlbGV0ZWQgKHRob3VnaCBtb3JlIGNhbm5vdCBiZSBtYWRlIHVudGlsIHRoZXJlIGFyZSBmZXdlciB0aGFuIFxyXG4gICAgIyB0aGUgbmV3IG1heCkuICAgICAgIFxyXG4gICAgbWF4LXNlbGVjdGVkOiBJbmZpbml0eSAgICAgICAgICAgICAgICBcclxuICAgICMgV2hldGhlciBvciBub3QgdGhlcmUgaXMgYSBzZWFyY2ggYm94IGluIHRoZSB3aWRnZXQuIFRoaXMgaXMgb25seSBcclxuICAgICMgYXBwbGljYWJsZSB0byBzaW5nbGUtc2VsZWN0IHdpZGdldHMsIGFzIG11bHRpLXNlbGVjdCB3aWRnZXRzIGluaGVyZW50bHkgXHJcbiAgICAjIGhhdmUgYSBzZWFyY2ggYm94LiBDaGFuZ2VzIHRvIHRoaXMgb3B0aW9uIGFmdGVyIGNyZWF0aW9uIHdpbGwgdGFrZSBcclxuICAgICMgZWZmZWN0IGltbWVkaWF0ZWx5LlxyXG4gICAgc2VhcmNoYWJsZTogbm9cclxuICAgICMgVGhlIHRocmVzaG9sZCBiZWxvdyB3aGljaCBhIHNlYXJjaCBib3ggd2lsbCBub3QgYmUgZGlzcGxheWVkLiBJZiB0aGVyZSBcclxuICAgICMgYXJlIGZld2VyIG9wdGlvbnMgYXZhaWxhYmxlIHRoYW4gdGhpcyBudW1iZXIsIG5vIHNlYXJjaCBib3ggd2lsbCBzaG93LiBcclxuICAgICMgQWdhaW4sIHRoaXMgaXMgb25seSBhcHBsaWNhYmxlIHRvIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0cy4gQ2hhbmdlcyB0byBcclxuICAgICMgdGhpcyBvcHRpb24gYWZ0ZXIgY3JlYXRpb24gd2lsbCB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseS5cclxuICAgIHRocmVzaG9sZDogMFxyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCB0aGUgc2VhcmNoIHRleHQgc2hvdWxkIGJlIG1hdGNoZWQgYWdhaW5zdCB0aGUgYmVnaW5uaW5nIFxyXG4gICAgIyBvZiBlYWNoIGl0ZW0gdGV4dCAoYXMgb3Bwb3NlZCB0byBtYXRjaGluZyBhbnl3aGVyZSB3aXRoaW4gdGhlIHRleHQpLiBcclxuICAgICMgQ2hhbmdlcyB0byB0aGlzIG9wdGlvbiBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LlxyXG4gICAgYW5jaG9yZWQtc2VhcmNoOiB5ZXNcclxuICAgICMgV2hldGhlciBvciBub3QgYW4gYW5jaG9yZWQgc2VhcmNoIGNhbiBtYXRjaCBhZ2FpbnN0IG9ubHkgdGhlIGJlZ2lubmluZyBcclxuICAgICMgb2YgdGhlIHRleHQgb3IgYWdhaW5zdCB0aGUgYmVnaW5uaW5nIG9mIGFueSB3b3JkIHdpdGhpbiB0aGUgdGV4dC4gVGhpcyBcclxuICAgICMgaGFzIG5vIGVmZmVjdCBpZiBhbmNob3JlZC1zZWFyY2ggaXMgbm8uIENoYW5nZXMgdG8gdGhpcyBvcHRpb24gYWZ0ZXIgXHJcbiAgICAjIGNyZWF0aW9uIHdpbGwgdGFrZSBlZmZlY3QgaW1tZWRpYXRlbHkuXHJcbiAgICBzcGxpdC1zZWFyY2g6IHllc1xyXG4gICAgIyBUaGUgdGV4dCB0aGF0IHNob3dzIG9uIHRoZSB3aWRnZXQgd2hlbiBubyBzZWxlY3Rpb24gaXMgbWFkZS4gQ2hhbmdlcyB0byBcclxuICAgICMgdGhpcyBvcHRpb24gd2lsbCB0YWtlIGVmZmVjdCB0aGUgbmV4dCB0aW1lIHRoYXQgdGhlIGRlZmF1bHQgdGV4dCBpcyBcclxuICAgICMgc2hvd24gaW4gdGhlIHdpZGdldC4gICAgICAgICAgICAgXHJcbiAgICBkZWZhdWx0LXRleHQ6ICdTZWxlY3QgYW4gaXRlbSdcclxuICAgICMgVGhlIHRleHQgZGlzcGxheWVkIHdoZW4gYSBzZWFyY2ggcmV0dXJucyBubyByZXN1bHRzLiBJdCBpcyBhcHBlbmRlZCBcclxuICAgICMgd2l0aCB0aGUgdGV4dCB0aGF0IHdhcyBzZWFyY2hlZCBmb3IgKGluIGRvdWJsZSBxdW90ZXMpLiBDaGFuZ2VzIHRvIHRoaXMgXHJcbiAgICAjIG9wdGlvbiBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IHRoZSBuZXh0IHRpbWUgdGhhdCB0aGUgdGV4dCBpcyBcclxuICAgICMgZGlzcGxheWVkIGluIHRoZSB3aWRnZXQuXHJcbiAgICBub3QtZm91bmQtdGV4dDogJ05vIHJlc3VsdHMgbWF0Y2gnXHJcblxyXG4gICAgIyBFVkVOVFNcclxuXHJcbiAgICAjIEZpcmVkIHdoZW4gYW55dGhpbmcgaXMgc2VsZWN0ZWQgb3IgZGVzZWxlY3RlZC4gVGhlIGRhdGEgb2JqZWN0IGNvbnRhaW5zIFxyXG4gICAgIyB0d28gZWxlbWVudHM6IGl0ZW0sIHdoaWNoIGNvbnRhaW5zIHRoZSBqUXVlcnktd3JhcHBlZCBlbGVtZW50IHRoYXQgd2FzIFxyXG4gICAgIyBhY3R1YWxseSBjbGlja2VkIG9uLCBhbmQgdmFsdWUsIHdoaWNoIGlzIGEgcGxhaW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIFxyXG4gICAgIyBkYXRhIHJlcHJlc2VudGVkIGJ5IHRoYXQgZWxlbWVudC4gVGhlIHZhbHVlIGFsd2F5cyBoYXMgdGhlIGZvbGxvd2luZyBcclxuICAgICMgZmllbGRzOiB2YWx1ZSwgdGV4dCwgaHRtbCwgc2VsZWN0ZWQsIGRpc2FibGVkLCBzdHlsZSwgYW5kIGNsYXNzZXMuIFxyXG4gICAgIyBBZGRpdGlvbmFsbHksIGl0IHdpbGwgY29udGFpbiBhbnkgb3RoZXIgYXJiaXRyYXJpbHktbmFtZWQgZmllbGRzIHRoYXQgXHJcbiAgICAjIHdlcmUgc3BlY2lmaWVkIGluIHRoZSBkYXRhIG9wdGlvbi4gRmllbGRzIHdob3NlIG5hbWVzIGJlZ2luIHdpdGggXHJcbiAgICAjIHVuZGVyc2NvcmVzIHdpbGwgbm90IGJlIG91dHB1dCBmcm9tIHRoZSB2YWx1ZSBtZXRob2QuXHJcbiAgICBjaGFuZ2U6IG51bGxcclxuICAgICMgRmlyZWQgd2hlbiB0aGUgd2lkZ2V0IGxvc2VzIGZvY3VzLiBUaGlzIGlzIGluZGVwZW5kZW50IG9mIHdoZXRoZXIgdGhlIFxyXG4gICAgIyBzZWFyY2ggYm94IGxvc2VzIGZvY3VzLi4uaXQgbG9zZXMgZm9jdXMgbmF0dXJhbGx5IHdoZW4gb3RoZXIgcGFydHMgb2YgXHJcbiAgICAjIHRoZSB3aWRnZXQgYXJlIGNsaWNrZWQgb24sIGJ1dCB0aGF0J3MgYWNjb3VudGVkIGZvciBhbmQgZG9lcyBub3QgcmVzdWx0IFxyXG4gICAgIyBpbiB0aGUgZmlyaW5nIG9mIHRoaXMgZXZlbnQuXHJcbiAgICBibHVyOiBudWxsXHJcbiAgICAjIEZpcmVkIHdoZW4gdGhlIHdpZGdldCBnYWlucyBmb2N1cy4gVGhlIHNlYXJjaCBib3ggKHdoaWNoIGlzIHRoZSBwYXJ0IFxyXG4gICAgIyB3aXRoIHRoZSB0YWJpbmRleCBzbyBpcyB0aGUgcGFydCB0aGF0IHJlY2VpdmVzIGZvY3VzIG5hdHVyYWxseSkgb2Z0ZW4gXHJcbiAgICAjIGxvc2VzIGFuZCByZWdhaW5zIGZvY3VzIHdoZW4gb3RoZXIgcGFydHMgb2YgdGhlIHdpZGdldCBhcmUgY2xpY2tlZCwgYnV0IFxyXG4gICAgIyB0aGlzIGlzIGNvbXBlbnNhdGVkIGZvciBhbmQgZG9lcyBub3QgcmVzdWx0IGluIHRoZSBmaXJpbmcgb2YgZXh0cmEgXHJcbiAgICAjIGV2ZW50cy5cclxuICAgIGZvY3VzOiBudWxsXHJcbiAgICAjIEZpcmVkIHdoZW4gdGhlIHNpemUgb2YgdGhlIGFsd2F5cy12aXNpYmxlIHBvcnRpb24gb2YgdGhlIHdpZGdldCBjaGFuZ2VzLlxyXG4gICAgIyBUaGlzIGdlbmVyYWxseSBvbmx5IGhhcHBlbnMgaW4gbXVsdGktc2VsZWN0IHdpZGdldHMgKHdoZW4gZW5vdWdoIG9wdGlvbnNcclxuICAgICMgYXJlIHNlbGVjdGVkIG9yIGRlc2VsZWN0ZWQgdGhhdCBpdCBjaGFuZ2VzIHRoZSBoZWlnaHQgb2YgdGhlIHdpZGdldCksIFxyXG4gICAgIyBidXQgaXQgaXMgYWxzbyBmaXJlZCBpbiBhbGwgd2lkZ2V0cyB3aGVuIHRoZXkncmUgY3JlYXRlZCBvciB3aGVuIHRoZWlyIFxyXG4gICAgIyB3aWR0aCBpcyBjaGFuZ2VkIHByb2dyYW1tYXRpY2FsbHkuXHJcbiAgICByZXNpemU6IG51bGxcclxuICAgICMgRmlyZWQgd2hlbiB0aGUgZHJvcGRvd24gcG9ydGlvbiBvZiB0aGUgd2lkZ2V0IGlzIGRpc3BsYXllZC5cclxuICAgIG9wZW46IG51bGxcclxuICAgICMgRmlyZWQgd2hlbiB0aGUgZHJvcGRvd24gcG9ydGlvbiBvZiB0aGUgd2lkZ2V0IGlzIGhpZGRlbi5cclxuICAgIGNsb3NlOiBudWxsXHJcblxyXG4gICMgVGhlIGZ1bGwgcnVuZG93biBvbiBob3cgcG9zdC1jcmVhdGlvbiBjaGFuZ2VzIHdvcmsgaXMgbGlzdGVkIHVuZGVyIHRoZSBcclxuICAjIGluZGl2aWR1YWwgb3B0aW9ucyBhYm92ZS5cclxuICBfc2V0LW9wdGlvbjogKGtleSwgdmFsdWUpICEtPlxyXG4gICAgc3dpdGNoIGtleVxyXG4gICAgICBjYXNlIFxccnRsXHJcbiAgICAgICAgaWYgdmFsdWUgdGhlbiBAY29udGFpbmVyLmFkZC1jbGFzcyBcXGJhci1zcC1ydGwgZWxzZSBAY29udGFpbmVyLnJlbW92ZS1jbGFzcyBcXGJhci1zcC1ydGxcclxuICAgICAgICBAX3N1cGVyIGtleSwgdmFsdWVcclxuICAgICAgY2FzZSBcXGRlc2VsZWN0YWJsZVxyXG4gICAgICAgIGlmIG5vdCBAbXVsdGlwbGVcclxuICAgICAgICAgIGlmIHZhbHVlIHRoZW4gQF9idWlsZC1kZXNlbGVjdC1jb250cm9sISBpZiBAc2VsZWN0ZWQtb3B0aW9uIFxyXG4gICAgICAgICAgZWxzZSBAc2VsZWN0aW9uLmZpbmQgXFwuYmFyLXNwLWRlc2VsZWN0IC5yZW1vdmUhXHJcbiAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcbiAgICAgIGNhc2UgXFxzZWFyY2hhYmxlXHJcbiAgICAgICAgaWYgbm90IEBtdWx0aXBsZVxyXG4gICAgICAgICAgaWYgdmFsdWUgdGhlbiBAc2VhcmNoLWZpZWxkLnJlbW92ZS1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG4gICAgICAgICAgZWxzZSBAc2VhcmNoLWZpZWxkLmFkZC1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG4gICAgICAgIEBfc3VwZXIga2V5LCB2YWx1ZVxyXG4gICAgICBjYXNlIFxcZGF0YVxyXG4gICAgICAgIEBfc3VwZXIga2V5LCB2YWx1ZVxyXG4gICAgICAgIEBfYnVpbGQtb3B0aW9ucyFcclxuICAgICAgY2FzZSBcXHRocmVzaG9sZFxyXG4gICAgICAgIGlmIG5vdCBAbXVsdGlwbGVcclxuICAgICAgICAgIGlmIG5vdCBAb3B0aW9ucy5zZWFyY2hhYmxlIG9yIEBtb2RlbC5sZW5ndGggPD0gdmFsdWVcclxuICAgICAgICAgICAgQHNlYXJjaC1maWVsZC5hZGQtY2xhc3MgXFx1aS1oZWxwZXItaGlkZGVuLWFjY2Vzc2libGVcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgQHNlYXJjaC1maWVsZC5yZW1vdmUtY2xhc3MgXFx1aS1oZWxwZXItaGlkZGVuLWFjY2Vzc2libGVcclxuICAgICAgICBAX3N1cGVyIGtleSwgdmFsdWVcclxuICAgICAgY2FzZSBcXGRpc2FibGVkXHJcbiAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcbiAgICAgICAgQF9zZXQtZGlzYWJsZWQtc3RhdGUhXHJcbiAgICAgIGNhc2UgXFx3aWR0aFxyXG4gICAgICAgIG9sZC13aWR0aCA9IEB3aWR0aFxyXG4gICAgICAgIEB3aWR0aCA9IHZhbHVlIG9yIEBlbGVtZW50Lm91dGVyLXdpZHRoIVxyXG4gICAgICAgIGlmIG9sZC13aWR0aCBpc250IEB3aWR0aFxyXG4gICAgICAgICAgQGNvbnRhaW5lci5jc3MgXFx3aWR0aCwgXCIje0Aud2lkdGh9cHhcIlxyXG4gICAgICAgICAgZGQtd2lkdGggPSBAd2lkdGggLSBAX2dldC1ib3JkZXItYW5kLXNpZGUtd2lkdGggQGRyb3Bkb3duXHJcbiAgICAgICAgICBAZHJvcGRvd24uY3NzIFxcd2lkdGgsIFwiI3tkZC13aWR0aH1weFwiXHJcbiAgICAgICAgICBAX3Jlc2l6ZS1zZWFyY2gtZmllbGQhXHJcbiAgICAgICAgICBAX3RyaWdnZXIgXFxyZXNpemUsIG51bGwsXHJcbiAgICAgICAgICAgIGl0ZW06IEBzZWxlY3Rpb25cclxuICAgICAgICAgICAgZGF0YTpcclxuICAgICAgICAgICAgICBoZWlnaHQ6IEBzZWxlY3Rpb24ub3V0ZXItaGVpZ2h0IVxyXG4gICAgICAgICAgICAgIHdpZHRoOiBAc2VsZWN0aW9uLm91dGVyLXdpZHRoIVxyXG4gICAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcbiAgICAgIGNhc2UgXFxtdWx0aVNlbGVjdCBcXGluaGVyaXRcclxuICAgICAgICAjIERvIG5vdGhpbmcsIGluY2x1ZGluZyBzZXR0aW5nIHRoZSB2YWx1ZSBvZiB0aGUgb3B0aW9uXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfc3VwZXIga2V5LCB2YWx1ZVxyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIEVORCBXSURHRVQgT1BUSU9OU1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgV0lER0VUIENSRUFUSU9OXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBDcmVhdGlvbiBpbnZvbHZlcyBzZXR0aW5nIHVwIHRoZSBIVE1MIGZvciB0aGUgd2lkZ2V0LCB3aGljaCBpcyBzZXBhcmF0ZSBcclxuICAjIGZyb20gdGhlIEhUTUwgb2YgYSBzZWxlY3QgZWxlbWVudCB0aGF0IHRoZSB3aWRnZXQgaXMgYnVpbHQgZnJvbS4gVGhlIFxyXG4gICMgb3JpZ2luYWwgc2VsZWN0IGVsZW1lbnQgaXMgaGlkZGVuLCBidXQgaXQgcmVtYWlucyBwYXJ0IG9mIHRoZSBET00uIEZvciBcclxuICAjIHRoaXMgcmVhc29uLCBmb3IgbGFyZ2VyIGRhdGFzZXRzIChpbnZvbHZpbmcgcGVyaGFwcyBhIGZldyBodW5kcmVkIGl0ZW1zKSwgXHJcbiAgIyBpdCBtYXkgYmUgYmV0dGVyIHRvIHVzZSBKU09OIGRhdGEgc28gYXZvaWQgaGF2aW5nIHRoZSByYXcgZGF0YSBiZSBwYXJ0IG9mIFxyXG4gICMgdGhlIERPTS5cclxuICAjXHJcbiAgIyBFdmVudHMgYXJlIGFsc28gc2V0IHVwIGluIGNyZWF0aW9uLCBhbmQgdGhlIGZyYW1ld29yayBmaXJlcyBvZmYgYSAnY3JlYXRlJ1xyXG4gICMgZXZlbnQgYXQgdGhlIGVuZC5cclxuICBfY3JlYXRlOiAhLT5cclxuXHJcbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgICAjIE1FTUJFUiBGSUVMRFNcclxuXHJcbiAgICAjIEFsbCBvZiB0aGUgbWVtYmVyIGZpZWxkcyBhcmUgbGlzdGVkIGhlcmUgZm9yIHRoZSBzYWtlIG9mIGRvY3VtZW50YXRpb24uXHJcblxyXG4gICAgIyBJbmRpY2F0ZXMgd2hldGhlciB0aGlzIGlzIGEgbXVsdGktc2VsZWN0IHdpZGdldC4gSWYgZmFsc2UsIGEgc2luZ2xlLVxyXG4gICAgIyBzZWxlY3Qgd2lkZ2V0IGlzIGNyZWF0ZWQuIChib29sZWFuKVxyXG4gICAgQG11bHRpcGxlICAgICAgICAgICAgPSBAb3B0aW9ucy5tdWx0aS1zZWxlY3QgPyBub3Qgbm90IEBlbGVtZW50LjAubXVsdGlwbGVcclxuICAgICMgRmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgdGhpcyB3aWRnZXQgaXMgdGhlIGFjdGl2ZSAoZm9jdXNlZCkgXHJcbiAgICAjIG9uZS4gKGJvb2xlYW4pXHJcbiAgICBAYWN0aXZlICAgICAgICAgICAgICAgPSBub1xyXG4gICAgIyBGbGFnIGluZGljYXRpbmcgd2hldGhlciBhIGJsdXIgZXZlbnQgb24gdGhlIHNlYXJjaCBmaWVsZCB3YXMgY2F1c2VkIGJ5IFxyXG4gICAgIyBhIGNsaWNrIG9uIGFub3RoZXIgcGFydCBvZiB0aGUgd2lkZ2V0LiBUaGUgYmx1ciBldmVudCBoYW5kbGVyIHVzZXMgdGhpcyBcclxuICAgICMgaW5mb3JtYXRpb24gdG8ga25vdyB3aGV0aGVyIGl0IHNob3VsZCByZWFsbHkgZmlyZSBhIGJsdXIgZXZlbnQgKGl0IFxyXG4gICAgIyBzaG91bGQgbm90IGlmIHRoZSBibHVyIHdhcyBjYXVzZWQgYnkgY2xpY2tpbmcgb24gYW5vdGhlciBwYXJ0IG9mIHRoZSBcclxuICAgICMgd2lkZ2V0KS4gKGJvb2xlYW4pXHJcbiAgICBAY2xpY2tlZCAgICAgICAgICAgICAgPSBub1xyXG4gICAgIyBGbGFnIGluZGljYXRpbmcgd2hldGhlciB0aGUgZHJvcC1kb3duIGJveCBpcyB2aXNpYmxlLiAoYm9vbGVhbilcclxuICAgIEBvcGVuICAgICAgICAgICAgICAgICA9IG5vXHJcbiAgICAjIEZsYWcgdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgYmFja3NwYWNlIGtleSBoYXMgYWxyZWFkeSBiZWVuIFxyXG4gICAgIyByZWdpc3RlcmVkIG9uY2UgZm9yIGEgbXVsdGktc2VsZWN0IHNlbGVjdGlvbi4gQSBzZWNvbmQgcHJlc3Mgb2YgdGhhdCBcclxuICAgICMga2V5IHdoaWxlIHRoaXMgZmxhZyBpcyB0cnVlIHJlc3VsdHMgaW4gdGhhdCBzZWxlY3Rpb24ncyBkZXN0cnVjdGlvbi4gXHJcbiAgICAjIChib29sZWFuKVxyXG4gICAgQGRlc3RydWN0aW9uLXBlbmRpbmcgID0gbm9cclxuXHJcbiAgICAjIFRoZSBvcHRpb24gdGhhdCBpcyBoaWdobGlnaHRlZCB2aWEgbW91c2VvdmVyIG9yIGtleSBjbGljay4gKGpRdWVyeSBcclxuICAgICMgb2JqZWN0KVxyXG4gICAgQGhpZ2hsaWdodGVkLW9wdGlvbiAgID0gbnVsbFxyXG4gICAgIyBUaGUgb3B0aW9uIHRoYXQgaXMgdGhlIGN1cnJlbnQgc2VsZWN0aW9uLiBTaW5nbGUtc2VsZWN0IG9ubHkuIChqUXVlcnkgXHJcbiAgICAjIG9iamVjdClcclxuICAgIEBzZWxlY3RlZC1vcHRpb24gICAgICA9IG51bGxcclxuXHJcbiAgICAjIFRoZSBudW1iZXIgb2Ygc2VsZXRpb25zIHRoYXQgaGF2ZSBiZWVuIG1hZGUuIE11bHRpLXNlbGVjdCBvbmx5LiAobnVtYmVyKVxyXG4gICAgQHNlbGVjdGlvbnMgICAgICAgICAgID0gMFxyXG4gICAgIyBUaGUgd2lkdGggb2YgdGhlIHdpZGdldC4gVGhpcyBpcyBiYXNlZCBvbiB0aGUgd2lkdGggb2YgdGhlIHVuZGVybHlpbmcgXHJcbiAgICAjIGVsZW1lbnQuIChudW1iZXIpXHJcbiAgICBAd2lkdGggICAgICAgICAgICAgICAgPSBAb3B0aW9ucy53aWR0aCBvciBAZWxlbWVudC5vdXRlci13aWR0aCFcclxuXHJcbiAgICAjIFRoZSBjdXJyZW50IHZhbHVlIGlzIGRpZmZlcmVudCBmcm9tIHRoZSBzZWxlY3RlZCBvcHRpb24uIFRoZSBsYXR0ZXIgaXMgXHJcbiAgICAjIGEgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIG9wdGlvbiAoYW4gPGE+IGVsZW1lbnQpIHRoYXQgd2FzIFxyXG4gICAgIyBzZWxlY3RlZC4gVGhpcyBpcyBpbnN0ZWFkIG9uZSBvZiB0aGUgZWxlbWVudHMgb2YgdGhlIG1vZGVsLCBhIHBsYWluIFxyXG4gICAgIyBvYmplY3QgY29udGFpbmluZyB0aGUgdmFsdWUsIHRleHQsIGh0bWwsIGNsYXNzZXMsIHN0eWxlLCBhbmQgc2VsZWN0ZWQgXHJcbiAgICAjIGFuZCBkaXNhYmxlZCBwcm9wZXJ0aWVzIG9mIHRoZSBzZWxlY3RlZCBlbGVtZW50LiAoc2luZ2xlLXNlbGVjdDogcGxhaW4gXHJcbiAgICAjIG9iamVjdCwgbXVsdGktc2VsZWN0OiBhcnJheSBvZiBwbGFpbiBvYmplY3RzKVxyXG4gICAgQGN1cnJlbnQtdmFsdWUgICAgICAgID0gaWYgQG11bHRpcGxlIHRoZW4gW10gZWxzZSBudWxsXHJcblxyXG4gICAgIyBUaGUgSUQgb2YgdGhlIGNvbnRhaW5lci4gSWYgdGhlcmUgd2FzIGFuIElEIG9uIHRoZSBlbGVtZW50IHRoYXQgdGhpcyBcclxuICAgICMgd2lkZ2V0IHdhcyBhc3NpZ25lZCB0bywgaXQncyB1c2VkIGluIGNyZWF0aW5nIHRoZSBjb250YWluZXIgSUQuIElmIFxyXG4gICAgIyB0aGVyZSBpcyBub3QsIHRoZSBiYXNlIG9mIHRoZSBJRCBjb25zaXN0cyBvZiA2IHJhbmRvbSBhbHBoYW51bWVyaWMgXHJcbiAgICAjIGNoYXJhY3RlcnMuIChzdHJpbmcpXHJcbiAgICBAY29udGFpbmVyLWlkICAgICAgICAgPSAoaWYgQGVsZW1lbnQuYXR0ciBcXGlkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbiBAZWxlbWVudC5hdHRyIFxcaWQgLnJlcGxhY2UgL1teXFx3XS9nIFxcLVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgQF9nZW5lcmF0ZS1jb250YWluZXItaWQhKSArIFxcLXNlbGVjdHBsdXNcclxuXHJcbiAgICAjIFRoZSByb290IGVsZW1lbnQgb2YgdGhlIHdpZGdldCwgY29udGFpbmluZyBhbGwgb3RoZXIgZWxlbWVudHMuIChqUXVlcnkgXHJcbiAgICAjIG9iamVjdClcclxuICAgIEBjb250YWluZXIgICAgICAgICAgICA9IG51bGxcclxuICAgICMgVGhlIGNvbnRhaW5lciBlbGVtZW50IGZvciB0aGUgZHJvcGRvd24gcG9ydGlvbiBvZiB0aGUgd2lkZ2V0LCBcclxuICAgICMgY29udGFpbmluZyBhbGwgb2YgdGhlIG9wdGlvbnMuIChqUXVlcnkgb2JqZWN0KVxyXG4gICAgQGRyb3Bkb3duICAgICAgICAgICAgID0gbnVsbFxyXG4gICAgIyBUaGUgY29udGFpbmVyIGZvciB0aGUgb3B0aW9ucyB0aGF0IGNhbiBiZSBjaG9zZW4gZnJvbS4gKGpRdWVyeSBvYmplY3QpXHJcbiAgICBAc2VsZWN0LW9wdGlvbnMgICAgICAgPSBudWxsXHJcbiAgICAjIFRoZSBjb250YWluZXIgZWxlbWVudCBmb3IgdGhlIHNlYXJjaCBmaWVsZCBhbmQgdGhlIHNlbGVjdGlvbnMgdGhhdCBoYXZlIFxyXG4gICAgIyBiZWVuIG1hZGUuIE5vdGUgdGhhdCB0aGlzIGFsd2F5cyBleGlzdHM7IGl0J3MgbWVyZWx5IGhpZGRlbiBpbiBhIFxyXG4gICAgIyBub25zZWFyY2hhYmxlIHdpZGdldC4gKGpRdWVyeSBvYmplY3QpXHJcbiAgICBAc2VhcmNoLWNvbnRhaW5lciAgICAgPSBudWxsXHJcbiAgICAjIFRoZSBhY3R1YWwgc2VhcmNoIGlucHV0IGNvbnRyb2wuIChqUXVlcnkgb2JqZWN0KVxyXG4gICAgQHNlYXJjaC1maWVsZCAgICAgICAgID0gbnVsbFxyXG4gICAgIyBUaGUgZWxlbWVudCB0aGF0IGluZGljYXRlcyB3aGF0IG9wdGlvbihzKSBoYXMgKGhhdmUpIGJlZW4gc2VsZWN0ZWQuIFxyXG4gICAgIyAoalF1ZXJ5IG9iamVjdClcclxuICAgIEBzZWxlY3Rpb24gICAgICAgICAgICA9IG51bGxcclxuXHJcbiAgICAjIEFjdGlvbnMgdGhhdCBmaXJlIHdoZW4gdGhlIGNvbnRhaW5lciBpcyBjbGlja2VkLCB0aGUgZG9jdW1lbnQgaXMgXHJcbiAgICAjIGNsaWNrZWQsIGFuZCB0aGUgYmFja3NwYWNlIGtleSBpcyBwcmVzc2VkLiBUaGVzZSBhcmUganVzdCByZS11c2FibGUgXHJcbiAgICAjIGV2ZW50IGhhbmRsZXJzLCBjcmVhdGVkIGVpdGhlciBiZWNhdXNlIGEgaGFuZGxlciBpcyB1c2VkIGluIG1vcmUgdGhhbiBcclxuICAgICMgb25lIHBsYWNlIG9yICBiZWNhdXNlIGl0J3MgcmVjdXJzaXZlLlxyXG4gICAgQGNvbnRhaW5lci1jbGljay1hY3Rpb24gICAgID0gbnVsbFxyXG4gICAgQGRvY3VtZW50LWNsaWNrLWFjdGlvbiAgICAgID0gbnVsbFxyXG4gICAgQGJhY2tzcGFjZS1hY3Rpb24gICAgICAgICAgID0gbnVsbFxyXG5cclxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAgICMgSFRNTCBDUkVBVElPTlxyXG5cclxuICAgIGNvbnRhaW5lci1jbGFzc2VzID0gPFsgdWktd2lkZ2V0IGJhci1zcCBdPlxyXG4gICAgY29udGFpbmVyLWNsYXNzZXMucHVzaCBcXGJhci1zcC0gKyAoaWYgQG11bHRpcGxlIHRoZW4gXFxtdWx0aSBlbHNlIFxcc2luZ2xlKVxyXG4gICAgY29udGFpbmVyLWNsYXNzZXMucHVzaCBAZWxlbWVudC5hdHRyIFxcY2xhc3MgaWYgQG9wdGlvbnMuaW5oZXJpdCBhbmQgJC50cmltIEBlbGVtZW50LmF0dHIgXFxjbGFzcyAubGVuZ3RoXHJcbiAgICBjb250YWluZXItY2xhc3Nlcy5wdXNoIFxcYmFyLXNwLXJ0bCBpZiBAb3B0aW9ucy5ydGxcclxuXHJcbiAgICBjb250YWluZXItcHJvcHMgPVxyXG4gICAgICBpZDogQGNvbnRhaW5lci1pZFxyXG4gICAgICBjbGFzczogY29udGFpbmVyLWNsYXNzZXMgKiAnICdcclxuICAgICAgc3R5bGU6IFwid2lkdGg6I3tAd2lkdGh9cHg7XCJcclxuICAgICAgdGl0bGU6IEBlbGVtZW50LmF0dHIgXFx0aXRsZVxyXG4gICAgXHJcbiAgICBAY29udGFpbmVyID0gJCBcXDxkaXY+IGNvbnRhaW5lci1wcm9wc1xyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIEBjb250YWluZXIuaHRtbCAgXCI8dWwgY2xhc3M9XFxcInVpLWNvcm5lci1hbGwgYmFyLXNwLXNlbGVjdGlvbnNcXFwiIHRhYmluZGV4PVxcXCItMVxcXCIgcm9sZT1cXFwiY29tYm9ib3hcXFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtYWN0aXZlZGVzY2VuZGFudD1cXFwiXFxcIiBhcmlhLW93bnM9XFxcIiN7QGNvbnRhaW5lci1pZH0tZHJvcFxcXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxsaSBjbGFzcz1cXFwiYmFyLXNwLXNlYXJjaFxcXCIgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCIje0BvcHRpb25zLmRlZmF1bHQtdGV4dH1cXFwiIGNsYXNzPVxcXCJiYXItc3AtZGVmYXVsdFxcXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b2NvbXBsZXRlPVxcXCJvZmZcXFwiIHJvbGU9XFxcInRleHRib3hcXFwiPjwvbGk+PC91bD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cXFwiI3tAY29udGFpbmVyLWlkfS1kcm9wXFxcIiBjbGFzcz1cXFwidWktd2lkZ2V0LWNvbnRlbnQgdWktZnJvbnQgdWktbWVudSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB1aS1jb3JuZXItYm90dG9tIHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZSBiYXItc3AtZHJvcFxcXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cXFwiYmFyLXNwLW9wdGlvbnNcXFwiIHJvbGU9XFxcImxpc3Rib3hcXFwiIGFyaWEtbGl2ZT1cXFwicG9saXRlXFxcIiB0YWJpbmRleD1cXFwiLTFcXFwiPjwvdWw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlwiXHJcbiAgICBlbHNlXHJcbiAgICAgIEBjb250YWluZXIuaHRtbCAgXCI8YSBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMClcXFwiIGNsYXNzPVxcXCJ1aS13aWRnZXQgdWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYWxsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGJhci1zcC1zZWxlY3Rpb25cXFwiIHRhYmluZGV4PVxcXCItMVxcXCIgcm9sZT1cXFwiY29tYm9ib3hcXFwiIGFyaWEtYWN0aXZlZGVzY2VuZGFudD1cXFwiXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcInVpLXByaW9yaXR5LXNlY29uZGFyeVxcXCI+I3tAb3B0aW9ucy5kZWZhdWx0LXRleHR9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ1aS1pY29uIHVpLWljb24tdHJpYW5nbGUtMS1zXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPjwvZGl2PjwvYT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwidWktd2lkZ2V0LWNvbnRlbnQgdWktZnJvbnQgdWktbWVudSB1aS1jb3JuZXItYm90dG9tIHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBiYXItc3AtZHJvcFxcXCIgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmFyLXNwLXNlYXJjaFxcXCIgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIGNsYXNzPVxcXCJ1aS1jb3JuZXItYWxsXFxcIiBhdXRvY29tcGxldGU9XFxcIm9mZlxcXCIgcm9sZT1cXFwidGV4dGJveFxcXCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cXFwiYmFyLXNwLW9wdGlvbnNcXFwiIHJvbGU9XFxcImxpc3Rib3hcXFwiIGFyaWEtbGl2ZT1cXFwicG9saXRlXFxcIiB0YWJpbmRleD1cXFwiLTFcXFwiLz48L2Rpdj5cIlxyXG5cclxuICAgIEBlbGVtZW50LmhpZGUhYWZ0ZXIgQGNvbnRhaW5lclxyXG5cclxuICAgIEBkcm9wZG93biA9IEBjb250YWluZXIuZmluZCBcXGRpdi5iYXItc3AtZHJvcCAuZmlyc3QhXHJcbiAgICBkZC13aWR0aCA9IEB3aWR0aCAtIEBfZ2V0LWJvcmRlci1hbmQtc2lkZS13aWR0aCBAZHJvcGRvd25cclxuICAgIEBkcm9wZG93bi5jc3Mgd2lkdGg6IGRkLXdpZHRoICsgXFxweFxyXG5cclxuICAgIEBzZWFyY2gtZmllbGQgPSBAY29udGFpbmVyLmZpbmQgXFxpbnB1dCAuZmlyc3QhXHJcbiAgICBAc2VsZWN0LW9wdGlvbnMgPSBAY29udGFpbmVyLmZpbmQgXFx1bC5iYXItc3Atb3B0aW9ucyAuZmlyc3QhXHJcblxyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIEBzZWFyY2gtY29udGFpbmVyID0gQGNvbnRhaW5lci5maW5kIFxcbGkuYmFyLXNwLXNlYXJjaCAuZmlyc3QhXHJcbiAgICAgIEBzZWxlY3Rpb24gPSBAY29udGFpbmVyLmZpbmQgXFx1bC5iYXItc3Atc2VsZWN0aW9ucyAuZmlyc3QhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZWFyY2gtY29udGFpbmVyID0gQGNvbnRhaW5lci5maW5kIFxcZGl2LmJhci1zcC1zZWFyY2ggLmZpcnN0IVxyXG4gICAgICBAc2VsZWN0aW9uID0gQGNvbnRhaW5lci5maW5kIFxcYS5iYXItc3Atc2VsZWN0aW9uIC5maXJzdCFcclxuXHJcbiAgICAkLmVhY2ggQGVsZW1lbnQuYXR0ciEsIChuYW1lLCB2YWx1ZSkgIX4+IEBzZWxlY3Rpb24uYXR0ciBuYW1lLCB2YWx1ZSBpZiAvXmFyaWEtLyBpcyBuYW1lXHJcblxyXG4gICAgQF9yZXNpemUtc2VhcmNoLWZpZWxkIVxyXG4gICAgQF9idWlsZC1vcHRpb25zIVxyXG4gICAgQF9zZXQtdGFiLWluZGV4IVxyXG5cclxuICAgICMgVHJpZ2dlciByZXNpemUgd2hlbiB0aGUgY29udHJvbCBpcyBmaXJzdCBidWlsdCB0byBpbmRpY2F0ZSBpbml0aWFsIHNpemVcclxuICAgIEBfdHJpZ2dlciBcXHJlc2l6ZSwgbnVsbCxcclxuICAgICAgaXRlbTogQHNlbGVjdGlvblxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIGhlaWdodDogQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgICAgd2lkdGg6IEBzZWxlY3Rpb24ub3V0ZXItd2lkdGghXHJcblxyXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICAgIyBFVkVOVCBIQU5ETEVSIE9CSkVDVFNcclxuXHJcbiAgICAjIEJhc2ljIGNsaWNrIGFjdGlvbiBmb3IgdGhlIGNvbnRhaW5lciBhcyBhIHdob2xlLCB3aGljaCBiYXNpY2FsbHkganVzdCBcclxuICAgICMgY2xlYW5zIHRoaW5ncyB1cCBhbmQgb3BlbnMgdGhlIGRyb3Bkb3duLlxyXG4gICAgQGNvbnRhaW5lci1jbGljay1hY3Rpb24gPSAoZXZlbnQpICF+PlxyXG4gICAgICBldmVudC5wcmV2ZW50LWRlZmF1bHQhXHJcbiAgICAgIGlmIG5vdCBAb3B0aW9ucy5kaXNhYmxlZFxyXG4gICAgICAgIGRlc2VsZWN0ID0gaWYgZXZlbnQ/IHRoZW4gJCBldmVudC50YXJnZXQgLmhhcy1jbGFzcyBcXGJhci1zcC1kZXNlbGVjdCBlbHNlIGZhbHNlXHJcbiAgICAgICAgaWYgbm90IEBtdWx0aXBsZSBhbmQgZGVzZWxlY3RcclxuICAgICAgICAgIEBfcmVzZXQtb3B0aW9ucyBldmVudFxyXG4gICAgICAgIGVsc2UgaWYgQG11bHRpcGxlIGFuZCBAZGVzdHJ1Y3Rpb24tcGVuZGluZ1xyXG4gICAgICAgICAgQGRlc3RydWN0aW9uLXBlbmRpbmcgPSBub1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGlmIG5vdCBAYWN0aXZlXHJcbiAgICAgICAgICAgIEBzZWFyY2gtZmllbGQudmFsICcnIGlmIEBtdWx0aXBsZVxyXG4gICAgICAgICAgICAkIGRvY3VtZW50IC5jbGljayBAZG9jdW1lbnQtY2xpY2stYWN0aW9uXHJcbiAgICAgICAgICAgIEBfb3Blbi1kcm9wZG93biFcclxuICAgICAgICAgIGVsc2UgaWYgbm90IEBtdWx0aXBsZSBhbmQgZXZlbnQ/IGFuZCAoZXZlbnQudGFyZ2V0IGlzIEBzZWxlY3Rpb24uMCBvciBcXFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkIGV2ZW50LnRhcmdldCAucGFyZW50cyBcXGEuYmFyLXNwLXNlbGVjdGlvbiAubGVuZ3RoKVxyXG4gICAgICAgICAgICBAX3RvZ2dsZS1kcm9wZG93biFcclxuICAgICAgICAgIEBfYWN0aXZhdGUtd2lkZ2V0IGV2ZW50XHJcblxyXG4gICAgIyBUaGlzIG1vdXNld2hlZWwgYWN0aW9uIGlzIHdoYXQgZW11bGF0ZXMgc2VsZWN0LWNvbnRyb2wtbGlrZSBzY3JvbGxpbmcgXHJcbiAgICAjIGZvciB0aGUgd2lkZ2V0LiBSZWd1bGFybHksIG9uY2UgdGhlIHRvcCBvciBib3R0b20gb2YgdGhlIGRyb3Bkb3duIHdhcyBcclxuICAgICMgcmVhY2hlZCBhbmQgc2Nyb2xsaW5nIGNvbnRpbnVlZCwgdGhlIHNjcm9sbCBldmVudCB3b3VsZCBidWJibGUgdG8gdGhlIFxyXG4gICAgIyB3aW5kb3cgYW5kIG1ha2UgdGhlIHBhZ2UgYXMgYSB3aG9sZSBzY3JvbGwuIFRoaXMgYWN0aW9uIHN0b3BzIHRoZSBcclxuICAgICMgc2Nyb2xsaW5nIGFuZCBwcmV2ZW50cyBidWJibGluZyB3aGVuIHRoZSBkcm9wZG93biBpcyBhdCB0aGUgdG9wIG9yIHRoZSBcclxuICAgICMgYm90dG9tLlxyXG4gICAgQG1vdXNld2hlZWwtYWN0aW9uID0gKGV2ZW50KSAhfj5cclxuICAgICAgb3JpZy1ldmVudCA9IGV2ZW50Lm9yaWdpbmFsLWV2ZW50XHJcbiAgICAgIGRlbHRhID0gaWYgb3JpZy1ldmVudC5kZXRhaWwgPCAwIG9yIG9yaWctZXZlbnQud2hlZWwtZGVsdGEgPiAwIHRoZW4gMSBlbHNlIC0xXHJcbiAgICAgIGlmIGRlbHRhID4gMCBhbmQgQHNlbGVjdC1vcHRpb25zLnNjcm9sbC10b3AhIGlzIDBcclxuICAgICAgICBldmVudC5wcmV2ZW50LWRlZmF1bHQhXHJcbiAgICAgIGVsc2UgaWYgZGVsdGEgPCAwIGFuZCBcXFxyXG4gICAgICAgICAgQHNlbGVjdC1vcHRpb25zLnNjcm9sbC10b3AhIGlzIEBzZWxlY3Qtb3B0aW9ucy5nZXQgMCAuc2Nyb2xsLWhlaWdodCAtIEBzZWxlY3Qtb3B0aW9ucy5pbm5lci1oZWlnaHQhXHJcbiAgICAgICAgZXZlbnQucHJldmVudC1kZWZhdWx0IVxyXG5cclxuICAgICMgRGVmYXVsdCBjbGljayBhY3Rpb24gb24gdGhlIGVudGlyZSBkb2N1bWVudC4gSXQgY2hlY2tzIHRvIHNlZSB3aGV0aGVyIFxyXG4gICAgIyB0aGUgbW91c2UgaXMgb3ZlciB0aGUgY29udHJvbCwgY2xvc2luZyBhbiBvcGVuIGNvbnRyb2wgaWYgaXQgaXNuJ3QuXHJcbiAgICBAZG9jdW1lbnQtY2xpY2stYWN0aW9uID0gKGV2ZW50KSAhfj5cclxuICAgICAgaWYgJCBldmVudC50YXJnZXQgLnBhcmVudHMgXCIjI3tAY29udGFpbmVyLWlkfVwiIC5sZW5ndGggdGhlbiBAYWN0aXZlID0geWVzXHJcbiAgICAgIGVsc2UgQF9kZWFjdGl2YXRlLXdpZGdldCBldmVudFxyXG5cclxuICAgICMgVHJhY2tzIHdoZXRoZXIgYmFja3NwYWNlIGhhcyBhbHJlYWR5IGJlZW4gcHJlc3NlZCBhbmQgb25seSBkZXNlbGVjdHMgYW4gXHJcbiAgICAjIG9wdGlvbiBpZiBpdCBoYXMuIFRoaXMgaW1wbGVtZW50cyB0aGUgdHdvLXN0ZXAgZGVzZWxlY3Rpb24gcHJvY2VzcyB0aGF0IFxyXG4gICAgIyBrZWVwcyBvcHRpb25zIGZyb20gYmVpbmcgZGVzZWxlY3RlZCBhY2NpZGVudGFsbHkgZm9yIGhpdHRpbmcgdGhlIFxyXG4gICAgIyBiYWNrc3BhY2Uga2V5IG9uZSB0b28gbWFueSB0aW1lcy5cclxuICAgIEBiYWNrc3BhY2UtYWN0aW9uID0gKGV2ZW50KSAhLT5cclxuICAgICAgaWYgQHBlbmRpbmctZGVzZWxlY3Rpb25cclxuICAgICAgICBwb3MgPSBAX2dldC1tb2RlbC1pbmRleCBAcGVuZGluZy1kZXNlbGVjdGlvblxyXG4gICAgICAgIEBfZGVzZWxlY3Qtb3B0aW9uIGV2ZW50LCAkIFwiIyN7QF9nZW5lcmF0ZS1kb20taWQgXFxvcHRpb24gcG9zfVwiXHJcbiAgICAgICAgQF9jbGVhci1iYWNrc3BhY2UhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBuZXh0LWF2YWlsYWJsZSA9IEBzZWFyY2gtY29udGFpbmVyLnNpYmxpbmdzIFxcbGkuYmFyLXNwLXNlbGVjdGlvbiAubGFzdCFcclxuICAgICAgICBpZiBuZXh0LWF2YWlsYWJsZS5sZW5ndGggYW5kIG5vdCBuZXh0LWF2YWlsYWJsZS5oYXMtY2xhc3MgXFx1aS1zdGF0ZS1kaXNhYmxlZFxyXG4gICAgICAgICAgQHBlbmRpbmctZGVzZWxlY3Rpb24gPSBuZXh0LWF2YWlsYWJsZVxyXG4gICAgICAgICAgaWYgQG9wdGlvbnMucXVpY2stZGVzZWxlY3RcclxuICAgICAgICAgICAgQGJhY2tzcGFjZS1hY3Rpb24gZXZlbnRcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgQHBlbmRpbmctZGVzZWxlY3Rpb24uYWRkLWNsYXNzIFxcdWktc3RhdGUtZm9jdXNcclxuXHJcbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgICAjIEVWRU5UIFRSSUdHRVIgU0VUVVBcclxuXHJcbiAgICAjIEV2ZW50IGhhbmRsZXJzIGZvciB0aGUgY29udGFpbmVyIGluIGdlbmVyYWwuIEFzIG9uZSBtaWdodCBleHBlY3QsIHRoZXNlIFxyXG4gICAgIyBhcmUgdmVyeSBnZW5lcmFsLCBoYW5kbGluZyBvbmx5IG1vdXNlb3ZlciBldmVudHMgYW5kIHRoZSBzdGF0dXMgZmxhZyBcclxuICAgICMgdGhhdCBoZWxwcyB0byBjb250cm9sIGZvY3VzLiBUaGUgZmluYWwgb25lIGlzIGEgbW91c2V3aGVlbCBoYW5kbGVyIHRvXHJcbiAgICAjIGNoZWNrIHRvIHNlZSB3aGV0aGVyIHRoZSB3aW5kb3cgc2Nyb2xsIHNob3VsZCBiZSBwcmV2ZW50ZWQgKHdoaWxlIFxyXG4gICAgIyBzY3JvbGxpbmcgb3ZlciBhIHdpZGdldCkuXHJcbiAgICBAX29uIEBjb250YWluZXIsXHJcbiAgICAgIGNsaWNrOiBAY29udGFpbmVyLWNsaWNrLWFjdGlvblxyXG4gICAgICBtb3VzZXdoZWVsOiBAbW91c2V3aGVlbC1hY3Rpb25cclxuICAgICAgRE9NTW91c2VTY3JvbGw6IEBtb3VzZXdoZWVsLWFjdGlvblxyXG4gICAgICBNb3pNb3VzZVBpeGVsU2Nyb2xsOiBAbW91c2V3aGVlbC1hY3Rpb25cclxuICAgICAgbW91c2Vkb3duOiAhfj4gQGNsaWNrZWQgPSB5ZXNcclxuICAgICAgbW91c2V1cDogIX4+IEBjbGlja2VkID0gbm9cclxuICAgICAgbW91c2VlbnRlcjogIX4+IEBzZWxlY3Rpb24uYWRkLWNsYXNzIFxcdWktc3RhdGUtaG92ZXIgaWYgbm90IEBvcGVuIGFuZCBub3QgQG11bHRpcGxlXHJcbiAgICAgIG1vdXNlbGVhdmU6ICF+PiBAc2VsZWN0aW9uLnJlbW92ZS1jbGFzcyBcXHVpLXN0YXRlLWhvdmVyIGlmIG5vdCBAbXVsdGlwbGVcclxuXHJcbiAgICAjIEV2ZW50IGhhbmRsZXJzIGZvciB0aGUgb3B0aW9ucy4gVGhpcyBhbHNvIGhhbmRsZXMgbW91c2VvdmVyIGV2ZW50cyBcclxuICAgICMgKGhpZ2hsaWdodGluZyksIGJ1dCBpdCBhbHNvIGhhbmRsZXMgdGhlIGFjdHVhbCBzZWxlY3Rpb24gb2Ygb3B0aW9ucyBcclxuICAgICMgd2l0aCBtb3VzZSBjbGlja3MuXHJcbiAgICBAX29uIEBzZWxlY3Qtb3B0aW9ucyxcclxuICAgICAgY2xpY2s6IChldmVudCkgIX4+XHJcbiAgICAgICAgZXZlbnQtdGFyZ2V0ID0gJCBldmVudC50YXJnZXRcclxuICAgICAgICB0YXJnZXQgPSBpZiBldmVudC10YXJnZXQgLmhhcy1jbGFzcyBcXGJhci1zcC1vcHRpb25cclxuICAgICAgICAgICAgICAgICB0aGVuIGV2ZW50LXRhcmdldFxyXG4gICAgICAgICAgICAgICAgIGVsc2UgZXZlbnQtdGFyZ2V0LnBhcmVudHMgXFwuYmFyLXNwLW9wdGlvbiAuZmlyc3QhXHJcbiAgICAgICAgaWYgdGFyZ2V0Lmxlbmd0aFxyXG4gICAgICAgICAgQGhpZ2hsaWdodGVkLW9wdGlvbiA9IHRhcmdldFxyXG4gICAgICAgICAgQF9zZWxlY3Qtb3B0aW9uIGV2ZW50LCB0YXJnZXRcclxuICAgICAgICAgIEBzZWFyY2gtZmllbGQuZm9jdXMhXHJcbiAgICAgIG1vdXNlb3ZlcjogKGV2ZW50KSAhfj5cclxuICAgICAgICBldmVudC10YXJnZXQgPSAkIGV2ZW50LnRhcmdldFxyXG4gICAgICAgIHRhcmdldCA9IGlmIGV2ZW50LXRhcmdldCAuaGFzLWNsYXNzIFxcYmFyLXNwLW9wdGlvblxyXG4gICAgICAgICAgICAgICAgIHRoZW4gZXZlbnQtdGFyZ2V0XHJcbiAgICAgICAgICAgICAgICAgZWxzZSBldmVudC10YXJnZXQucGFyZW50cyBcXC5iYXItc3Atb3B0aW9uIC5maXJzdCFcclxuICAgICAgICBAX2hpZ2hsaWdodC1vcHRpb24gdGFyZ2V0IGlmIHRhcmdldC5sZW5ndGhcclxuICAgICAgbW91c2VvdXQ6IChldmVudCkgIX4+XHJcbiAgICAgICAgZXZlbnQtdGFyZ2V0ID0gJCBldmVudC50YXJnZXRcclxuICAgICAgICBpZiBldmVudC10YXJnZXQgLmhhcy1jbGFzcyBcXGJhci1zcC1vcHRpb24gb3IgZXZlbnQtdGFyZ2V0IC5wYXJlbnRzIFxcLmJhci1zcC1vcHRpb24gLmxlbmd0aFxyXG4gICAgICAgICAgQF9jbGVhci1oaWdobGlnaHQhXHJcblxyXG4gICAgIyBFdmVudCBoYW5kbGVycyBvbiB0aGUgc2VhcmNoIGZpZWxkLiBTaW5jZSB0aGlzIGlzIHRoZSBlbGVtZW50IHRoYXQgaXMgXHJcbiAgICAjIGFzc2lnbmVkIHRoZSAocG9zaXRpdmUpIHRhYmluZGV4LCB0aGlzIGVsZW1lbnQgaXMgcmVzcG9uc2libGUgZm9yIGZvY3VzIFxyXG4gICAgIyBhbmQgYmx1ciBmb3IgdGhlIGVudGlyZSB3aWRnZXQsIHdoaWNoIGlzIGhhbmRsZWQgaGVyZS4gQWxzbywga2V5cHJlc3NlcyBcclxuICAgICMgYXJlIGhhbmRsZWQgaGVyZSwgc2luY2UgYXMgbG9uZyBhcyB0aGUgd2lkZ2V0IGlzIGFjdGl2ZSwga2V5Ym9hcmQgaW5wdXQgXHJcbiAgICAjIGlzIHNlbnQgaGVyZS5cclxuICAgIEBfb24gQHNlYXJjaC1maWVsZCxcclxuICAgICAgYmx1cjogKGV2ZW50KSAhfj5cclxuICAgICAgICBpZiBub3QgQGNsaWNrZWRcclxuICAgICAgICAgIEBfdHJpZ2dlciBcXGJsdXIsIGV2ZW50LCBpdGVtOiBAY29udGFpbmVyXHJcbiAgICAgICAgICBAX2RlYWN0aXZhdGUtd2lkZ2V0IGV2ZW50XHJcbiAgICAgIGZvY3VzOiAoZXZlbnQpICF+PiBcclxuICAgICAgICB1bmxlc3MgQGFjdGl2ZVxyXG4gICAgICAgICAgQF9hY3RpdmF0ZS13aWRnZXQgZXZlbnRcclxuICAgICAgICAgIEBfc2V0LXNlYXJjaC1maWVsZC1kZWZhdWx0IVxyXG4gICAgICAgICAgQF90cmlnZ2VyIFxcZm9jdXMsIGV2ZW50LCBpdGVtOiBAY29udGFpbmVyXHJcbiAgICAgIGtleWRvd246IChldmVudCkgIX4+XHJcbiAgICAgICAgaWYgbm90IEBvcHRpb25zLmRpc2FibGVkXHJcbiAgICAgICAgICBrZXktY29kZSA9IGV2ZW50LndoaWNoID8gZXZlbnQua2V5LWNvZGVcclxuICAgICAgICAgIEBfcmVzaXplLXNlYXJjaC1maWVsZCFcclxuXHJcbiAgICAgICAgICBAX2NsZWFyLWJhY2tzcGFjZSEgaWYga2V5LWNvZGUgaXMgbm90IDggYW5kIEBwZW5kaW5nLWRlc2VsZWN0aW9uXHJcblxyXG4gICAgICAgICAgc3dpdGNoIGtleS1jb2RlXHJcbiAgICAgICAgICAgICMgYmFja3NwYWNlLCBvbmx5IHRyYWNrcyB0aGUgbGVuZ3RoIG9mIHRoZSBzZWFyY2ggZmllbGQgdG8ga25vdyBcclxuICAgICAgICAgICAgIyAoaW4ga2V5dXApIHdoZXRoZXIgc3BlY2lhbCBhY3Rpb24gaXMgbmVjZXNzYXJ5XHJcbiAgICAgICAgICAgIGNhc2UgOCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIEBiYWNrc3BhY2UtbGVuZ3RoID0gQHNlYXJjaC1maWVsZC52YWwhIC5sZW5ndGhcclxuICAgICAgICAgICAgIyB0YWIsIHNlbGVjdHMgdGhlIGhpZ2hsaWdodGVkIG9wdGlvbiBpbiBhZGRpdGlvbiB0byBtb3ZpbmcgdG8gXHJcbiAgICAgICAgICAgICMgdGhlIG5leHQgdGFiaW5kZXhlZCBlbGVtZW50IG9uIHRoZSBwYWdlXHJcbiAgICAgICAgICAgIGNhc2UgOVxyXG4gICAgICAgICAgICAgIEBfc2VsZWN0LW9wdGlvbiBldmVudCwgQGhpZ2hsaWdodGVkLW9wdGlvbiBpZiBAb3BlblxyXG4gICAgICAgICAgICAjIGVudGVyLCBzaW1wbHkgcHJldmVudHMgdGhlIGRlZmF1bHQgYWN0aW9uIGZyb20gb2NjdXJpbmcgKHRoZSBcclxuICAgICAgICAgICAgIyByZXBsYWNlbWVudCBhY3Rpb25zIGFyZSBpbiBrZXl1cClcclxuICAgICAgICAgICAgY2FzZSAxM1xyXG4gICAgICAgICAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgICAgICAgIyB1cCBhcnJvdyBhbmQgbGVmdCBhcnJvdywgbW92ZXMgdXAgb25lIG9wdGlvbiBhbmQgaWYgYWxyZWFkeSBhdCBcclxuICAgICAgICAgICAgIyB0aGUgdG9wLCBjbG9zZXMgdGhlIGRyb3Bkb3duXHJcbiAgICAgICAgICAgIGNhc2UgMzcgMzhcclxuICAgICAgICAgICAgICBldmVudC5wcmV2ZW50LWRlZmF1bHQhXHJcbiAgICAgICAgICAgICAgaWYgQG9wZW4gYW5kIEBoaWdobGlnaHRlZC1vcHRpb25cclxuICAgICAgICAgICAgICAgIHByZXYtc2libGluZ3MgPSBAaGlnaGxpZ2h0ZWQtb3B0aW9uLnBhcmVudCFwcmV2LWFsbCAnbGk6bm90KC51aS1oZWxwZXItaGlkZGVuKSdcclxuICAgICAgICAgICAgICAgICAgLmNoaWxkcmVuICdhOm5vdCguYmFyLXNwLW9wdGlvbi1ncm91cCknXHJcbiAgICAgICAgICAgICAgICBpZiBwcmV2LXNpYmxpbmdzLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgICBAX2hpZ2hsaWdodC1vcHRpb24gcHJldi1zaWJsaW5ncy5maXJzdCFcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgQF9jbGVhci1oaWdobGlnaHQhXHJcbiAgICAgICAgICAgICAgICAgIEBfZGVhY3RpdmF0ZS13aWRnZXQgZXZlbnRcclxuICAgICAgICAgICAgIyByaWdodCBhcnJvdyBhbmQgZG93biBhcnJvdywgbW92ZXMgZG93biBvbmUgb3B0aW9uIGFuZCBpZiB0aGUgXHJcbiAgICAgICAgICAgICMgZHJvcGRvd24gaXMgY2xvc2VkLCBvcGVucyBpdFxyXG4gICAgICAgICAgICBjYXNlIDM5IDQwXHJcbiAgICAgICAgICAgICAgaWYgbm90IEBoaWdobGlnaHRlZC1vcHRpb25cclxuICAgICAgICAgICAgICAgIGZpcnN0LWFjdGl2ZSA9IEBzZWxlY3Qtb3B0aW9ucy5maW5kICdsaTpub3QoLnVpLWhlbHBlci1oaWRkZW4pJ1xyXG4gICAgICAgICAgICAgICAgICAuY2hpbGRyZW4gJ2E6bm90KC5iYXItc3Atb3B0aW9uLWdyb3VwKScgLmZpcnN0IVxyXG4gICAgICAgICAgICAgICAgQF9oaWdobGlnaHQtb3B0aW9uIGZpcnN0LWFjdGl2ZSBpZiBmaXJzdC1hY3RpdmUubGVuZ3RoXHJcbiAgICAgICAgICAgICAgZWxzZSBpZiBAb3BlblxyXG4gICAgICAgICAgICAgICAgbmV4dC1zaWJsaW5ncyA9IEBoaWdobGlnaHRlZC1vcHRpb24ucGFyZW50IW5leHQtYWxsICdsaTpub3QoLnVpLWhlbHBlci1oaWRkZW4pJ1xyXG4gICAgICAgICAgICAgICAgICAuY2hpbGRyZW4gJ2E6bm90KC5iYXItc3Atb3B0aW9uLWdyb3VwKSdcclxuICAgICAgICAgICAgICAgIEBfaGlnaGxpZ2h0LW9wdGlvbiBuZXh0LXNpYmxpbmdzLmZpcnN0ISBpZiBuZXh0LXNpYmxpbmdzLmxlbmd0aFxyXG4gICAgICAgICAgICAgIEBfb3Blbi1kcm9wZG93biEgaWYgbm90IEBvcGVuXHJcbiAgICAgIGtleXVwOiAoZXZlbnQpICF+PlxyXG4gICAgICAgIGlmIG5vdCBAb3B0aW9ucy5kaXNhYmxlZFxyXG4gICAgICAgICAga2V5LWNvZGUgPSBldmVudC53aGljaCA/IGV2ZW50LmtleS1jb2RlXHJcbiAgICAgICAgICBzd2l0Y2gga2V5LWNvZGVcclxuICAgICAgICAgICAgIyBiYWNrc3BhY2UsIGVpdGhlciBmaWx0ZXJzIGlmIHRoZXJlIGlzIHN0aWxsIHNlYXJjaCB0ZXh0IGxlZnQsIFxyXG4gICAgICAgICAgICAjIGRlc2VsZWN0cyBvbiBhIHNpbmdsZS1zZWxlY3QgZGVzZWxlY3RhYmxlIHdpZGdldCwgb3IgaGFuZGxlcyBcclxuICAgICAgICAgICAgIyB0aGUgZGVzZWxlY3Rpb24gb2YgbXVsdGktc2VsZWN0IG9wdGlvbnNcclxuICAgICAgICAgICAgY2FzZSA4XHJcbiAgICAgICAgICAgICAgaWYgQG11bHRpcGxlIGFuZCBAYmFja3NwYWNlLWxlbmd0aCA8IDEgYW5kIEBzZWxlY3Rpb25zID4gMFxyXG4gICAgICAgICAgICAgICAgQGJhY2tzcGFjZS1hY3Rpb24gZXZlbnRcclxuICAgICAgICAgICAgICBlbHNlIGlmIG5vdCBAcGVuZGluZy1kZXNlbGVjdGlvblxyXG4gICAgICAgICAgICAgICAgQF9jbGVhci1oaWdobGlnaHQhXHJcbiAgICAgICAgICAgICAgICBpZiBAb3BlblxyXG4gICAgICAgICAgICAgICAgICBAX2ZpbHRlci1vcHRpb25zIVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiBAc2VhcmNoLWZpZWxkLnZhbCEgaXMgbm90ICcnXHJcbiAgICAgICAgICAgICAgICAgIEBfb3Blbi1kcm9wZG93biFcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgbm90IEBtdWx0aXBsZSBhbmQgQHNlbGVjdGlvbi5maW5kIFxcLmJhci1zcC1kZXNlbGVjdCAubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgIEBfcmVzZXQtb3B0aW9ucyBldmVudFxyXG4gICAgICAgICAgICAjIGVudGVyLCBzZWxlY3RzIGFuIG9wdGlvbiBpZiB0aGUgZHJvcGRvd24gaXMgb3Blbiwgb3Igb3BlbnMgaXQgXHJcbiAgICAgICAgICAgICMgaWYgaXQncyBjbG9zZWRcclxuICAgICAgICAgICAgY2FzZSAxM1xyXG4gICAgICAgICAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgICAgICAgICBpZiBAb3BlbiB0aGVuIEBfc2VsZWN0LW9wdGlvbiBldmVudCwgQGhpZ2hsaWdodGVkLW9wdGlvbiBlbHNlIEBfb3Blbi1kcm9wZG93biFcclxuICAgICAgICAgICAgIyBlc2NhcGUsIGNsb3NlcyB0aGUgZHJvcGRvd25cclxuICAgICAgICAgICAgY2FzZSAyN1xyXG4gICAgICAgICAgICAgIEBfY2xvc2UtZHJvcGRvd24hIGlmIEBvcGVuXHJcbiAgICAgICAgICAgICMgdGFiLCBzaGlmdCwgY29udHJvbCwgYWxsIGZvdXIgYXJyb3cga2V5cywgd2luZG93cyBrZXk6IHRoZXNlIFxyXG4gICAgICAgICAgICAjIGhhdmUgbm8gZWZmZWN0IG90aGVyIHRoYW4gdGhlaXIgbm9ybWFsIG9uZXNcclxuICAgICAgICAgICAgY2FzZSA5IDE2IDE3IDM3IDM4IDM5IDQwIDkxID0+XHJcbiAgICAgICAgICAgICMgcHJldHR5IG11Y2ggYW55IHJlZ3VsYXIga2V5c3Ryb2tlIChsZXR0ZXJzLCBudW1iZXJzLCBldGMuKSBcclxuICAgICAgICAgICAgIyBjYXVzZXMgZmlsdGVyaW5nIHRvIGhhcHBlblxyXG4gICAgICAgICAgICBkZWZhdWx0XHJcbiAgICAgICAgICAgICAgaWYgQG9wZW4gdGhlbiBAX2ZpbHRlci1vcHRpb25zISBlbHNlIEBfb3Blbi1kcm9wZG93biFcclxuXHJcbiAgICAjIEV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2VsZWN0aW9uIGFyZWEgb24gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBTaW1wbHkgXHJcbiAgICAjIG9wZW5zIHRoZSBkcm9wZG93biBpZiBhbiBlbXB0eSBhcmVhIChpLmUuLCBvbmUgd2l0aG91dCBhIHNlbGVjdGlvbiBcclxuICAgICMgY29udHJvbCkgaXMgY2xpY2tlZC4gVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSB0aGUgdmlzaWJsZSBwYXJ0IG9mIGEgXHJcbiAgICAjIG11bHRpLXNlbGVjdCB3aWRnZXQgaXMgb25seSBwYXJ0aWFsbHkgY292ZXJlZCBieSB0aGUgc2VhcmNoIGZpZWxkOyB0aGlzIFxyXG4gICAgIyBoYW5kbGVyIGFsbG93cyB0aGUgZHJvcGRvd24gdG8gYmUgb3BlbmVkIGV2ZW4gaWYgYSBwYXJ0IGlzIGNsaWNrZWQgdGhhdCBcclxuICAgICMgZG9lc24ndCBoYXBwZW4gdG8gYmUgdGhlIHNlYXJjaCBmaWVsZC5cclxuICAgIGlmIEBtdWx0aXBsZSB0aGVuIEBfb24gQHNlbGVjdGlvbixcclxuICAgICAgY2xpY2s6IChldmVudCkgIX4+XHJcbiAgICAgICAgZXZlbnQucHJldmVudC1kZWZhdWx0IVxyXG4gICAgICAgIGlmIEBhY3RpdmUgYW5kIFxcXHJcbiAgICAgICAgICAgbm90ICgkIGV2ZW50LnRhcmdldCAuaGFzLWNsYXNzIFxcYmFyLXNwLXNlbGVjdGlvbiBvciBcXFxyXG4gICAgICAgICAgICAgICAgJCBldmVudC50YXJnZXQgLnBhcmVudHMgXFxiYXItc3Atc2VsZWN0aW9uIC5sZW5ndGgpIGFuZCBcXFxyXG4gICAgICAgICAgIG5vdCBAb3BlblxyXG4gICAgICAgICAgQF9vcGVuLWRyb3Bkb3duIVxyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIEVORCBXSURHRVQgQ1JFQVRJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIFdJREdFVCBERVNUUlVDVElPTlxyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMgRGVzdHJveSBpcyBjbGVhbiBpbiB0aGlzIHdpZGdldC4gQ3JlYXRpb24gaXMgc2ltcGx5IHVuZG9uZS4gVGhlIG9sZCBcclxuICAjIHRhYmluZGV4ICh3aGljaCBoYWQgYmVlbiByZW1vdmVkIGZyb20gdGhlIG9yaWdpbmFsIGVsZW1lbnQpIGlzIHJlc3RvcmVkLCBcclxuICAjIHRoZSB3aWRnZXRzIGlzIHJlbW92ZWQsIGFuZCB0aGUgb3JpZ2luYWwgZWxlbWVudCBpcyBzaG93bi4gSW4gdGhlb3J5LCBcclxuICAjIF9jcmVhdGUgYW5kIF9kZXN0cm95IGNhbiBiZSBjYWxsZWQgb3ZlciBhbmQgb3ZlciBhZ2FpbiB3aXRoIHRoZSBzYW1lIFxyXG4gICMgZWZmZWN0IGVhY2ggdGltZS5cclxuICBfZGVzdHJveTogIS0+XHJcbiAgICBAX3JldmVydC10YWItaW5kZXghXHJcbiAgICBAY29udGFpbmVyLnJlbW92ZSFcclxuICAgIEBlbGVtZW50LnNob3chXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFdJREdFVCBERVNDUlVUQ1RJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIFBVQkxJQyBNRVRIT0RTXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBSZXR1cm5zIHRoZSBjdXJyZW50IHZhbHVlIG9mIHRoZSB3aWRnZXQsIG1lYW5pbmcgdGhlIGRhdGEgZWxlbWVudHMgdGhhdCBcclxuICAjIGFyZSBzZWxlY3RlZC4gSW50ZXJuYWwgZmllbGRzIChhbnkgdGhhdCBiZWdpbiB3aXRoIGFuIHVuZGVyc2NvcmUpIGFyZSBcclxuICAjIHJlbW92ZWQgZnJvbSB0aGlzIG91dHB1dCBkYXRhLiBUaGUgZmllbGRzIHZhbHVlLCB0ZXh0LCBodG1sLCBzZWxlY3RlZCwgXHJcbiAgIyBkaXNhYmxlZCwgY2xhc3NlcywgYW5kIHN0eWxlIHdpbGwgYWx3YXlzIGJlIHByZXNlbnQsIGFzIHdpbGwgY3VzdG9tIFxyXG4gICMgZmllbGRzIHRoYXQgd2VyZSBhIHBhcnQgb2YgdGhlIEpTT04gZGF0YS5cclxuICAjXHJcbiAgIyBGb3Igc2luZ2xlLXNlbGVjdCB3aWRnZXRzLCB0aGlzIGlzIGEgcGxhaW4gb2JqZWN0IChvciBudWxsIG9mIG5vIFxyXG4gICMgc2VsZWN0aW9uIGhhcyBiZWVuIG1hZGUpLiBGb3IgbXVsdGktc2VsZWN0IHdpZGdldHMsIGl0IGlzIGFuIGFycmF5IG9mIFxyXG4gICMgc3VjaCBvYmplY3RzICh3aGljaCBpcyBlbXB0eSBpZiBubyBzZWxlY3Rpb24gaGFzIGJlZW4gbWFkZSkuXHJcbiAgI1xyXG4gICMgVGhpcyBpcyBhIHJlYWQtb25seSBtZXRob2QuIEl0IGNhbm5vdCBiZSB1c2VkIHRvIHNldCB0aGUgdmFsdWUsIGluIGxhcmdlIFxyXG4gICMgcGFydCBiZWNhdXNlIG9mIHRoZSBtYW55IGRpZmZlcmVudCB3YXlzIHRoYXQncyBwb3NzaWJsZS4gVG8gc2V0IHZhbHVlcywgXHJcbiAgIyBzZXQgdGhlbSBpbiB0aGUgYmFja2luZyBkYXRhIGl0c2VsZiAoZWl0aGVyIHRoZSBvcmlnaW5hbCBvcHRpb24gZWxlbWVudHMgXHJcbiAgIyBvciB0aGUgSlNPTiBkYXRhIGFycmF5KS4gaWYgdGhpcyBpcyBkb25lIGRpcmVjdGx5IG9uIHRoZSBvcHRpb24gZWxlbWVudHMgXHJcbiAgIyBhbmQgbm90IGJ5IHBhc3NpbmcgbmV3IGRhdGEsIHRoZW4gcmVmcmVzaCB3aWxsIG5lZWQgdG8gYmUgY2FsbGVkIHRvIG1ha2UgXHJcbiAgIyB0aGUgd2lkZ2V0IHVwZGF0ZSAodGhpcyBpcyBkb25lIGF1dG9tYXRpY2FsbHkgd2hlbiBkYXRhIGlzIHNldCkuXHJcbiAgdmFsdWU6IC0+IFxyXG4gICAgfCBAbXVsdGlwbGUgICAgICAgICAgID0+IFtAX3Nhbml0aXplLWl0ZW0gaXRlbSBmb3IgaXRlbSBpbiBAY3VycmVudC12YWx1ZV1cclxuICAgIHwgbm90IEBjdXJyZW50LXZhbHVlICA9PiBudWxsXHJcbiAgICB8IG90aGVyd2lzZSAgICAgICAgICAgPT4gQF9zYW5pdGl6ZS1pdGVtIEBjdXJyZW50LXZhbHVlXHJcblxyXG4gICMgU2ltcGx5IHJldHVybnMgdGhlIHdpZGdldCBpdHNlbGYsIGFzIGEgalF1ZXJ5IG9iamVjdC5cclxuICB3aWRnZXQ6IC0+IEBjb250YWluZXJcclxuXHJcbiAgIyBEaXNhYmxlcyB0aGUgd2lkZ2V0LiBUaGlzIGlzIHRoZSBzYW1lIGFzIGNhbGxpbmcgdGhlIGRpc2FibGVkIG9wdGlvbiB3aXRoIFxyXG4gICMgYSB0cnVlIHZhbHVlLlxyXG4gIGRpc2FibGU6ICEtPlxyXG4gICAgQG9wdGlvbnMuZGlzYWJsZWQgPSB5ZXNcclxuICAgIEBfc2V0LWRpc2FibGVkLXN0YXRlIVxyXG5cclxuICAjIEVuYWJsZWQgdGhlIHdpZGdldC4gVGhpcyBpcyB0aGUgc2FtZSBhcyBjYWxsaW5nIHRoZSBkaXNhYmxlZCBvcHRpb24gd2l0aCBcclxuICAjIGEgZmFsc2UgdmFsdWUuXHJcbiAgZW5hYmxlOiAhLT5cclxuICAgIEBvcHRpb25zLmRpc2FibGVkID0gbm9cclxuICAgIEBfc2V0LWRpc2FibGVkLXN0YXRlIVxyXG5cclxuICAjIFJlYnVpbGRzIHRoZSBvcHRpb25zLCB0YWtpbmcgYW55IGNoYW5nZXMgaW50byBhY2NvdW50LiBUaGlzIGF1dG9tYXRpY2FsbHkgXHJcbiAgIyBoYXBwZW5zIHdoZW4gdGhlIGRhdGEgb3B0aW9uIGlzIHNldCwgc28gdGhpcyBpcyBwcmltYXJpbHkgZm9yIHJlZnJlc2hpbmcgXHJcbiAgIyBhZnRlciB0aGUgaW5mb3JtYXRpb24gaW4gc2VsZWN0L29wdGlvbiBlbGVtZW50cyBoYXMgYmVlbiBjaGFuZ2VkLlxyXG4gIHJlZnJlc2g6ICEtPiBAX2J1aWxkLW9wdGlvbnMhXHJcblxyXG4gICMgQ2xlYXJzIGFueSBzZWxlY3RlZCBvcHRpb25zLiBFdmVudHMgYXJlIHN0aWxsIGZpcmVkIHdoZW4gdGhlc2Ugc2VsZWN0aW9ucyBcclxuICAjIGFyZSBjbGVhcmVkLlxyXG4gIGNsZWFyOiAhLT4gQF9yZXNldC1vcHRpb25zIVxyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIEVORCBQVUJMSUMgTUVUSE9EU1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgV0lER0VUIEJVSUxESU5HXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBCdWlsZHMgdGhlIG9iamVjdHMgYW5kIEhUTUwgZm9yIGFsbCBvZiB0aGUgZWxlbWVudHMgaW5zaWRlIHRoZSBkcm9wZG93bi4gXHJcbiAgIyBJdCBkb2VzIG5vdCBkZXNlbGVjdCBhbnkgb3B0aW9ucyBhbHJlYWR5IHNlbGVjdGVkLCBzbyB0aGUgd2lkZ2V0J3Mgc3RhdGUgXHJcbiAgIyB3aWxsIHJlbWFpbiB0aGUgc2FtZSBhdCB0aGUgZW5kLlxyXG4gIF9idWlsZC1vcHRpb25zOiAhLT5cclxuICAgIEBtb2RlbCA9IEBfcGFyc2UhXHJcblxyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIGlmIEBzZWxlY3Rpb25zID4gMFxyXG4gICAgICAgIEBzZWxlY3Rpb24uZmluZCBcXGxpLmJhci1zcC1zZWxlY3Rpb24gLnJlbW92ZSFcclxuICAgICAgICBAc2VsZWN0aW9ucyA9IDBcclxuICAgIGVsc2VcclxuICAgICAgQHNlbGVjdGlvbi5maW5kIFxcc3BhbiAuYWRkLWNsYXNzIFxcdWktcHJpb3JpdHktc2Vjb25kYXJ5IC50ZXh0IEBvcHRpb25zLmRlZmF1bHQtdGV4dFxyXG4gICAgICBpZiBub3QgQG9wdGlvbnMuc2VhcmNoYWJsZSBvciBAbW9kZWwubGVuZ3RoIDw9IEBvcHRpb25zLnRocmVzaG9sZFxyXG4gICAgICAgIEBzZWFyY2gtZmllbGQuYWRkLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAc2VhcmNoLWZpZWxkLnJlbW92ZS1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG5cclxuICAgIGNvbnRlbnQgPSAnJ1xyXG4gICAgZm9yIG9wdGlvbiBpbiBAbW9kZWxcclxuICAgICAgaWYgb3B0aW9uLmdyb3VwXHJcbiAgICAgICAgY29udGVudCArPSBAX2NyZWF0ZS1ncm91cCBvcHRpb25cclxuICAgICAgZWxzZSBpZiBub3Qgb3B0aW9uLmVtcHR5XHJcbiAgICAgICAgY29udGVudCArPSBAX2NyZWF0ZS1vcHRpb24gb3B0aW9uXHJcbiAgICAgICAgaWYgb3B0aW9uLnNlbGVjdGVkXHJcbiAgICAgICAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgICAgICAgQF9idWlsZC1zZWxlY3Rpb24gb3B0aW9uXHJcbiAgICAgICAgICAgIEBjdXJyZW50LXZhbHVlWypdID0gb3B0aW9uXHJcbiAgICAgICAgICBlbHNlIFxyXG4gICAgICAgICAgICBAc2VsZWN0aW9uLmZpbmQgXFxzcGFuIC5yZW1vdmUtY2xhc3MgXFx1aS1wcmlvcml0eS1zZWNvbmRhcnkgLnRleHQgb3B0aW9uLnRleHRcclxuICAgICAgICAgICAgQGN1cnJlbnQtdmFsdWUgPSBvcHRpb25cclxuICAgICAgICAgICAgQF9idWlsZC1kZXNlbGVjdC1jb250cm9sISBpZiBAb3B0aW9ucy5kZXNlbGVjdGFibGVcclxuXHJcbiAgICBAX3NldC1kaXNhYmxlZC1zdGF0ZSFcclxuICAgIEBfc2V0LXNlYXJjaC1maWVsZC1kZWZhdWx0IVxyXG4gICAgQF9yZXNpemUtc2VhcmNoLWZpZWxkIVxyXG5cclxuICAgIEBzZWxlY3Qtb3B0aW9ucy5odG1sIGNvbnRlbnRcclxuXHJcbiAgICBpZiBub3QgQG11bHRpcGxlIGFuZCBAY3VycmVudC12YWx1ZVxyXG4gICAgICBpZCA9IEBfZ2VuZXJhdGUtZG9tLWlkIFxcb3B0aW9uIEBjdXJyZW50LXZhbHVlLl9ub2RlLWluZGV4XHJcbiAgICAgIEBzZWxlY3RlZC1vcHRpb24gPSAkIFwiIyNpZFwiXHJcblxyXG4gICMgQ3JlYXRlcyBhbiBvcHRpb24gZ3JvdXAuIFRoaXMgcmVwcmVzZW50cyB0aGUgc2FtZSB0aGluZyBhcyBhbiBIVE1MIFxyXG4gICMgPG9wdGdyb3VwPiBlbGVtZW50LiBJdCdzIHByaW1hcmlseSBmb3IgcHJlc2VudGF0aW9uLCBncm91cGluZyBvcHRpb25zIFxyXG4gICMgdmlzdWFsbHkgb24gdGhlIHNjcmVlbiwgdGhvdWdoIGdyb3VwcyBjYW4gYmUgZGlzYWJsZWQgYXMgYSB1bml0LlxyXG4gIF9jcmVhdGUtZ3JvdXA6IChncm91cCkgLT5cclxuICAgIGlmIG5vdCBncm91cC5kaXNhYmxlZFxyXG4gICAgICBncm91cC5fZG9tLWlkID0gQF9nZW5lcmF0ZS1kb20taWQgXFxncm91cCBncm91cC5fbm9kZS1pbmRleFxyXG4gICAgICBcIjxsaSBjbGFzcz1cXFwidWktbWVudS1pdGVtXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPlxyXG4gICAgICAgIDxhIGlkPVxcXCIje2dyb3VwLl9kb20taWR9XFxcIiBocmVmPVxcXCJqYXZhc2NyaXB0OnZvaWQoMClcXFwiIGNsYXNzPVxcXCJ1aS1wcmlvcml0eS1wcmltYXJ5IGJhci1zcC1vcHRpb24tZ3JvdXBcXFwiXHJcbiAgICAgICAgICByb2xlPVxcXCJncm91cFxcXCIgYXJpYS1oaWRkZW49XFxcImZhbHNlXFxcIiB0YWJpbmRleD1cXFwiLTFcXFwiPiN7ICQgXFw8ZGl2PiAudGV4dCBncm91cC5sYWJlbCAuaHRtbCEgfTwvYT48L2xpPlwiXHJcbiAgICBlbHNlICcnXHJcblxyXG4gICMgQ3JlYXRlcyBvbmUgb2YgdGhlIHNlbGVjdGFibGUgb3B0aW9ucy5cclxuICBfY3JlYXRlLW9wdGlvbjogKG9wdGlvbikgLT5cclxuICAgIGlmIG5vdCBvcHRpb24uZGlzYWJsZWRcclxuICAgICAgb3B0aW9uLl9kb20taWQgPSBAX2dlbmVyYXRlLWRvbS1pZCBcXG9wdGlvbiBvcHRpb24uX25vZGUtaW5kZXhcclxuXHJcbiAgICAgIGNsYXNzZXMgPSA8WyB1aS1jb3JuZXItYWxsIGJhci1zcC1vcHRpb24gXT5cclxuICAgICAgY2xhc3Nlc1sqXSA9IFxcYmFyLXNwLXNlbGVjdGVkIGlmIG9wdGlvbi5zZWxlY3RlZFxyXG4gICAgICBjbGFzc2VzWypdID0gXFxiYXItc3AtZ3JvdXBlZC1vcHRpb24gaWYgb3B0aW9uLl9ncm91cC1pbmRleD9cclxuICAgICAgY2xhc3Nlc1sqXSA9IG9wdGlvbi5jbGFzc2VzIGlmIEBvcHRpb25zLmluaGVyaXQgYW5kIG9wdGlvbi5jbGFzc2VzIGlzIG5vdCAnJ1xyXG5cclxuICAgICAgc3R5bGUgPSBpZiBAb3B0aW9ucy5pbmhlcml0IGFuZCBvcHRpb24uc3R5bGUgaXMgbm90ICcnIHRoZW4gXCIgc3R5bGU9XFxcIiN7b3B0aW9uLnN0eWxlfVxcXCJcIiBlbHNlICcnXHJcbiAgICAgIHdyYXBwZXItY2xhc3MgPSBcXHVpLW1lbnUtaXRlbSArIChpZiBvcHRpb24uc2VsZWN0ZWQgdGhlbiAnIHVpLWhlbHBlci1oaWRkZW4nIGVsc2UgJycpXHJcblxyXG4gICAgICBcIjxsaSBjbGFzcz1cXFwiI3t3cmFwcGVyLWNsYXNzfVxcXCIgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIj5cclxuICAgICAgICA8YSBpZD1cXFwiI3tvcHRpb24uX2RvbS1pZH1cXFwiIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKVxcXCIgY2xhc3M9XFxcIiN7Y2xhc3NlcyAqICcgJ31cXFwiI3tzdHlsZX0gcm9sZT1cXFwib3B0aW9uXFxcIlxyXG4gICAgICAgICAgYXJpYS1oaWRkZW49XFxcImZhbHNlXFxcIiB0YWJpbmRleD1cXFwiLTFcXFwiPiN7b3B0aW9uLmh0bWx9PC9hPjwvbGk+XCJcclxuICAgIGVsc2UgJydcclxuXHJcbiAgIyBCdWlsZHMgYSBkZXNlbGVjdCBjb250cm9sLiBUaGlzIGFwcGVhcnMgYXMgYW4gWCB0byB0aGUgaW5zaWRlIG9mIHRoZSBcclxuICAjIGRyb3Bkb3duIGFycm93LiBJdCdzIG9ubHkgY2FsbGVkIGlmIGEgc2luZ2xlLXNlbGVjdCB3aWRnZXQgaXMgbWFya2VkIFxyXG4gICMgZGVzZWxlY3RhYmxlLlxyXG4gIF9idWlsZC1kZXNlbGVjdC1jb250cm9sOiAhLT5cclxuICAgIGlmIG5vdCBAc2VsZWN0aW9uLmZpbmQgXFxkaXYuYmFyLXNwLWRlc2VsZWN0IC5sZW5ndGhcclxuICAgICAgQHNlbGVjdGlvbi5maW5kIFxcc3BhbiAuZmlyc3QhYWZ0ZXIgJzxkaXYgY2xhc3M9XCJ1aS1pY29uIHVpLWljb24tY2xvc2UgYmFyLXNwLWRlc2VsZWN0XCIvPidcclxuXHJcbiAgIyBCdWlsZHMgdGhlIGNvbnRyb2xzIHRoYXQgcmVwcmVzZW50IHNlbGVjdGlvbnMgaW4gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBcclxuICAjIFRoZXNlIGRpc3BsYXkgdGhlIHRleHQgb2YgdGhlIHNlbGVjdGVkIG9wdGlvbiwgYWxvbmcgd2l0aCBhbiBYIHRoYXQgd2lsbCBcclxuICAjIGRlc2VsZWN0IHRoZW0gd2hlbiBjbGlja2VkLlxyXG4gIF9idWlsZC1zZWxlY3Rpb246IChvcHRpb24pICEtPlxyXG4gICAgcmV0dXJuIGlmIEBvcHRpb25zLm1heC1zZWxlY3RlZCA8PSBAc2VsZWN0aW9uc1xyXG4gICAgc2VsZWN0aW9uLWlkID0gQF9nZW5lcmF0ZS1kb20taWQgXFxzZWxlY3Rpb24gb3B0aW9uLl9ub2RlLWluZGV4XHJcbiAgICBAc2VsZWN0aW9ucyArPSAxXHJcblxyXG4gICAgaWYgb3B0aW9uLmRpc2FibGVkXHJcbiAgICAgIGh0bWwgPSBcIjxsaSBjbGFzcz1cXFwidWktY29ybmVyLWFsbCB1aS1zdGF0ZS1kaXNhYmxlZCBiYXItc3Atc2VsZWN0aW9uXFxcIiBpZD1cXFwiI3tzZWxlY3Rpb24taWR9XFxcIj5cclxuICAgICAgICAgICAgICA8c3Bhbj4je29wdGlvbi5odG1sfTwvc3Bhbj48L2xpPlwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGh0bWwgPSBcIjxsaSBjbGFzcz1cXFwidWktY29ybmVyLWFsbCB1aS1zdGF0ZS1kZWZhdWx0IGJhci1zcC1zZWxlY3Rpb25cXFwiIGlkPVxcXCIje3NlbGVjdGlvbi1pZH1cXFwiPlxyXG4gICAgICAgICAgICAgIDxzcGFuPiN7b3B0aW9uLmh0bWx9PC9zcGFuPlxyXG4gICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKVxcXCIgY2xhc3M9XFxcInVpLWljb24gdWktaWNvbi1jbG9zZXRoaWNrIGJhci1zcC1zZWxlY3Rpb24tY2xvc2VcXFwiIFxyXG4gICAgICAgICAgICAgICAgdGFiaW5kZXg9XFxcIi0xXFxcIj48L2E+PC9saT5cIlxyXG4gICAgQHNlYXJjaC1jb250YWluZXIuYmVmb3JlIGh0bWxcclxuXHJcbiAgICBsaW5rID0gJCBcIiMjc2VsZWN0aW9uLWlkXCIgLmZpbmQgXFxhIC5maXJzdCFcclxuICAgICMgVGhlIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgWCBjb250cm9sLiBUaGUgY2xpY2tlZCBtZW1iZXIgZmllbGQgbXVzdCBiZSBcclxuICAgICMgc2V0IGhlcmUgYXMgd2VsbCwgaW4gcGFydCBiZWNhdXNlIHRoZSBjb250cm9sIGlzIGRlc3Ryb3llZCBhcyBhIHBhcnQgb2YgXHJcbiAgICAjIHRoaXMgaGFuZGxpbmcgYW5kIHRoYXQgbWVzc2VzIHRoaW5ncyB1cCBhIGJpdC5cclxuICAgIGxpbmsubW91c2Vkb3duIChldmVudCkgIX4+XHJcbiAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgaWYgQG9wdGlvbnMuZGlzYWJsZWRcclxuICAgICAgICBldmVudC5zdG9wLXByb3BhZ2F0aW9uIVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQGNsaWNrZWQgPSB5ZXNcclxuICAgICAgICBAZGVzdHJ1Y3Rpb24tcGVuZGluZyA9IHllc1xyXG4gICAgICAgIEBfZGVzZWxlY3Qtb3B0aW9uIGV2ZW50LCAkIFwiIyN7QF9nZW5lcmF0ZS1kb20taWQgXFxvcHRpb24gb3B0aW9uLl9ub2RlLWluZGV4fVwiXHJcbiAgICBsaW5rLm1vdXNldXAgIX4+XHJcbiAgICAgIEBjbGlja2VkID0gbm9cclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgV0lER0VUIEJVSUxESU5HXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBEUk9QRE9XTiBPUEVSQVRJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBPcGVucyB0aGUgZHJvcGRvd24gc28gdGhhdCB0aGUgb3B0aW9ucyAoYW5kIHRoZSBzZWFyY2ggZmllbGQsIGluIGEgXHJcbiAgIyBzaW5nbGUtc2VsZWN0IGNvbnRyb2wpIGNhbiBiZSB2aWV3ZWQuXHJcbiAgX29wZW4tZHJvcGRvd246ICEtPlxyXG4gICAgaWYgbm90IEBtdWx0aXBsZVxyXG4gICAgICBAc2VsZWN0aW9uLmFkZC1jbGFzcyAndWktc3RhdGUtYWN0aXZlIGJhci1zcC13aXRoLWRyb3AnXHJcbiAgICAgIEBzZWxlY3Rpb24uZmluZCBcXGRpdiAucmVtb3ZlLWNsYXNzIFxcdWktaWNvbi10cmlhbmdsZS0xLXMgLmFkZC1jbGFzcyBcXHVpLWljb24tdHJpYW5nbGUtMS1uXHJcbiAgICAgIEBfaGlnaGxpZ2h0LW9wdGlvbiBAc2VsZWN0ZWQtb3B0aW9uIGlmIEBzZWxlY3RlZC1vcHRpb25cclxuICAgIGVsc2UgaWYgQG9wdGlvbnMubWF4LXNlbGVjdGVkIDw9IEBzZWxlY3Rpb25zIHRoZW4gcmV0dXJuXHJcbiAgICBlbHNlIEBzZWxlY3Rpb24uYWRkLWNsYXNzIFxcYmFyLXNwLXdpdGgtZHJvcFxyXG5cclxuICAgIGRkLXRvcCA9IEBjb250YWluZXIuaGVpZ2h0IVxyXG4gICAgQGRyb3Bkb3duLmNzcyB0b3A6IGRkLXRvcCArIFxccHggLnJlbW92ZS1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG5cclxuICAgIEBzZWFyY2gtZmllbGQuZm9jdXMhXHJcbiAgICBAc2VhcmNoLWZpZWxkLnZhbCBAc2VhcmNoLWZpZWxkLnZhbCFcclxuXHJcbiAgICBAX2ZpbHRlci1vcHRpb25zIVxyXG5cclxuICAgIEBfdHJpZ2dlciBcXG9wZW4sIG51bGwsIGl0ZW06IEBjb250YWluZXIgdW5sZXNzIEBvcGVuXHJcbiAgICBAb3BlbiA9IHllc1xyXG5cclxuICBfc2VsZWN0LWl0ZW06IChpdGVtKSAhLT5cclxuICAgIGl0ZW0uc2VsZWN0ZWQgPSB5ZXNcclxuICAgIGlmIGl0ZW0uX2VsZW1lbnQ/XHJcbiAgICAgICRlbGVtZW50ID0gJCBpdGVtLl9lbGVtZW50XHJcbiAgICAgICRlbGVtZW50LnByb3AgXFxzZWxlY3RlZCB5ZXNcclxuICAgICAgJGVsZW1lbnQucGFyZW50cyBcXHNlbGVjdCAudHJpZ2dlciBcXGNoYW5nZVxyXG5cclxuICBfZGVzZWxlY3QtaXRlbTogKGl0ZW0pICEtPlxyXG4gICAgaXRlbS5zZWxlY3RlZCA9IG5vXHJcbiAgICBpZiBpdGVtLl9lbGVtZW50P1xyXG4gICAgICAkZWxlbWVudCA9ICQgaXRlbS5fZWxlbWVudFxyXG4gICAgICAkZWxlbWVudC5wcm9wIFxcc2VsZWN0ZWQgbm9cclxuICAgICAgJGVsZW1lbnQucGFyZW50cyBcXHNlbGVjdCAudHJpZ2dlciBcXGNoYW5nZSBpZiBAbXVsdGlwbGVcclxuXHJcbiAgIyBDbG9zZXMgdGhlIGRyb3Bkb3duIHNvIHRoYXQgdGhlIG9wdGlvbnMgKGFuZCB0aGUgc2VhcmNoIGZpZWxkLCBpbiBhIFxyXG4gICMgc2luZ2xlLXNlbGVjdCBjb250cm9sKSBjYW4gbm8gbG9uZ2VyIGJlIHZpZXdlZC5cclxuICBfY2xvc2UtZHJvcGRvd246ICEtPlxyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIEBzZWxlY3Rpb24ucmVtb3ZlLWNsYXNzIFxcYmFyLXNwLXdpdGgtZHJvcFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2VsZWN0aW9uLnJlbW92ZS1jbGFzcyAndWktc3RhdGUtYWN0aXZlIGJhci1zcC13aXRoLWRyb3AnXHJcbiAgICAgIEBzZWxlY3Rpb24uZmluZCBcXGRpdiAucmVtb3ZlLWNsYXNzIFxcdWktaWNvbi10cmlhbmdsZS0xLW4gLmFkZC1jbGFzcyBcXHVpLWljb24tdHJpYW5nbGUtMS1zXHJcbiAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuXHJcbiAgICBAZHJvcGRvd24uYWRkLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcbiAgICBAX3RyaWdnZXIgXFxjbG9zZSwgbnVsbCwgaXRlbTogQGNvbnRhaW5lciBpZiBAb3BlblxyXG4gICAgQG9wZW4gPSBub1xyXG5cclxuICAjIFRvZ2dsZXMgdGhlIGRyb3Bkb3duLCBvcGVuaW5nIGl0IGlmIGNsb3NlZCBhbmQgY2xvc2luZyBpdCBpZiBvcGVuLlxyXG4gIF90b2dnbGUtZHJvcGRvd246ICEtPiBpZiBAb3BlbiB0aGVuIEBfY2xvc2UtZHJvcGRvd24hIGVsc2UgQF9vcGVuLWRyb3Bkb3duIVxyXG5cclxuICAjIFJlc2V0cyB0aGUgb3B0aW9ucywgY2xlYXJpbmcgb3V0IGFueSBzZWxlY3Rpb24gYW5kIGNsb3NpbmcgdGhlIGRyb3Bkb3duLiBcclxuICAjIFNpbmNlIG11bHRpLXNlbGVjdCByZXF1aXJlcyBtb3JlIGhhbmRsaW5nIGJlY2F1c2Ugb2YgdGhlIHNlbGVjdGlvbiBcclxuICAjIGVsZW1lbnRzLCB0aGlzIG1ldGhvZCBtZXJlbHkgaXRlcmF0ZXMgdGhyb3VnaCB0aGUgc2VsZWN0ZWQgb3B0aW9ucyBhbmQgXHJcbiAgIyBkZWxlZ2F0ZXMgdG8gX2Rlc2VsZWN0LW9wdGlvbiBmb3IgZWFjaCBvbmUsIG1lYW5pbmcgdGhhdCBhIGNoYW5nZSBldmVudCBcclxuICAjIGlzIGZpcmVkIGZvciBlYWNoIHNlbGVjdGlvbiB0aGF0IGlzIGNsZWFyZWQuIEZvciBzaW5nbGUtc2VsZWN0IHdpZGdldHMsIGEgXHJcbiAgIyBzaW5nbGUgY2hhbmdlIGV2ZW50IGlzIGZpcmVkLCBhbmQgb25seSBpZiB0aGVyZSBhY3R1YWxseSBoYWQgYmVlbiBhIFxyXG4gICMgc2VsZWN0ZWQgb3B0aW9uIGJlZm9yZSB0aGUgY2FsbCB0byB0aGlzIG1ldGhvZC5cclxuICBfcmVzZXQtb3B0aW9uczogKGV2ZW50KSAhLT5cclxuICAgIGlmIEBtdWx0aXBsZVxyXG4gICAgICBpbmRpY2VzID0gW2l0ZW0uX25vZGUtaW5kZXggZm9yIGl0ZW0gaW4gQGN1cnJlbnQtdmFsdWVdXHJcbiAgICAgIGZvciBpbmRleCBpbiBpbmRpY2VzXHJcbiAgICAgICAgb3B0aW9uID0gJCBcIiMje0BfZ2VuZXJhdGUtZG9tLWlkIFxcb3B0aW9uIGluZGV4fVwiXHJcbiAgICAgICAgQF9kZXNlbGVjdC1vcHRpb24gZXZlbnQsIG9wdGlvblxyXG4gICAgZWxzZVxyXG4gICAgICBAc2VsZWN0aW9uLmZpbmQgXFxzcGFuIC50ZXh0IEBvcHRpb25zLmRlZmF1bHQtdGV4dCAuYWRkLWNsYXNzIFxcdWktcHJpb3JpdHktc2Vjb25kYXJ5XHJcbiAgICAgIG9sZC12YWx1ZSA9IEBjdXJyZW50LXZhbHVlXHJcbiAgICAgIG9sZC1pdGVtID0gQHNlbGVjdGVkLW9wdGlvblxyXG4gICAgICBAX2Rlc2VsZWN0LWl0ZW0gb2xkLWl0ZW0gaWYgb2xkLWl0ZW0/XHJcbiAgICAgIEBjdXJyZW50LXZhbHVlID0gbnVsbFxyXG4gICAgICBAc2VsZWN0ZWQtb3B0aW9uID0gbnVsbFxyXG4gICAgICBAc2VsZWN0aW9uLmZpbmQgXFwuYmFyLXNwLWRlc2VsZWN0IC5yZW1vdmUhXHJcbiAgICAgIEBfYWN0aXZhdGUtb3B0aW9uKEBzZWxlY3Qtb3B0aW9ucy5maW5kIFxcLmJhci1zcC1zZWxlY3RlZCAucmVtb3ZlLWNsYXNzIFxcYmFyLXNwLXNlbGVjdGVkKVxyXG4gICAgICBAX2Nsb3NlLWRyb3Bkb3duISBpZiBAYWN0aXZlXHJcblxyXG4gICAgICBpZiBvbGQtdmFsdWUgaXMgbm90IG51bGxcclxuICAgICAgICBAX3RyaWdnZXIgXFxjaGFuZ2UsIGV2ZW50LCBpdGVtOiBudWxsIGRhdGE6IG51bGwgXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIERST1BET1dOIE9QRVJBVElPTlNcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIE9QVElPTiBTRUxFQ1RJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIFNlbGVjdHMgdGhlIHNwZWNpZmllZCBvcHRpb24uIEFzaWRlIGZyb20gc2ltcGx5IG1ha2luZyB0aGUgc2VsZWN0aW9uLCBcclxuICAjIHRoaXMgYWRkcyB0aGUgb3B0aW9uJ3MgZGF0YSB0byBjdXJyZW50LXZhbHVlLCByZW1vdmVzIHRoZSBoaWdobGlnaHQsIGFuZCBcclxuICAjIGNsb3NlcyB0aGUgZHJvcGRvd24gKHVubGVzcyB0aGUgQ3RybCBvciBBbHQga2V5IGlzIGJlaW5nIGhlbGQgZG93biBvbiBhIFxyXG4gICMgbXVsdGktc2VsZWN0IHdpZGdldCkuIEl0IGFsc28gZmlyZXMgYSBjaGFuZ2UgZXZlbnQgYXMgbG9uZyBhcyB0aGUgbWV0aG9kIFxyXG4gICMgaXNuJ3QgY2FsbGVkIHdpdGggYW4gYWxyZWFkeS1zZWxlY3RlZCBvcHRpb24uIE11bHRpLXNlbGVjdCB3aWRnZXRzIHdpbGwgXHJcbiAgIyBub3QgYWxsb3cgdGhlIHNhbWUgb3B0aW9uIHRvIGJlIHNlbGVjdGVkIHR3aWNlOyB0aGUgc2Vjb25kIG9uZSB3aWxsIGJlIFxyXG4gICMgc2lsZW50bHkgaWdub3JlZC5cclxuICBfc2VsZWN0LW9wdGlvbjogKGV2ZW50LCBvcHRpb24pICEtPlxyXG4gICAgaWYgb3B0aW9uP1xyXG4gICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuXHJcbiAgICAgIHBvc2l0aW9uID0gQF9nZXQtbW9kZWwtaW5kZXggb3B0aW9uXHJcbiAgICAgIHZhbHVlID0gQG1vZGVsW3Bvc2l0aW9uXVxyXG4gICAgICByZXR1cm4gaWYgdmFsdWUuc2VsZWN0ZWRcclxuXHJcbiAgICAgIGlmIEBtdWx0aXBsZVxyXG4gICAgICAgIEBfZGVhY3RpdmF0ZS1vcHRpb24gb3B0aW9uXHJcbiAgICAgICAgaWYgKHBvcyA9IHZhbHVlLl9ncm91cC1pbmRleClcclxuICAgICAgICAgIGdyb3VwID0gQG1vZGVsW3Bvc11cclxuICAgICAgICAgIHZpc2libGUgPSBub1xyXG4gICAgICAgICAgZm9yIGluZGV4IGZyb20gcG9zICsgMSB0aWwgcG9zICsgZ3JvdXAuX2NoaWxkcmVuXHJcbiAgICAgICAgICAgIGlmIG5vdCBAbW9kZWxbaW5kZXhdLnNlbGVjdGVkXHJcbiAgICAgICAgICAgICAgdmlzaWJsZSA9IHllc1xyXG4gICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICBpZiBub3QgdmlzaWJsZVxyXG4gICAgICAgICAgICBAX2RlYWN0aXZhdGUtb3B0aW9uICQgXCIjI3tncm91cC5fZG9tLWlkfVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAX2FjdGl2YXRlLW9wdGlvbihAc2VsZWN0LW9wdGlvbnMuZmluZCBcXGEuYmFyLXNwLXNlbGVjdGVkIC5yZW1vdmUtY2xhc3MgXFxiYXItc3Atc2VsZWN0ZWQpXHJcbiAgICAgICAgQHNlbGVjdGVkLW9wdGlvbiA9IG9wdGlvblxyXG4gICAgICAgIEBzZWxlY3Rpb24uZmluZCBcXHNwYW4gLnJlbW92ZS1jbGFzcyBcXHVpLXByaW9yaXR5LXNlY29uZGFyeVxyXG5cclxuICAgICAgb3B0aW9uLmFkZC1jbGFzcyBcXGJhci1zcC1zZWxlY3RlZFxyXG4gICAgICBAX3NlbGVjdC1pdGVtIHZhbHVlXHJcblxyXG4gICAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgICBzLWhlaWdodCA9IEBzZWxlY3Rpb24ub3V0ZXItaGVpZ2h0IVxyXG4gICAgICAgIHMtd2lkdGggPSBAc2VsZWN0aW9uLm91dGVyLXdpZHRoIVxyXG4gICAgICAgIEBfYnVpbGQtc2VsZWN0aW9uIHZhbHVlXHJcbiAgICAgICAgbmV3LWhlaWdodCA9IEBzZWxlY3Rpb24ub3V0ZXItaGVpZ2h0IVxyXG4gICAgICAgIG5ldy13aWR0aCA9IEBzZWxlY3Rpb24ub3V0ZXItd2lkdGghXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAc2VsZWN0aW9uLmZpbmQgXFxzcGFuIC5maXJzdCF0ZXh0IHZhbHVlLnRleHRcclxuICAgICAgICBAX2J1aWxkLWRlc2VsZWN0LWNvbnRyb2whIGlmIEBvcHRpb25zLmRlc2VsZWN0YWJsZVxyXG5cclxuICAgICAgQF9jbG9zZS1kcm9wZG93biEgdW5sZXNzIEBtdWx0aXBsZSBhbmQgKGV2ZW50Py5tZXRhLWtleSBvciBldmVudD8uY3RybC1rZXkpXHJcbiAgICAgIEBzZWFyY2gtZmllbGQudmFsICcnXHJcblxyXG4gICAgICBpZiBAbXVsdGlwbGUgYW5kIChzLWhlaWdodCBpcyBub3QgbmV3LWhlaWdodCBvciBzLXdpZHRoIGlzIG5vdCBuZXctd2lkdGgpXHJcbiAgICAgICAgQF90cmlnZ2VyIFxccmVzaXplLCBldmVudCxcclxuICAgICAgICAgIGl0ZW06IEBzZWxlY3Rpb25cclxuICAgICAgICAgIGRhdGE6XHJcbiAgICAgICAgICAgIGhlaWdodDogbmV3LWhlaWdodFxyXG4gICAgICAgICAgICB3aWR0aDogbmV3LXdpZHRoXHJcbiAgICAgIGlmIEBtdWx0aXBsZSBhbmQgJC5pbi1hcnJheSB2YWx1ZSwgQGN1cnJlbnQtdmFsdWUgaXMgLTFcclxuICAgICAgICBAY3VycmVudC12YWx1ZVsqXSA9IHZhbHVlIFxyXG4gICAgICAgIEBfdHJpZ2dlciBcXGNoYW5nZSwgZXZlbnQsIGl0ZW06IG9wdGlvbiwgZGF0YTogdmFsdWVcclxuICAgICAgaWYgbm90IEBtdWx0aXBsZSBhbmQgdmFsdWUgaXMgbm90IEBjdXJyZW50LXZhbHVlXHJcbiAgICAgICAgb2xkLXZhbHVlID0gQGN1cnJlbnQtdmFsdWVcclxuICAgICAgICBAX2Rlc2VsZWN0LWl0ZW0gb2xkLXZhbHVlIGlmIG9sZC12YWx1ZT9cclxuICAgICAgICBAY3VycmVudC12YWx1ZSA9IHZhbHVlXHJcbiAgICAgICAgQF90cmlnZ2VyIFxcY2hhbmdlLCBldmVudCwgaXRlbTogb3B0aW9uLCBkYXRhOiB2YWx1ZVxyXG5cclxuICAgICAgQF9yZXNpemUtc2VhcmNoLWZpZWxkIVxyXG5cclxuICAjIERlc2VsZWN0cyBhbiBvcHRpb24gaW4gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBUbyBkbyBzbyBpbiBhIHNpbmdsZS1zZWxlY3QgXHJcbiAgIyB3aWRnZXQsIHVzZSBfcmVzZXQtb3B0aW9ucy4gVGhpcyBoYW5kbGVzIHRoZSBzZWxlY3Rpb24gb24gdGhlIGRhdGEgc2lkZSBcclxuICAjIGFuZCBhbHNvIGRlc3Ryb3lzIHRoZSBIVE1MIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VsZWN0aW9uIG9uIHRoZSBcclxuICAjIHByZXNlbnRhdGlvbiBzaWRlLlxyXG4gIF9kZXNlbGVjdC1vcHRpb246IChldmVudCwgb3B0aW9uKSAhLT5cclxuICAgIHBvcyA9IEBfZ2V0LW1vZGVsLWluZGV4IG9wdGlvblxyXG4gICAgdmFsdWUgPSBAbW9kZWxbcG9zXVxyXG5cclxuICAgIGlmIG5vdCB2YWx1ZS5kaXNhYmxlZFxyXG4gICAgICBAX2Rlc2VsZWN0LWl0ZW0gdmFsdWVcclxuICAgICAgQF9hY3RpdmF0ZS1vcHRpb24gb3B0aW9uXHJcbiAgICAgIGlmIHZhbHVlLl9ncm91cC1pbmRleFxyXG4gICAgICAgIEBfYWN0aXZhdGUtb3B0aW9uICQgXCIjI3tAX2dlbmVyYXRlLWRvbS1pZCBcXGdyb3VwIHZhbHVlLl9ncm91cC1pbmRleH1cIlxyXG5cclxuICAgICAgQF9jbGVhci1oaWdobGlnaHQhXHJcbiAgICAgIEBfZmlsdGVyLW9wdGlvbnMhXHJcblxyXG4gICAgICBpbmRleCA9ICQuaW4tYXJyYXkgdmFsdWUsIEBjdXJyZW50LXZhbHVlXHJcbiAgICAgIEBjdXJyZW50LXZhbHVlLnNwbGljZSBpbmRleCwgMVxyXG5cclxuICAgICAgc2VsZWN0aW9uID0gJCBcIiMje0BfZ2VuZXJhdGUtZG9tLWlkIFxcc2VsZWN0aW9uIHBvc31cIlxyXG4gICAgICBAc2VsZWN0aW9ucyAtPSAxXHJcblxyXG4gICAgICBAX2Nsb3NlLWRyb3Bkb3duISBpZiBAc2VsZWN0aW9ucyA+IDAgYW5kIEBzZWFyY2gtZmllbGQudmFsISAubGVuZ3RoIGlzIDBcclxuICAgICAgXHJcbiAgICAgIHMtaGVpZ2h0ID0gQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgIHMtd2lkdGggPSBAc2VsZWN0aW9uLm91dGVyLXdpZHRoIVxyXG4gICAgICBzZWxlY3Rpb24ucmVtb3ZlIVxyXG4gICAgICBuZXctaGVpZ2h0ID0gQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgIG5ldy13aWR0aCA9IEBzZWxlY3Rpb24ub3V0ZXItaGVpZ2h0IVxyXG5cclxuICAgICAgQHNlYXJjaC1maWVsZC5mb2N1cyFcclxuICAgICAgQF9zZXQtc2VhcmNoLWZpZWxkLWRlZmF1bHQhXHJcbiAgICAgIEBfcmVzaXplLXNlYXJjaC1maWVsZCFcclxuXHJcbiAgICAgIGlmIHMtaGVpZ2h0IGlzIG5vdCBuZXctaGVpZ2h0IG9yIHMtd2lkdGggaXMgbm90IG5ldy13aWR0aFxyXG4gICAgICAgIEBfdHJpZ2dlciBcXHJlc2l6ZSwgZXZlbnQsXHJcbiAgICAgICAgICBpdGVtOiBAc2VsZWN0aW9uXHJcbiAgICAgICAgICBkYXRhOlxyXG4gICAgICAgICAgICBoZWlnaHQ6IG5ldy1oZWlnaHRcclxuICAgICAgICAgICAgd2lkdGg6IG5ldy13aWR0aFxyXG4gICAgICBAX3RyaWdnZXIgXFxjaGFuZ2UsIGV2ZW50LCBpdGVtOiBudWxsLCBkYXRhOiBudWxsXHJcbiAgICBcclxuICAjIEFwcGxpZXMgYSBoaWdobGlnaHQgdG8gdGhlIHByb3ZpZGVkIG9wdGlvbi4gSW4gYWRkaXRpb24gdG8gaGlnaGxpZ2h0aW5nIFxyXG4gICMgaXQgKGJ5IGdpdmluZyBpdCB0aGUgY2xhc3MgdWktc3RhdGUtZm9jdXMsIHdoaWNoIGlzIHRoZSBzYW1lIHdheSB0aGF0IHRoZSBcclxuICAjIGpRdWVyeSBVSSBtZW51IGRvZXMgaXQpLCBpdCBhbHNvIGNoZWNrcyB0aGUgcG9zaXRpb24gb2YgdGhlIGhpZ2hsaWdodGVkIFxyXG4gICMgb3B0aW9uIGFuZCBzY3JvbGxzIGl0IGludG8gdmlldyBpZiBuZWNlc3NhcnkuIEl0IGFsc28gaGFuZGxlcyB0aGUgXHJcbiAgIyB3aWRnZXQncyBhcmlhLWFjdGl2ZWRlc2NlbmRhbnQgYXR0cmlidXRlIGZvciBhY2Nlc3NpYmlsaXR5LlxyXG4gIF9oaWdobGlnaHQtb3B0aW9uOiAob3B0aW9uKSAhLT5cclxuICAgIGlmIG9wdGlvbi5sZW5ndGhcclxuICAgICAgQF9jbGVhci1oaWdobGlnaHQhXHJcblxyXG4gICAgICBAaGlnaGxpZ2h0ZWQtb3B0aW9uID0gb3B0aW9uXHJcbiAgICAgIEBoaWdobGlnaHRlZC1vcHRpb24uYWRkLWNsYXNzIFxcdWktc3RhdGUtZm9jdXNcclxuICAgICAgQHNlbGVjdGlvbi5hdHRyIFxcYXJpYS1hY3RpdmVkZXNjZW5kYW50IEBoaWdobGlnaHRlZC1vcHRpb24uYXR0ciBcXGlkXHJcblxyXG4gICAgICBtYXgtaGVpZ2h0ID0gcGFyc2UtaW50IEBzZWxlY3Qtb3B0aW9ucy5jc3MgXFxtYXhIZWlnaHRcclxuICAgICAgdmlzaWJsZS10b3AgPSBAc2VsZWN0LW9wdGlvbnMuc2Nyb2xsLXRvcCFcclxuICAgICAgdmlzaWJsZS1ib3R0b20gPSBtYXgtaGVpZ2h0ICsgdmlzaWJsZS10b3BcclxuXHJcbiAgICAgIGhpZ2hsaWdodC10b3AgPSBAaGlnaGxpZ2h0ZWQtb3B0aW9uLnBvc2l0aW9uIXRvcCArIEBzZWxlY3Qtb3B0aW9ucy5zY3JvbGwtdG9wIVxyXG4gICAgICBoaWdobGlnaHQtYm90dG9tID0gaGlnaGxpZ2h0LXRvcCArIEBoaWdobGlnaHRlZC1vcHRpb24ub3V0ZXItaGVpZ2h0IVxyXG5cclxuICAgICAgaWYgaGlnaGxpZ2h0LWJvdHRvbSA+PSB2aXNpYmxlLWJvdHRvbVxyXG4gICAgICAgIEBzZWxlY3Qtb3B0aW9ucy5zY3JvbGwtdG9wIGlmIGhpZ2hsaWdodC1ib3R0b20gLSBtYXgtaGVpZ2h0ID4gMCB0aGVuIGhpZ2hsaWdodC1ib3R0b20gLSBtYXgtaGVpZ2h0IGVsc2UgMFxyXG4gICAgICBlbHNlIGlmIGhpZ2hsaWdodC10b3AgPCB2aXNpYmxlLXRvcFxyXG4gICAgICAgIEBzZWxlY3Qtb3B0aW9ucy5zY3JvbGwtdG9wIGhpZ2hsaWdodC10b3BcclxuXHJcbiAgIyBSZW1vdmVzIHRoZSBoaWdobGlnaHRpbmcgZnJvbSB0aGUgKGZvcm1lcmx5KSBoaWdobGlnaHRlZCBvcHRpb24uXHJcbiAgX2NsZWFyLWhpZ2hsaWdodDogIS0+XHJcbiAgICBAaGlnaGxpZ2h0ZWQtb3B0aW9uLnJlbW92ZS1jbGFzcyBcXHVpLXN0YXRlLWZvY3VzIGlmIEBoaWdobGlnaHRlZC1vcHRpb25cclxuICAgIEBoaWdobGlnaHRlZC1vcHRpb24gPSBudWxsXHJcblxyXG4gICMgTWFrZXMgYW4gb3B0aW9uIGF2YWlsYWJsZSBmb3Igc2VsZWN0aW9uLiBUaGlzIGlzIGRvbmUgd2hlbiBpdCBpcyBcclxuICAjIGRlc2VsZWN0ZWQgZnJvbSBhIG11bHRpLXNlbGVjdCB3aWRnZXQsIHNpbmNlIHRoZSBvcHRpb24gaXMgaGlkZGVuIHdoZW4gXHJcbiAgIyBpdCdzIHNlbGVjdGVkIHNvIHRoYXQgaXQgY2FuJ3QgYmUgcmUtc2VsZWN0ZWQuXHJcbiAgX2FjdGl2YXRlLW9wdGlvbjogKG9wdGlvbikgIS0+IFxyXG4gICAgb3B0aW9uLnBhcmVudCFyZW1vdmUtY2xhc3MgXFx1aS1oZWxwZXItaGlkZGVuXHJcbiAgICBvcHRpb24uYXR0ciBcXGFyaWEtaGlkZGVuIFxcZmFsc2VcclxuXHJcbiAgIyBNYWtlcyBhbiBvcHRpb24gdW5hdmFpbGFibGUgZm9yIHNlbGVjdGlvbi4gVGhpcyBpcyBkb25lIHdoZW4gaXQncyBcclxuICAjIHNlbGVjdGVkIGluIGEgbXVsdGktc2VsZWN0IHdpZGdldCBzbyB0aGF0IGl0IGNhbid0IGJlIHNlbGVjdGVkIGEgc2Vjb25kIFxyXG4gICMgdGltZS4gVGhpcyBpcyBkb25lIGluIGFuIGFjY2Vzc2FiaWxpdHktZnJpZW5kbHkgd2F5LCBieSBoaWRpbmcgdGhlIFxyXG4gICMgZWxlbWVudCBhbmQgc2V0dGluZyBpdHMgYXJpYS1oaWRkZW4gYXR0cmlidXRlLlxyXG4gIF9kZWFjdGl2YXRlLW9wdGlvbjogKG9wdGlvbikgIS0+XHJcbiAgICBvcHRpb24ucGFyZW50IWFkZC1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW5cclxuICAgIG9wdGlvbi5hdHRyIFxcYXJpYS1oaWRkZW4gXFx0cnVlXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIE9QVElPTiBTRUxFQ1RJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIFdJREdFVCBBQ1RJVkFUSU9OXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBBY3RpdmF0ZXMgdGhlIHdpZGdldCBieSBnaXZpbmcgaXQgdGhlIGFwcHJvcHJpYXRlIGNsYXNzZXMgYW5kIGZvY3VzaW5nIFxyXG4gICMgdGhlIHNlYXJjaCBmaWVsZC5cclxuICBfYWN0aXZhdGUtd2lkZ2V0OiAoZXZlbnQpICEtPlxyXG4gICAgQGNvbnRhaW5lci5hZGQtY2xhc3MgXFxiYXItc3AtYWN0aXZlXHJcbiAgICBAc2VsZWN0aW9uLmFkZC1jbGFzcyBcXHVpLXN0YXRlLWZvY3VzIGlmIG5vdCBAbXVsdGlwbGVcclxuICAgIEBhY3RpdmUgPSB5ZXNcclxuICAgIEBzZWFyY2gtZmllbGQudmFsIEBzZWFyY2gtZmllbGQudmFsIVxyXG4gICAgQHNlYXJjaC1maWVsZC5mb2N1cyFcclxuXHJcbiAgIyBEZWFjdGl2YXRlcyB0aGUgd2lkZ2V0IGJ5IHJlbW92aW5nIHRoZSBhcHByb3ByaWF0ZSBjbGFzc2VzLCBjbG9zaW5nIHRoZSBcclxuICAjIGRyb3Bkb3duLCBhbmQgY2xlYXJpbmcgbXVjaCBvZiB0aGUgd2lkZ2V0J3Mgc3RhdGUuXHJcbiAgX2RlYWN0aXZhdGUtd2lkZ2V0OiAoZXZlbnQpICEtPlxyXG4gICAgJCBkb2N1bWVudCAudW5iaW5kIFxcY2xpY2sgQGRvY3VtZW50LWNsaWNrLWFjdGlvblxyXG4gICAgQGFjdGl2ZSA9IG5vXHJcbiAgICBAX2Nsb3NlLWRyb3Bkb3duIVxyXG5cclxuICAgIEBjb250YWluZXIucmVtb3ZlLWNsYXNzIFxcYmFyLXNwLWFjdGl2ZVxyXG4gICAgQHNlbGVjdGlvbi5yZW1vdmUtY2xhc3MgXFx1aS1zdGF0ZS1mb2N1cyBpZiBub3QgQG11bHRpcGxlXHJcbiAgICBAX2NsZWFyLW9wdGlvbnMtZmlsdGVyIVxyXG4gICAgQF9jbGVhci1iYWNrc3BhY2UhXHJcblxyXG4gICAgQF9zZXQtc2VhcmNoLWZpZWxkLWRlZmF1bHQhXHJcbiAgICBAX3Jlc2l6ZS1zZWFyY2gtZmllbGQhXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFdJREdFVCBBQ1RJVkFUSU9OXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBPUFRJT04gRklMVEVSSU5HXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBBcHBsaWVzIHRoZSB0ZXh0IGluIHRoZSBzZWFyY2ggZmllbGQgdG8gdGhlIGF2YWlsYWJsZSBvcHRpb25zLCBoaWRpbmcgYWxsIFxyXG4gICMgb2YgdGhvc2UgdGhhdCBkb24ndCBtYXRjaCB0aGUgc2VhcmNoIGFuZCBoaWdobGlnaHRpbmcgdGhlIHBvcnRpb24gb2YgdGhlIFxyXG4gICMgcmVzdCB0aGF0IGRvZXMgbWF0Y2ggdGhlIHNlYXJjaC5cclxuICBfZmlsdGVyLW9wdGlvbnM6ICEtPlxyXG4gICAgQF9jbGVhci1ub3QtZm91bmQhXHJcbiAgICBjb3VudCA9IDBcclxuXHJcbiAgICBzZWFyY2gtdGV4dCA9ICQgXFw8ZGl2PiAudGV4dCgkLnRyaW0gQHNlYXJjaC1maWVsZC52YWwhKS5odG1sIVxyXG4gICAgcmVnZXgtYW5jaG9yID0gaWYgQG9wdGlvbnMuYW5jaG9yZWQtc2VhcmNoIHRoZW4gJ14nIGVsc2UgJydcclxuICAgIGVzY2FwZWQtc2VhcmNoID0gc2VhcmNoLXRleHQucmVwbGFjZSAvWy1bXFxde30oKSorPy4sXFxcXF4kfCNcXHNdL2cgXFxcXFxcJCZcclxuICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cCByZWdleC1hbmNob3IgKyBlc2NhcGVkLXNlYXJjaCwgJ2knXHJcbiAgICBwYXJ0LXJlZ2V4ID0gbmV3IFJlZ0V4cCAnXFxcXHMnICsgZXNjYXBlZC1zZWFyY2gsICdpJ1xyXG5cclxuICAgIGZvciBvcHRpb24gaW4gQG1vZGVsXHJcbiAgICAgIGlmIG5vdCBvcHRpb24uZGlzYWJsZWQgYW5kIG5vdCBvcHRpb24uZW1wdHlcclxuICAgICAgICBpZiBvcHRpb24uZ3JvdXBcclxuICAgICAgICAgIEBfZGVhY3RpdmF0ZS1vcHRpb24gJCBcIiMje29wdGlvbi5fZG9tLWlkfVwiXHJcbiAgICAgICAgZWxzZSBpZiBub3QgKEBtdWx0aXBsZSBhbmQgb3B0aW9uLnNlbGVjdGVkKVxyXG4gICAgICAgICAgZm91bmQgPSBub1xyXG4gICAgICAgICAgcmVzdWx0LWlkID0gb3B0aW9uLl9kb20taWRcclxuICAgICAgICAgIHJlc3VsdCA9ICQgXCIjI3tyZXN1bHQtaWR9XCJcclxuXHJcbiAgICAgICAgICBpZiAoc3RhcnQgPSBvcHRpb24uaHRtbC5zZWFyY2ggcmVnZXgpIGlzIG5vdCAtMVxyXG4gICAgICAgICAgICBmb3VuZCA9IHllc1xyXG4gICAgICAgICAgICBjb3VudCArPSAxXHJcbiAgICAgICAgICBlbHNlIGlmIEBvcHRpb25zLnNwbGl0LXNlYXJjaCBhbmQgKG9wdGlvbi5odG1sLmluZGV4LW9mKCcgJykgaXMgbm90IC0xIG9yIG9wdGlvbi5odG1sLmluZGV4LW9mKCdbJykgaXMgMClcclxuICAgICAgICAgICAgcGFydHMgPSBvcHRpb24uaHRtbC5yZXBsYWNlIC9cXFt8XFxdL2cgJycgLnNwbGl0ICcgJ1xyXG4gICAgICAgICAgICBpZiBwYXJ0cy5sZW5ndGhcclxuICAgICAgICAgICAgICBmb3IgcGFydCBpbiBwYXJ0c1xyXG4gICAgICAgICAgICAgICAgaWYgcmVnZXgudGVzdCBwYXJ0XHJcbiAgICAgICAgICAgICAgICAgIGZvdW5kID0geWVzXHJcbiAgICAgICAgICAgICAgICAgIGNvdW50ICs9IDFcclxuICAgICAgICAgICAgICAgICAgc3RhcnQgPSBvcHRpb24uaHRtbC5zZWFyY2gocGFydC1yZWdleCkgKyAxXHJcbiAgICAgICAgICAgICAgICAgIGJyZWFrXHJcblxyXG4gICAgICAgICAgaWYgZm91bmRcclxuICAgICAgICAgICAgaWYgc2VhcmNoLXRleHQubGVuZ3RoXHJcbiAgICAgICAgICAgICAgdGV4dCA9IFwiI3sgb3B0aW9uLmh0bWwuc3Vic3RyIDAgc3RhcnQgKyBzZWFyY2gtdGV4dC5sZW5ndGggfTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICN7IG9wdGlvbi5odG1sLnN1YnN0ciBzdGFydCArIHNlYXJjaC10ZXh0Lmxlbmd0aCB9XCJcclxuICAgICAgICAgICAgICB0ZXh0ID0gXCIjeyB0ZXh0LnN1YnN0ciAwIHN0YXJ0IH08c3BhbiBjbGFzcz1cXFwidWktcHJpb3JpdHktcHJpbWFyeVxcXCI+I3sgdGV4dC5zdWJzdHIgc3RhcnQgfVwiXHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICB0ZXh0ID0gb3B0aW9uLmh0bWxcclxuXHJcbiAgICAgICAgICAgIHJlc3VsdC5odG1sIHRleHRcclxuICAgICAgICAgICAgQF9hY3RpdmF0ZS1vcHRpb24gcmVzdWx0XHJcblxyXG4gICAgICAgICAgICBpZiBvcHRpb24uX2dyb3VwLWluZGV4P1xyXG4gICAgICAgICAgICAgIEBfYWN0aXZhdGUtb3B0aW9uICQgXCIjI3tAbW9kZWxbb3B0aW9uLl9ncm91cC1pbmRleF0uX2RvbS1pZH1cIlxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBAX2NsZWFyLWhpZ2hsaWdodCEgaWYgQGhpZ2hsaWdodGVkLW9wdGlvbiBhbmQgcmVzdWx0LWlkIGlzIEBoaWdobGlnaHRlZC1vcHRpb24uYXR0ciBcXGlkXHJcbiAgICAgICAgICAgIEBfZGVhY3RpdmF0ZS1vcHRpb24gcmVzdWx0XHJcblxyXG4gICAgaWYgY291bnQgPCAxIGFuZCBzZWFyY2gtdGV4dC5sZW5ndGhcclxuICAgICAgQF9ub3QtZm91bmQgc2VhcmNoLXRleHRcclxuICAgIGVsc2VcclxuICAgICAgQF9zZXQtZmlsdGVyLWhpZ2hsaWdodCFcclxuXHJcbiAgIyBDbGVhcnMgdGhlIGZpbHRlciBieSBhY3RpdmF0aW5nIGFsbCBvcHRpb25zIHRoYXQgd2VyZSBoaWRkZW4uIEl0IGFsc28gXHJcbiAgIyBjbGVhcnMgdGhlIHNlYXJjaCBmaWVsZC5cclxuICBfY2xlYXItb3B0aW9ucy1maWx0ZXI6ICEtPlxyXG4gICAgQHNlYXJjaC1maWVsZC52YWwgJydcclxuICAgIGxpbmtzID0gQHNlbGVjdC1vcHRpb25zLmZpbmQgXFxhXHJcblxyXG4gICAgZm9yIGEgaW4gbGlua3NcclxuICAgICAgbGluayA9ICQgYVxyXG4gICAgICBpZiBub3QgQG11bHRpcGxlIG9yIGxpbmsuaGFzLWNsYXNzIFxcYmFyLXNwLW9wdGlvbi1ncm91cCBvciBub3QgbGluay5oYXMtY2xhc3MgXFxiYXItc3Atc2VsZWN0ZWRcclxuICAgICAgICBAX2FjdGl2YXRlLW9wdGlvbiBsaW5rIFxyXG5cclxuICAjIEhpZ2hsaWdodHMgd2hpY2hldmVyIG9wdGlvbiBpcyBhcHByb3ByaWF0ZSBhZnRlciB0aGUgZmlsdGVyIHJlbW92ZXMgc29tZSBcclxuICAjIG9wdGlvbnMuIElmIHRoZSBjdXJyZW50bHkgaGlnaGxpZ2h0ZWQgb3B0aW9uIGlzIHJlbW92ZWQgYnkgdGhlIGZpbHRlciwgXHJcbiAgIyB0aGlzIHdpbGwgZmlndXJlIG91dCB0aGUgY2xvc2VzdCBzdGlsbC12aXNpYmxlIG9uZSBhbmQgdXNlIGl0IGluc3RlYWQuXHJcbiAgX3NldC1maWx0ZXItaGlnaGxpZ2h0OiAhLT5cclxuICAgIGlmIG5vdCBAaGlnaGxpZ2h0ZWQtb3B0aW9uXHJcbiAgICAgIHNlbGVjdGVkID0gaWYgQG11bHRpcGxlIHRoZW4gW10gZWxzZSBAc2VsZWN0LW9wdGlvbnMuZmluZCBcXC5iYXItc3Atc2VsZWN0ZWRcclxuICAgICAgaGlnaGxpZ2h0ZWQgPSBpZiBzZWxlY3RlZC5sZW5ndGhcclxuICAgICAgICAgICAgICAgICAgICB0aGVuIHNlbGVjdGVkLmZpcnN0IVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgQHNlbGVjdC1vcHRpb25zLmZpbmQgXFwuYmFyLXNwLW9wdGlvbiAuZmlyc3QhXHJcbiAgICAgIEBfaGlnaGxpZ2h0LW9wdGlvbiBoaWdobGlnaHRlZCBpZiBoaWdobGlnaHRlZC5sZW5ndGhcclxuXHJcbiAgIyBBZGRzIGVsZW1lbnRzIHRvIHRoZSBkcm9wZG93biB0byBzaG93IHRoYXQgYSBzZWFyY2ggZGlkIG5vdCByZXR1cm4gYSBcclxuICAjIHJlc3VsdC5cclxuICBfbm90LWZvdW5kOiAodGV4dCkgIS0+XHJcbiAgICBodG1sID0gJCBcIjxsaSBjbGFzcz1cXFwiYmFyLXNwLW5vdC1mb3VuZCB1aS1tZW51LWl0ZW1cXFwiPlxyXG4gICAgICAgICAgICAgIDxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKVxcXCI+I3tAb3B0aW9ucy5ub3QtZm91bmQtdGV4dH0gXFxcIiN7dGV4dH1cXFwiPC9hPjwvbGk+XCJcclxuICAgIEBzZWxlY3Qtb3B0aW9ucy5hcHBlbmQgaHRtbFxyXG5cclxuICAjIENsZWFycyB0aGUgbm90LWZvdW5kIG1lc3NhZ2UgZnJvbSB0aGUgRE9NXHJcbiAgX2NsZWFyLW5vdC1mb3VuZDogIS0+XHJcbiAgICBAc2VsZWN0LW9wdGlvbnMuZmluZCBcXC5iYXItc3Atbm90LWZvdW5kIC5yZW1vdmUhXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFdJREdFVCBPUFRJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBVVElMSVRZIEZVTkNUSU9OU1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMgSGFuZGxlcyBib3RoIHRoZSBkaXNhYmxpbmcgYW5kIHRoZSBlbmFibGluZyBvZiB0aGUgd2lkZ2V0LiBUaGlzIHNldHMgdGhlIFxyXG4gICMgZGlzYWJsZWQgQ1NTIGNsYXNzIHRvIHRoZSBjb250YWluZXIgYW5kIGV4cGxpY2l0bHkgZGlzYWJsZXMgdGhlIHNlYXJjaCBcclxuICAjIGZpZWxkIChvciB0aGUgb3Bwb3NpdGUsIGlmIHRoZSB3aWRnZXQgaXMgZW5hYmxlZCkuIFNpbmNlIHRoZSBzZWFyY2ggZmllbGQgXHJcbiAgIyBpcyBkaXNhYmxlZCwgdGhlIHdpZGdldCB3aWxsIG5vdCByZWNlaXZlIGZvY3VzIHdoaWxlIGRpc2FibGVkLlxyXG4gIF9zZXQtZGlzYWJsZWQtc3RhdGU6ICEtPlxyXG4gICAgaWYgQG9wdGlvbnMuZGlzYWJsZWRcclxuICAgICAgQGNvbnRhaW5lci5hZGQtY2xhc3MgJ2Jhci1zcC1kaXNhYmxlZCB1aS1zdGF0ZS1kaXNhYmxlZCdcclxuICAgICAgQHNlYXJjaC1maWVsZC4wLmRpc2FibGVkID0geWVzXHJcbiAgICAgIEBfZGVhY3RpdmF0ZS13aWRnZXQhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBjb250YWluZXIucmVtb3ZlLWNsYXNzICdiYXItc3AtZGlzYWJsZWQgdWktc3RhdGUtZGlzYWJsZWQnXHJcbiAgICAgIEBzZWFyY2gtZmllbGQuMC5kaXNhYmxlZCA9IG5vXHJcblxyXG4gICMgU2V0cyB0aGUgZGVmYXVsdCB0ZXh0IGFuZCBjbGFzcyBpbnRvIHRoZSBzZWFyY2ggZmllbGQuIE5vdGUgdGhhdCBzaW5jZSBcclxuICAjIG9ubHkgbXVsdGktc2VsZWN0IHdpZGdldHMgcHV0IHRoZSBkZWZhdWx0IHRleHQgaW4gdGhlIHNlYXJjaCBmaWVsZCwgdGhpcyBcclxuICAjIG1ldGhvZCB3aWxsIGhhdmUgYW55IHJlYWwgZWZmZWN0IHdoZW4gY2FsbGVkIGJ5IGEgbXVsdGktc2VsZWN0IHdpZGdldC4gXHJcbiAgIyBTaW5nbGUtc2VsZWN0IGNhbiBjYWxsIGl0LCBidXQgaXQgd29uJ3QgZG8gYW55dGhpbmcuXHJcbiAgX3NldC1zZWFyY2gtZmllbGQtZGVmYXVsdDogIS0+XHJcbiAgICBpZiBAbXVsdGlwbGUgYW5kIEBzZWxlY3Rpb25zIDwgMSBhbmQgbm90IEBhY3RpdmVcclxuICAgICAgQHNlYXJjaC1maWVsZC52YWwgQG9wdGlvbnMuZGVmYXVsdC10ZXh0IC5hZGQtY2xhc3MgXFxiYXItc3AtZGVmYXVsdFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2VhcmNoLWZpZWxkLnZhbCAnJyAucmVtb3ZlLWNsYXNzIFxcYmFyLXNwLWRlZmF1bHRcclxuXHJcbiAgIyBSZXNpemVzIHRoZSBzZWFyY2ggZmllbGQgd2lkdGggYW5kIHBvc2l0aW9uaW5nLiBUaGlzIG9ubHkgcmVhbGx5IG5lZWRzIHRvIFxyXG4gICMgYmUgZG9uZSBvbmNlIChhdCBjcmVhdGlvbikgZm9yIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0cyBzaW5jZSB0aGV5IHdpbGwgXHJcbiAgIyBhbHdheXMgaGF2ZSB0aGUgc2FtZSBudW1iZXIgb2Ygc2VsZWN0aW9ucyBhbmQgZG9uJ3QgbmVlZCByZXNpemluZy4gTXVsdGktXHJcbiAgIyBzZWxlY3Qgd2lkZ2V0cyBzaG91bGQgcmVxdWlyZSBpdCBlYWNoIHRpbWUgYW4gb3B0aW9uIGlzIHNlbGVjdGVkIG9yIFxyXG4gICMgZGVzZWxlY3RlZCwgc2luY2UgdGhhdCBtYXkgY2hhbmdlIHRoZSBzaXplIG9mIHRoZSBpbnB1dC4gSG93ZXZlciwgY2FsbGluZyBcclxuICAjIHRoaXMgbW9yZSB0aGFuIG9uY2Ugb24gYSBzaW5nbGUtc2VsZWN0IHdpZGdldCBpcyBoYXJtbGVzcyBzaW5jZSBpdCB3aWxsIFxyXG4gICMgYWx3YXlzICdyZXNpemUnIHRvIHRoZSBzYW1lIHNpemUuXHJcbiAgX3Jlc2l6ZS1zZWFyY2gtZmllbGQ6ICEtPlxyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIHNmLXdpZHRoID0gMFxyXG4gICAgICBzdHlsZS10ZXh0ID0gJ3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6LTEwMDBweDt0b3A6LTEwMDBweDtkaXNwbGF5Om5vbmU7J1xyXG4gICAgICBzdHlsZXMgPSA8WyBmb250LXNpemUgZm9udC1zdHlsZSBmb250LXdlaWdodCBmb250LWZhbWlseSBsaW5lLWhlaWdodCB0ZXh0LXRyYW5zZm9ybSBsZXR0ZXItc3BhY2luZyBdPlxyXG5cclxuICAgICAgZm9yIHN0eWxlIGluIHN0eWxlc1xyXG4gICAgICAgIHN0eWxlLXRleHQgKz0gXCIjc3R5bGU6I3sgQHNlYXJjaC1maWVsZC5jc3Mgc3R5bGUgfTtcIlxyXG5cclxuICAgICAgdGVtcC1kaXYgPSAkIFxcPGRpdj4gc3R5bGU6IHN0eWxlLXRleHRcclxuICAgICAgdGVtcC1kaXYudGV4dCBAc2VhcmNoLWZpZWxkLnZhbCFcclxuICAgICAgJCBcXGJvZHkgLmFwcGVuZCB0ZW1wLWRpdlxyXG5cclxuICAgICAgc2Ytd2lkdGggPSB0ZW1wLWRpdi53aWR0aCArIDI1XHJcbiAgICAgIHNmLXdpZHRoID0gQHdpZHRoIC0gMTAgaWYgc2Ytd2lkdGggPiBAd2lkdGggLSAxMFxyXG4gICAgICB0ZW1wLWRpdi5yZW1vdmUhXHJcbiAgICBlbHNlXHJcbiAgICAgIGRkLXdpZHRoID0gQHdpZHRoIC0gQF9nZXQtYm9yZGVyLWFuZC1zaWRlLXdpZHRoIEBkcm9wZG93blxyXG4gICAgICBzZi13aWR0aCA9IGRkLXdpZHRoIC0gQF9nZXQtYm9yZGVyLWFuZC1zaWRlLXdpZHRoKEBzZWFyY2gtY29udGFpbmVyKSAtIFxcXHJcbiAgICAgICAgQF9nZXQtYm9yZGVyLWFuZC1zaWRlLXdpZHRoIEBzZWFyY2gtZmllbGRcclxuXHJcbiAgICBkZC10b3AgPSBAY29udGFpbmVyLmhlaWdodCFcclxuICAgIEBzZWFyY2gtZmllbGQuY3NzIHdpZHRoOiBzZi13aWR0aCArIFxccHhcclxuICAgIEBkcm9wZG93bi5jc3MgdG9wOiBkZC10b3AgKyBcXHB4XHJcblxyXG4gICMgTW92ZXMgdGhlIHVuZGVybHlpbmcgZWxlbWVudCdzIHRhYmluZGV4IHRvIHRoZSB3aWRnZXQncyBzZWFyY2ggZmllbGQsIHNvIFxyXG4gICMgdGhhdCB0aGUgd2lkZ2V0IGNhbiBpbnNlcnQgaXRzZWxmIGludG8gd2hhdGV2ZXIgdGFiaW5kZXggc2NoZW1lIGhhcyBiZWVuIFxyXG4gICMgZXN0YWJsaXNoZWQuIElmIHRoZSB1bmRlcmx5aW5nIGVsZW1lbnQgaGFzIG5vIHRhYmluZGV4LCB0aGUgd2lkZ2V0J3Mgd2lsbCBcclxuICAjIHN0YXkgYXQgLTEuXHJcbiAgX3NldC10YWItaW5kZXg6ICEtPlxyXG4gICAgaW5kZXggPSBAZWxlbWVudC5hdHRyIFxcdGFiaW5kZXhcclxuICAgIGlmIGluZGV4XHJcbiAgICAgIEBlbGVtZW50LmF0dHIgXFx0YWJpbmRleCAtMVxyXG4gICAgICBAc2VhcmNoLWZpZWxkLmF0dHIgXFx0YWJpbmRleCBpbmRleFxyXG5cclxuICAjIFVuZG9lcyB0aGUgY2hhbmdlcyBmcm9tIHRoZSBfc2V0LXRhYi1pbmRleCBtZXRob2QuIFRoaXMgaXMgY2FsbGVkIFxyXG4gICMgaW1tZWRpYXRlbHkgcHJpb3IgdG8gdGhlIGRlc3RydWN0aW9uIG9mIHRoZSB3aWRnZXQsIHB1dHRpbmcgdGhlIHRhYmluZGV4IFxyXG4gICMgYmFjayBvbnRvIHRoZSB1bmRlcmx5aW5nIGVsZW1lbnQgc28gdGhhdCBhIG5ldyB3aWRnZXQgY291bGQgY29uY2VpdmFibHkgXHJcbiAgIyBiZSBidWlsdCBpbiB0aGUgc2FtZSBsb2NhdGlvbi5cclxuICBfcmV2ZXJ0LXRhYi1pbmRleDogIS0+XHJcbiAgICBpbmRleCA9IEBzZWFyY2gtZmllbGQuYXR0ciBcXHRhYmluZGV4XHJcbiAgICBpZiBpbmRleFxyXG4gICAgICBAc2VhcmNoLWZpZWxkLmF0dHIgXFx0YWJpbmRleCAtMVxyXG4gICAgICBAZWxlbWVudC5hdHRyIFxcdGFiaW5kZXggaW5kZXhcclxuXHJcbiAgIyBSZW1vdmVzIHJlY29yZCBvZiBiYWNrc3BhY2VzIHByZXNzZWQgd2l0aCByZWdhcmQgdG8gZGVsZXRpbmcgc2VsZWN0aW9ucyBcclxuICAjIGluIGEgbXVsdGktc2VsZWN0IHdpZGdldC4gSXQgY2xlYXJzIGRhdGEgIGFib3V0IHdoaWNoIG9wdGlvbiB3aWxsIGJlIFxyXG4gICMgcmVtb3ZlZCBvbiB0aGUgbmV4dCBiYWNrc3BhY2UgYW5kIHJlbW92ZXMgdGhlIGZvY3VzIHN0YXRlIENTUyBjbGFzcyBmcm9tIFxyXG4gICMgcHJldmlvdXNseS1iYWNrc3BhY2VkIG9wdGlvbnMuIFxyXG4gIF9jbGVhci1iYWNrc3BhY2U6ICEtPlxyXG4gICAgQHBlbmRpbmctZGVzZWxlY3Rpb24ucmVtb3ZlLWNsYXNzIFxcdWktc3RhdGUtZm9jdXMgaWYgQHBlbmRpbmctZGVzZWxlY3Rpb25cclxuICAgIEBwZW5kaW5nLWRlc2VsZWN0aW9uID0gbnVsbFxyXG5cclxuICAjIEdlbmVyYXRlcyBhIHJhbmRvbSBJRCBmb3IgYSBjb250YWluZXIuIFRoaXMgaXMgb25seSBjYWxsZWQgaWYgdGhlIFxyXG4gICMgb3JpZ2luYWwgZWxlbWVudCBkb2Vzbid0IGhhdmUgYW4gSUQgdG8gYnVpbGQgb2ZmIG9mIGFuZCBjb25zaXN0cyBzaW1wbHkgXHJcbiAgIyBvZiB0aGUgc3RyaW5nICdzcC0nIGZvbGxvd2VkIGJ5IDYgcmFuZG9tIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzLlxyXG4gIF9nZW5lcmF0ZS1jb250YWluZXItaWQ6IC0+XHJcbiAgICByZXN1bHQgPSBcXHNwLSArIFtAX2dlbmVyYXRlLWNoYXIhIGZvciBpIGZyb20gMSB0byA2XSAqICcnXHJcbiAgICB3aGlsZSAkIFwiIyN7cmVzdWx0fVwiIC5sZW5ndGhcclxuICAgICAgcmVzdWx0ICs9IEBfZ2VuZXJhdGUtY2hhciFcclxuICAgIHJlc3VsdFxyXG5cclxuICAjIEdlbmVyYXRlcyBhIHNpbmdsZSByYW5kb20gYWxwaGFudW1lcmljIGNoYXJhY3RlciwgZm9yIHVzZSB3aXRoIHRoZSBcclxuICAjIHByZXZpb3VzIG1ldGhvZC5cclxuICBfZ2VuZXJhdGUtY2hhcjogLT5cclxuICAgIGNoYXJzID0gXFwwMTIzNDU2Nzg5QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpcclxuICAgIHJhbmQgPSBNYXRoLmZsb29yIE1hdGgucmFuZG9tISAqIGNoYXJzLmxlbmd0aFxyXG4gICAgY2hhcnMuY2hhci1hdCByYW5kXHJcblxyXG4gICMgR2VuZXJhdGVzIGFuIElEIGZvciBhbiBvcHRpb24uIFRoaXMgY29uc2lzdHMgb2YgdGhlIHR5cGUgb2YgdGhlIG9wdGlvbiBcclxuICAjICh0aGluZ3MgbGlrZSAnb3B0aW9uJywgJ2dyb3VwJywgb3IgJ3NlbGVjdGlvbicpLCB0aGUgY29udGFpbmVyIElELCBhbmQgXHJcbiAgIyB0aGUgaW5kZXggb2YgdGhlIG9wdGlvbiBkYXRhIHdpdGhpbiB0aGUgbW9kZWwsIGFsbCBzZXBhcmF0ZWQgYnkgaHlwaGVucy5cclxuICBfZ2VuZXJhdGUtZG9tLWlkOiAodHlwZSwgaW5kZXgpIC0+IFwiI3R5cGUtI3tAY29udGFpbmVyLWlkfS0jaW5kZXhcIlxyXG5cclxuICAjIERldGVybWluZXMgdGhlIHdpZHRoIG9mIGFuIGVsZW1lbnQncyBib3JkZXIgYW5kIHBhZGRpbmcgdG9nZXRoZXIuIFRoaXMgaXMgXHJcbiAgIyB1c2VkIHRvIGxheSBvdXQgdGhlIHdpZGdldCBvbiBjcmVhdGlvbi5cclxuICBfZ2V0LWJvcmRlci1hbmQtc2lkZS13aWR0aDogKGVsZW1lbnQpIC0+IGVsZW1lbnQub3V0ZXItd2lkdGghIC0gZWxlbWVudC53aWR0aCFcclxuXHJcbiAgIyBFeHRyYWN0cyB0aGUgaW5kZXggKHBvc2l0aW9uIG9mIGFuIGVsZW1lbnQgd2l0aGluIHRoZSBtb2RlbCkgZnJvbSBhbiBcclxuICAjIG9wdGlvbi4gSXQgZG9lcyB0aGlzIGJ5IHB1bGxpbmcgdGhlIG51bWJlciBmcm9tIHRoZSBlbmQgb2YgdGhlIG9wdGlvbidzIFxyXG4gICMgSUQuXHJcbiAgX2dldC1tb2RlbC1pbmRleDogKG9wdGlvbikgLT5cclxuICAgIGlkID0gb3B0aW9uLmF0dHIgXFxpZFxyXG4gICAgaWQuc3Vic3RyIGlkLmxhc3QtaW5kZXgtb2YoXFwtKSArIDFcclxuXHJcbiAgIyBSZW1vdmVzIHRoZSAnaW50ZXJuYWwnIGRhdGEgKGtleXMgdGhhdCBiZWdpbiB3aXRoIGFuIHVuZGVyc2NvcmUpIGZyb20gYW4gXHJcbiAgIyBpdGVtJ3MgZGF0YSBhbmQgcmV0dXJucyB0aGUgc2FuaXRpemVkIG9iamVjdC5cclxuICBfc2FuaXRpemUtaXRlbTogKGl0ZW0pIC0+XHJcbiAgICByZXN1bHQgPSB7fVxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIGl0ZW1cclxuICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZSBpZiBrZXkuaW5kZXgtb2YoXFxfKSBpcyBub3QgMFxyXG4gICAgcmVzdWx0XHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFVUSUxJVFkgRlVOQ1RJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBEQVRBIFBBUlNJTkdcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIFBhcnNlcyBkYXRhIGludG8gYSBtb2RlbC4gVGhpcyBkYXRhIGNhbiBjb21lIGVpdGhlciBmcm9tIHRoZSBkYXRhIG9wdGlvbiBcclxuICAjIG9yIGEgYmFja2luZyBzZWxlY3QgZWxlbWVudCBhbmQgaXRzIGNoaWxkcmVuLlxyXG4gIF9wYXJzZTogLT5cclxuICAgIGlmIEBvcHRpb25zLmRhdGFcclxuICAgICAgQF9wYXJzZS1kYXRhIEBvcHRpb25zLmRhdGFcclxuICAgIGVsc2UgaWYgQGVsZW1lbnQuMC5ub2RlLW5hbWUudG8tbG93ZXItY2FzZSEgaXMgXFxzZWxlY3RcclxuICAgICAgQF9wYXJzZS1vcHRpb25zIEBlbGVtZW50LjBcclxuICAgIGVsc2VcclxuICAgICAgW11cclxuXHJcbiAgIyBQYXJzZXMgSlNPTiBkYXRhIGludG8gYSBtb2RlbC4gSWYgdGhlcmUgYXJlIGFkZGl0aW9uYWwgZmllbGRzIG92ZXIgYW5kIFxyXG4gICMgYWJvdmUgdGhlIG5lY2Vzc2FyeSBvbmVzIHdpdGhpbiBhIGRhdGEgZWxlbWVudCwgdGhleSB3aWxsIGJlIHJldGFpbmVkIFxyXG4gICMgKGp1c3Qgbm90IHVzZWQgYnkgdGhlIHdpZGdldCkuXHJcbiAgX3BhcnNlLWRhdGE6IChkYXRhKSAtPlxyXG4gICAgb3B0aW9uLWluZGV4ID0gMFxyXG4gICAgbW9kZWwgPSBbXVxyXG5cclxuICAgIGFkZC1ub2RlID0gKG5vZGUpICEtPlxyXG4gICAgICBpZiBub2RlLmNoaWxkcmVuPy5sZW5ndGggdGhlbiBhZGQtZ3JvdXAgbm9kZSBlbHNlIGFkZC1vcHRpb24gbm9kZVxyXG5cclxuICAgIGFkZC1ncm91cCA9IChub2RlKSAhLT5cclxuICAgICAgcG9zaXRpb24gPSBtb2RlbC5sZW5ndGhcclxuICAgICAgbmV3LW5vZGUgPVxyXG4gICAgICAgIF9ub2RlLWluZGV4OiBwb3NpdGlvblxyXG4gICAgICAgIGdyb3VwOiB5ZXNcclxuICAgICAgICBsYWJlbDogbm9kZS5sYWJlbCA/IG5vZGUudGV4dCA/ICcnXHJcbiAgICAgICAgX2NoaWxkcmVuOiAwXHJcbiAgICAgICAgZGlzYWJsZWQ6IG5vZGUuZGlzYWJsZWQgPyBub1xyXG4gICAgICBmb3Igb3duIGtleSwgdmFsIG9mIG5vZGVcclxuICAgICAgICBpZiBub3QgJC5pbi1hcnJheSBrZXksIDxbIF9ub2RlSW5kZXggZ3JvdXAgbGFiZWwgX2NoaWxkcmVuIGRpc2FibGVkIF0+XHJcbiAgICAgICAgICBuZXctbm9kZVtrZXldID0gdmFsXHJcbiAgICAgIG1vZGVsWypdID0gbmV3LW5vZGVcclxuICAgICAgW2FkZC1vcHRpb24gb3B0aW9uLCBwb3NpdGlvbiwgbm9kZS5kaXNhYmxlZCBmb3Igb3B0aW9uIGluIG5vZGUuY2hpbGRyZW5dXHJcblxyXG4gICAgYWRkLW9wdGlvbiA9IChub2RlLCBncm91cC1wb3NpdGlvbiwgZ3JvdXAtZGlzYWJsZWQpICEtPlxyXG4gICAgICBpZiBub3Qgbm9kZS5jaGlsZHJlbj8ubGVuZ3RoXHJcbiAgICAgICAgaWYgbm9kZS50ZXh0IGlzIG5vdCAnJ1xyXG4gICAgICAgICAgaWYgZ3JvdXAtcG9zaXRpb24/XHJcbiAgICAgICAgICAgIG1vZGVsW2dyb3VwLXBvc2l0aW9uXS5fY2hpbGRyZW4gKz0gMVxyXG4gICAgICAgICAgbmV3LW5vZGUgPVxyXG4gICAgICAgICAgICBfbm9kZS1pbmRleDogbW9kZWwubGVuZ3RoXHJcbiAgICAgICAgICAgIF9vcHRpb24taW5kZXg6IG9wdGlvbi1pbmRleFxyXG4gICAgICAgICAgICB2YWx1ZTogbm9kZS52YWx1ZSA/IG5vZGUudGV4dFxyXG4gICAgICAgICAgICB0ZXh0OiBub2RlLnRleHRcclxuICAgICAgICAgICAgaHRtbDogbm9kZS5odG1sID8gbm9kZS50ZXh0XHJcbiAgICAgICAgICAgIHNlbGVjdGVkOiBub2RlLnNlbGVjdGVkID8gbm9cclxuICAgICAgICAgICAgZGlzYWJsZWQ6IGlmIGdyb3VwLWRpc2FibGVkIHRoZW4gZ3JvdXAtZGlzYWJsZWQgZWxzZSBub2RlLmRpc2FibGVkID8gbm9cclxuICAgICAgICAgICAgX2dyb3VwLWluZGV4OiBncm91cC1wb3NpdGlvblxyXG4gICAgICAgICAgICBjbGFzc2VzOiBub2RlLmNsYXNzZXNcclxuICAgICAgICAgICAgc3R5bGU6IG5vZGUuc3R5bGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgICAgIF9ub2RlLWluZGV4OiBtb2RlbC5sZW5ndGhcclxuICAgICAgICAgICAgX29wdGlvbi1pbmRleDogb3B0aW9uLWluZGV4XHJcbiAgICAgICAgICAgIGVtcHR5OiB5ZXNcclxuICAgICAgICBmb3Igb3duIGtleSwgdmFsIG9mIG5vZGVcclxuICAgICAgICAgIGlmIG5vdCAkLmluLWFycmF5IGtleSwgPFsgX25vZGVJbmRleCBfb3B0aW9uSW5kZXggdmFsdWUgdGV4dCBodG1sIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZCBkaXNhYmxlZCBfZ3JvdXBJbmRleCBjbGFzc2VzIHN0eWxlIF0+XHJcbiAgICAgICAgICAgIG5ldy1ub2RlW2tleV0gPSB2YWxcclxuICAgICAgICBvcHRpb24taW5kZXggKz0gMVxyXG4gICAgICAgIG1vZGVsWypdID0gbmV3LW5vZGVcclxuXHJcbiAgICBmb3Igbm9kZSBpbiBkYXRhXHJcbiAgICAgIGFkZC1ub2RlIG5vZGVcclxuICAgIG1vZGVsXHJcblxyXG4gICMgUGFyc2VzIGEgc2VsZWN0IGVsZW1lbnQgaW50byBhIG1vZGVsLlxyXG4gIF9wYXJzZS1vcHRpb25zOiAoZWxlbWVudCkgLT5cclxuICAgIG9wdGlvbi1pbmRleCA9IDBcclxuICAgIG1vZGVsID0gW11cclxuXHJcbiAgICBhZGQtbm9kZSA9IChub2RlKSAhLT5cclxuICAgICAgaWYgbm9kZS5ub2RlLW5hbWUudG8tbG93ZXItY2FzZSEgaXMgXFxvcHRncm91cFxyXG4gICAgICB0aGVuIGFkZC1ncm91cCBub2RlXHJcbiAgICAgIGVsc2UgYWRkLW9wdGlvbiBub2RlXHJcblxyXG4gICAgYWRkLWdyb3VwID0gKG5vZGUpICEtPlxyXG4gICAgICBwb3NpdGlvbiA9IG1vZGVsLmxlbmd0aFxyXG4gICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgX2VsZW1lbnQ6IG5vZGVcclxuICAgICAgICBfbm9kZS1pbmRleDogcG9zaXRpb25cclxuICAgICAgICBncm91cDogeWVzXHJcbiAgICAgICAgbGFiZWw6IG5vZGUubGFiZWxcclxuICAgICAgICBfY2hpbGRyZW46IDBcclxuICAgICAgICBkaXNhYmxlZDogbm9kZS5kaXNhYmxlZFxyXG4gICAgICBtb2RlbFsqXSA9IG5ldy1ub2RlXHJcbiAgICAgIFthZGQtb3B0aW9uIG9wdGlvbiwgcG9zaXRpb24sIG5vZGUuZGlzYWJsZWQgZm9yIG9wdGlvbiBpbiBub2RlLmNoaWxkLW5vZGVzXVxyXG5cclxuICAgIGFkZC1vcHRpb24gPSAobm9kZSwgZ3JvdXAtcG9zaXRpb24sIGdyb3VwLWRpc2FibGVkKSAhLT5cclxuICAgICAgaWYgbm9kZS5ub2RlLW5hbWUudG8tbG93ZXItY2FzZSEgaXMgXFxvcHRpb25cclxuICAgICAgICBpZiBub2RlLnRleHQgaXMgbm90ICcnXHJcbiAgICAgICAgICBpZiBncm91cC1wb3NpdGlvbj9cclxuICAgICAgICAgICAgbW9kZWxbZ3JvdXAtcG9zaXRpb25dLl9jaGlsZHJlbiArPSAxXHJcbiAgICAgICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgICAgIF9lbGVtZW50OiBub2RlXHJcbiAgICAgICAgICAgIF9ub2RlLWluZGV4OiBtb2RlbC5sZW5ndGhcclxuICAgICAgICAgICAgX29wdGlvbi1pbmRleDogb3B0aW9uLWluZGV4XHJcbiAgICAgICAgICAgIHZhbHVlOiBub2RlLnZhbHVlXHJcbiAgICAgICAgICAgIHRleHQ6IG5vZGUudGV4dFxyXG4gICAgICAgICAgICBodG1sOiBub2RlLmlubmVySFRNTFxyXG4gICAgICAgICAgICBzZWxlY3RlZDogbm9kZS5zZWxlY3RlZFxyXG4gICAgICAgICAgICBkaXNhYmxlZDogaWYgZ3JvdXAtZGlzYWJsZWQgdGhlbiBncm91cC1kaXNhYmxlZCBlbHNlIG5vZGUuZGlzYWJsZWRcclxuICAgICAgICAgICAgX2dyb3VwLWluZGV4OiBncm91cC1wb3NpdGlvblxyXG4gICAgICAgICAgICBjbGFzc2VzOiBub2RlLmNsYXNzLW5hbWVcclxuICAgICAgICAgICAgc3R5bGU6IG5vZGUuc3R5bGUuY3NzLXRleHRcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgICAgIF9ub2RlLWluZGV4OiBtb2RlbC5sZW5ndGhcclxuICAgICAgICAgICAgX29wdGlvbi1pbmRleDogb3B0aW9uLWluZGV4XHJcbiAgICAgICAgICAgIGVtcHR5OiB5ZXNcclxuICAgICAgICBvcHRpb24taW5kZXggKz0gMVxyXG4gICAgICAgIG1vZGVsWypdID0gbmV3LW5vZGVcclxuXHJcbiAgICBmb3Igbm9kZSBpbiBlbGVtZW50LmNoaWxkLW5vZGVzXHJcbiAgICAgIGFkZC1ub2RlIG5vZGVcclxuICAgIG1vZGVsXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIERBVEEgUEFSU0lOR1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4kLmJhcmFuZGlzLnNlbGVjdHBsdXNcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9