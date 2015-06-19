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
  return $.barandis.selectplus;
});
//# sourceMappingURL=data:application/json;base64,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SUFBSSxDQUFDLEtBQUssQ0FBQztZQVZsQjtXQVdKO1lBQ0UsT0FBUyxDQUFBLENBQUEsQ0FDUDtjQUFBLFlBQWEsS0FBSyxDQUFDO2NBQ25CLGNBQWU7Y0FDZixPQUFPO1lBRlA7O1VBR0osV0FBYSxDQUFBLEVBQUEsQ0FBRzs2QkFDUCxDQUFBLENBQUEsQ0FBRTs7O01BRWYsdUVBQUE7UUFBSTtRQUNGLFFBQVMsSUFBQTs7YUFDWDs7RUEvM0NGLENBWk87U0FtNUNULENBQUMsQ0FBQyxRQUFRLENBQUMiLCJmaWxlIjoic2VsZWN0cGx1cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMtMjAxNSwgVGhvbWFzIEouIE90dGVyc29uXHJcbiAqXHJcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcclxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxyXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXHJcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcclxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXHJcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XHJcbiAqXHJcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXHJcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxyXG4gKlxyXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXHJcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxyXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcclxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxyXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxyXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXHJcbiAqIFRIRSBTT0ZUV0FSRS5cclxuICogQGxpY2Vuc2VcclxuICovXHJcblxyXG4kIDwtICgoZmFjdG9yeSkgIS0+XHJcbiAgaWYgdHlwZW9mIGRlZmluZSBpcyBcXGZ1bmN0aW9uIGFuZCBkZWZpbmUuYW1kXHJcbiAgICBkZWZpbmUgPFsganF1ZXJ5IGpxdWVyeS11aS9jb3JlIGpxdWVyeS11aS93aWRnZXQgXT4gZmFjdG9yeVxyXG4gIGVsc2UgaWYgdHlwZW9mIGV4cG9ydHMgaXMgXFxvYmplY3RcclxuICAgIHJlcXVpcmUhIDxbIGpxdWVyeSBqcXVlcnktdWkvY29yZSBqcXVlcnktdWkvd2lkZ2V0IF0+XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkganF1ZXJ5LCBjb3JlLCB3aWRnZXRcclxuICBlbHNlXHJcbiAgICBmYWN0b3J5IGpRdWVyeSlcclxuXHJcbiMgVGhpcyBhZGRzIHNvbWUgZnVuY3Rpb25hbGl0eSB0byB0aGUgY29yZSBqUXVlcnkgLmF0dHIoKSBtZXRob2QuIE5hbWVseSwgaXQgXHJcbiMgcmV0dXJucyBhIG1hcCBvZiBhbGwgYXR0cmlidXRlIG5hbWVzIHRvIHZhbHVlcyBpZiBubyBhcmd1bWVudHMgYXJlIHBhc3NlZCBcclxuIyB0byBpdC4gVGhpcyBtYXkgYmUgdW51c3VhbCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSAoOCBhbmQgYmVmb3JlKSwgd2hpY2ggXHJcbiMgYXBwYXJlbnRseSByZXR1cm4gdGhlIG5hbWVzIG9mIGFsbCBwb3NzaWJsZSBhdHRyaWJ1dGVzLCByYXRoZXIgdGhhbiBzaW1wbHkgXHJcbiMgdGhlIG5hbWVzIG9mIGFsbCBzZXQgYXR0cmlidXRlcyB0aGF0IG90aGVyIGJyb3dzZXJzIHJldHVybi5cclxuI1xyXG4jIFRoaXMgaXMgdXNlZCBsYXRlciB0byBjb3B5IG92ZXIgYXJpYSBhdHRyaWJ1dGVzLCBpbmNpZGVudGFsbHkuXHJcbl9vbGQgPSAkLmZuLmF0dHJcclxuJC5mbi5hdHRyID0gLT5cclxuICBpZiBAMCBhbmQgYXJndW1lbnRzLmxlbmd0aCBpcyAwXHJcbiAgICBtYXAgPSB7fVxyXG4gICAgYXR0cmlidXRlcyA9IEAwLmF0dHJpYnV0ZXNcclxuICAgIGZvciBhdHRyaWJ1dGUgaW4gYXR0cmlidXRlc1xyXG4gICAgICBtYXBbYXR0cmlidXRlLm5hbWUudG8tbG93ZXItY2FzZSFdID0gYXR0cmlidXRlLnZhbHVlXHJcbiAgICBtYXBcclxuICBlbHNlXHJcbiAgICBfb2xkLmFwcGx5IEAsIGFyZ3VtZW50c1xyXG5cclxuJC53aWRnZXQgXFxiYXJhbmRpcy5zZWxlY3RwbHVzLFxyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIFdJREdFVCBPUFRJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBSZW1lbWJlciB0aGF0IHRoaXMgaXMgTGl2ZVNjcmlwdCwgYW5kIHdoZW4gaXQncyBjb21waWxlZCBpbnRvIEphdmFTY3JpcHQsIFxyXG4gICMgZGFzaGVkIGlkZW50aWZpZXJzIGFyZSByZXBsYWNlZCB3aXRoIGNhbWVsLWNhc2VkIG9uZXMuIFRoZXJlZm9yZSwgZm9yIFxyXG4gICMgaW5zdGFuY2UsIHRoZSBwcm9wZXJ0eSB3aWxsIGJlIG1heFNlbGVjdGVkIHJhdGhlciB0aGFuIHRoZSBtYXgtc2VsZWN0ZWQgXHJcbiAgIyBzaG93biBiZWxvdy5cclxuICBvcHRpb25zOlxyXG4gICAgIyBSYXcgSlNPTiBkYXRhIGZvciB1c2UgaW4gdGhlIG1vZGVsLiBJZiB0aGlzIGlzIG51bGwsIHRoZSB3aWRnZXQgaW5zdGVhZFxyXG4gICAgIyBwYXJzZXMgdGhlIHNlbGVjdCBjb250cm9sIHRoYXQgaXQncyBhdHRhY2hlZCB0by4gSWYgdGhpcyBvcHRpb24gaXMgXHJcbiAgICAjIGNoYW5nZWQgYWZ0ZXIgY3JlYXRpb24sIGl0IHdpbGwgdGFrZSBlZmZlY3QgaW1tZWRpYXRlbHkuXHJcbiAgICBkYXRhOiBudWxsXHJcbiAgICAjIFdoZXRoZXIgb3Igbm90IHRoZSB3aWRnZXQgaXMgZGlzYWJsZWQuIFBvc3QtY3JlYXRpb24gY2hhbmdlcyBvZiB0aGlzIFxyXG4gICAgIyBvcHRpb24gKG9yIHVzaW5nIHRoZSBlbmFibGUgb3IgZGlzYWJsZSBtZXRob2QpIHdpbGwgdGFrZSBlZmZlY3QgXHJcbiAgICAjIGltbWVkaWF0ZWx5LlxyXG4gICAgZGlzYWJsZWQ6IG5vXHJcbiAgICAjIFRoZSB3aWR0aCBvZiB0aGUgd2lkZ2V0LCBpbiBwaXhlbHMuIElmIHRoaXMgaXMgc2V0IHRvIDAgKHRoZSBkZWZhdWx0KSwgXHJcbiAgICAjIHRoZW4gdGhlIHdpZHRoIG9mIHRoZSB1bmRlcmx5aW5nIEhUTUwgY29udHJvbC4gQ2hhbmdlcyB0byB0aGlzIG9wdGlvbiBcclxuICAgICMgbWFkZSBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LiBOT1RFOiBXaGlsZSB0aGUgd2lkdGggXHJcbiAgICAjIGNhbiBjb25jZWl2YWJseSBzZXQgaW4gYSBDU1MgZmlsZSB3aXRoIGFuICFpbXBvcnRhbnQgZGlyZWN0aXZlLCB0aGlzIGlzIFxyXG4gICAgIyBub3QgcmVjb21tZW5kZWQuIFRoZSB3aWR0aHMgb2YgbXVsdGlwbGUgcGFydHMgb2YgdGhlIHdpZGdldCBhcmUgc2V0IFxyXG4gICAgIyBzcGVjaWZpY2FsbHksIGFuZCBjaGFuZ2luZyB0aGUgd2lkdGggdmlhIENTUyB3aWxsIG5vdCB1cGRhdGUgYWxsIG9mIFxyXG4gICAgIyB0aG9zZSBwYXJ0cyBhdXRvbWF0aWNhbGx5LiBBZGRpdGlvbmFsbHksIGEgcmVzaXplIGV2ZW50IHdpbGwgbm90IGJlIFxyXG4gICAgIyBmaXJlZCBpZiB0aGUgd2lkdGggb2YgdGhlIHdpZGdldCBpcyBjaGFuZ2VkIHZpYSBDU1MuXHJcbiAgICB3aWR0aDogMFxyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCBjbGFzcyBhbmQgc3R5bGUgYXR0cmlidXRlcyBhcmUgaW5oZXJpdGVkIGZyb20gdGhlIFxyXG4gICAgIyB1bmRlcmx5aW5nIHNlbGVjdCBhbmQgb3B0aW9ucy4gSWYgZGF0YSBpcyBub3QgbnVsbCwgdGhpcyBkZXRlcm1pbmVzIFxyXG4gICAgIyB3aGV0aGVyIHRoZSBkYXRhJ3MgY2xhc3NlcyBhbmQgc3R5bGUgdmFsdWVzIGFyZSB1c2VkLiBDaGFuZ2luZyB0aGlzIFxyXG4gICAgIyBhZnRlciBjcmVhdGlvbiB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IHdvdWxkIHJlcXVpcmUgcmVjYWxjdWxhdGlvbiBcclxuICAgICMgb2YgYSBsb3Qgb2YgdGhlIGRpbWVuc2lvbnMgb2YgdGhlIHdpZGdldC4gVG8gY2hhbmdlIHRoaXMgb24gdGhlIGZseSwgXHJcbiAgICAjIGRlc3Ryb3kgdGhlIHdpZGdldCBhbmQgY3JlYXRlIGFub3RoZXIgb25lIHdpdGggdGhpcyBvcHRpb24gZW5hYmxlZC5cclxuICAgIGluaGVyaXQ6IG5vXHJcbiAgICAjIFJpZ2h0LXRvLWxlZnQgc3VwcG9ydC4gUG9zdC1jcmVhdGlvbiBjaGFuZ2VzIHRvIHRoaXMgb3B0aW9uIHRha2UgZWZmZWN0IFxyXG4gICAgIyBpbW1lZGlhdGVseS5cclxuICAgIHJ0bDogbm9cclxuICAgICMgV2hldGhlciBvciBub3QgYSB2YWx1ZSBjYW4gYmUgZGVzZWxlY3RlZCAobGVhdmluZyB0aGUgY3VycmVudCB2YWx1ZSBhcyBcclxuICAgICMgbnVsbCkuIFRoaXMgaXMgb25seSBhcHBsaWNhYmxlIHRvIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0cywgYXMgXHJcbiAgICAjIG11bHRpcGxlLXNlbGVjdCB3aWRnZXRzIGFyZSBpbmhlcmVudGx5IGRlc2VsZWN0YWJsZS4gQSBkZXNlbGVjdGFibGUgXHJcbiAgICAjIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0IHdpbGwgaGF2ZSBhbiBYIGRpc3BsYXllZCBuZXh0IHRvIHRoZSB1cC9kb3duIGFycm93IFxyXG4gICAgIyB3aGVuIGEgc2VsZWN0aW9uIGlzIG1hZGUsIGFsbG93aW5nIHRoYXQgc2VsZWN0aW9uIHRvIGJlIHVuLW1hZGUuIFxyXG4gICAgIyBDaGFuZ2VzIHRvIHRoaXMgb3B0aW9uIGFmdGVyIGNyZWF0aW9uIHdpbGwgdGFrZSBlZmZlY3QgaW1tZWRpYXRlbHkuXHJcbiAgICBkZXNlbGVjdGFibGU6IG5vXHJcbiAgICAjIFdoZXRoZXIgb3Igbm90IG11bHRpcGxlIHNlbGVjdGlvbnMgYXJlIGFsbG93ZWQuIFNpbmdsZSBzZWxlY3Rpb24gaXMgdGhlIFxyXG4gICAgIyBkZWZhdWx0LiBJZiB0aGlzIGlzIHllcywgdGhlIHdpZGdldCB3aWxsIGJlIG11bHRpcGxlLXNlbGVjdC4gSWYgaXQgaXMgXHJcbiAgICAjIG51bGwsIGl0IHdpbGwgZGVwZW5kIG9uIHdoZXRoZXIgdGhlIHVuZGVybHlpbmcgc2VsZWN0IGhhcyB0aGUgbXVsaXBsZSBcclxuICAgICMgYXR0cmlidXRlIChpZiB0aGVyZSBpcyBubyB1bmRlcmx5aW5nIHNlbGVjdCwgdGhlbiBpdCB3aWxsIGJlIFxyXG4gICAgIyBzaW5nbGUtc2VsZWN0KS4gVGhpcyBvcHRpb24gY2Fubm90IGJlIGNoYW5nZWQgYWZ0ZXIgY3JlYXRpb24gc2luY2UgdGhlIFxyXG4gICAgIyBIVE1MIHN0cnVjdHVyZSBpcyBjb21wbGV0ZWx5IGRpZmZlcmVudDsgdG8gZG8gdGhpcywgZGVzdHJveSB0aGUgXHJcbiAgICAjIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0IGFuZCBjcmVhdGUgYSBuZXcgbXVsdGktc2VsZWN0IHdpZGdldCB3aXRoIHRoZSBzYW1lIFxyXG4gICAgIyBkYXRhLlxyXG4gICAgbXVsdGktc2VsZWN0OiBudWxsXHJcbiAgICAjIERlc2VsZWN0aW5nIGJ5IGtleWJvYXJkIChiYWNrc3BhY2UvZGVsZXRlKSBpbiBhIG11bHRpLXNlbGVjdCB3aWRnZXQgXHJcbiAgICAjIG5vcm1hbGx5IHJlcXVpcmVzIHR3byBrZXlzdHJva2VzLiBUaGUgZmlyc3Qgd2lsbCBoaWdobGlnaHQgdGhlIFxyXG4gICAgIyBzZWxlY3Rpb24gYW5kIHRoZSBzZWNvbmQgd2lsbCBkZXNlbGVjdCBpdC4gVGhpcyBhbGxvd3MgZGVzZWxlY3Rpb24gdG8gXHJcbiAgICAjIG9jY3VyIGluIG9uZSBrZXlzdHJva2UgaW5zdGVhZC4gSXQgZG9lcyBub3QgYXBwbHkgdG8gc2luZ2xlLXNlbGVjdCBcclxuICAgICMgd2lkZ2V0cy4gQ2hhbmdlcyB0byB0aGlzIG9wdGlvbiBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IFxyXG4gICAgIyBpbW1lZGlhdGVseS5cclxuICAgIHF1aWNrLWRlc2VsZWN0OiBubyAgICAgICAgICAgICBcclxuICAgICMgVGhlIG1heGltdW0gbnVtYmVyIG9mIHNlbGVjdGlvbnMgdGhhdCBjYW4gYmUgbWFkZSBpbiBhIG11bHRpLXNlbGVjdCBcclxuICAgICMgd2lkZ2V0LiBJdCBkb2VzIG5vdCBhcHBseSB0byBzaW5nbGUtc2VsZWN0IHdpZGdldHMuIENoYW5nZXMgdG8gdGhpcyBcclxuICAgICMgb3B0aW9uIHdpbGwgdGFrZSBlZmZlY3QgaW1tZWRpYXRlbHksIHRob3VnaCBpZiB0aGUgbmV3IG1heCBpcyBsZXNzIFxyXG4gICAgIyB0aGFuIHRoZSBhbW91bnQgb2YgIHNlbGVjdGlvbnMgYWxyZWFkeSBtYWRlLCB0aGUgZXh0cmEgc2VsZWN0aW9ucyB3aWxsIFxyXG4gICAgIyBub3QgYmUgZGVsZXRlZCAodGhvdWdoIG1vcmUgY2Fubm90IGJlIG1hZGUgdW50aWwgdGhlcmUgYXJlIGZld2VyIHRoYW4gXHJcbiAgICAjIHRoZSBuZXcgbWF4KS4gICAgICAgXHJcbiAgICBtYXgtc2VsZWN0ZWQ6IEluZmluaXR5ICAgICAgICAgICAgICAgIFxyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCB0aGVyZSBpcyBhIHNlYXJjaCBib3ggaW4gdGhlIHdpZGdldC4gVGhpcyBpcyBvbmx5IFxyXG4gICAgIyBhcHBsaWNhYmxlIHRvIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0cywgYXMgbXVsdGktc2VsZWN0IHdpZGdldHMgaW5oZXJlbnRseSBcclxuICAgICMgaGF2ZSBhIHNlYXJjaCBib3guIENoYW5nZXMgdG8gdGhpcyBvcHRpb24gYWZ0ZXIgY3JlYXRpb24gd2lsbCB0YWtlIFxyXG4gICAgIyBlZmZlY3QgaW1tZWRpYXRlbHkuXHJcbiAgICBzZWFyY2hhYmxlOiBub1xyXG4gICAgIyBUaGUgdGhyZXNob2xkIGJlbG93IHdoaWNoIGEgc2VhcmNoIGJveCB3aWxsIG5vdCBiZSBkaXNwbGF5ZWQuIElmIHRoZXJlIFxyXG4gICAgIyBhcmUgZmV3ZXIgb3B0aW9ucyBhdmFpbGFibGUgdGhhbiB0aGlzIG51bWJlciwgbm8gc2VhcmNoIGJveCB3aWxsIHNob3cuIFxyXG4gICAgIyBBZ2FpbiwgdGhpcyBpcyBvbmx5IGFwcGxpY2FibGUgdG8gc2luZ2xlLXNlbGVjdCB3aWRnZXRzLiBDaGFuZ2VzIHRvIFxyXG4gICAgIyB0aGlzIG9wdGlvbiBhZnRlciBjcmVhdGlvbiB3aWxsIHRha2UgZWZmZWN0IGltbWVkaWF0ZWx5LlxyXG4gICAgdGhyZXNob2xkOiAwXHJcbiAgICAjIFdoZXRoZXIgb3Igbm90IHRoZSBzZWFyY2ggdGV4dCBzaG91bGQgYmUgbWF0Y2hlZCBhZ2FpbnN0IHRoZSBiZWdpbm5pbmcgXHJcbiAgICAjIG9mIGVhY2ggaXRlbSB0ZXh0IChhcyBvcHBvc2VkIHRvIG1hdGNoaW5nIGFueXdoZXJlIHdpdGhpbiB0aGUgdGV4dCkuIFxyXG4gICAgIyBDaGFuZ2VzIHRvIHRoaXMgb3B0aW9uIGFmdGVyIGNyZWF0aW9uIHdpbGwgdGFrZSBlZmZlY3QgaW1tZWRpYXRlbHkuXHJcbiAgICBhbmNob3JlZC1zZWFyY2g6IHllc1xyXG4gICAgIyBXaGV0aGVyIG9yIG5vdCBhbiBhbmNob3JlZCBzZWFyY2ggY2FuIG1hdGNoIGFnYWluc3Qgb25seSB0aGUgYmVnaW5uaW5nIFxyXG4gICAgIyBvZiB0aGUgdGV4dCBvciBhZ2FpbnN0IHRoZSBiZWdpbm5pbmcgb2YgYW55IHdvcmQgd2l0aGluIHRoZSB0ZXh0LiBUaGlzIFxyXG4gICAgIyBoYXMgbm8gZWZmZWN0IGlmIGFuY2hvcmVkLXNlYXJjaCBpcyBuby4gQ2hhbmdlcyB0byB0aGlzIG9wdGlvbiBhZnRlciBcclxuICAgICMgY3JlYXRpb24gd2lsbCB0YWtlIGVmZmVjdCBpbW1lZGlhdGVseS5cclxuICAgIHNwbGl0LXNlYXJjaDogeWVzXHJcbiAgICAjIFRoZSB0ZXh0IHRoYXQgc2hvd3Mgb24gdGhlIHdpZGdldCB3aGVuIG5vIHNlbGVjdGlvbiBpcyBtYWRlLiBDaGFuZ2VzIHRvIFxyXG4gICAgIyB0aGlzIG9wdGlvbiB3aWxsIHRha2UgZWZmZWN0IHRoZSBuZXh0IHRpbWUgdGhhdCB0aGUgZGVmYXVsdCB0ZXh0IGlzIFxyXG4gICAgIyBzaG93biBpbiB0aGUgd2lkZ2V0LiAgICAgICAgICAgICBcclxuICAgIGRlZmF1bHQtdGV4dDogJ1NlbGVjdCBhbiBpdGVtJ1xyXG4gICAgIyBUaGUgdGV4dCBkaXNwbGF5ZWQgd2hlbiBhIHNlYXJjaCByZXR1cm5zIG5vIHJlc3VsdHMuIEl0IGlzIGFwcGVuZGVkIFxyXG4gICAgIyB3aXRoIHRoZSB0ZXh0IHRoYXQgd2FzIHNlYXJjaGVkIGZvciAoaW4gZG91YmxlIHF1b3RlcykuIENoYW5nZXMgdG8gdGhpcyBcclxuICAgICMgb3B0aW9uIGFmdGVyIGNyZWF0aW9uIHdpbGwgdGFrZSBlZmZlY3QgdGhlIG5leHQgdGltZSB0aGF0IHRoZSB0ZXh0IGlzIFxyXG4gICAgIyBkaXNwbGF5ZWQgaW4gdGhlIHdpZGdldC5cclxuICAgIG5vdC1mb3VuZC10ZXh0OiAnTm8gcmVzdWx0cyBtYXRjaCdcclxuXHJcbiAgICAjIEVWRU5UU1xyXG5cclxuICAgICMgRmlyZWQgd2hlbiBhbnl0aGluZyBpcyBzZWxlY3RlZCBvciBkZXNlbGVjdGVkLiBUaGUgZGF0YSBvYmplY3QgY29udGFpbnMgXHJcbiAgICAjIHR3byBlbGVtZW50czogaXRlbSwgd2hpY2ggY29udGFpbnMgdGhlIGpRdWVyeS13cmFwcGVkIGVsZW1lbnQgdGhhdCB3YXMgXHJcbiAgICAjIGFjdHVhbGx5IGNsaWNrZWQgb24sIGFuZCB2YWx1ZSwgd2hpY2ggaXMgYSBwbGFpbiBvYmplY3QgY29udGFpbmluZyB0aGUgXHJcbiAgICAjIGRhdGEgcmVwcmVzZW50ZWQgYnkgdGhhdCBlbGVtZW50LiBUaGUgdmFsdWUgYWx3YXlzIGhhcyB0aGUgZm9sbG93aW5nIFxyXG4gICAgIyBmaWVsZHM6IHZhbHVlLCB0ZXh0LCBodG1sLCBzZWxlY3RlZCwgZGlzYWJsZWQsIHN0eWxlLCBhbmQgY2xhc3Nlcy4gXHJcbiAgICAjIEFkZGl0aW9uYWxseSwgaXQgd2lsbCBjb250YWluIGFueSBvdGhlciBhcmJpdHJhcmlseS1uYW1lZCBmaWVsZHMgdGhhdCBcclxuICAgICMgd2VyZSBzcGVjaWZpZWQgaW4gdGhlIGRhdGEgb3B0aW9uLiBGaWVsZHMgd2hvc2UgbmFtZXMgYmVnaW4gd2l0aCBcclxuICAgICMgdW5kZXJzY29yZXMgd2lsbCBub3QgYmUgb3V0cHV0IGZyb20gdGhlIHZhbHVlIG1ldGhvZC5cclxuICAgIGNoYW5nZTogbnVsbFxyXG4gICAgIyBGaXJlZCB3aGVuIHRoZSB3aWRnZXQgbG9zZXMgZm9jdXMuIFRoaXMgaXMgaW5kZXBlbmRlbnQgb2Ygd2hldGhlciB0aGUgXHJcbiAgICAjIHNlYXJjaCBib3ggbG9zZXMgZm9jdXMuLi5pdCBsb3NlcyBmb2N1cyBuYXR1cmFsbHkgd2hlbiBvdGhlciBwYXJ0cyBvZiBcclxuICAgICMgdGhlIHdpZGdldCBhcmUgY2xpY2tlZCBvbiwgYnV0IHRoYXQncyBhY2NvdW50ZWQgZm9yIGFuZCBkb2VzIG5vdCByZXN1bHQgXHJcbiAgICAjIGluIHRoZSBmaXJpbmcgb2YgdGhpcyBldmVudC5cclxuICAgIGJsdXI6IG51bGxcclxuICAgICMgRmlyZWQgd2hlbiB0aGUgd2lkZ2V0IGdhaW5zIGZvY3VzLiBUaGUgc2VhcmNoIGJveCAod2hpY2ggaXMgdGhlIHBhcnQgXHJcbiAgICAjIHdpdGggdGhlIHRhYmluZGV4IHNvIGlzIHRoZSBwYXJ0IHRoYXQgcmVjZWl2ZXMgZm9jdXMgbmF0dXJhbGx5KSBvZnRlbiBcclxuICAgICMgbG9zZXMgYW5kIHJlZ2FpbnMgZm9jdXMgd2hlbiBvdGhlciBwYXJ0cyBvZiB0aGUgd2lkZ2V0IGFyZSBjbGlja2VkLCBidXQgXHJcbiAgICAjIHRoaXMgaXMgY29tcGVuc2F0ZWQgZm9yIGFuZCBkb2VzIG5vdCByZXN1bHQgaW4gdGhlIGZpcmluZyBvZiBleHRyYSBcclxuICAgICMgZXZlbnRzLlxyXG4gICAgZm9jdXM6IG51bGxcclxuICAgICMgRmlyZWQgd2hlbiB0aGUgc2l6ZSBvZiB0aGUgYWx3YXlzLXZpc2libGUgcG9ydGlvbiBvZiB0aGUgd2lkZ2V0IGNoYW5nZXMuXHJcbiAgICAjIFRoaXMgZ2VuZXJhbGx5IG9ubHkgaGFwcGVucyBpbiBtdWx0aS1zZWxlY3Qgd2lkZ2V0cyAod2hlbiBlbm91Z2ggb3B0aW9uc1xyXG4gICAgIyBhcmUgc2VsZWN0ZWQgb3IgZGVzZWxlY3RlZCB0aGF0IGl0IGNoYW5nZXMgdGhlIGhlaWdodCBvZiB0aGUgd2lkZ2V0KSwgXHJcbiAgICAjIGJ1dCBpdCBpcyBhbHNvIGZpcmVkIGluIGFsbCB3aWRnZXRzIHdoZW4gdGhleSdyZSBjcmVhdGVkIG9yIHdoZW4gdGhlaXIgXHJcbiAgICAjIHdpZHRoIGlzIGNoYW5nZWQgcHJvZ3JhbW1hdGljYWxseS5cclxuICAgIHJlc2l6ZTogbnVsbFxyXG4gICAgIyBGaXJlZCB3aGVuIHRoZSBkcm9wZG93biBwb3J0aW9uIG9mIHRoZSB3aWRnZXQgaXMgZGlzcGxheWVkLlxyXG4gICAgb3BlbjogbnVsbFxyXG4gICAgIyBGaXJlZCB3aGVuIHRoZSBkcm9wZG93biBwb3J0aW9uIG9mIHRoZSB3aWRnZXQgaXMgaGlkZGVuLlxyXG4gICAgY2xvc2U6IG51bGxcclxuXHJcbiAgIyBUaGUgZnVsbCBydW5kb3duIG9uIGhvdyBwb3N0LWNyZWF0aW9uIGNoYW5nZXMgd29yayBpcyBsaXN0ZWQgdW5kZXIgdGhlIFxyXG4gICMgaW5kaXZpZHVhbCBvcHRpb25zIGFib3ZlLlxyXG4gIF9zZXQtb3B0aW9uOiAoa2V5LCB2YWx1ZSkgIS0+XHJcbiAgICBzd2l0Y2gga2V5XHJcbiAgICAgIGNhc2UgXFxydGxcclxuICAgICAgICBpZiB2YWx1ZSB0aGVuIEBjb250YWluZXIuYWRkLWNsYXNzIFxcYmFyLXNwLXJ0bCBlbHNlIEBjb250YWluZXIucmVtb3ZlLWNsYXNzIFxcYmFyLXNwLXJ0bFxyXG4gICAgICAgIEBfc3VwZXIga2V5LCB2YWx1ZVxyXG4gICAgICBjYXNlIFxcZGVzZWxlY3RhYmxlXHJcbiAgICAgICAgaWYgbm90IEBtdWx0aXBsZVxyXG4gICAgICAgICAgaWYgdmFsdWUgdGhlbiBAX2J1aWxkLWRlc2VsZWN0LWNvbnRyb2whIGlmIEBzZWxlY3RlZC1vcHRpb24gXHJcbiAgICAgICAgICBlbHNlIEBzZWxlY3Rpb24uZmluZCBcXC5iYXItc3AtZGVzZWxlY3QgLnJlbW92ZSFcclxuICAgICAgICBAX3N1cGVyIGtleSwgdmFsdWVcclxuICAgICAgY2FzZSBcXHNlYXJjaGFibGVcclxuICAgICAgICBpZiBub3QgQG11bHRpcGxlXHJcbiAgICAgICAgICBpZiB2YWx1ZSB0aGVuIEBzZWFyY2gtZmllbGQucmVtb3ZlLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcbiAgICAgICAgICBlbHNlIEBzZWFyY2gtZmllbGQuYWRkLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcbiAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcbiAgICAgIGNhc2UgXFxkYXRhXHJcbiAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcbiAgICAgICAgQF9idWlsZC1vcHRpb25zIVxyXG4gICAgICBjYXNlIFxcdGhyZXNob2xkXHJcbiAgICAgICAgaWYgbm90IEBtdWx0aXBsZVxyXG4gICAgICAgICAgaWYgbm90IEBvcHRpb25zLnNlYXJjaGFibGUgb3IgQG1vZGVsLmxlbmd0aCA8PSB2YWx1ZVxyXG4gICAgICAgICAgICBAc2VhcmNoLWZpZWxkLmFkZC1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBAc2VhcmNoLWZpZWxkLnJlbW92ZS1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW4tYWNjZXNzaWJsZVxyXG4gICAgICAgIEBfc3VwZXIga2V5LCB2YWx1ZVxyXG4gICAgICBjYXNlIFxcZGlzYWJsZWRcclxuICAgICAgICBAX3N1cGVyIGtleSwgdmFsdWVcclxuICAgICAgICBAX3NldC1kaXNhYmxlZC1zdGF0ZSFcclxuICAgICAgY2FzZSBcXHdpZHRoXHJcbiAgICAgICAgb2xkLXdpZHRoID0gQHdpZHRoXHJcbiAgICAgICAgQHdpZHRoID0gdmFsdWUgb3IgQGVsZW1lbnQub3V0ZXItd2lkdGghXHJcbiAgICAgICAgaWYgb2xkLXdpZHRoIGlzbnQgQHdpZHRoXHJcbiAgICAgICAgICBAY29udGFpbmVyLmNzcyBcXHdpZHRoLCBcIiN7QC53aWR0aH1weFwiXHJcbiAgICAgICAgICBkZC13aWR0aCA9IEB3aWR0aCAtIEBfZ2V0LWJvcmRlci1hbmQtc2lkZS13aWR0aCBAZHJvcGRvd25cclxuICAgICAgICAgIEBkcm9wZG93bi5jc3MgXFx3aWR0aCwgXCIje2RkLXdpZHRofXB4XCJcclxuICAgICAgICAgIEBfcmVzaXplLXNlYXJjaC1maWVsZCFcclxuICAgICAgICAgIEBfdHJpZ2dlciBcXHJlc2l6ZSwgbnVsbCxcclxuICAgICAgICAgICAgaXRlbTogQHNlbGVjdGlvblxyXG4gICAgICAgICAgICBkYXRhOlxyXG4gICAgICAgICAgICAgIGhlaWdodDogQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgICAgICAgICAgd2lkdGg6IEBzZWxlY3Rpb24ub3V0ZXItd2lkdGghXHJcbiAgICAgICAgICBAX3N1cGVyIGtleSwgdmFsdWVcclxuICAgICAgY2FzZSBcXG11bHRpU2VsZWN0IFxcaW5oZXJpdFxyXG4gICAgICAgICMgRG8gbm90aGluZywgaW5jbHVkaW5nIHNldHRpbmcgdGhlIHZhbHVlIG9mIHRoZSBvcHRpb25cclxuICAgICAgICBicmVha1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9zdXBlciBrZXksIHZhbHVlXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFdJREdFVCBPUFRJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBXSURHRVQgQ1JFQVRJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIENyZWF0aW9uIGludm9sdmVzIHNldHRpbmcgdXAgdGhlIEhUTUwgZm9yIHRoZSB3aWRnZXQsIHdoaWNoIGlzIHNlcGFyYXRlIFxyXG4gICMgZnJvbSB0aGUgSFRNTCBvZiBhIHNlbGVjdCBlbGVtZW50IHRoYXQgdGhlIHdpZGdldCBpcyBidWlsdCBmcm9tLiBUaGUgXHJcbiAgIyBvcmlnaW5hbCBzZWxlY3QgZWxlbWVudCBpcyBoaWRkZW4sIGJ1dCBpdCByZW1haW5zIHBhcnQgb2YgdGhlIERPTS4gRm9yIFxyXG4gICMgdGhpcyByZWFzb24sIGZvciBsYXJnZXIgZGF0YXNldHMgKGludm9sdmluZyBwZXJoYXBzIGEgZmV3IGh1bmRyZWQgaXRlbXMpLCBcclxuICAjIGl0IG1heSBiZSBiZXR0ZXIgdG8gdXNlIEpTT04gZGF0YSBzbyBhdm9pZCBoYXZpbmcgdGhlIHJhdyBkYXRhIGJlIHBhcnQgb2YgXHJcbiAgIyB0aGUgRE9NLlxyXG4gICNcclxuICAjIEV2ZW50cyBhcmUgYWxzbyBzZXQgdXAgaW4gY3JlYXRpb24sIGFuZCB0aGUgZnJhbWV3b3JrIGZpcmVzIG9mZiBhICdjcmVhdGUnXHJcbiAgIyBldmVudCBhdCB0aGUgZW5kLlxyXG4gIF9jcmVhdGU6ICEtPlxyXG5cclxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAgICMgTUVNQkVSIEZJRUxEU1xyXG5cclxuICAgICMgQWxsIG9mIHRoZSBtZW1iZXIgZmllbGRzIGFyZSBsaXN0ZWQgaGVyZSBmb3IgdGhlIHNha2Ugb2YgZG9jdW1lbnRhdGlvbi5cclxuXHJcbiAgICAjIEluZGljYXRlcyB3aGV0aGVyIHRoaXMgaXMgYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBJZiBmYWxzZSwgYSBzaW5nbGUtXHJcbiAgICAjIHNlbGVjdCB3aWRnZXQgaXMgY3JlYXRlZC4gKGJvb2xlYW4pXHJcbiAgICBAbXVsdGlwbGUgICAgICAgICAgICA9IEBvcHRpb25zLm11bHRpLXNlbGVjdCA/IG5vdCBub3QgQGVsZW1lbnQuMC5tdWx0aXBsZVxyXG4gICAgIyBGbGFnIGluZGljYXRpbmcgd2hldGhlciB0aGlzIHdpZGdldCBpcyB0aGUgYWN0aXZlIChmb2N1c2VkKSBcclxuICAgICMgb25lLiAoYm9vbGVhbilcclxuICAgIEBhY3RpdmUgICAgICAgICAgICAgICA9IG5vXHJcbiAgICAjIEZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGEgYmx1ciBldmVudCBvbiB0aGUgc2VhcmNoIGZpZWxkIHdhcyBjYXVzZWQgYnkgXHJcbiAgICAjIGEgY2xpY2sgb24gYW5vdGhlciBwYXJ0IG9mIHRoZSB3aWRnZXQuIFRoZSBibHVyIGV2ZW50IGhhbmRsZXIgdXNlcyB0aGlzIFxyXG4gICAgIyBpbmZvcm1hdGlvbiB0byBrbm93IHdoZXRoZXIgaXQgc2hvdWxkIHJlYWxseSBmaXJlIGEgYmx1ciBldmVudCAoaXQgXHJcbiAgICAjIHNob3VsZCBub3QgaWYgdGhlIGJsdXIgd2FzIGNhdXNlZCBieSBjbGlja2luZyBvbiBhbm90aGVyIHBhcnQgb2YgdGhlIFxyXG4gICAgIyB3aWRnZXQpLiAoYm9vbGVhbilcclxuICAgIEBjbGlja2VkICAgICAgICAgICAgICA9IG5vXHJcbiAgICAjIEZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBkcm9wLWRvd24gYm94IGlzIHZpc2libGUuIChib29sZWFuKVxyXG4gICAgQG9wZW4gICAgICAgICAgICAgICAgID0gbm9cclxuICAgICMgRmxhZyB0aGF0IGluZGljYXRlcyB3aGV0aGVyIHRoZSBiYWNrc3BhY2Uga2V5IGhhcyBhbHJlYWR5IGJlZW4gXHJcbiAgICAjIHJlZ2lzdGVyZWQgb25jZSBmb3IgYSBtdWx0aS1zZWxlY3Qgc2VsZWN0aW9uLiBBIHNlY29uZCBwcmVzcyBvZiB0aGF0IFxyXG4gICAgIyBrZXkgd2hpbGUgdGhpcyBmbGFnIGlzIHRydWUgcmVzdWx0cyBpbiB0aGF0IHNlbGVjdGlvbidzIGRlc3RydWN0aW9uLiBcclxuICAgICMgKGJvb2xlYW4pXHJcbiAgICBAZGVzdHJ1Y3Rpb24tcGVuZGluZyAgPSBub1xyXG5cclxuICAgICMgVGhlIG9wdGlvbiB0aGF0IGlzIGhpZ2hsaWdodGVkIHZpYSBtb3VzZW92ZXIgb3Iga2V5IGNsaWNrLiAoalF1ZXJ5IFxyXG4gICAgIyBvYmplY3QpXHJcbiAgICBAaGlnaGxpZ2h0ZWQtb3B0aW9uICAgPSBudWxsXHJcbiAgICAjIFRoZSBvcHRpb24gdGhhdCBpcyB0aGUgY3VycmVudCBzZWxlY3Rpb24uIFNpbmdsZS1zZWxlY3Qgb25seS4gKGpRdWVyeSBcclxuICAgICMgb2JqZWN0KVxyXG4gICAgQHNlbGVjdGVkLW9wdGlvbiAgICAgID0gbnVsbFxyXG5cclxuICAgICMgVGhlIG51bWJlciBvZiBzZWxldGlvbnMgdGhhdCBoYXZlIGJlZW4gbWFkZS4gTXVsdGktc2VsZWN0IG9ubHkuIChudW1iZXIpXHJcbiAgICBAc2VsZWN0aW9ucyAgICAgICAgICAgPSAwXHJcbiAgICAjIFRoZSB3aWR0aCBvZiB0aGUgd2lkZ2V0LiBUaGlzIGlzIGJhc2VkIG9uIHRoZSB3aWR0aCBvZiB0aGUgdW5kZXJseWluZyBcclxuICAgICMgZWxlbWVudC4gKG51bWJlcilcclxuICAgIEB3aWR0aCAgICAgICAgICAgICAgICA9IEBvcHRpb25zLndpZHRoIG9yIEBlbGVtZW50Lm91dGVyLXdpZHRoIVxyXG5cclxuICAgICMgVGhlIGN1cnJlbnQgdmFsdWUgaXMgZGlmZmVyZW50IGZyb20gdGhlIHNlbGVjdGVkIG9wdGlvbi4gVGhlIGxhdHRlciBpcyBcclxuICAgICMgYSBqUXVlcnkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgb3B0aW9uIChhbiA8YT4gZWxlbWVudCkgdGhhdCB3YXMgXHJcbiAgICAjIHNlbGVjdGVkLiBUaGlzIGlzIGluc3RlYWQgb25lIG9mIHRoZSBlbGVtZW50cyBvZiB0aGUgbW9kZWwsIGEgcGxhaW4gXHJcbiAgICAjIG9iamVjdCBjb250YWluaW5nIHRoZSB2YWx1ZSwgdGV4dCwgaHRtbCwgY2xhc3Nlcywgc3R5bGUsIGFuZCBzZWxlY3RlZCBcclxuICAgICMgYW5kIGRpc2FibGVkIHByb3BlcnRpZXMgb2YgdGhlIHNlbGVjdGVkIGVsZW1lbnQuIChzaW5nbGUtc2VsZWN0OiBwbGFpbiBcclxuICAgICMgb2JqZWN0LCBtdWx0aS1zZWxlY3Q6IGFycmF5IG9mIHBsYWluIG9iamVjdHMpXHJcbiAgICBAY3VycmVudC12YWx1ZSAgICAgICAgPSBpZiBAbXVsdGlwbGUgdGhlbiBbXSBlbHNlIG51bGxcclxuXHJcbiAgICAjIFRoZSBJRCBvZiB0aGUgY29udGFpbmVyLiBJZiB0aGVyZSB3YXMgYW4gSUQgb24gdGhlIGVsZW1lbnQgdGhhdCB0aGlzIFxyXG4gICAgIyB3aWRnZXQgd2FzIGFzc2lnbmVkIHRvLCBpdCdzIHVzZWQgaW4gY3JlYXRpbmcgdGhlIGNvbnRhaW5lciBJRC4gSWYgXHJcbiAgICAjIHRoZXJlIGlzIG5vdCwgdGhlIGJhc2Ugb2YgdGhlIElEIGNvbnNpc3RzIG9mIDYgcmFuZG9tIGFscGhhbnVtZXJpYyBcclxuICAgICMgY2hhcmFjdGVycy4gKHN0cmluZylcclxuICAgIEBjb250YWluZXItaWQgICAgICAgICA9IChpZiBAZWxlbWVudC5hdHRyIFxcaWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVuIEBlbGVtZW50LmF0dHIgXFxpZCAucmVwbGFjZSAvW15cXHddL2cgXFwtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBAX2dlbmVyYXRlLWNvbnRhaW5lci1pZCEpICsgXFwtc2VsZWN0cGx1c1xyXG5cclxuICAgICMgVGhlIHJvb3QgZWxlbWVudCBvZiB0aGUgd2lkZ2V0LCBjb250YWluaW5nIGFsbCBvdGhlciBlbGVtZW50cy4gKGpRdWVyeSBcclxuICAgICMgb2JqZWN0KVxyXG4gICAgQGNvbnRhaW5lciAgICAgICAgICAgID0gbnVsbFxyXG4gICAgIyBUaGUgY29udGFpbmVyIGVsZW1lbnQgZm9yIHRoZSBkcm9wZG93biBwb3J0aW9uIG9mIHRoZSB3aWRnZXQsIFxyXG4gICAgIyBjb250YWluaW5nIGFsbCBvZiB0aGUgb3B0aW9ucy4gKGpRdWVyeSBvYmplY3QpXHJcbiAgICBAZHJvcGRvd24gICAgICAgICAgICAgPSBudWxsXHJcbiAgICAjIFRoZSBjb250YWluZXIgZm9yIHRoZSBvcHRpb25zIHRoYXQgY2FuIGJlIGNob3NlbiBmcm9tLiAoalF1ZXJ5IG9iamVjdClcclxuICAgIEBzZWxlY3Qtb3B0aW9ucyAgICAgICA9IG51bGxcclxuICAgICMgVGhlIGNvbnRhaW5lciBlbGVtZW50IGZvciB0aGUgc2VhcmNoIGZpZWxkIGFuZCB0aGUgc2VsZWN0aW9ucyB0aGF0IGhhdmUgXHJcbiAgICAjIGJlZW4gbWFkZS4gTm90ZSB0aGF0IHRoaXMgYWx3YXlzIGV4aXN0czsgaXQncyBtZXJlbHkgaGlkZGVuIGluIGEgXHJcbiAgICAjIG5vbnNlYXJjaGFibGUgd2lkZ2V0LiAoalF1ZXJ5IG9iamVjdClcclxuICAgIEBzZWFyY2gtY29udGFpbmVyICAgICA9IG51bGxcclxuICAgICMgVGhlIGFjdHVhbCBzZWFyY2ggaW5wdXQgY29udHJvbC4gKGpRdWVyeSBvYmplY3QpXHJcbiAgICBAc2VhcmNoLWZpZWxkICAgICAgICAgPSBudWxsXHJcbiAgICAjIFRoZSBlbGVtZW50IHRoYXQgaW5kaWNhdGVzIHdoYXQgb3B0aW9uKHMpIGhhcyAoaGF2ZSkgYmVlbiBzZWxlY3RlZC4gXHJcbiAgICAjIChqUXVlcnkgb2JqZWN0KVxyXG4gICAgQHNlbGVjdGlvbiAgICAgICAgICAgID0gbnVsbFxyXG5cclxuICAgICMgQWN0aW9ucyB0aGF0IGZpcmUgd2hlbiB0aGUgY29udGFpbmVyIGlzIGNsaWNrZWQsIHRoZSBkb2N1bWVudCBpcyBcclxuICAgICMgY2xpY2tlZCwgYW5kIHRoZSBiYWNrc3BhY2Uga2V5IGlzIHByZXNzZWQuIFRoZXNlIGFyZSBqdXN0IHJlLXVzYWJsZSBcclxuICAgICMgZXZlbnQgaGFuZGxlcnMsIGNyZWF0ZWQgZWl0aGVyIGJlY2F1c2UgYSBoYW5kbGVyIGlzIHVzZWQgaW4gbW9yZSB0aGFuIFxyXG4gICAgIyBvbmUgcGxhY2Ugb3IgIGJlY2F1c2UgaXQncyByZWN1cnNpdmUuXHJcbiAgICBAY29udGFpbmVyLWNsaWNrLWFjdGlvbiAgICAgPSBudWxsXHJcbiAgICBAZG9jdW1lbnQtY2xpY2stYWN0aW9uICAgICAgPSBudWxsXHJcbiAgICBAYmFja3NwYWNlLWFjdGlvbiAgICAgICAgICAgPSBudWxsXHJcblxyXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICAgIyBIVE1MIENSRUFUSU9OXHJcblxyXG4gICAgY29udGFpbmVyLWNsYXNzZXMgPSA8WyB1aS13aWRnZXQgYmFyLXNwIF0+XHJcbiAgICBjb250YWluZXItY2xhc3Nlcy5wdXNoIFxcYmFyLXNwLSArIChpZiBAbXVsdGlwbGUgdGhlbiBcXG11bHRpIGVsc2UgXFxzaW5nbGUpXHJcbiAgICBjb250YWluZXItY2xhc3Nlcy5wdXNoIEBlbGVtZW50LmF0dHIgXFxjbGFzcyBpZiBAb3B0aW9ucy5pbmhlcml0IGFuZCAkLnRyaW0gQGVsZW1lbnQuYXR0ciBcXGNsYXNzIC5sZW5ndGhcclxuICAgIGNvbnRhaW5lci1jbGFzc2VzLnB1c2ggXFxiYXItc3AtcnRsIGlmIEBvcHRpb25zLnJ0bFxyXG5cclxuICAgIGNvbnRhaW5lci1wcm9wcyA9XHJcbiAgICAgIGlkOiBAY29udGFpbmVyLWlkXHJcbiAgICAgIGNsYXNzOiBjb250YWluZXItY2xhc3NlcyAqICcgJ1xyXG4gICAgICBzdHlsZTogXCJ3aWR0aDoje0B3aWR0aH1weDtcIlxyXG4gICAgICB0aXRsZTogQGVsZW1lbnQuYXR0ciBcXHRpdGxlXHJcbiAgICBcclxuICAgIEBjb250YWluZXIgPSAkIFxcPGRpdj4gY29udGFpbmVyLXByb3BzXHJcbiAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgQGNvbnRhaW5lci5odG1sICBcIjx1bCBjbGFzcz1cXFwidWktY29ybmVyLWFsbCBiYXItc3Atc2VsZWN0aW9uc1xcXCIgdGFiaW5kZXg9XFxcIi0xXFxcIiByb2xlPVxcXCJjb21ib2JveFxcXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1hY3RpdmVkZXNjZW5kYW50PVxcXCJcXFwiIGFyaWEtb3ducz1cXFwiI3tAY29udGFpbmVyLWlkfS1kcm9wXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGxpIGNsYXNzPVxcXCJiYXItc3Atc2VhcmNoXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIiN7QG9wdGlvbnMuZGVmYXVsdC10ZXh0fVxcXCIgY2xhc3M9XFxcImJhci1zcC1kZWZhdWx0XFxcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvY29tcGxldGU9XFxcIm9mZlxcXCIgcm9sZT1cXFwidGV4dGJveFxcXCI+PC9saT48L3VsPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVxcXCIje0Bjb250YWluZXItaWR9LWRyb3BcXFwiIGNsYXNzPVxcXCJ1aS13aWRnZXQtY29udGVudCB1aS1mcm9udCB1aS1tZW51IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVpLWNvcm5lci1ib3R0b20gdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlIGJhci1zcC1kcm9wXFxcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVxcXCJiYXItc3Atb3B0aW9uc1xcXCIgcm9sZT1cXFwibGlzdGJveFxcXCIgYXJpYS1saXZlPVxcXCJwb2xpdGVcXFwiIHRhYmluZGV4PVxcXCItMVxcXCI+PC91bD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XCJcclxuICAgIGVsc2VcclxuICAgICAgQGNvbnRhaW5lci5odG1sICBcIjxhIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKVxcXCIgY2xhc3M9XFxcInVpLXdpZGdldCB1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYmFyLXNwLXNlbGVjdGlvblxcXCIgdGFiaW5kZXg9XFxcIi0xXFxcIiByb2xlPVxcXCJjb21ib2JveFxcXCIgYXJpYS1hY3RpdmVkZXNjZW5kYW50PVxcXCJcXFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwidWktcHJpb3JpdHktc2Vjb25kYXJ5XFxcIj4je0BvcHRpb25zLmRlZmF1bHQtdGV4dH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcInVpLWljb24gdWktaWNvbi10cmlhbmdsZS0xLXNcXFwiIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCI+PC9kaXY+PC9hPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJ1aS13aWRnZXQtY29udGVudCB1aS1mcm9udCB1aS1tZW51IHVpLWNvcm5lci1ib3R0b20gdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGJhci1zcC1kcm9wXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJiYXItc3Atc2VhcmNoXFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcInVpLWNvcm5lci1hbGxcXFwiIGF1dG9jb21wbGV0ZT1cXFwib2ZmXFxcIiByb2xlPVxcXCJ0ZXh0Ym94XFxcIj48L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVxcXCJiYXItc3Atb3B0aW9uc1xcXCIgcm9sZT1cXFwibGlzdGJveFxcXCIgYXJpYS1saXZlPVxcXCJwb2xpdGVcXFwiIHRhYmluZGV4PVxcXCItMVxcXCIvPjwvZGl2PlwiXHJcblxyXG4gICAgQGVsZW1lbnQuaGlkZSFhZnRlciBAY29udGFpbmVyXHJcblxyXG4gICAgQGRyb3Bkb3duID0gQGNvbnRhaW5lci5maW5kIFxcZGl2LmJhci1zcC1kcm9wIC5maXJzdCFcclxuICAgIGRkLXdpZHRoID0gQHdpZHRoIC0gQF9nZXQtYm9yZGVyLWFuZC1zaWRlLXdpZHRoIEBkcm9wZG93blxyXG4gICAgQGRyb3Bkb3duLmNzcyB3aWR0aDogZGQtd2lkdGggKyBcXHB4XHJcblxyXG4gICAgQHNlYXJjaC1maWVsZCA9IEBjb250YWluZXIuZmluZCBcXGlucHV0IC5maXJzdCFcclxuICAgIEBzZWxlY3Qtb3B0aW9ucyA9IEBjb250YWluZXIuZmluZCBcXHVsLmJhci1zcC1vcHRpb25zIC5maXJzdCFcclxuXHJcbiAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgQHNlYXJjaC1jb250YWluZXIgPSBAY29udGFpbmVyLmZpbmQgXFxsaS5iYXItc3Atc2VhcmNoIC5maXJzdCFcclxuICAgICAgQHNlbGVjdGlvbiA9IEBjb250YWluZXIuZmluZCBcXHVsLmJhci1zcC1zZWxlY3Rpb25zIC5maXJzdCFcclxuICAgIGVsc2VcclxuICAgICAgQHNlYXJjaC1jb250YWluZXIgPSBAY29udGFpbmVyLmZpbmQgXFxkaXYuYmFyLXNwLXNlYXJjaCAuZmlyc3QhXHJcbiAgICAgIEBzZWxlY3Rpb24gPSBAY29udGFpbmVyLmZpbmQgXFxhLmJhci1zcC1zZWxlY3Rpb24gLmZpcnN0IVxyXG5cclxuICAgICQuZWFjaCBAZWxlbWVudC5hdHRyISwgKG5hbWUsIHZhbHVlKSAhfj4gQHNlbGVjdGlvbi5hdHRyIG5hbWUsIHZhbHVlIGlmIC9eYXJpYS0vIGlzIG5hbWVcclxuXHJcbiAgICBAX3Jlc2l6ZS1zZWFyY2gtZmllbGQhXHJcbiAgICBAX2J1aWxkLW9wdGlvbnMhXHJcbiAgICBAX3NldC10YWItaW5kZXghXHJcblxyXG4gICAgIyBUcmlnZ2VyIHJlc2l6ZSB3aGVuIHRoZSBjb250cm9sIGlzIGZpcnN0IGJ1aWx0IHRvIGluZGljYXRlIGluaXRpYWwgc2l6ZVxyXG4gICAgQF90cmlnZ2VyIFxccmVzaXplLCBudWxsLFxyXG4gICAgICBpdGVtOiBAc2VsZWN0aW9uXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgaGVpZ2h0OiBAc2VsZWN0aW9uLm91dGVyLWhlaWdodCFcclxuICAgICAgICB3aWR0aDogQHNlbGVjdGlvbi5vdXRlci13aWR0aCFcclxuXHJcbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgICAjIEVWRU5UIEhBTkRMRVIgT0JKRUNUU1xyXG5cclxuICAgICMgQmFzaWMgY2xpY2sgYWN0aW9uIGZvciB0aGUgY29udGFpbmVyIGFzIGEgd2hvbGUsIHdoaWNoIGJhc2ljYWxseSBqdXN0IFxyXG4gICAgIyBjbGVhbnMgdGhpbmdzIHVwIGFuZCBvcGVucyB0aGUgZHJvcGRvd24uXHJcbiAgICBAY29udGFpbmVyLWNsaWNrLWFjdGlvbiA9IChldmVudCkgIX4+XHJcbiAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgaWYgbm90IEBvcHRpb25zLmRpc2FibGVkXHJcbiAgICAgICAgZGVzZWxlY3QgPSBpZiBldmVudD8gdGhlbiAkIGV2ZW50LnRhcmdldCAuaGFzLWNsYXNzIFxcYmFyLXNwLWRlc2VsZWN0IGVsc2UgZmFsc2VcclxuICAgICAgICBpZiBub3QgQG11bHRpcGxlIGFuZCBkZXNlbGVjdFxyXG4gICAgICAgICAgQF9yZXNldC1vcHRpb25zIGV2ZW50XHJcbiAgICAgICAgZWxzZSBpZiBAbXVsdGlwbGUgYW5kIEBkZXN0cnVjdGlvbi1wZW5kaW5nXHJcbiAgICAgICAgICBAZGVzdHJ1Y3Rpb24tcGVuZGluZyA9IG5vXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgaWYgbm90IEBhY3RpdmVcclxuICAgICAgICAgICAgQHNlYXJjaC1maWVsZC52YWwgJycgaWYgQG11bHRpcGxlXHJcbiAgICAgICAgICAgICQgZG9jdW1lbnQgLmNsaWNrIEBkb2N1bWVudC1jbGljay1hY3Rpb25cclxuICAgICAgICAgICAgQF9vcGVuLWRyb3Bkb3duIVxyXG4gICAgICAgICAgZWxzZSBpZiBub3QgQG11bHRpcGxlIGFuZCBldmVudD8gYW5kIChldmVudC50YXJnZXQgaXMgQHNlbGVjdGlvbi4wIG9yIFxcXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQgZXZlbnQudGFyZ2V0IC5wYXJlbnRzIFxcYS5iYXItc3Atc2VsZWN0aW9uIC5sZW5ndGgpXHJcbiAgICAgICAgICAgIEBfdG9nZ2xlLWRyb3Bkb3duIVxyXG4gICAgICAgICAgQF9hY3RpdmF0ZS13aWRnZXQgZXZlbnRcclxuXHJcbiAgICAjIFRoaXMgbW91c2V3aGVlbCBhY3Rpb24gaXMgd2hhdCBlbXVsYXRlcyBzZWxlY3QtY29udHJvbC1saWtlIHNjcm9sbGluZyBcclxuICAgICMgZm9yIHRoZSB3aWRnZXQuIFJlZ3VsYXJseSwgb25jZSB0aGUgdG9wIG9yIGJvdHRvbSBvZiB0aGUgZHJvcGRvd24gd2FzIFxyXG4gICAgIyByZWFjaGVkIGFuZCBzY3JvbGxpbmcgY29udGludWVkLCB0aGUgc2Nyb2xsIGV2ZW50IHdvdWxkIGJ1YmJsZSB0byB0aGUgXHJcbiAgICAjIHdpbmRvdyBhbmQgbWFrZSB0aGUgcGFnZSBhcyBhIHdob2xlIHNjcm9sbC4gVGhpcyBhY3Rpb24gc3RvcHMgdGhlIFxyXG4gICAgIyBzY3JvbGxpbmcgYW5kIHByZXZlbnRzIGJ1YmJsaW5nIHdoZW4gdGhlIGRyb3Bkb3duIGlzIGF0IHRoZSB0b3Agb3IgdGhlIFxyXG4gICAgIyBib3R0b20uXHJcbiAgICBAbW91c2V3aGVlbC1hY3Rpb24gPSAoZXZlbnQpICF+PlxyXG4gICAgICBvcmlnLWV2ZW50ID0gZXZlbnQub3JpZ2luYWwtZXZlbnRcclxuICAgICAgZGVsdGEgPSBpZiBvcmlnLWV2ZW50LmRldGFpbCA8IDAgb3Igb3JpZy1ldmVudC53aGVlbC1kZWx0YSA+IDAgdGhlbiAxIGVsc2UgLTFcclxuICAgICAgaWYgZGVsdGEgPiAwIGFuZCBAc2VsZWN0LW9wdGlvbnMuc2Nyb2xsLXRvcCEgaXMgMFxyXG4gICAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgZWxzZSBpZiBkZWx0YSA8IDAgYW5kIFxcXHJcbiAgICAgICAgICBAc2VsZWN0LW9wdGlvbnMuc2Nyb2xsLXRvcCEgaXMgQHNlbGVjdC1vcHRpb25zLmdldCAwIC5zY3JvbGwtaGVpZ2h0IC0gQHNlbGVjdC1vcHRpb25zLmlubmVyLWhlaWdodCFcclxuICAgICAgICBldmVudC5wcmV2ZW50LWRlZmF1bHQhXHJcblxyXG4gICAgIyBEZWZhdWx0IGNsaWNrIGFjdGlvbiBvbiB0aGUgZW50aXJlIGRvY3VtZW50LiBJdCBjaGVja3MgdG8gc2VlIHdoZXRoZXIgXHJcbiAgICAjIHRoZSBtb3VzZSBpcyBvdmVyIHRoZSBjb250cm9sLCBjbG9zaW5nIGFuIG9wZW4gY29udHJvbCBpZiBpdCBpc24ndC5cclxuICAgIEBkb2N1bWVudC1jbGljay1hY3Rpb24gPSAoZXZlbnQpICF+PlxyXG4gICAgICBpZiAkIGV2ZW50LnRhcmdldCAucGFyZW50cyBcIiMje0Bjb250YWluZXItaWR9XCIgLmxlbmd0aCB0aGVuIEBhY3RpdmUgPSB5ZXNcclxuICAgICAgZWxzZSBAX2RlYWN0aXZhdGUtd2lkZ2V0IGV2ZW50XHJcblxyXG4gICAgIyBUcmFja3Mgd2hldGhlciBiYWNrc3BhY2UgaGFzIGFscmVhZHkgYmVlbiBwcmVzc2VkIGFuZCBvbmx5IGRlc2VsZWN0cyBhbiBcclxuICAgICMgb3B0aW9uIGlmIGl0IGhhcy4gVGhpcyBpbXBsZW1lbnRzIHRoZSB0d28tc3RlcCBkZXNlbGVjdGlvbiBwcm9jZXNzIHRoYXQgXHJcbiAgICAjIGtlZXBzIG9wdGlvbnMgZnJvbSBiZWluZyBkZXNlbGVjdGVkIGFjY2lkZW50YWxseSBmb3IgaGl0dGluZyB0aGUgXHJcbiAgICAjIGJhY2tzcGFjZSBrZXkgb25lIHRvbyBtYW55IHRpbWVzLlxyXG4gICAgQGJhY2tzcGFjZS1hY3Rpb24gPSAoZXZlbnQpICEtPlxyXG4gICAgICBpZiBAcGVuZGluZy1kZXNlbGVjdGlvblxyXG4gICAgICAgIHBvcyA9IEBfZ2V0LW1vZGVsLWluZGV4IEBwZW5kaW5nLWRlc2VsZWN0aW9uXHJcbiAgICAgICAgQF9kZXNlbGVjdC1vcHRpb24gZXZlbnQsICQgXCIjI3tAX2dlbmVyYXRlLWRvbS1pZCBcXG9wdGlvbiBwb3N9XCJcclxuICAgICAgICBAX2NsZWFyLWJhY2tzcGFjZSFcclxuICAgICAgZWxzZVxyXG4gICAgICAgIG5leHQtYXZhaWxhYmxlID0gQHNlYXJjaC1jb250YWluZXIuc2libGluZ3MgXFxsaS5iYXItc3Atc2VsZWN0aW9uIC5sYXN0IVxyXG4gICAgICAgIGlmIG5leHQtYXZhaWxhYmxlLmxlbmd0aCBhbmQgbm90IG5leHQtYXZhaWxhYmxlLmhhcy1jbGFzcyBcXHVpLXN0YXRlLWRpc2FibGVkXHJcbiAgICAgICAgICBAcGVuZGluZy1kZXNlbGVjdGlvbiA9IG5leHQtYXZhaWxhYmxlXHJcbiAgICAgICAgICBpZiBAb3B0aW9ucy5xdWljay1kZXNlbGVjdFxyXG4gICAgICAgICAgICBAYmFja3NwYWNlLWFjdGlvbiBldmVudFxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBAcGVuZGluZy1kZXNlbGVjdGlvbi5hZGQtY2xhc3MgXFx1aS1zdGF0ZS1mb2N1c1xyXG5cclxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAgICMgRVZFTlQgVFJJR0dFUiBTRVRVUFxyXG5cclxuICAgICMgRXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBjb250YWluZXIgaW4gZ2VuZXJhbC4gQXMgb25lIG1pZ2h0IGV4cGVjdCwgdGhlc2UgXHJcbiAgICAjIGFyZSB2ZXJ5IGdlbmVyYWwsIGhhbmRsaW5nIG9ubHkgbW91c2VvdmVyIGV2ZW50cyBhbmQgdGhlIHN0YXR1cyBmbGFnIFxyXG4gICAgIyB0aGF0IGhlbHBzIHRvIGNvbnRyb2wgZm9jdXMuIFRoZSBmaW5hbCBvbmUgaXMgYSBtb3VzZXdoZWVsIGhhbmRsZXIgdG9cclxuICAgICMgY2hlY2sgdG8gc2VlIHdoZXRoZXIgdGhlIHdpbmRvdyBzY3JvbGwgc2hvdWxkIGJlIHByZXZlbnRlZCAod2hpbGUgXHJcbiAgICAjIHNjcm9sbGluZyBvdmVyIGEgd2lkZ2V0KS5cclxuICAgIEBfb24gQGNvbnRhaW5lcixcclxuICAgICAgY2xpY2s6IEBjb250YWluZXItY2xpY2stYWN0aW9uXHJcbiAgICAgIG1vdXNld2hlZWw6IEBtb3VzZXdoZWVsLWFjdGlvblxyXG4gICAgICBET01Nb3VzZVNjcm9sbDogQG1vdXNld2hlZWwtYWN0aW9uXHJcbiAgICAgIE1vek1vdXNlUGl4ZWxTY3JvbGw6IEBtb3VzZXdoZWVsLWFjdGlvblxyXG4gICAgICBtb3VzZWRvd246ICF+PiBAY2xpY2tlZCA9IHllc1xyXG4gICAgICBtb3VzZXVwOiAhfj4gQGNsaWNrZWQgPSBub1xyXG4gICAgICBtb3VzZWVudGVyOiAhfj4gQHNlbGVjdGlvbi5hZGQtY2xhc3MgXFx1aS1zdGF0ZS1ob3ZlciBpZiBub3QgQG9wZW4gYW5kIG5vdCBAbXVsdGlwbGVcclxuICAgICAgbW91c2VsZWF2ZTogIX4+IEBzZWxlY3Rpb24ucmVtb3ZlLWNsYXNzIFxcdWktc3RhdGUtaG92ZXIgaWYgbm90IEBtdWx0aXBsZVxyXG5cclxuICAgICMgRXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBvcHRpb25zLiBUaGlzIGFsc28gaGFuZGxlcyBtb3VzZW92ZXIgZXZlbnRzIFxyXG4gICAgIyAoaGlnaGxpZ2h0aW5nKSwgYnV0IGl0IGFsc28gaGFuZGxlcyB0aGUgYWN0dWFsIHNlbGVjdGlvbiBvZiBvcHRpb25zIFxyXG4gICAgIyB3aXRoIG1vdXNlIGNsaWNrcy5cclxuICAgIEBfb24gQHNlbGVjdC1vcHRpb25zLFxyXG4gICAgICBjbGljazogKGV2ZW50KSAhfj5cclxuICAgICAgICBldmVudC10YXJnZXQgPSAkIGV2ZW50LnRhcmdldFxyXG4gICAgICAgIHRhcmdldCA9IGlmIGV2ZW50LXRhcmdldCAuaGFzLWNsYXNzIFxcYmFyLXNwLW9wdGlvblxyXG4gICAgICAgICAgICAgICAgIHRoZW4gZXZlbnQtdGFyZ2V0XHJcbiAgICAgICAgICAgICAgICAgZWxzZSBldmVudC10YXJnZXQucGFyZW50cyBcXC5iYXItc3Atb3B0aW9uIC5maXJzdCFcclxuICAgICAgICBpZiB0YXJnZXQubGVuZ3RoXHJcbiAgICAgICAgICBAaGlnaGxpZ2h0ZWQtb3B0aW9uID0gdGFyZ2V0XHJcbiAgICAgICAgICBAX3NlbGVjdC1vcHRpb24gZXZlbnQsIHRhcmdldFxyXG4gICAgICAgICAgQHNlYXJjaC1maWVsZC5mb2N1cyFcclxuICAgICAgbW91c2VvdmVyOiAoZXZlbnQpICF+PlxyXG4gICAgICAgIGV2ZW50LXRhcmdldCA9ICQgZXZlbnQudGFyZ2V0XHJcbiAgICAgICAgdGFyZ2V0ID0gaWYgZXZlbnQtdGFyZ2V0IC5oYXMtY2xhc3MgXFxiYXItc3Atb3B0aW9uXHJcbiAgICAgICAgICAgICAgICAgdGhlbiBldmVudC10YXJnZXRcclxuICAgICAgICAgICAgICAgICBlbHNlIGV2ZW50LXRhcmdldC5wYXJlbnRzIFxcLmJhci1zcC1vcHRpb24gLmZpcnN0IVxyXG4gICAgICAgIEBfaGlnaGxpZ2h0LW9wdGlvbiB0YXJnZXQgaWYgdGFyZ2V0Lmxlbmd0aFxyXG4gICAgICBtb3VzZW91dDogKGV2ZW50KSAhfj5cclxuICAgICAgICBldmVudC10YXJnZXQgPSAkIGV2ZW50LnRhcmdldFxyXG4gICAgICAgIGlmIGV2ZW50LXRhcmdldCAuaGFzLWNsYXNzIFxcYmFyLXNwLW9wdGlvbiBvciBldmVudC10YXJnZXQgLnBhcmVudHMgXFwuYmFyLXNwLW9wdGlvbiAubGVuZ3RoXHJcbiAgICAgICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuXHJcbiAgICAjIEV2ZW50IGhhbmRsZXJzIG9uIHRoZSBzZWFyY2ggZmllbGQuIFNpbmNlIHRoaXMgaXMgdGhlIGVsZW1lbnQgdGhhdCBpcyBcclxuICAgICMgYXNzaWduZWQgdGhlIChwb3NpdGl2ZSkgdGFiaW5kZXgsIHRoaXMgZWxlbWVudCBpcyByZXNwb25zaWJsZSBmb3IgZm9jdXMgXHJcbiAgICAjIGFuZCBibHVyIGZvciB0aGUgZW50aXJlIHdpZGdldCwgd2hpY2ggaXMgaGFuZGxlZCBoZXJlLiBBbHNvLCBrZXlwcmVzc2VzIFxyXG4gICAgIyBhcmUgaGFuZGxlZCBoZXJlLCBzaW5jZSBhcyBsb25nIGFzIHRoZSB3aWRnZXQgaXMgYWN0aXZlLCBrZXlib2FyZCBpbnB1dCBcclxuICAgICMgaXMgc2VudCBoZXJlLlxyXG4gICAgQF9vbiBAc2VhcmNoLWZpZWxkLFxyXG4gICAgICBibHVyOiAoZXZlbnQpICF+PlxyXG4gICAgICAgIGlmIG5vdCBAY2xpY2tlZFxyXG4gICAgICAgICAgQF90cmlnZ2VyIFxcYmx1ciwgZXZlbnQsIGl0ZW06IEBjb250YWluZXJcclxuICAgICAgICAgIEBfZGVhY3RpdmF0ZS13aWRnZXQgZXZlbnRcclxuICAgICAgZm9jdXM6IChldmVudCkgIX4+IFxyXG4gICAgICAgIHVubGVzcyBAYWN0aXZlXHJcbiAgICAgICAgICBAX2FjdGl2YXRlLXdpZGdldCBldmVudFxyXG4gICAgICAgICAgQF9zZXQtc2VhcmNoLWZpZWxkLWRlZmF1bHQhXHJcbiAgICAgICAgICBAX3RyaWdnZXIgXFxmb2N1cywgZXZlbnQsIGl0ZW06IEBjb250YWluZXJcclxuICAgICAga2V5ZG93bjogKGV2ZW50KSAhfj5cclxuICAgICAgICBpZiBub3QgQG9wdGlvbnMuZGlzYWJsZWRcclxuICAgICAgICAgIGtleS1jb2RlID0gZXZlbnQud2hpY2ggPyBldmVudC5rZXktY29kZVxyXG4gICAgICAgICAgQF9yZXNpemUtc2VhcmNoLWZpZWxkIVxyXG5cclxuICAgICAgICAgIEBfY2xlYXItYmFja3NwYWNlISBpZiBrZXktY29kZSBpcyBub3QgOCBhbmQgQHBlbmRpbmctZGVzZWxlY3Rpb25cclxuXHJcbiAgICAgICAgICBzd2l0Y2gga2V5LWNvZGVcclxuICAgICAgICAgICAgIyBiYWNrc3BhY2UsIG9ubHkgdHJhY2tzIHRoZSBsZW5ndGggb2YgdGhlIHNlYXJjaCBmaWVsZCB0byBrbm93IFxyXG4gICAgICAgICAgICAjIChpbiBrZXl1cCkgd2hldGhlciBzcGVjaWFsIGFjdGlvbiBpcyBuZWNlc3NhcnlcclxuICAgICAgICAgICAgY2FzZSA4ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgQGJhY2tzcGFjZS1sZW5ndGggPSBAc2VhcmNoLWZpZWxkLnZhbCEgLmxlbmd0aFxyXG4gICAgICAgICAgICAjIHRhYiwgc2VsZWN0cyB0aGUgaGlnaGxpZ2h0ZWQgb3B0aW9uIGluIGFkZGl0aW9uIHRvIG1vdmluZyB0byBcclxuICAgICAgICAgICAgIyB0aGUgbmV4dCB0YWJpbmRleGVkIGVsZW1lbnQgb24gdGhlIHBhZ2VcclxuICAgICAgICAgICAgY2FzZSA5XHJcbiAgICAgICAgICAgICAgQF9zZWxlY3Qtb3B0aW9uIGV2ZW50LCBAaGlnaGxpZ2h0ZWQtb3B0aW9uIGlmIEBvcGVuXHJcbiAgICAgICAgICAgICMgZW50ZXIsIHNpbXBseSBwcmV2ZW50cyB0aGUgZGVmYXVsdCBhY3Rpb24gZnJvbSBvY2N1cmluZyAodGhlIFxyXG4gICAgICAgICAgICAjIHJlcGxhY2VtZW50IGFjdGlvbnMgYXJlIGluIGtleXVwKVxyXG4gICAgICAgICAgICBjYXNlIDEzXHJcbiAgICAgICAgICAgICAgZXZlbnQucHJldmVudC1kZWZhdWx0IVxyXG4gICAgICAgICAgICAjIHVwIGFycm93IGFuZCBsZWZ0IGFycm93LCBtb3ZlcyB1cCBvbmUgb3B0aW9uIGFuZCBpZiBhbHJlYWR5IGF0IFxyXG4gICAgICAgICAgICAjIHRoZSB0b3AsIGNsb3NlcyB0aGUgZHJvcGRvd25cclxuICAgICAgICAgICAgY2FzZSAzNyAzOFxyXG4gICAgICAgICAgICAgIGV2ZW50LnByZXZlbnQtZGVmYXVsdCFcclxuICAgICAgICAgICAgICBpZiBAb3BlbiBhbmQgQGhpZ2hsaWdodGVkLW9wdGlvblxyXG4gICAgICAgICAgICAgICAgcHJldi1zaWJsaW5ncyA9IEBoaWdobGlnaHRlZC1vcHRpb24ucGFyZW50IXByZXYtYWxsICdsaTpub3QoLnVpLWhlbHBlci1oaWRkZW4pJ1xyXG4gICAgICAgICAgICAgICAgICAuY2hpbGRyZW4gJ2E6bm90KC5iYXItc3Atb3B0aW9uLWdyb3VwKSdcclxuICAgICAgICAgICAgICAgIGlmIHByZXYtc2libGluZ3MubGVuZ3RoXHJcbiAgICAgICAgICAgICAgICAgIEBfaGlnaGxpZ2h0LW9wdGlvbiBwcmV2LXNpYmxpbmdzLmZpcnN0IVxyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuICAgICAgICAgICAgICAgICAgQF9kZWFjdGl2YXRlLXdpZGdldCBldmVudFxyXG4gICAgICAgICAgICAjIHJpZ2h0IGFycm93IGFuZCBkb3duIGFycm93LCBtb3ZlcyBkb3duIG9uZSBvcHRpb24gYW5kIGlmIHRoZSBcclxuICAgICAgICAgICAgIyBkcm9wZG93biBpcyBjbG9zZWQsIG9wZW5zIGl0XHJcbiAgICAgICAgICAgIGNhc2UgMzkgNDBcclxuICAgICAgICAgICAgICBpZiBub3QgQGhpZ2hsaWdodGVkLW9wdGlvblxyXG4gICAgICAgICAgICAgICAgZmlyc3QtYWN0aXZlID0gQHNlbGVjdC1vcHRpb25zLmZpbmQgJ2xpOm5vdCgudWktaGVscGVyLWhpZGRlbiknXHJcbiAgICAgICAgICAgICAgICAgIC5jaGlsZHJlbiAnYTpub3QoLmJhci1zcC1vcHRpb24tZ3JvdXApJyAuZmlyc3QhXHJcbiAgICAgICAgICAgICAgICBAX2hpZ2hsaWdodC1vcHRpb24gZmlyc3QtYWN0aXZlIGlmIGZpcnN0LWFjdGl2ZS5sZW5ndGhcclxuICAgICAgICAgICAgICBlbHNlIGlmIEBvcGVuXHJcbiAgICAgICAgICAgICAgICBuZXh0LXNpYmxpbmdzID0gQGhpZ2hsaWdodGVkLW9wdGlvbi5wYXJlbnQhbmV4dC1hbGwgJ2xpOm5vdCgudWktaGVscGVyLWhpZGRlbiknXHJcbiAgICAgICAgICAgICAgICAgIC5jaGlsZHJlbiAnYTpub3QoLmJhci1zcC1vcHRpb24tZ3JvdXApJ1xyXG4gICAgICAgICAgICAgICAgQF9oaWdobGlnaHQtb3B0aW9uIG5leHQtc2libGluZ3MuZmlyc3QhIGlmIG5leHQtc2libGluZ3MubGVuZ3RoXHJcbiAgICAgICAgICAgICAgQF9vcGVuLWRyb3Bkb3duISBpZiBub3QgQG9wZW5cclxuICAgICAga2V5dXA6IChldmVudCkgIX4+XHJcbiAgICAgICAgaWYgbm90IEBvcHRpb25zLmRpc2FibGVkXHJcbiAgICAgICAgICBrZXktY29kZSA9IGV2ZW50LndoaWNoID8gZXZlbnQua2V5LWNvZGVcclxuICAgICAgICAgIHN3aXRjaCBrZXktY29kZVxyXG4gICAgICAgICAgICAjIGJhY2tzcGFjZSwgZWl0aGVyIGZpbHRlcnMgaWYgdGhlcmUgaXMgc3RpbGwgc2VhcmNoIHRleHQgbGVmdCwgXHJcbiAgICAgICAgICAgICMgZGVzZWxlY3RzIG9uIGEgc2luZ2xlLXNlbGVjdCBkZXNlbGVjdGFibGUgd2lkZ2V0LCBvciBoYW5kbGVzIFxyXG4gICAgICAgICAgICAjIHRoZSBkZXNlbGVjdGlvbiBvZiBtdWx0aS1zZWxlY3Qgb3B0aW9uc1xyXG4gICAgICAgICAgICBjYXNlIDhcclxuICAgICAgICAgICAgICBpZiBAbXVsdGlwbGUgYW5kIEBiYWNrc3BhY2UtbGVuZ3RoIDwgMSBhbmQgQHNlbGVjdGlvbnMgPiAwXHJcbiAgICAgICAgICAgICAgICBAYmFja3NwYWNlLWFjdGlvbiBldmVudFxyXG4gICAgICAgICAgICAgIGVsc2UgaWYgbm90IEBwZW5kaW5nLWRlc2VsZWN0aW9uXHJcbiAgICAgICAgICAgICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuICAgICAgICAgICAgICAgIGlmIEBvcGVuXHJcbiAgICAgICAgICAgICAgICAgIEBfZmlsdGVyLW9wdGlvbnMhXHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIEBzZWFyY2gtZmllbGQudmFsISBpcyBub3QgJydcclxuICAgICAgICAgICAgICAgICAgQF9vcGVuLWRyb3Bkb3duIVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiBub3QgQG11bHRpcGxlIGFuZCBAc2VsZWN0aW9uLmZpbmQgXFwuYmFyLXNwLWRlc2VsZWN0IC5sZW5ndGhcclxuICAgICAgICAgICAgICAgICAgQF9yZXNldC1vcHRpb25zIGV2ZW50XHJcbiAgICAgICAgICAgICMgZW50ZXIsIHNlbGVjdHMgYW4gb3B0aW9uIGlmIHRoZSBkcm9wZG93biBpcyBvcGVuLCBvciBvcGVucyBpdCBcclxuICAgICAgICAgICAgIyBpZiBpdCdzIGNsb3NlZFxyXG4gICAgICAgICAgICBjYXNlIDEzXHJcbiAgICAgICAgICAgICAgZXZlbnQucHJldmVudC1kZWZhdWx0IVxyXG4gICAgICAgICAgICAgIGlmIEBvcGVuIHRoZW4gQF9zZWxlY3Qtb3B0aW9uIGV2ZW50LCBAaGlnaGxpZ2h0ZWQtb3B0aW9uIGVsc2UgQF9vcGVuLWRyb3Bkb3duIVxyXG4gICAgICAgICAgICAjIGVzY2FwZSwgY2xvc2VzIHRoZSBkcm9wZG93blxyXG4gICAgICAgICAgICBjYXNlIDI3XHJcbiAgICAgICAgICAgICAgQF9jbG9zZS1kcm9wZG93biEgaWYgQG9wZW5cclxuICAgICAgICAgICAgIyB0YWIsIHNoaWZ0LCBjb250cm9sLCBhbGwgZm91ciBhcnJvdyBrZXlzLCB3aW5kb3dzIGtleTogdGhlc2UgXHJcbiAgICAgICAgICAgICMgaGF2ZSBubyBlZmZlY3Qgb3RoZXIgdGhhbiB0aGVpciBub3JtYWwgb25lc1xyXG4gICAgICAgICAgICBjYXNlIDkgMTYgMTcgMzcgMzggMzkgNDAgOTEgPT5cclxuICAgICAgICAgICAgIyBwcmV0dHkgbXVjaCBhbnkgcmVndWxhciBrZXlzdHJva2UgKGxldHRlcnMsIG51bWJlcnMsIGV0Yy4pIFxyXG4gICAgICAgICAgICAjIGNhdXNlcyBmaWx0ZXJpbmcgdG8gaGFwcGVuXHJcbiAgICAgICAgICAgIGRlZmF1bHRcclxuICAgICAgICAgICAgICBpZiBAb3BlbiB0aGVuIEBfZmlsdGVyLW9wdGlvbnMhIGVsc2UgQF9vcGVuLWRyb3Bkb3duIVxyXG5cclxuICAgICMgRXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBzZWxlY3Rpb24gYXJlYSBvbiBhIG11bHRpLXNlbGVjdCB3aWRnZXQuIFNpbXBseSBcclxuICAgICMgb3BlbnMgdGhlIGRyb3Bkb3duIGlmIGFuIGVtcHR5IGFyZWEgKGkuZS4sIG9uZSB3aXRob3V0IGEgc2VsZWN0aW9uIFxyXG4gICAgIyBjb250cm9sKSBpcyBjbGlja2VkLiBUaGlzIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIHRoZSB2aXNpYmxlIHBhcnQgb2YgYSBcclxuICAgICMgbXVsdGktc2VsZWN0IHdpZGdldCBpcyBvbmx5IHBhcnRpYWxseSBjb3ZlcmVkIGJ5IHRoZSBzZWFyY2ggZmllbGQ7IHRoaXMgXHJcbiAgICAjIGhhbmRsZXIgYWxsb3dzIHRoZSBkcm9wZG93biB0byBiZSBvcGVuZWQgZXZlbiBpZiBhIHBhcnQgaXMgY2xpY2tlZCB0aGF0IFxyXG4gICAgIyBkb2Vzbid0IGhhcHBlbiB0byBiZSB0aGUgc2VhcmNoIGZpZWxkLlxyXG4gICAgaWYgQG11bHRpcGxlIHRoZW4gQF9vbiBAc2VsZWN0aW9uLFxyXG4gICAgICBjbGljazogKGV2ZW50KSAhfj5cclxuICAgICAgICBldmVudC5wcmV2ZW50LWRlZmF1bHQhXHJcbiAgICAgICAgaWYgQGFjdGl2ZSBhbmQgXFxcclxuICAgICAgICAgICBub3QgKCQgZXZlbnQudGFyZ2V0IC5oYXMtY2xhc3MgXFxiYXItc3Atc2VsZWN0aW9uIG9yIFxcXHJcbiAgICAgICAgICAgICAgICAkIGV2ZW50LnRhcmdldCAucGFyZW50cyBcXGJhci1zcC1zZWxlY3Rpb24gLmxlbmd0aCkgYW5kIFxcXHJcbiAgICAgICAgICAgbm90IEBvcGVuXHJcbiAgICAgICAgICBAX29wZW4tZHJvcGRvd24hXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFdJREdFVCBDUkVBVElPTlxyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgV0lER0VUIERFU1RSVUNUSU9OXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBEZXN0cm95IGlzIGNsZWFuIGluIHRoaXMgd2lkZ2V0LiBDcmVhdGlvbiBpcyBzaW1wbHkgdW5kb25lLiBUaGUgb2xkIFxyXG4gICMgdGFiaW5kZXggKHdoaWNoIGhhZCBiZWVuIHJlbW92ZWQgZnJvbSB0aGUgb3JpZ2luYWwgZWxlbWVudCkgaXMgcmVzdG9yZWQsIFxyXG4gICMgdGhlIHdpZGdldHMgaXMgcmVtb3ZlZCwgYW5kIHRoZSBvcmlnaW5hbCBlbGVtZW50IGlzIHNob3duLiBJbiB0aGVvcnksIFxyXG4gICMgX2NyZWF0ZSBhbmQgX2Rlc3Ryb3kgY2FuIGJlIGNhbGxlZCBvdmVyIGFuZCBvdmVyIGFnYWluIHdpdGggdGhlIHNhbWUgXHJcbiAgIyBlZmZlY3QgZWFjaCB0aW1lLlxyXG4gIF9kZXN0cm95OiAhLT5cclxuICAgIEBfcmV2ZXJ0LXRhYi1pbmRleCFcclxuICAgIEBjb250YWluZXIucmVtb3ZlIVxyXG4gICAgQGVsZW1lbnQuc2hvdyFcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgV0lER0VUIERFU0NSVVRDVElPTlxyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgUFVCTElDIE1FVEhPRFNcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIFJldHVybnMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIHdpZGdldCwgbWVhbmluZyB0aGUgZGF0YSBlbGVtZW50cyB0aGF0IFxyXG4gICMgYXJlIHNlbGVjdGVkLiBJbnRlcm5hbCBmaWVsZHMgKGFueSB0aGF0IGJlZ2luIHdpdGggYW4gdW5kZXJzY29yZSkgYXJlIFxyXG4gICMgcmVtb3ZlZCBmcm9tIHRoaXMgb3V0cHV0IGRhdGEuIFRoZSBmaWVsZHMgdmFsdWUsIHRleHQsIGh0bWwsIHNlbGVjdGVkLCBcclxuICAjIGRpc2FibGVkLCBjbGFzc2VzLCBhbmQgc3R5bGUgd2lsbCBhbHdheXMgYmUgcHJlc2VudCwgYXMgd2lsbCBjdXN0b20gXHJcbiAgIyBmaWVsZHMgdGhhdCB3ZXJlIGEgcGFydCBvZiB0aGUgSlNPTiBkYXRhLlxyXG4gICNcclxuICAjIEZvciBzaW5nbGUtc2VsZWN0IHdpZGdldHMsIHRoaXMgaXMgYSBwbGFpbiBvYmplY3QgKG9yIG51bGwgb2Ygbm8gXHJcbiAgIyBzZWxlY3Rpb24gaGFzIGJlZW4gbWFkZSkuIEZvciBtdWx0aS1zZWxlY3Qgd2lkZ2V0cywgaXQgaXMgYW4gYXJyYXkgb2YgXHJcbiAgIyBzdWNoIG9iamVjdHMgKHdoaWNoIGlzIGVtcHR5IGlmIG5vIHNlbGVjdGlvbiBoYXMgYmVlbiBtYWRlKS5cclxuICAjXHJcbiAgIyBUaGlzIGlzIGEgcmVhZC1vbmx5IG1ldGhvZC4gSXQgY2Fubm90IGJlIHVzZWQgdG8gc2V0IHRoZSB2YWx1ZSwgaW4gbGFyZ2UgXHJcbiAgIyBwYXJ0IGJlY2F1c2Ugb2YgdGhlIG1hbnkgZGlmZmVyZW50IHdheXMgdGhhdCdzIHBvc3NpYmxlLiBUbyBzZXQgdmFsdWVzLCBcclxuICAjIHNldCB0aGVtIGluIHRoZSBiYWNraW5nIGRhdGEgaXRzZWxmIChlaXRoZXIgdGhlIG9yaWdpbmFsIG9wdGlvbiBlbGVtZW50cyBcclxuICAjIG9yIHRoZSBKU09OIGRhdGEgYXJyYXkpLiBpZiB0aGlzIGlzIGRvbmUgZGlyZWN0bHkgb24gdGhlIG9wdGlvbiBlbGVtZW50cyBcclxuICAjIGFuZCBub3QgYnkgcGFzc2luZyBuZXcgZGF0YSwgdGhlbiByZWZyZXNoIHdpbGwgbmVlZCB0byBiZSBjYWxsZWQgdG8gbWFrZSBcclxuICAjIHRoZSB3aWRnZXQgdXBkYXRlICh0aGlzIGlzIGRvbmUgYXV0b21hdGljYWxseSB3aGVuIGRhdGEgaXMgc2V0KS5cclxuICB2YWx1ZTogLT4gXHJcbiAgICB8IEBtdWx0aXBsZSAgICAgICAgICAgPT4gW0Bfc2FuaXRpemUtaXRlbSBpdGVtIGZvciBpdGVtIGluIEBjdXJyZW50LXZhbHVlXVxyXG4gICAgfCBub3QgQGN1cnJlbnQtdmFsdWUgID0+IG51bGxcclxuICAgIHwgb3RoZXJ3aXNlICAgICAgICAgICA9PiBAX3Nhbml0aXplLWl0ZW0gQGN1cnJlbnQtdmFsdWVcclxuXHJcbiAgIyBTaW1wbHkgcmV0dXJucyB0aGUgd2lkZ2V0IGl0c2VsZiwgYXMgYSBqUXVlcnkgb2JqZWN0LlxyXG4gIHdpZGdldDogLT4gQGNvbnRhaW5lclxyXG5cclxuICAjIERpc2FibGVzIHRoZSB3aWRnZXQuIFRoaXMgaXMgdGhlIHNhbWUgYXMgY2FsbGluZyB0aGUgZGlzYWJsZWQgb3B0aW9uIHdpdGggXHJcbiAgIyBhIHRydWUgdmFsdWUuXHJcbiAgZGlzYWJsZTogIS0+XHJcbiAgICBAb3B0aW9ucy5kaXNhYmxlZCA9IHllc1xyXG4gICAgQF9zZXQtZGlzYWJsZWQtc3RhdGUhXHJcblxyXG4gICMgRW5hYmxlZCB0aGUgd2lkZ2V0LiBUaGlzIGlzIHRoZSBzYW1lIGFzIGNhbGxpbmcgdGhlIGRpc2FibGVkIG9wdGlvbiB3aXRoIFxyXG4gICMgYSBmYWxzZSB2YWx1ZS5cclxuICBlbmFibGU6ICEtPlxyXG4gICAgQG9wdGlvbnMuZGlzYWJsZWQgPSBub1xyXG4gICAgQF9zZXQtZGlzYWJsZWQtc3RhdGUhXHJcblxyXG4gICMgUmVidWlsZHMgdGhlIG9wdGlvbnMsIHRha2luZyBhbnkgY2hhbmdlcyBpbnRvIGFjY291bnQuIFRoaXMgYXV0b21hdGljYWxseSBcclxuICAjIGhhcHBlbnMgd2hlbiB0aGUgZGF0YSBvcHRpb24gaXMgc2V0LCBzbyB0aGlzIGlzIHByaW1hcmlseSBmb3IgcmVmcmVzaGluZyBcclxuICAjIGFmdGVyIHRoZSBpbmZvcm1hdGlvbiBpbiBzZWxlY3Qvb3B0aW9uIGVsZW1lbnRzIGhhcyBiZWVuIGNoYW5nZWQuXHJcbiAgcmVmcmVzaDogIS0+IEBfYnVpbGQtb3B0aW9ucyFcclxuXHJcbiAgIyBDbGVhcnMgYW55IHNlbGVjdGVkIG9wdGlvbnMuIEV2ZW50cyBhcmUgc3RpbGwgZmlyZWQgd2hlbiB0aGVzZSBzZWxlY3Rpb25zIFxyXG4gICMgYXJlIGNsZWFyZWQuXHJcbiAgY2xlYXI6ICEtPiBAX3Jlc2V0LW9wdGlvbnMhXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgRU5EIFBVQkxJQyBNRVRIT0RTXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBXSURHRVQgQlVJTERJTkdcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIEJ1aWxkcyB0aGUgb2JqZWN0cyBhbmQgSFRNTCBmb3IgYWxsIG9mIHRoZSBlbGVtZW50cyBpbnNpZGUgdGhlIGRyb3Bkb3duLiBcclxuICAjIEl0IGRvZXMgbm90IGRlc2VsZWN0IGFueSBvcHRpb25zIGFscmVhZHkgc2VsZWN0ZWQsIHNvIHRoZSB3aWRnZXQncyBzdGF0ZSBcclxuICAjIHdpbGwgcmVtYWluIHRoZSBzYW1lIGF0IHRoZSBlbmQuXHJcbiAgX2J1aWxkLW9wdGlvbnM6ICEtPlxyXG4gICAgQG1vZGVsID0gQF9wYXJzZSFcclxuXHJcbiAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgaWYgQHNlbGVjdGlvbnMgPiAwXHJcbiAgICAgICAgQHNlbGVjdGlvbi5maW5kIFxcbGkuYmFyLXNwLXNlbGVjdGlvbiAucmVtb3ZlIVxyXG4gICAgICAgIEBzZWxlY3Rpb25zID0gMFxyXG4gICAgZWxzZVxyXG4gICAgICBAc2VsZWN0aW9uLmZpbmQgXFxzcGFuIC5hZGQtY2xhc3MgXFx1aS1wcmlvcml0eS1zZWNvbmRhcnkgLnRleHQgQG9wdGlvbnMuZGVmYXVsdC10ZXh0XHJcbiAgICAgIGlmIG5vdCBAb3B0aW9ucy5zZWFyY2hhYmxlIG9yIEBtb2RlbC5sZW5ndGggPD0gQG9wdGlvbnMudGhyZXNob2xkXHJcbiAgICAgICAgQHNlYXJjaC1maWVsZC5hZGQtY2xhc3MgXFx1aS1oZWxwZXItaGlkZGVuLWFjY2Vzc2libGVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBzZWFyY2gtZmllbGQucmVtb3ZlLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcblxyXG4gICAgY29udGVudCA9ICcnXHJcbiAgICBmb3Igb3B0aW9uIGluIEBtb2RlbFxyXG4gICAgICBpZiBvcHRpb24uZ3JvdXBcclxuICAgICAgICBjb250ZW50ICs9IEBfY3JlYXRlLWdyb3VwIG9wdGlvblxyXG4gICAgICBlbHNlIGlmIG5vdCBvcHRpb24uZW1wdHlcclxuICAgICAgICBjb250ZW50ICs9IEBfY3JlYXRlLW9wdGlvbiBvcHRpb25cclxuICAgICAgICBpZiBvcHRpb24uc2VsZWN0ZWRcclxuICAgICAgICAgIGlmIEBtdWx0aXBsZVxyXG4gICAgICAgICAgICBAX2J1aWxkLXNlbGVjdGlvbiBvcHRpb25cclxuICAgICAgICAgICAgQGN1cnJlbnQtdmFsdWVbKl0gPSBvcHRpb25cclxuICAgICAgICAgIGVsc2UgXHJcbiAgICAgICAgICAgIEBzZWxlY3Rpb24uZmluZCBcXHNwYW4gLnJlbW92ZS1jbGFzcyBcXHVpLXByaW9yaXR5LXNlY29uZGFyeSAudGV4dCBvcHRpb24udGV4dFxyXG4gICAgICAgICAgICBAY3VycmVudC12YWx1ZSA9IG9wdGlvblxyXG4gICAgICAgICAgICBAX2J1aWxkLWRlc2VsZWN0LWNvbnRyb2whIGlmIEBvcHRpb25zLmRlc2VsZWN0YWJsZVxyXG5cclxuICAgIEBfc2V0LWRpc2FibGVkLXN0YXRlIVxyXG4gICAgQF9zZXQtc2VhcmNoLWZpZWxkLWRlZmF1bHQhXHJcbiAgICBAX3Jlc2l6ZS1zZWFyY2gtZmllbGQhXHJcblxyXG4gICAgQHNlbGVjdC1vcHRpb25zLmh0bWwgY29udGVudFxyXG5cclxuICAgIGlmIG5vdCBAbXVsdGlwbGUgYW5kIEBjdXJyZW50LXZhbHVlXHJcbiAgICAgIGlkID0gQF9nZW5lcmF0ZS1kb20taWQgXFxvcHRpb24gQGN1cnJlbnQtdmFsdWUuX25vZGUtaW5kZXhcclxuICAgICAgQHNlbGVjdGVkLW9wdGlvbiA9ICQgXCIjI2lkXCJcclxuXHJcbiAgIyBDcmVhdGVzIGFuIG9wdGlvbiBncm91cC4gVGhpcyByZXByZXNlbnRzIHRoZSBzYW1lIHRoaW5nIGFzIGFuIEhUTUwgXHJcbiAgIyA8b3B0Z3JvdXA+IGVsZW1lbnQuIEl0J3MgcHJpbWFyaWx5IGZvciBwcmVzZW50YXRpb24sIGdyb3VwaW5nIG9wdGlvbnMgXHJcbiAgIyB2aXN1YWxseSBvbiB0aGUgc2NyZWVuLCB0aG91Z2ggZ3JvdXBzIGNhbiBiZSBkaXNhYmxlZCBhcyBhIHVuaXQuXHJcbiAgX2NyZWF0ZS1ncm91cDogKGdyb3VwKSAtPlxyXG4gICAgaWYgbm90IGdyb3VwLmRpc2FibGVkXHJcbiAgICAgIGdyb3VwLl9kb20taWQgPSBAX2dlbmVyYXRlLWRvbS1pZCBcXGdyb3VwIGdyb3VwLl9ub2RlLWluZGV4XHJcbiAgICAgIFwiPGxpIGNsYXNzPVxcXCJ1aS1tZW51LWl0ZW1cXFwiIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCI+XHJcbiAgICAgICAgPGEgaWQ9XFxcIiN7Z3JvdXAuX2RvbS1pZH1cXFwiIGhyZWY9XFxcImphdmFzY3JpcHQ6dm9pZCgwKVxcXCIgY2xhc3M9XFxcInVpLXByaW9yaXR5LXByaW1hcnkgYmFyLXNwLW9wdGlvbi1ncm91cFxcXCJcclxuICAgICAgICAgIHJvbGU9XFxcImdyb3VwXFxcIiBhcmlhLWhpZGRlbj1cXFwiZmFsc2VcXFwiIHRhYmluZGV4PVxcXCItMVxcXCI+I3sgJCBcXDxkaXY+IC50ZXh0IGdyb3VwLmxhYmVsIC5odG1sISB9PC9hPjwvbGk+XCJcclxuICAgIGVsc2UgJydcclxuXHJcbiAgIyBDcmVhdGVzIG9uZSBvZiB0aGUgc2VsZWN0YWJsZSBvcHRpb25zLlxyXG4gIF9jcmVhdGUtb3B0aW9uOiAob3B0aW9uKSAtPlxyXG4gICAgaWYgbm90IG9wdGlvbi5kaXNhYmxlZFxyXG4gICAgICBvcHRpb24uX2RvbS1pZCA9IEBfZ2VuZXJhdGUtZG9tLWlkIFxcb3B0aW9uIG9wdGlvbi5fbm9kZS1pbmRleFxyXG5cclxuICAgICAgY2xhc3NlcyA9IDxbIHVpLWNvcm5lci1hbGwgYmFyLXNwLW9wdGlvbiBdPlxyXG4gICAgICBjbGFzc2VzWypdID0gXFxiYXItc3Atc2VsZWN0ZWQgaWYgb3B0aW9uLnNlbGVjdGVkXHJcbiAgICAgIGNsYXNzZXNbKl0gPSBcXGJhci1zcC1ncm91cGVkLW9wdGlvbiBpZiBvcHRpb24uX2dyb3VwLWluZGV4P1xyXG4gICAgICBjbGFzc2VzWypdID0gb3B0aW9uLmNsYXNzZXMgaWYgQG9wdGlvbnMuaW5oZXJpdCBhbmQgb3B0aW9uLmNsYXNzZXMgaXMgbm90ICcnXHJcblxyXG4gICAgICBzdHlsZSA9IGlmIEBvcHRpb25zLmluaGVyaXQgYW5kIG9wdGlvbi5zdHlsZSBpcyBub3QgJycgdGhlbiBcIiBzdHlsZT1cXFwiI3tvcHRpb24uc3R5bGV9XFxcIlwiIGVsc2UgJydcclxuICAgICAgd3JhcHBlci1jbGFzcyA9IFxcdWktbWVudS1pdGVtICsgKGlmIG9wdGlvbi5zZWxlY3RlZCB0aGVuICcgdWktaGVscGVyLWhpZGRlbicgZWxzZSAnJylcclxuXHJcbiAgICAgIFwiPGxpIGNsYXNzPVxcXCIje3dyYXBwZXItY2xhc3N9XFxcIiByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiPlxyXG4gICAgICAgIDxhIGlkPVxcXCIje29wdGlvbi5fZG9tLWlkfVxcXCIgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApXFxcIiBjbGFzcz1cXFwiI3tjbGFzc2VzICogJyAnfVxcXCIje3N0eWxlfSByb2xlPVxcXCJvcHRpb25cXFwiXHJcbiAgICAgICAgICBhcmlhLWhpZGRlbj1cXFwiZmFsc2VcXFwiIHRhYmluZGV4PVxcXCItMVxcXCI+I3tvcHRpb24uaHRtbH08L2E+PC9saT5cIlxyXG4gICAgZWxzZSAnJ1xyXG5cclxuICAjIEJ1aWxkcyBhIGRlc2VsZWN0IGNvbnRyb2wuIFRoaXMgYXBwZWFycyBhcyBhbiBYIHRvIHRoZSBpbnNpZGUgb2YgdGhlIFxyXG4gICMgZHJvcGRvd24gYXJyb3cuIEl0J3Mgb25seSBjYWxsZWQgaWYgYSBzaW5nbGUtc2VsZWN0IHdpZGdldCBpcyBtYXJrZWQgXHJcbiAgIyBkZXNlbGVjdGFibGUuXHJcbiAgX2J1aWxkLWRlc2VsZWN0LWNvbnRyb2w6ICEtPlxyXG4gICAgaWYgbm90IEBzZWxlY3Rpb24uZmluZCBcXGRpdi5iYXItc3AtZGVzZWxlY3QgLmxlbmd0aFxyXG4gICAgICBAc2VsZWN0aW9uLmZpbmQgXFxzcGFuIC5maXJzdCFhZnRlciAnPGRpdiBjbGFzcz1cInVpLWljb24gdWktaWNvbi1jbG9zZSBiYXItc3AtZGVzZWxlY3RcIi8+J1xyXG5cclxuICAjIEJ1aWxkcyB0aGUgY29udHJvbHMgdGhhdCByZXByZXNlbnQgc2VsZWN0aW9ucyBpbiBhIG11bHRpLXNlbGVjdCB3aWRnZXQuIFxyXG4gICMgVGhlc2UgZGlzcGxheSB0aGUgdGV4dCBvZiB0aGUgc2VsZWN0ZWQgb3B0aW9uLCBhbG9uZyB3aXRoIGFuIFggdGhhdCB3aWxsIFxyXG4gICMgZGVzZWxlY3QgdGhlbSB3aGVuIGNsaWNrZWQuXHJcbiAgX2J1aWxkLXNlbGVjdGlvbjogKG9wdGlvbikgIS0+XHJcbiAgICByZXR1cm4gaWYgQG9wdGlvbnMubWF4LXNlbGVjdGVkIDw9IEBzZWxlY3Rpb25zXHJcbiAgICBzZWxlY3Rpb24taWQgPSBAX2dlbmVyYXRlLWRvbS1pZCBcXHNlbGVjdGlvbiBvcHRpb24uX25vZGUtaW5kZXhcclxuICAgIEBzZWxlY3Rpb25zICs9IDFcclxuXHJcbiAgICBpZiBvcHRpb24uZGlzYWJsZWRcclxuICAgICAgaHRtbCA9IFwiPGxpIGNsYXNzPVxcXCJ1aS1jb3JuZXItYWxsIHVpLXN0YXRlLWRpc2FibGVkIGJhci1zcC1zZWxlY3Rpb25cXFwiIGlkPVxcXCIje3NlbGVjdGlvbi1pZH1cXFwiPlxyXG4gICAgICAgICAgICAgIDxzcGFuPiN7b3B0aW9uLmh0bWx9PC9zcGFuPjwvbGk+XCJcclxuICAgIGVsc2VcclxuICAgICAgaHRtbCA9IFwiPGxpIGNsYXNzPVxcXCJ1aS1jb3JuZXItYWxsIHVpLXN0YXRlLWRlZmF1bHQgYmFyLXNwLXNlbGVjdGlvblxcXCIgaWQ9XFxcIiN7c2VsZWN0aW9uLWlkfVxcXCI+XHJcbiAgICAgICAgICAgICAgPHNwYW4+I3tvcHRpb24uaHRtbH08L3NwYW4+XHJcbiAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApXFxcIiBjbGFzcz1cXFwidWktaWNvbiB1aS1pY29uLWNsb3NldGhpY2sgYmFyLXNwLXNlbGVjdGlvbi1jbG9zZVxcXCIgXHJcbiAgICAgICAgICAgICAgICB0YWJpbmRleD1cXFwiLTFcXFwiPjwvYT48L2xpPlwiXHJcbiAgICBAc2VhcmNoLWNvbnRhaW5lci5iZWZvcmUgaHRtbFxyXG5cclxuICAgIGxpbmsgPSAkIFwiIyNzZWxlY3Rpb24taWRcIiAuZmluZCBcXGEgLmZpcnN0IVxyXG4gICAgIyBUaGUgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBYIGNvbnRyb2wuIFRoZSBjbGlja2VkIG1lbWJlciBmaWVsZCBtdXN0IGJlIFxyXG4gICAgIyBzZXQgaGVyZSBhcyB3ZWxsLCBpbiBwYXJ0IGJlY2F1c2UgdGhlIGNvbnRyb2wgaXMgZGVzdHJveWVkIGFzIGEgcGFydCBvZiBcclxuICAgICMgdGhpcyBoYW5kbGluZyBhbmQgdGhhdCBtZXNzZXMgdGhpbmdzIHVwIGEgYml0LlxyXG4gICAgbGluay5tb3VzZWRvd24gKGV2ZW50KSAhfj5cclxuICAgICAgZXZlbnQucHJldmVudC1kZWZhdWx0IVxyXG4gICAgICBpZiBAb3B0aW9ucy5kaXNhYmxlZFxyXG4gICAgICAgIGV2ZW50LnN0b3AtcHJvcGFnYXRpb24hXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAY2xpY2tlZCA9IHllc1xyXG4gICAgICAgIEBkZXN0cnVjdGlvbi1wZW5kaW5nID0geWVzXHJcbiAgICAgICAgQF9kZXNlbGVjdC1vcHRpb24gZXZlbnQsICQgXCIjI3tAX2dlbmVyYXRlLWRvbS1pZCBcXG9wdGlvbiBvcHRpb24uX25vZGUtaW5kZXh9XCJcclxuICAgIGxpbmsubW91c2V1cCAhfj5cclxuICAgICAgQGNsaWNrZWQgPSBub1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIEVORCBXSURHRVQgQlVJTERJTkdcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIERST1BET1dOIE9QRVJBVElPTlNcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIE9wZW5zIHRoZSBkcm9wZG93biBzbyB0aGF0IHRoZSBvcHRpb25zIChhbmQgdGhlIHNlYXJjaCBmaWVsZCwgaW4gYSBcclxuICAjIHNpbmdsZS1zZWxlY3QgY29udHJvbCkgY2FuIGJlIHZpZXdlZC5cclxuICBfb3Blbi1kcm9wZG93bjogIS0+XHJcbiAgICBpZiBub3QgQG11bHRpcGxlXHJcbiAgICAgIEBzZWxlY3Rpb24uYWRkLWNsYXNzICd1aS1zdGF0ZS1hY3RpdmUgYmFyLXNwLXdpdGgtZHJvcCdcclxuICAgICAgQHNlbGVjdGlvbi5maW5kIFxcZGl2IC5yZW1vdmUtY2xhc3MgXFx1aS1pY29uLXRyaWFuZ2xlLTEtcyAuYWRkLWNsYXNzIFxcdWktaWNvbi10cmlhbmdsZS0xLW5cclxuICAgICAgQF9oaWdobGlnaHQtb3B0aW9uIEBzZWxlY3RlZC1vcHRpb24gaWYgQHNlbGVjdGVkLW9wdGlvblxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5tYXgtc2VsZWN0ZWQgPD0gQHNlbGVjdGlvbnMgdGhlbiByZXR1cm5cclxuICAgIGVsc2UgQHNlbGVjdGlvbi5hZGQtY2xhc3MgXFxiYXItc3Atd2l0aC1kcm9wXHJcblxyXG4gICAgZGQtdG9wID0gQGNvbnRhaW5lci5oZWlnaHQhXHJcbiAgICBAZHJvcGRvd24uY3NzIHRvcDogZGQtdG9wICsgXFxweCAucmVtb3ZlLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlbi1hY2Nlc3NpYmxlXHJcblxyXG4gICAgQHNlYXJjaC1maWVsZC5mb2N1cyFcclxuICAgIEBzZWFyY2gtZmllbGQudmFsIEBzZWFyY2gtZmllbGQudmFsIVxyXG5cclxuICAgIEBfZmlsdGVyLW9wdGlvbnMhXHJcblxyXG4gICAgQF90cmlnZ2VyIFxcb3BlbiwgbnVsbCwgaXRlbTogQGNvbnRhaW5lciB1bmxlc3MgQG9wZW5cclxuICAgIEBvcGVuID0geWVzXHJcblxyXG4gIF9zZWxlY3QtaXRlbTogKGl0ZW0pICEtPlxyXG4gICAgaXRlbS5zZWxlY3RlZCA9IHllc1xyXG4gICAgaWYgaXRlbS5fZWxlbWVudD9cclxuICAgICAgJGVsZW1lbnQgPSAkIGl0ZW0uX2VsZW1lbnRcclxuICAgICAgJGVsZW1lbnQucHJvcCBcXHNlbGVjdGVkIHllc1xyXG4gICAgICAkZWxlbWVudC5wYXJlbnRzIFxcc2VsZWN0IC50cmlnZ2VyIFxcY2hhbmdlXHJcblxyXG4gIF9kZXNlbGVjdC1pdGVtOiAoaXRlbSkgIS0+XHJcbiAgICBpdGVtLnNlbGVjdGVkID0gbm9cclxuICAgIGlmIGl0ZW0uX2VsZW1lbnQ/XHJcbiAgICAgICRlbGVtZW50ID0gJCBpdGVtLl9lbGVtZW50XHJcbiAgICAgICRlbGVtZW50LnByb3AgXFxzZWxlY3RlZCBub1xyXG4gICAgICAkZWxlbWVudC5wYXJlbnRzIFxcc2VsZWN0IC50cmlnZ2VyIFxcY2hhbmdlIGlmIEBtdWx0aXBsZVxyXG5cclxuICAjIENsb3NlcyB0aGUgZHJvcGRvd24gc28gdGhhdCB0aGUgb3B0aW9ucyAoYW5kIHRoZSBzZWFyY2ggZmllbGQsIGluIGEgXHJcbiAgIyBzaW5nbGUtc2VsZWN0IGNvbnRyb2wpIGNhbiBubyBsb25nZXIgYmUgdmlld2VkLlxyXG4gIF9jbG9zZS1kcm9wZG93bjogIS0+XHJcbiAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgQHNlbGVjdGlvbi5yZW1vdmUtY2xhc3MgXFxiYXItc3Atd2l0aC1kcm9wXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZWxlY3Rpb24ucmVtb3ZlLWNsYXNzICd1aS1zdGF0ZS1hY3RpdmUgYmFyLXNwLXdpdGgtZHJvcCdcclxuICAgICAgQHNlbGVjdGlvbi5maW5kIFxcZGl2IC5yZW1vdmUtY2xhc3MgXFx1aS1pY29uLXRyaWFuZ2xlLTEtbiAuYWRkLWNsYXNzIFxcdWktaWNvbi10cmlhbmdsZS0xLXNcclxuICAgIEBfY2xlYXItaGlnaGxpZ2h0IVxyXG5cclxuICAgIEBkcm9wZG93bi5hZGQtY2xhc3MgXFx1aS1oZWxwZXItaGlkZGVuLWFjY2Vzc2libGVcclxuICAgIEBfdHJpZ2dlciBcXGNsb3NlLCBudWxsLCBpdGVtOiBAY29udGFpbmVyIGlmIEBvcGVuXHJcbiAgICBAb3BlbiA9IG5vXHJcblxyXG4gICMgVG9nZ2xlcyB0aGUgZHJvcGRvd24sIG9wZW5pbmcgaXQgaWYgY2xvc2VkIGFuZCBjbG9zaW5nIGl0IGlmIG9wZW4uXHJcbiAgX3RvZ2dsZS1kcm9wZG93bjogIS0+IGlmIEBvcGVuIHRoZW4gQF9jbG9zZS1kcm9wZG93biEgZWxzZSBAX29wZW4tZHJvcGRvd24hXHJcblxyXG4gICMgUmVzZXRzIHRoZSBvcHRpb25zLCBjbGVhcmluZyBvdXQgYW55IHNlbGVjdGlvbiBhbmQgY2xvc2luZyB0aGUgZHJvcGRvd24uIFxyXG4gICMgU2luY2UgbXVsdGktc2VsZWN0IHJlcXVpcmVzIG1vcmUgaGFuZGxpbmcgYmVjYXVzZSBvZiB0aGUgc2VsZWN0aW9uIFxyXG4gICMgZWxlbWVudHMsIHRoaXMgbWV0aG9kIG1lcmVseSBpdGVyYXRlcyB0aHJvdWdoIHRoZSBzZWxlY3RlZCBvcHRpb25zIGFuZCBcclxuICAjIGRlbGVnYXRlcyB0byBfZGVzZWxlY3Qtb3B0aW9uIGZvciBlYWNoIG9uZSwgbWVhbmluZyB0aGF0IGEgY2hhbmdlIGV2ZW50IFxyXG4gICMgaXMgZmlyZWQgZm9yIGVhY2ggc2VsZWN0aW9uIHRoYXQgaXMgY2xlYXJlZC4gRm9yIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0cywgYSBcclxuICAjIHNpbmdsZSBjaGFuZ2UgZXZlbnQgaXMgZmlyZWQsIGFuZCBvbmx5IGlmIHRoZXJlIGFjdHVhbGx5IGhhZCBiZWVuIGEgXHJcbiAgIyBzZWxlY3RlZCBvcHRpb24gYmVmb3JlIHRoZSBjYWxsIHRvIHRoaXMgbWV0aG9kLlxyXG4gIF9yZXNldC1vcHRpb25zOiAoZXZlbnQpICEtPlxyXG4gICAgaWYgQG11bHRpcGxlXHJcbiAgICAgIGluZGljZXMgPSBbaXRlbS5fbm9kZS1pbmRleCBmb3IgaXRlbSBpbiBAY3VycmVudC12YWx1ZV1cclxuICAgICAgZm9yIGluZGV4IGluIGluZGljZXNcclxuICAgICAgICBvcHRpb24gPSAkIFwiIyN7QF9nZW5lcmF0ZS1kb20taWQgXFxvcHRpb24gaW5kZXh9XCJcclxuICAgICAgICBAX2Rlc2VsZWN0LW9wdGlvbiBldmVudCwgb3B0aW9uXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZWxlY3Rpb24uZmluZCBcXHNwYW4gLnRleHQgQG9wdGlvbnMuZGVmYXVsdC10ZXh0IC5hZGQtY2xhc3MgXFx1aS1wcmlvcml0eS1zZWNvbmRhcnlcclxuICAgICAgb2xkLXZhbHVlID0gQGN1cnJlbnQtdmFsdWVcclxuICAgICAgb2xkLWl0ZW0gPSBAc2VsZWN0ZWQtb3B0aW9uXHJcbiAgICAgIEBfZGVzZWxlY3QtaXRlbSBvbGQtaXRlbSBpZiBvbGQtaXRlbT9cclxuICAgICAgQGN1cnJlbnQtdmFsdWUgPSBudWxsXHJcbiAgICAgIEBzZWxlY3RlZC1vcHRpb24gPSBudWxsXHJcbiAgICAgIEBzZWxlY3Rpb24uZmluZCBcXC5iYXItc3AtZGVzZWxlY3QgLnJlbW92ZSFcclxuICAgICAgQF9hY3RpdmF0ZS1vcHRpb24oQHNlbGVjdC1vcHRpb25zLmZpbmQgXFwuYmFyLXNwLXNlbGVjdGVkIC5yZW1vdmUtY2xhc3MgXFxiYXItc3Atc2VsZWN0ZWQpXHJcbiAgICAgIEBfY2xvc2UtZHJvcGRvd24hIGlmIEBhY3RpdmVcclxuXHJcbiAgICAgIGlmIG9sZC12YWx1ZSBpcyBub3QgbnVsbFxyXG4gICAgICAgIEBfdHJpZ2dlciBcXGNoYW5nZSwgZXZlbnQsIGl0ZW06IG51bGwgZGF0YTogbnVsbCBcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgRFJPUERPV04gT1BFUkFUSU9OU1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgT1BUSU9OIFNFTEVDVElPTlxyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMgU2VsZWN0cyB0aGUgc3BlY2lmaWVkIG9wdGlvbi4gQXNpZGUgZnJvbSBzaW1wbHkgbWFraW5nIHRoZSBzZWxlY3Rpb24sIFxyXG4gICMgdGhpcyBhZGRzIHRoZSBvcHRpb24ncyBkYXRhIHRvIGN1cnJlbnQtdmFsdWUsIHJlbW92ZXMgdGhlIGhpZ2hsaWdodCwgYW5kIFxyXG4gICMgY2xvc2VzIHRoZSBkcm9wZG93biAodW5sZXNzIHRoZSBDdHJsIG9yIEFsdCBrZXkgaXMgYmVpbmcgaGVsZCBkb3duIG9uIGEgXHJcbiAgIyBtdWx0aS1zZWxlY3Qgd2lkZ2V0KS4gSXQgYWxzbyBmaXJlcyBhIGNoYW5nZSBldmVudCBhcyBsb25nIGFzIHRoZSBtZXRob2QgXHJcbiAgIyBpc24ndCBjYWxsZWQgd2l0aCBhbiBhbHJlYWR5LXNlbGVjdGVkIG9wdGlvbi4gTXVsdGktc2VsZWN0IHdpZGdldHMgd2lsbCBcclxuICAjIG5vdCBhbGxvdyB0aGUgc2FtZSBvcHRpb24gdG8gYmUgc2VsZWN0ZWQgdHdpY2U7IHRoZSBzZWNvbmQgb25lIHdpbGwgYmUgXHJcbiAgIyBzaWxlbnRseSBpZ25vcmVkLlxyXG4gIF9zZWxlY3Qtb3B0aW9uOiAoZXZlbnQsIG9wdGlvbikgIS0+XHJcbiAgICBpZiBvcHRpb24/XHJcbiAgICAgIEBfY2xlYXItaGlnaGxpZ2h0IVxyXG5cclxuICAgICAgcG9zaXRpb24gPSBAX2dldC1tb2RlbC1pbmRleCBvcHRpb25cclxuICAgICAgdmFsdWUgPSBAbW9kZWxbcG9zaXRpb25dXHJcbiAgICAgIHJldHVybiBpZiB2YWx1ZS5zZWxlY3RlZFxyXG5cclxuICAgICAgaWYgQG11bHRpcGxlXHJcbiAgICAgICAgQF9kZWFjdGl2YXRlLW9wdGlvbiBvcHRpb25cclxuICAgICAgICBpZiAocG9zID0gdmFsdWUuX2dyb3VwLWluZGV4KVxyXG4gICAgICAgICAgZ3JvdXAgPSBAbW9kZWxbcG9zXVxyXG4gICAgICAgICAgdmlzaWJsZSA9IG5vXHJcbiAgICAgICAgICBmb3IgaW5kZXggZnJvbSBwb3MgKyAxIHRpbCBwb3MgKyBncm91cC5fY2hpbGRyZW5cclxuICAgICAgICAgICAgaWYgbm90IEBtb2RlbFtpbmRleF0uc2VsZWN0ZWRcclxuICAgICAgICAgICAgICB2aXNpYmxlID0geWVzXHJcbiAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgIGlmIG5vdCB2aXNpYmxlXHJcbiAgICAgICAgICAgIEBfZGVhY3RpdmF0ZS1vcHRpb24gJCBcIiMje2dyb3VwLl9kb20taWR9XCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfYWN0aXZhdGUtb3B0aW9uKEBzZWxlY3Qtb3B0aW9ucy5maW5kIFxcYS5iYXItc3Atc2VsZWN0ZWQgLnJlbW92ZS1jbGFzcyBcXGJhci1zcC1zZWxlY3RlZClcclxuICAgICAgICBAc2VsZWN0ZWQtb3B0aW9uID0gb3B0aW9uXHJcbiAgICAgICAgQHNlbGVjdGlvbi5maW5kIFxcc3BhbiAucmVtb3ZlLWNsYXNzIFxcdWktcHJpb3JpdHktc2Vjb25kYXJ5XHJcblxyXG4gICAgICBvcHRpb24uYWRkLWNsYXNzIFxcYmFyLXNwLXNlbGVjdGVkXHJcbiAgICAgIEBfc2VsZWN0LWl0ZW0gdmFsdWVcclxuXHJcbiAgICAgIGlmIEBtdWx0aXBsZVxyXG4gICAgICAgIHMtaGVpZ2h0ID0gQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgICAgcy13aWR0aCA9IEBzZWxlY3Rpb24ub3V0ZXItd2lkdGghXHJcbiAgICAgICAgQF9idWlsZC1zZWxlY3Rpb24gdmFsdWVcclxuICAgICAgICBuZXctaGVpZ2h0ID0gQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcbiAgICAgICAgbmV3LXdpZHRoID0gQHNlbGVjdGlvbi5vdXRlci13aWR0aCFcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBzZWxlY3Rpb24uZmluZCBcXHNwYW4gLmZpcnN0IXRleHQgdmFsdWUudGV4dFxyXG4gICAgICAgIEBfYnVpbGQtZGVzZWxlY3QtY29udHJvbCEgaWYgQG9wdGlvbnMuZGVzZWxlY3RhYmxlXHJcblxyXG4gICAgICBAX2Nsb3NlLWRyb3Bkb3duISB1bmxlc3MgQG11bHRpcGxlIGFuZCAoZXZlbnQ/Lm1ldGEta2V5IG9yIGV2ZW50Py5jdHJsLWtleSlcclxuICAgICAgQHNlYXJjaC1maWVsZC52YWwgJydcclxuXHJcbiAgICAgIGlmIEBtdWx0aXBsZSBhbmQgKHMtaGVpZ2h0IGlzIG5vdCBuZXctaGVpZ2h0IG9yIHMtd2lkdGggaXMgbm90IG5ldy13aWR0aClcclxuICAgICAgICBAX3RyaWdnZXIgXFxyZXNpemUsIGV2ZW50LFxyXG4gICAgICAgICAgaXRlbTogQHNlbGVjdGlvblxyXG4gICAgICAgICAgZGF0YTpcclxuICAgICAgICAgICAgaGVpZ2h0OiBuZXctaGVpZ2h0XHJcbiAgICAgICAgICAgIHdpZHRoOiBuZXctd2lkdGhcclxuICAgICAgaWYgQG11bHRpcGxlIGFuZCAkLmluLWFycmF5IHZhbHVlLCBAY3VycmVudC12YWx1ZSBpcyAtMVxyXG4gICAgICAgIEBjdXJyZW50LXZhbHVlWypdID0gdmFsdWUgXHJcbiAgICAgICAgQF90cmlnZ2VyIFxcY2hhbmdlLCBldmVudCwgaXRlbTogb3B0aW9uLCBkYXRhOiB2YWx1ZVxyXG4gICAgICBpZiBub3QgQG11bHRpcGxlIGFuZCB2YWx1ZSBpcyBub3QgQGN1cnJlbnQtdmFsdWVcclxuICAgICAgICBvbGQtdmFsdWUgPSBAY3VycmVudC12YWx1ZVxyXG4gICAgICAgIEBfZGVzZWxlY3QtaXRlbSBvbGQtdmFsdWUgaWYgb2xkLXZhbHVlP1xyXG4gICAgICAgIEBjdXJyZW50LXZhbHVlID0gdmFsdWVcclxuICAgICAgICBAX3RyaWdnZXIgXFxjaGFuZ2UsIGV2ZW50LCBpdGVtOiBvcHRpb24sIGRhdGE6IHZhbHVlXHJcblxyXG4gICAgICBAX3Jlc2l6ZS1zZWFyY2gtZmllbGQhXHJcblxyXG4gICMgRGVzZWxlY3RzIGFuIG9wdGlvbiBpbiBhIG11bHRpLXNlbGVjdCB3aWRnZXQuIFRvIGRvIHNvIGluIGEgc2luZ2xlLXNlbGVjdCBcclxuICAjIHdpZGdldCwgdXNlIF9yZXNldC1vcHRpb25zLiBUaGlzIGhhbmRsZXMgdGhlIHNlbGVjdGlvbiBvbiB0aGUgZGF0YSBzaWRlIFxyXG4gICMgYW5kIGFsc28gZGVzdHJveXMgdGhlIEhUTUwgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZWxlY3Rpb24gb24gdGhlIFxyXG4gICMgcHJlc2VudGF0aW9uIHNpZGUuXHJcbiAgX2Rlc2VsZWN0LW9wdGlvbjogKGV2ZW50LCBvcHRpb24pICEtPlxyXG4gICAgcG9zID0gQF9nZXQtbW9kZWwtaW5kZXggb3B0aW9uXHJcbiAgICB2YWx1ZSA9IEBtb2RlbFtwb3NdXHJcblxyXG4gICAgaWYgbm90IHZhbHVlLmRpc2FibGVkXHJcbiAgICAgIEBfZGVzZWxlY3QtaXRlbSB2YWx1ZVxyXG4gICAgICBAX2FjdGl2YXRlLW9wdGlvbiBvcHRpb25cclxuICAgICAgaWYgdmFsdWUuX2dyb3VwLWluZGV4XHJcbiAgICAgICAgQF9hY3RpdmF0ZS1vcHRpb24gJCBcIiMje0BfZ2VuZXJhdGUtZG9tLWlkIFxcZ3JvdXAgdmFsdWUuX2dyb3VwLWluZGV4fVwiXHJcblxyXG4gICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuICAgICAgQF9maWx0ZXItb3B0aW9ucyFcclxuXHJcbiAgICAgIGluZGV4ID0gJC5pbi1hcnJheSB2YWx1ZSwgQGN1cnJlbnQtdmFsdWVcclxuICAgICAgQGN1cnJlbnQtdmFsdWUuc3BsaWNlIGluZGV4LCAxXHJcblxyXG4gICAgICBzZWxlY3Rpb24gPSAkIFwiIyN7QF9nZW5lcmF0ZS1kb20taWQgXFxzZWxlY3Rpb24gcG9zfVwiXHJcbiAgICAgIEBzZWxlY3Rpb25zIC09IDFcclxuXHJcbiAgICAgIEBfY2xvc2UtZHJvcGRvd24hIGlmIEBzZWxlY3Rpb25zID4gMCBhbmQgQHNlYXJjaC1maWVsZC52YWwhIC5sZW5ndGggaXMgMFxyXG4gICAgICBcclxuICAgICAgcy1oZWlnaHQgPSBAc2VsZWN0aW9uLm91dGVyLWhlaWdodCFcclxuICAgICAgcy13aWR0aCA9IEBzZWxlY3Rpb24ub3V0ZXItd2lkdGghXHJcbiAgICAgIHNlbGVjdGlvbi5yZW1vdmUhXHJcbiAgICAgIG5ldy1oZWlnaHQgPSBAc2VsZWN0aW9uLm91dGVyLWhlaWdodCFcclxuICAgICAgbmV3LXdpZHRoID0gQHNlbGVjdGlvbi5vdXRlci1oZWlnaHQhXHJcblxyXG4gICAgICBAc2VhcmNoLWZpZWxkLmZvY3VzIVxyXG4gICAgICBAX3NldC1zZWFyY2gtZmllbGQtZGVmYXVsdCFcclxuICAgICAgQF9yZXNpemUtc2VhcmNoLWZpZWxkIVxyXG5cclxuICAgICAgaWYgcy1oZWlnaHQgaXMgbm90IG5ldy1oZWlnaHQgb3Igcy13aWR0aCBpcyBub3QgbmV3LXdpZHRoXHJcbiAgICAgICAgQF90cmlnZ2VyIFxccmVzaXplLCBldmVudCxcclxuICAgICAgICAgIGl0ZW06IEBzZWxlY3Rpb25cclxuICAgICAgICAgIGRhdGE6XHJcbiAgICAgICAgICAgIGhlaWdodDogbmV3LWhlaWdodFxyXG4gICAgICAgICAgICB3aWR0aDogbmV3LXdpZHRoXHJcbiAgICAgIEBfdHJpZ2dlciBcXGNoYW5nZSwgZXZlbnQsIGl0ZW06IG51bGwsIGRhdGE6IG51bGxcclxuICAgIFxyXG4gICMgQXBwbGllcyBhIGhpZ2hsaWdodCB0byB0aGUgcHJvdmlkZWQgb3B0aW9uLiBJbiBhZGRpdGlvbiB0byBoaWdobGlnaHRpbmcgXHJcbiAgIyBpdCAoYnkgZ2l2aW5nIGl0IHRoZSBjbGFzcyB1aS1zdGF0ZS1mb2N1cywgd2hpY2ggaXMgdGhlIHNhbWUgd2F5IHRoYXQgdGhlIFxyXG4gICMgalF1ZXJ5IFVJIG1lbnUgZG9lcyBpdCksIGl0IGFsc28gY2hlY2tzIHRoZSBwb3NpdGlvbiBvZiB0aGUgaGlnaGxpZ2h0ZWQgXHJcbiAgIyBvcHRpb24gYW5kIHNjcm9sbHMgaXQgaW50byB2aWV3IGlmIG5lY2Vzc2FyeS4gSXQgYWxzbyBoYW5kbGVzIHRoZSBcclxuICAjIHdpZGdldCdzIGFyaWEtYWN0aXZlZGVzY2VuZGFudCBhdHRyaWJ1dGUgZm9yIGFjY2Vzc2liaWxpdHkuXHJcbiAgX2hpZ2hsaWdodC1vcHRpb246IChvcHRpb24pICEtPlxyXG4gICAgaWYgb3B0aW9uLmxlbmd0aFxyXG4gICAgICBAX2NsZWFyLWhpZ2hsaWdodCFcclxuXHJcbiAgICAgIEBoaWdobGlnaHRlZC1vcHRpb24gPSBvcHRpb25cclxuICAgICAgQGhpZ2hsaWdodGVkLW9wdGlvbi5hZGQtY2xhc3MgXFx1aS1zdGF0ZS1mb2N1c1xyXG4gICAgICBAc2VsZWN0aW9uLmF0dHIgXFxhcmlhLWFjdGl2ZWRlc2NlbmRhbnQgQGhpZ2hsaWdodGVkLW9wdGlvbi5hdHRyIFxcaWRcclxuXHJcbiAgICAgIG1heC1oZWlnaHQgPSBwYXJzZS1pbnQgQHNlbGVjdC1vcHRpb25zLmNzcyBcXG1heEhlaWdodFxyXG4gICAgICB2aXNpYmxlLXRvcCA9IEBzZWxlY3Qtb3B0aW9ucy5zY3JvbGwtdG9wIVxyXG4gICAgICB2aXNpYmxlLWJvdHRvbSA9IG1heC1oZWlnaHQgKyB2aXNpYmxlLXRvcFxyXG5cclxuICAgICAgaGlnaGxpZ2h0LXRvcCA9IEBoaWdobGlnaHRlZC1vcHRpb24ucG9zaXRpb24hdG9wICsgQHNlbGVjdC1vcHRpb25zLnNjcm9sbC10b3AhXHJcbiAgICAgIGhpZ2hsaWdodC1ib3R0b20gPSBoaWdobGlnaHQtdG9wICsgQGhpZ2hsaWdodGVkLW9wdGlvbi5vdXRlci1oZWlnaHQhXHJcblxyXG4gICAgICBpZiBoaWdobGlnaHQtYm90dG9tID49IHZpc2libGUtYm90dG9tXHJcbiAgICAgICAgQHNlbGVjdC1vcHRpb25zLnNjcm9sbC10b3AgaWYgaGlnaGxpZ2h0LWJvdHRvbSAtIG1heC1oZWlnaHQgPiAwIHRoZW4gaGlnaGxpZ2h0LWJvdHRvbSAtIG1heC1oZWlnaHQgZWxzZSAwXHJcbiAgICAgIGVsc2UgaWYgaGlnaGxpZ2h0LXRvcCA8IHZpc2libGUtdG9wXHJcbiAgICAgICAgQHNlbGVjdC1vcHRpb25zLnNjcm9sbC10b3AgaGlnaGxpZ2h0LXRvcFxyXG5cclxuICAjIFJlbW92ZXMgdGhlIGhpZ2hsaWdodGluZyBmcm9tIHRoZSAoZm9ybWVybHkpIGhpZ2hsaWdodGVkIG9wdGlvbi5cclxuICBfY2xlYXItaGlnaGxpZ2h0OiAhLT5cclxuICAgIEBoaWdobGlnaHRlZC1vcHRpb24ucmVtb3ZlLWNsYXNzIFxcdWktc3RhdGUtZm9jdXMgaWYgQGhpZ2hsaWdodGVkLW9wdGlvblxyXG4gICAgQGhpZ2hsaWdodGVkLW9wdGlvbiA9IG51bGxcclxuXHJcbiAgIyBNYWtlcyBhbiBvcHRpb24gYXZhaWxhYmxlIGZvciBzZWxlY3Rpb24uIFRoaXMgaXMgZG9uZSB3aGVuIGl0IGlzIFxyXG4gICMgZGVzZWxlY3RlZCBmcm9tIGEgbXVsdGktc2VsZWN0IHdpZGdldCwgc2luY2UgdGhlIG9wdGlvbiBpcyBoaWRkZW4gd2hlbiBcclxuICAjIGl0J3Mgc2VsZWN0ZWQgc28gdGhhdCBpdCBjYW4ndCBiZSByZS1zZWxlY3RlZC5cclxuICBfYWN0aXZhdGUtb3B0aW9uOiAob3B0aW9uKSAhLT4gXHJcbiAgICBvcHRpb24ucGFyZW50IXJlbW92ZS1jbGFzcyBcXHVpLWhlbHBlci1oaWRkZW5cclxuICAgIG9wdGlvbi5hdHRyIFxcYXJpYS1oaWRkZW4gXFxmYWxzZVxyXG5cclxuICAjIE1ha2VzIGFuIG9wdGlvbiB1bmF2YWlsYWJsZSBmb3Igc2VsZWN0aW9uLiBUaGlzIGlzIGRvbmUgd2hlbiBpdCdzIFxyXG4gICMgc2VsZWN0ZWQgaW4gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0IHNvIHRoYXQgaXQgY2FuJ3QgYmUgc2VsZWN0ZWQgYSBzZWNvbmQgXHJcbiAgIyB0aW1lLiBUaGlzIGlzIGRvbmUgaW4gYW4gYWNjZXNzYWJpbGl0eS1mcmllbmRseSB3YXksIGJ5IGhpZGluZyB0aGUgXHJcbiAgIyBlbGVtZW50IGFuZCBzZXR0aW5nIGl0cyBhcmlhLWhpZGRlbiBhdHRyaWJ1dGUuXHJcbiAgX2RlYWN0aXZhdGUtb3B0aW9uOiAob3B0aW9uKSAhLT5cclxuICAgIG9wdGlvbi5wYXJlbnQhYWRkLWNsYXNzIFxcdWktaGVscGVyLWhpZGRlblxyXG4gICAgb3B0aW9uLmF0dHIgXFxhcmlhLWhpZGRlbiBcXHRydWVcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgT1BUSU9OIFNFTEVDVElPTlxyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG4gICMjXHJcbiAgIyMgV0lER0VUIEFDVElWQVRJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIEFjdGl2YXRlcyB0aGUgd2lkZ2V0IGJ5IGdpdmluZyBpdCB0aGUgYXBwcm9wcmlhdGUgY2xhc3NlcyBhbmQgZm9jdXNpbmcgXHJcbiAgIyB0aGUgc2VhcmNoIGZpZWxkLlxyXG4gIF9hY3RpdmF0ZS13aWRnZXQ6IChldmVudCkgIS0+XHJcbiAgICBAY29udGFpbmVyLmFkZC1jbGFzcyBcXGJhci1zcC1hY3RpdmVcclxuICAgIEBzZWxlY3Rpb24uYWRkLWNsYXNzIFxcdWktc3RhdGUtZm9jdXMgaWYgbm90IEBtdWx0aXBsZVxyXG4gICAgQGFjdGl2ZSA9IHllc1xyXG4gICAgQHNlYXJjaC1maWVsZC52YWwgQHNlYXJjaC1maWVsZC52YWwhXHJcbiAgICBAc2VhcmNoLWZpZWxkLmZvY3VzIVxyXG5cclxuICAjIERlYWN0aXZhdGVzIHRoZSB3aWRnZXQgYnkgcmVtb3ZpbmcgdGhlIGFwcHJvcHJpYXRlIGNsYXNzZXMsIGNsb3NpbmcgdGhlIFxyXG4gICMgZHJvcGRvd24sIGFuZCBjbGVhcmluZyBtdWNoIG9mIHRoZSB3aWRnZXQncyBzdGF0ZS5cclxuICBfZGVhY3RpdmF0ZS13aWRnZXQ6IChldmVudCkgIS0+XHJcbiAgICAkIGRvY3VtZW50IC51bmJpbmQgXFxjbGljayBAZG9jdW1lbnQtY2xpY2stYWN0aW9uXHJcbiAgICBAYWN0aXZlID0gbm9cclxuICAgIEBfY2xvc2UtZHJvcGRvd24hXHJcblxyXG4gICAgQGNvbnRhaW5lci5yZW1vdmUtY2xhc3MgXFxiYXItc3AtYWN0aXZlXHJcbiAgICBAc2VsZWN0aW9uLnJlbW92ZS1jbGFzcyBcXHVpLXN0YXRlLWZvY3VzIGlmIG5vdCBAbXVsdGlwbGVcclxuICAgIEBfY2xlYXItb3B0aW9ucy1maWx0ZXIhXHJcbiAgICBAX2NsZWFyLWJhY2tzcGFjZSFcclxuXHJcbiAgICBAX3NldC1zZWFyY2gtZmllbGQtZGVmYXVsdCFcclxuICAgIEBfcmVzaXplLXNlYXJjaC1maWVsZCFcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgV0lER0VUIEFDVElWQVRJT05cclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIE9QVElPTiBGSUxURVJJTkdcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIEFwcGxpZXMgdGhlIHRleHQgaW4gdGhlIHNlYXJjaCBmaWVsZCB0byB0aGUgYXZhaWxhYmxlIG9wdGlvbnMsIGhpZGluZyBhbGwgXHJcbiAgIyBvZiB0aG9zZSB0aGF0IGRvbid0IG1hdGNoIHRoZSBzZWFyY2ggYW5kIGhpZ2hsaWdodGluZyB0aGUgcG9ydGlvbiBvZiB0aGUgXHJcbiAgIyByZXN0IHRoYXQgZG9lcyBtYXRjaCB0aGUgc2VhcmNoLlxyXG4gIF9maWx0ZXItb3B0aW9uczogIS0+XHJcbiAgICBAX2NsZWFyLW5vdC1mb3VuZCFcclxuICAgIGNvdW50ID0gMFxyXG5cclxuICAgIHNlYXJjaC10ZXh0ID0gJCBcXDxkaXY+IC50ZXh0KCQudHJpbSBAc2VhcmNoLWZpZWxkLnZhbCEpLmh0bWwhXHJcbiAgICByZWdleC1hbmNob3IgPSBpZiBAb3B0aW9ucy5hbmNob3JlZC1zZWFyY2ggdGhlbiAnXicgZWxzZSAnJ1xyXG4gICAgZXNjYXBlZC1zZWFyY2ggPSBzZWFyY2gtdGV4dC5yZXBsYWNlIC9bLVtcXF17fSgpKis/LixcXFxcXiR8I1xcc10vZyBcXFxcXFwkJlxyXG4gICAgcmVnZXggPSBuZXcgUmVnRXhwIHJlZ2V4LWFuY2hvciArIGVzY2FwZWQtc2VhcmNoLCAnaSdcclxuICAgIHBhcnQtcmVnZXggPSBuZXcgUmVnRXhwICdcXFxccycgKyBlc2NhcGVkLXNlYXJjaCwgJ2knXHJcblxyXG4gICAgZm9yIG9wdGlvbiBpbiBAbW9kZWxcclxuICAgICAgaWYgbm90IG9wdGlvbi5kaXNhYmxlZCBhbmQgbm90IG9wdGlvbi5lbXB0eVxyXG4gICAgICAgIGlmIG9wdGlvbi5ncm91cFxyXG4gICAgICAgICAgQF9kZWFjdGl2YXRlLW9wdGlvbiAkIFwiIyN7b3B0aW9uLl9kb20taWR9XCJcclxuICAgICAgICBlbHNlIGlmIG5vdCAoQG11bHRpcGxlIGFuZCBvcHRpb24uc2VsZWN0ZWQpXHJcbiAgICAgICAgICBmb3VuZCA9IG5vXHJcbiAgICAgICAgICByZXN1bHQtaWQgPSBvcHRpb24uX2RvbS1pZFxyXG4gICAgICAgICAgcmVzdWx0ID0gJCBcIiMje3Jlc3VsdC1pZH1cIlxyXG5cclxuICAgICAgICAgIGlmIChzdGFydCA9IG9wdGlvbi5odG1sLnNlYXJjaCByZWdleCkgaXMgbm90IC0xXHJcbiAgICAgICAgICAgIGZvdW5kID0geWVzXHJcbiAgICAgICAgICAgIGNvdW50ICs9IDFcclxuICAgICAgICAgIGVsc2UgaWYgQG9wdGlvbnMuc3BsaXQtc2VhcmNoIGFuZCAob3B0aW9uLmh0bWwuaW5kZXgtb2YoJyAnKSBpcyBub3QgLTEgb3Igb3B0aW9uLmh0bWwuaW5kZXgtb2YoJ1snKSBpcyAwKVxyXG4gICAgICAgICAgICBwYXJ0cyA9IG9wdGlvbi5odG1sLnJlcGxhY2UgL1xcW3xcXF0vZyAnJyAuc3BsaXQgJyAnXHJcbiAgICAgICAgICAgIGlmIHBhcnRzLmxlbmd0aFxyXG4gICAgICAgICAgICAgIGZvciBwYXJ0IGluIHBhcnRzXHJcbiAgICAgICAgICAgICAgICBpZiByZWdleC50ZXN0IHBhcnRcclxuICAgICAgICAgICAgICAgICAgZm91bmQgPSB5ZXNcclxuICAgICAgICAgICAgICAgICAgY291bnQgKz0gMVxyXG4gICAgICAgICAgICAgICAgICBzdGFydCA9IG9wdGlvbi5odG1sLnNlYXJjaChwYXJ0LXJlZ2V4KSArIDFcclxuICAgICAgICAgICAgICAgICAgYnJlYWtcclxuXHJcbiAgICAgICAgICBpZiBmb3VuZFxyXG4gICAgICAgICAgICBpZiBzZWFyY2gtdGV4dC5sZW5ndGhcclxuICAgICAgICAgICAgICB0ZXh0ID0gXCIjeyBvcHRpb24uaHRtbC5zdWJzdHIgMCBzdGFydCArIHNlYXJjaC10ZXh0Lmxlbmd0aCB9PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgI3sgb3B0aW9uLmh0bWwuc3Vic3RyIHN0YXJ0ICsgc2VhcmNoLXRleHQubGVuZ3RoIH1cIlxyXG4gICAgICAgICAgICAgIHRleHQgPSBcIiN7IHRleHQuc3Vic3RyIDAgc3RhcnQgfTxzcGFuIGNsYXNzPVxcXCJ1aS1wcmlvcml0eS1wcmltYXJ5XFxcIj4jeyB0ZXh0LnN1YnN0ciBzdGFydCB9XCJcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgIHRleHQgPSBvcHRpb24uaHRtbFxyXG5cclxuICAgICAgICAgICAgcmVzdWx0Lmh0bWwgdGV4dFxyXG4gICAgICAgICAgICBAX2FjdGl2YXRlLW9wdGlvbiByZXN1bHRcclxuXHJcbiAgICAgICAgICAgIGlmIG9wdGlvbi5fZ3JvdXAtaW5kZXg/XHJcbiAgICAgICAgICAgICAgQF9hY3RpdmF0ZS1vcHRpb24gJCBcIiMje0Btb2RlbFtvcHRpb24uX2dyb3VwLWluZGV4XS5fZG9tLWlkfVwiXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIEBfY2xlYXItaGlnaGxpZ2h0ISBpZiBAaGlnaGxpZ2h0ZWQtb3B0aW9uIGFuZCByZXN1bHQtaWQgaXMgQGhpZ2hsaWdodGVkLW9wdGlvbi5hdHRyIFxcaWRcclxuICAgICAgICAgICAgQF9kZWFjdGl2YXRlLW9wdGlvbiByZXN1bHRcclxuXHJcbiAgICBpZiBjb3VudCA8IDEgYW5kIHNlYXJjaC10ZXh0Lmxlbmd0aFxyXG4gICAgICBAX25vdC1mb3VuZCBzZWFyY2gtdGV4dFxyXG4gICAgZWxzZVxyXG4gICAgICBAX3NldC1maWx0ZXItaGlnaGxpZ2h0IVxyXG5cclxuICAjIENsZWFycyB0aGUgZmlsdGVyIGJ5IGFjdGl2YXRpbmcgYWxsIG9wdGlvbnMgdGhhdCB3ZXJlIGhpZGRlbi4gSXQgYWxzbyBcclxuICAjIGNsZWFycyB0aGUgc2VhcmNoIGZpZWxkLlxyXG4gIF9jbGVhci1vcHRpb25zLWZpbHRlcjogIS0+XHJcbiAgICBAc2VhcmNoLWZpZWxkLnZhbCAnJ1xyXG4gICAgbGlua3MgPSBAc2VsZWN0LW9wdGlvbnMuZmluZCBcXGFcclxuXHJcbiAgICBmb3IgYSBpbiBsaW5rc1xyXG4gICAgICBsaW5rID0gJCBhXHJcbiAgICAgIGlmIG5vdCBAbXVsdGlwbGUgb3IgbGluay5oYXMtY2xhc3MgXFxiYXItc3Atb3B0aW9uLWdyb3VwIG9yIG5vdCBsaW5rLmhhcy1jbGFzcyBcXGJhci1zcC1zZWxlY3RlZFxyXG4gICAgICAgIEBfYWN0aXZhdGUtb3B0aW9uIGxpbmsgXHJcblxyXG4gICMgSGlnaGxpZ2h0cyB3aGljaGV2ZXIgb3B0aW9uIGlzIGFwcHJvcHJpYXRlIGFmdGVyIHRoZSBmaWx0ZXIgcmVtb3ZlcyBzb21lIFxyXG4gICMgb3B0aW9ucy4gSWYgdGhlIGN1cnJlbnRseSBoaWdobGlnaHRlZCBvcHRpb24gaXMgcmVtb3ZlZCBieSB0aGUgZmlsdGVyLCBcclxuICAjIHRoaXMgd2lsbCBmaWd1cmUgb3V0IHRoZSBjbG9zZXN0IHN0aWxsLXZpc2libGUgb25lIGFuZCB1c2UgaXQgaW5zdGVhZC5cclxuICBfc2V0LWZpbHRlci1oaWdobGlnaHQ6ICEtPlxyXG4gICAgaWYgbm90IEBoaWdobGlnaHRlZC1vcHRpb25cclxuICAgICAgc2VsZWN0ZWQgPSBpZiBAbXVsdGlwbGUgdGhlbiBbXSBlbHNlIEBzZWxlY3Qtb3B0aW9ucy5maW5kIFxcLmJhci1zcC1zZWxlY3RlZFxyXG4gICAgICBoaWdobGlnaHRlZCA9IGlmIHNlbGVjdGVkLmxlbmd0aFxyXG4gICAgICAgICAgICAgICAgICAgIHRoZW4gc2VsZWN0ZWQuZmlyc3QhXHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBAc2VsZWN0LW9wdGlvbnMuZmluZCBcXC5iYXItc3Atb3B0aW9uIC5maXJzdCFcclxuICAgICAgQF9oaWdobGlnaHQtb3B0aW9uIGhpZ2hsaWdodGVkIGlmIGhpZ2hsaWdodGVkLmxlbmd0aFxyXG5cclxuICAjIEFkZHMgZWxlbWVudHMgdG8gdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhhdCBhIHNlYXJjaCBkaWQgbm90IHJldHVybiBhIFxyXG4gICMgcmVzdWx0LlxyXG4gIF9ub3QtZm91bmQ6ICh0ZXh0KSAhLT5cclxuICAgIGh0bWwgPSAkIFwiPGxpIGNsYXNzPVxcXCJiYXItc3Atbm90LWZvdW5kIHVpLW1lbnUtaXRlbVxcXCI+XHJcbiAgICAgICAgICAgICAgPGEgaHJlZj1cXFwiamF2YXNjcmlwdDp2b2lkKDApXFxcIj4je0BvcHRpb25zLm5vdC1mb3VuZC10ZXh0fSBcXFwiI3t0ZXh0fVxcXCI8L2E+PC9saT5cIlxyXG4gICAgQHNlbGVjdC1vcHRpb25zLmFwcGVuZCBodG1sXHJcblxyXG4gICMgQ2xlYXJzIHRoZSBub3QtZm91bmQgbWVzc2FnZSBmcm9tIHRoZSBET01cclxuICBfY2xlYXItbm90LWZvdW5kOiAhLT5cclxuICAgIEBzZWxlY3Qtb3B0aW9ucy5maW5kIFxcLmJhci1zcC1ub3QtZm91bmQgLnJlbW92ZSFcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgV0lER0VUIE9QVElPTlNcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIFVUSUxJVFkgRlVOQ1RJT05TXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiAgIyBIYW5kbGVzIGJvdGggdGhlIGRpc2FibGluZyBhbmQgdGhlIGVuYWJsaW5nIG9mIHRoZSB3aWRnZXQuIFRoaXMgc2V0cyB0aGUgXHJcbiAgIyBkaXNhYmxlZCBDU1MgY2xhc3MgdG8gdGhlIGNvbnRhaW5lciBhbmQgZXhwbGljaXRseSBkaXNhYmxlcyB0aGUgc2VhcmNoIFxyXG4gICMgZmllbGQgKG9yIHRoZSBvcHBvc2l0ZSwgaWYgdGhlIHdpZGdldCBpcyBlbmFibGVkKS4gU2luY2UgdGhlIHNlYXJjaCBmaWVsZCBcclxuICAjIGlzIGRpc2FibGVkLCB0aGUgd2lkZ2V0IHdpbGwgbm90IHJlY2VpdmUgZm9jdXMgd2hpbGUgZGlzYWJsZWQuXHJcbiAgX3NldC1kaXNhYmxlZC1zdGF0ZTogIS0+XHJcbiAgICBpZiBAb3B0aW9ucy5kaXNhYmxlZFxyXG4gICAgICBAY29udGFpbmVyLmFkZC1jbGFzcyAnYmFyLXNwLWRpc2FibGVkIHVpLXN0YXRlLWRpc2FibGVkJ1xyXG4gICAgICBAc2VhcmNoLWZpZWxkLjAuZGlzYWJsZWQgPSB5ZXNcclxuICAgICAgQF9kZWFjdGl2YXRlLXdpZGdldCFcclxuICAgIGVsc2VcclxuICAgICAgQGNvbnRhaW5lci5yZW1vdmUtY2xhc3MgJ2Jhci1zcC1kaXNhYmxlZCB1aS1zdGF0ZS1kaXNhYmxlZCdcclxuICAgICAgQHNlYXJjaC1maWVsZC4wLmRpc2FibGVkID0gbm9cclxuXHJcbiAgIyBTZXRzIHRoZSBkZWZhdWx0IHRleHQgYW5kIGNsYXNzIGludG8gdGhlIHNlYXJjaCBmaWVsZC4gTm90ZSB0aGF0IHNpbmNlIFxyXG4gICMgb25seSBtdWx0aS1zZWxlY3Qgd2lkZ2V0cyBwdXQgdGhlIGRlZmF1bHQgdGV4dCBpbiB0aGUgc2VhcmNoIGZpZWxkLCB0aGlzIFxyXG4gICMgbWV0aG9kIHdpbGwgaGF2ZSBhbnkgcmVhbCBlZmZlY3Qgd2hlbiBjYWxsZWQgYnkgYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBcclxuICAjIFNpbmdsZS1zZWxlY3QgY2FuIGNhbGwgaXQsIGJ1dCBpdCB3b24ndCBkbyBhbnl0aGluZy5cclxuICBfc2V0LXNlYXJjaC1maWVsZC1kZWZhdWx0OiAhLT5cclxuICAgIGlmIEBtdWx0aXBsZSBhbmQgQHNlbGVjdGlvbnMgPCAxIGFuZCBub3QgQGFjdGl2ZVxyXG4gICAgICBAc2VhcmNoLWZpZWxkLnZhbCBAb3B0aW9ucy5kZWZhdWx0LXRleHQgLmFkZC1jbGFzcyBcXGJhci1zcC1kZWZhdWx0XHJcbiAgICBlbHNlXHJcbiAgICAgIEBzZWFyY2gtZmllbGQudmFsICcnIC5yZW1vdmUtY2xhc3MgXFxiYXItc3AtZGVmYXVsdFxyXG5cclxuICAjIFJlc2l6ZXMgdGhlIHNlYXJjaCBmaWVsZCB3aWR0aCBhbmQgcG9zaXRpb25pbmcuIFRoaXMgb25seSByZWFsbHkgbmVlZHMgdG8gXHJcbiAgIyBiZSBkb25lIG9uY2UgKGF0IGNyZWF0aW9uKSBmb3Igc2luZ2xlLXNlbGVjdCB3aWRnZXRzIHNpbmNlIHRoZXkgd2lsbCBcclxuICAjIGFsd2F5cyBoYXZlIHRoZSBzYW1lIG51bWJlciBvZiBzZWxlY3Rpb25zIGFuZCBkb24ndCBuZWVkIHJlc2l6aW5nLiBNdWx0aS1cclxuICAjIHNlbGVjdCB3aWRnZXRzIHNob3VsZCByZXF1aXJlIGl0IGVhY2ggdGltZSBhbiBvcHRpb24gaXMgc2VsZWN0ZWQgb3IgXHJcbiAgIyBkZXNlbGVjdGVkLCBzaW5jZSB0aGF0IG1heSBjaGFuZ2UgdGhlIHNpemUgb2YgdGhlIGlucHV0LiBIb3dldmVyLCBjYWxsaW5nIFxyXG4gICMgdGhpcyBtb3JlIHRoYW4gb25jZSBvbiBhIHNpbmdsZS1zZWxlY3Qgd2lkZ2V0IGlzIGhhcm1sZXNzIHNpbmNlIGl0IHdpbGwgXHJcbiAgIyBhbHdheXMgJ3Jlc2l6ZScgdG8gdGhlIHNhbWUgc2l6ZS5cclxuICBfcmVzaXplLXNlYXJjaC1maWVsZDogIS0+XHJcbiAgICBpZiBAbXVsdGlwbGVcclxuICAgICAgc2Ytd2lkdGggPSAwXHJcbiAgICAgIHN0eWxlLXRleHQgPSAncG9zaXRpb246YWJzb2x1dGU7bGVmdDotMTAwMHB4O3RvcDotMTAwMHB4O2Rpc3BsYXk6bm9uZTsnXHJcbiAgICAgIHN0eWxlcyA9IDxbIGZvbnQtc2l6ZSBmb250LXN0eWxlIGZvbnQtd2VpZ2h0IGZvbnQtZmFtaWx5IGxpbmUtaGVpZ2h0IHRleHQtdHJhbnNmb3JtIGxldHRlci1zcGFjaW5nIF0+XHJcblxyXG4gICAgICBmb3Igc3R5bGUgaW4gc3R5bGVzXHJcbiAgICAgICAgc3R5bGUtdGV4dCArPSBcIiNzdHlsZTojeyBAc2VhcmNoLWZpZWxkLmNzcyBzdHlsZSB9O1wiXHJcblxyXG4gICAgICB0ZW1wLWRpdiA9ICQgXFw8ZGl2PiBzdHlsZTogc3R5bGUtdGV4dFxyXG4gICAgICB0ZW1wLWRpdi50ZXh0IEBzZWFyY2gtZmllbGQudmFsIVxyXG4gICAgICAkIFxcYm9keSAuYXBwZW5kIHRlbXAtZGl2XHJcblxyXG4gICAgICBzZi13aWR0aCA9IHRlbXAtZGl2LndpZHRoICsgMjVcclxuICAgICAgc2Ytd2lkdGggPSBAd2lkdGggLSAxMCBpZiBzZi13aWR0aCA+IEB3aWR0aCAtIDEwXHJcbiAgICAgIHRlbXAtZGl2LnJlbW92ZSFcclxuICAgIGVsc2VcclxuICAgICAgZGQtd2lkdGggPSBAd2lkdGggLSBAX2dldC1ib3JkZXItYW5kLXNpZGUtd2lkdGggQGRyb3Bkb3duXHJcbiAgICAgIHNmLXdpZHRoID0gZGQtd2lkdGggLSBAX2dldC1ib3JkZXItYW5kLXNpZGUtd2lkdGgoQHNlYXJjaC1jb250YWluZXIpIC0gXFxcclxuICAgICAgICBAX2dldC1ib3JkZXItYW5kLXNpZGUtd2lkdGggQHNlYXJjaC1maWVsZFxyXG5cclxuICAgIGRkLXRvcCA9IEBjb250YWluZXIuaGVpZ2h0IVxyXG4gICAgQHNlYXJjaC1maWVsZC5jc3Mgd2lkdGg6IHNmLXdpZHRoICsgXFxweFxyXG4gICAgQGRyb3Bkb3duLmNzcyB0b3A6IGRkLXRvcCArIFxccHhcclxuXHJcbiAgIyBNb3ZlcyB0aGUgdW5kZXJseWluZyBlbGVtZW50J3MgdGFiaW5kZXggdG8gdGhlIHdpZGdldCdzIHNlYXJjaCBmaWVsZCwgc28gXHJcbiAgIyB0aGF0IHRoZSB3aWRnZXQgY2FuIGluc2VydCBpdHNlbGYgaW50byB3aGF0ZXZlciB0YWJpbmRleCBzY2hlbWUgaGFzIGJlZW4gXHJcbiAgIyBlc3RhYmxpc2hlZC4gSWYgdGhlIHVuZGVybHlpbmcgZWxlbWVudCBoYXMgbm8gdGFiaW5kZXgsIHRoZSB3aWRnZXQncyB3aWxsIFxyXG4gICMgc3RheSBhdCAtMS5cclxuICBfc2V0LXRhYi1pbmRleDogIS0+XHJcbiAgICBpbmRleCA9IEBlbGVtZW50LmF0dHIgXFx0YWJpbmRleFxyXG4gICAgaWYgaW5kZXhcclxuICAgICAgQGVsZW1lbnQuYXR0ciBcXHRhYmluZGV4IC0xXHJcbiAgICAgIEBzZWFyY2gtZmllbGQuYXR0ciBcXHRhYmluZGV4IGluZGV4XHJcblxyXG4gICMgVW5kb2VzIHRoZSBjaGFuZ2VzIGZyb20gdGhlIF9zZXQtdGFiLWluZGV4IG1ldGhvZC4gVGhpcyBpcyBjYWxsZWQgXHJcbiAgIyBpbW1lZGlhdGVseSBwcmlvciB0byB0aGUgZGVzdHJ1Y3Rpb24gb2YgdGhlIHdpZGdldCwgcHV0dGluZyB0aGUgdGFiaW5kZXggXHJcbiAgIyBiYWNrIG9udG8gdGhlIHVuZGVybHlpbmcgZWxlbWVudCBzbyB0aGF0IGEgbmV3IHdpZGdldCBjb3VsZCBjb25jZWl2YWJseSBcclxuICAjIGJlIGJ1aWx0IGluIHRoZSBzYW1lIGxvY2F0aW9uLlxyXG4gIF9yZXZlcnQtdGFiLWluZGV4OiAhLT5cclxuICAgIGluZGV4ID0gQHNlYXJjaC1maWVsZC5hdHRyIFxcdGFiaW5kZXhcclxuICAgIGlmIGluZGV4XHJcbiAgICAgIEBzZWFyY2gtZmllbGQuYXR0ciBcXHRhYmluZGV4IC0xXHJcbiAgICAgIEBlbGVtZW50LmF0dHIgXFx0YWJpbmRleCBpbmRleFxyXG5cclxuICAjIFJlbW92ZXMgcmVjb3JkIG9mIGJhY2tzcGFjZXMgcHJlc3NlZCB3aXRoIHJlZ2FyZCB0byBkZWxldGluZyBzZWxlY3Rpb25zIFxyXG4gICMgaW4gYSBtdWx0aS1zZWxlY3Qgd2lkZ2V0LiBJdCBjbGVhcnMgZGF0YSAgYWJvdXQgd2hpY2ggb3B0aW9uIHdpbGwgYmUgXHJcbiAgIyByZW1vdmVkIG9uIHRoZSBuZXh0IGJhY2tzcGFjZSBhbmQgcmVtb3ZlcyB0aGUgZm9jdXMgc3RhdGUgQ1NTIGNsYXNzIGZyb20gXHJcbiAgIyBwcmV2aW91c2x5LWJhY2tzcGFjZWQgb3B0aW9ucy4gXHJcbiAgX2NsZWFyLWJhY2tzcGFjZTogIS0+XHJcbiAgICBAcGVuZGluZy1kZXNlbGVjdGlvbi5yZW1vdmUtY2xhc3MgXFx1aS1zdGF0ZS1mb2N1cyBpZiBAcGVuZGluZy1kZXNlbGVjdGlvblxyXG4gICAgQHBlbmRpbmctZGVzZWxlY3Rpb24gPSBudWxsXHJcblxyXG4gICMgR2VuZXJhdGVzIGEgcmFuZG9tIElEIGZvciBhIGNvbnRhaW5lci4gVGhpcyBpcyBvbmx5IGNhbGxlZCBpZiB0aGUgXHJcbiAgIyBvcmlnaW5hbCBlbGVtZW50IGRvZXNuJ3QgaGF2ZSBhbiBJRCB0byBidWlsZCBvZmYgb2YgYW5kIGNvbnNpc3RzIHNpbXBseSBcclxuICAjIG9mIHRoZSBzdHJpbmcgJ3NwLScgZm9sbG93ZWQgYnkgNiByYW5kb20gYWxwaGFudW1lcmljIGNoYXJhY3RlcnMuXHJcbiAgX2dlbmVyYXRlLWNvbnRhaW5lci1pZDogLT5cclxuICAgIHJlc3VsdCA9IFxcc3AtICsgW0BfZ2VuZXJhdGUtY2hhciEgZm9yIGkgZnJvbSAxIHRvIDZdICogJydcclxuICAgIHdoaWxlICQgXCIjI3tyZXN1bHR9XCIgLmxlbmd0aFxyXG4gICAgICByZXN1bHQgKz0gQF9nZW5lcmF0ZS1jaGFyIVxyXG4gICAgcmVzdWx0XHJcblxyXG4gICMgR2VuZXJhdGVzIGEgc2luZ2xlIHJhbmRvbSBhbHBoYW51bWVyaWMgY2hhcmFjdGVyLCBmb3IgdXNlIHdpdGggdGhlIFxyXG4gICMgcHJldmlvdXMgbWV0aG9kLlxyXG4gIF9nZW5lcmF0ZS1jaGFyOiAtPlxyXG4gICAgY2hhcnMgPSBcXDAxMjM0NTY3ODlBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWlxyXG4gICAgcmFuZCA9IE1hdGguZmxvb3IgTWF0aC5yYW5kb20hICogY2hhcnMubGVuZ3RoXHJcbiAgICBjaGFycy5jaGFyLWF0IHJhbmRcclxuXHJcbiAgIyBHZW5lcmF0ZXMgYW4gSUQgZm9yIGFuIG9wdGlvbi4gVGhpcyBjb25zaXN0cyBvZiB0aGUgdHlwZSBvZiB0aGUgb3B0aW9uIFxyXG4gICMgKHRoaW5ncyBsaWtlICdvcHRpb24nLCAnZ3JvdXAnLCBvciAnc2VsZWN0aW9uJyksIHRoZSBjb250YWluZXIgSUQsIGFuZCBcclxuICAjIHRoZSBpbmRleCBvZiB0aGUgb3B0aW9uIGRhdGEgd2l0aGluIHRoZSBtb2RlbCwgYWxsIHNlcGFyYXRlZCBieSBoeXBoZW5zLlxyXG4gIF9nZW5lcmF0ZS1kb20taWQ6ICh0eXBlLCBpbmRleCkgLT4gXCIjdHlwZS0je0Bjb250YWluZXItaWR9LSNpbmRleFwiXHJcblxyXG4gICMgRGV0ZXJtaW5lcyB0aGUgd2lkdGggb2YgYW4gZWxlbWVudCdzIGJvcmRlciBhbmQgcGFkZGluZyB0b2dldGhlci4gVGhpcyBpcyBcclxuICAjIHVzZWQgdG8gbGF5IG91dCB0aGUgd2lkZ2V0IG9uIGNyZWF0aW9uLlxyXG4gIF9nZXQtYm9yZGVyLWFuZC1zaWRlLXdpZHRoOiAoZWxlbWVudCkgLT4gZWxlbWVudC5vdXRlci13aWR0aCEgLSBlbGVtZW50LndpZHRoIVxyXG5cclxuICAjIEV4dHJhY3RzIHRoZSBpbmRleCAocG9zaXRpb24gb2YgYW4gZWxlbWVudCB3aXRoaW4gdGhlIG1vZGVsKSBmcm9tIGFuIFxyXG4gICMgb3B0aW9uLiBJdCBkb2VzIHRoaXMgYnkgcHVsbGluZyB0aGUgbnVtYmVyIGZyb20gdGhlIGVuZCBvZiB0aGUgb3B0aW9uJ3MgXHJcbiAgIyBJRC5cclxuICBfZ2V0LW1vZGVsLWluZGV4OiAob3B0aW9uKSAtPlxyXG4gICAgaWQgPSBvcHRpb24uYXR0ciBcXGlkXHJcbiAgICBpZC5zdWJzdHIgaWQubGFzdC1pbmRleC1vZihcXC0pICsgMVxyXG5cclxuICAjIFJlbW92ZXMgdGhlICdpbnRlcm5hbCcgZGF0YSAoa2V5cyB0aGF0IGJlZ2luIHdpdGggYW4gdW5kZXJzY29yZSkgZnJvbSBhbiBcclxuICAjIGl0ZW0ncyBkYXRhIGFuZCByZXR1cm5zIHRoZSBzYW5pdGl6ZWQgb2JqZWN0LlxyXG4gIF9zYW5pdGl6ZS1pdGVtOiAoaXRlbSkgLT5cclxuICAgIHJlc3VsdCA9IHt9XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2YgaXRlbVxyXG4gICAgICByZXN1bHRba2V5XSA9IHZhbHVlIGlmIGtleS5pbmRleC1vZihcXF8pIGlzIG5vdCAwXHJcbiAgICByZXN1bHRcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgVVRJTElUWSBGVU5DVElPTlNcclxuICAjI1xyXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xyXG5cclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAjI1xyXG4gICMjIERBVEEgUEFSU0lOR1xyXG4gICMjXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcblxyXG4gICMgUGFyc2VzIGRhdGEgaW50byBhIG1vZGVsLiBUaGlzIGRhdGEgY2FuIGNvbWUgZWl0aGVyIGZyb20gdGhlIGRhdGEgb3B0aW9uIFxyXG4gICMgb3IgYSBiYWNraW5nIHNlbGVjdCBlbGVtZW50IGFuZCBpdHMgY2hpbGRyZW4uXHJcbiAgX3BhcnNlOiAtPlxyXG4gICAgaWYgQG9wdGlvbnMuZGF0YVxyXG4gICAgICBAX3BhcnNlLWRhdGEgQG9wdGlvbnMuZGF0YVxyXG4gICAgZWxzZSBpZiBAZWxlbWVudC4wLm5vZGUtbmFtZS50by1sb3dlci1jYXNlISBpcyBcXHNlbGVjdFxyXG4gICAgICBAX3BhcnNlLW9wdGlvbnMgQGVsZW1lbnQuMFxyXG4gICAgZWxzZVxyXG4gICAgICBbXVxyXG5cclxuICAjIFBhcnNlcyBKU09OIGRhdGEgaW50byBhIG1vZGVsLiBJZiB0aGVyZSBhcmUgYWRkaXRpb25hbCBmaWVsZHMgb3ZlciBhbmQgXHJcbiAgIyBhYm92ZSB0aGUgbmVjZXNzYXJ5IG9uZXMgd2l0aGluIGEgZGF0YSBlbGVtZW50LCB0aGV5IHdpbGwgYmUgcmV0YWluZWQgXHJcbiAgIyAoanVzdCBub3QgdXNlZCBieSB0aGUgd2lkZ2V0KS5cclxuICBfcGFyc2UtZGF0YTogKGRhdGEpIC0+XHJcbiAgICBvcHRpb24taW5kZXggPSAwXHJcbiAgICBtb2RlbCA9IFtdXHJcblxyXG4gICAgYWRkLW5vZGUgPSAobm9kZSkgIS0+XHJcbiAgICAgIGlmIG5vZGUuY2hpbGRyZW4/Lmxlbmd0aCB0aGVuIGFkZC1ncm91cCBub2RlIGVsc2UgYWRkLW9wdGlvbiBub2RlXHJcblxyXG4gICAgYWRkLWdyb3VwID0gKG5vZGUpICEtPlxyXG4gICAgICBwb3NpdGlvbiA9IG1vZGVsLmxlbmd0aFxyXG4gICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgX25vZGUtaW5kZXg6IHBvc2l0aW9uXHJcbiAgICAgICAgZ3JvdXA6IHllc1xyXG4gICAgICAgIGxhYmVsOiBub2RlLmxhYmVsID8gbm9kZS50ZXh0ID8gJydcclxuICAgICAgICBfY2hpbGRyZW46IDBcclxuICAgICAgICBkaXNhYmxlZDogbm9kZS5kaXNhYmxlZCA/IG5vXHJcbiAgICAgIGZvciBvd24ga2V5LCB2YWwgb2Ygbm9kZVxyXG4gICAgICAgIGlmIG5vdCAkLmluLWFycmF5IGtleSwgPFsgX25vZGVJbmRleCBncm91cCBsYWJlbCBfY2hpbGRyZW4gZGlzYWJsZWQgXT5cclxuICAgICAgICAgIG5ldy1ub2RlW2tleV0gPSB2YWxcclxuICAgICAgbW9kZWxbKl0gPSBuZXctbm9kZVxyXG4gICAgICBbYWRkLW9wdGlvbiBvcHRpb24sIHBvc2l0aW9uLCBub2RlLmRpc2FibGVkIGZvciBvcHRpb24gaW4gbm9kZS5jaGlsZHJlbl1cclxuXHJcbiAgICBhZGQtb3B0aW9uID0gKG5vZGUsIGdyb3VwLXBvc2l0aW9uLCBncm91cC1kaXNhYmxlZCkgIS0+XHJcbiAgICAgIGlmIG5vdCBub2RlLmNoaWxkcmVuPy5sZW5ndGhcclxuICAgICAgICBpZiBub2RlLnRleHQgaXMgbm90ICcnXHJcbiAgICAgICAgICBpZiBncm91cC1wb3NpdGlvbj9cclxuICAgICAgICAgICAgbW9kZWxbZ3JvdXAtcG9zaXRpb25dLl9jaGlsZHJlbiArPSAxXHJcbiAgICAgICAgICBuZXctbm9kZSA9XHJcbiAgICAgICAgICAgIF9ub2RlLWluZGV4OiBtb2RlbC5sZW5ndGhcclxuICAgICAgICAgICAgX29wdGlvbi1pbmRleDogb3B0aW9uLWluZGV4XHJcbiAgICAgICAgICAgIHZhbHVlOiBub2RlLnZhbHVlID8gbm9kZS50ZXh0XHJcbiAgICAgICAgICAgIHRleHQ6IG5vZGUudGV4dFxyXG4gICAgICAgICAgICBodG1sOiBub2RlLmh0bWwgPyBub2RlLnRleHRcclxuICAgICAgICAgICAgc2VsZWN0ZWQ6IG5vZGUuc2VsZWN0ZWQgPyBub1xyXG4gICAgICAgICAgICBkaXNhYmxlZDogaWYgZ3JvdXAtZGlzYWJsZWQgdGhlbiBncm91cC1kaXNhYmxlZCBlbHNlIG5vZGUuZGlzYWJsZWQgPyBub1xyXG4gICAgICAgICAgICBfZ3JvdXAtaW5kZXg6IGdyb3VwLXBvc2l0aW9uXHJcbiAgICAgICAgICAgIGNsYXNzZXM6IG5vZGUuY2xhc3Nlc1xyXG4gICAgICAgICAgICBzdHlsZTogbm9kZS5zdHlsZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG5ldy1ub2RlID1cclxuICAgICAgICAgICAgX25vZGUtaW5kZXg6IG1vZGVsLmxlbmd0aFxyXG4gICAgICAgICAgICBfb3B0aW9uLWluZGV4OiBvcHRpb24taW5kZXhcclxuICAgICAgICAgICAgZW1wdHk6IHllc1xyXG4gICAgICAgIGZvciBvd24ga2V5LCB2YWwgb2Ygbm9kZVxyXG4gICAgICAgICAgaWYgbm90ICQuaW4tYXJyYXkga2V5LCA8WyBfbm9kZUluZGV4IF9vcHRpb25JbmRleCB2YWx1ZSB0ZXh0IGh0bWwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkIGRpc2FibGVkIF9ncm91cEluZGV4IGNsYXNzZXMgc3R5bGUgXT5cclxuICAgICAgICAgICAgbmV3LW5vZGVba2V5XSA9IHZhbFxyXG4gICAgICAgIG9wdGlvbi1pbmRleCArPSAxXHJcbiAgICAgICAgbW9kZWxbKl0gPSBuZXctbm9kZVxyXG5cclxuICAgIGZvciBub2RlIGluIGRhdGFcclxuICAgICAgYWRkLW5vZGUgbm9kZVxyXG4gICAgbW9kZWxcclxuXHJcbiAgIyBQYXJzZXMgYSBzZWxlY3QgZWxlbWVudCBpbnRvIGEgbW9kZWwuXHJcbiAgX3BhcnNlLW9wdGlvbnM6IChlbGVtZW50KSAtPlxyXG4gICAgb3B0aW9uLWluZGV4ID0gMFxyXG4gICAgbW9kZWwgPSBbXVxyXG5cclxuICAgIGFkZC1ub2RlID0gKG5vZGUpICEtPlxyXG4gICAgICBpZiBub2RlLm5vZGUtbmFtZS50by1sb3dlci1jYXNlISBpcyBcXG9wdGdyb3VwXHJcbiAgICAgIHRoZW4gYWRkLWdyb3VwIG5vZGVcclxuICAgICAgZWxzZSBhZGQtb3B0aW9uIG5vZGVcclxuXHJcbiAgICBhZGQtZ3JvdXAgPSAobm9kZSkgIS0+XHJcbiAgICAgIHBvc2l0aW9uID0gbW9kZWwubGVuZ3RoXHJcbiAgICAgIG5ldy1ub2RlID1cclxuICAgICAgICBfZWxlbWVudDogbm9kZVxyXG4gICAgICAgIF9ub2RlLWluZGV4OiBwb3NpdGlvblxyXG4gICAgICAgIGdyb3VwOiB5ZXNcclxuICAgICAgICBsYWJlbDogbm9kZS5sYWJlbFxyXG4gICAgICAgIF9jaGlsZHJlbjogMFxyXG4gICAgICAgIGRpc2FibGVkOiBub2RlLmRpc2FibGVkXHJcbiAgICAgIG1vZGVsWypdID0gbmV3LW5vZGVcclxuICAgICAgW2FkZC1vcHRpb24gb3B0aW9uLCBwb3NpdGlvbiwgbm9kZS5kaXNhYmxlZCBmb3Igb3B0aW9uIGluIG5vZGUuY2hpbGQtbm9kZXNdXHJcblxyXG4gICAgYWRkLW9wdGlvbiA9IChub2RlLCBncm91cC1wb3NpdGlvbiwgZ3JvdXAtZGlzYWJsZWQpICEtPlxyXG4gICAgICBpZiBub2RlLm5vZGUtbmFtZS50by1sb3dlci1jYXNlISBpcyBcXG9wdGlvblxyXG4gICAgICAgIGlmIG5vZGUudGV4dCBpcyBub3QgJydcclxuICAgICAgICAgIGlmIGdyb3VwLXBvc2l0aW9uP1xyXG4gICAgICAgICAgICBtb2RlbFtncm91cC1wb3NpdGlvbl0uX2NoaWxkcmVuICs9IDFcclxuICAgICAgICAgIG5ldy1ub2RlID1cclxuICAgICAgICAgICAgX2VsZW1lbnQ6IG5vZGVcclxuICAgICAgICAgICAgX25vZGUtaW5kZXg6IG1vZGVsLmxlbmd0aFxyXG4gICAgICAgICAgICBfb3B0aW9uLWluZGV4OiBvcHRpb24taW5kZXhcclxuICAgICAgICAgICAgdmFsdWU6IG5vZGUudmFsdWVcclxuICAgICAgICAgICAgdGV4dDogbm9kZS50ZXh0XHJcbiAgICAgICAgICAgIGh0bWw6IG5vZGUuaW5uZXJIVE1MXHJcbiAgICAgICAgICAgIHNlbGVjdGVkOiBub2RlLnNlbGVjdGVkXHJcbiAgICAgICAgICAgIGRpc2FibGVkOiBpZiBncm91cC1kaXNhYmxlZCB0aGVuIGdyb3VwLWRpc2FibGVkIGVsc2Ugbm9kZS5kaXNhYmxlZFxyXG4gICAgICAgICAgICBfZ3JvdXAtaW5kZXg6IGdyb3VwLXBvc2l0aW9uXHJcbiAgICAgICAgICAgIGNsYXNzZXM6IG5vZGUuY2xhc3MtbmFtZVxyXG4gICAgICAgICAgICBzdHlsZTogbm9kZS5zdHlsZS5jc3MtdGV4dFxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIG5ldy1ub2RlID1cclxuICAgICAgICAgICAgX25vZGUtaW5kZXg6IG1vZGVsLmxlbmd0aFxyXG4gICAgICAgICAgICBfb3B0aW9uLWluZGV4OiBvcHRpb24taW5kZXhcclxuICAgICAgICAgICAgZW1wdHk6IHllc1xyXG4gICAgICAgIG9wdGlvbi1pbmRleCArPSAxXHJcbiAgICAgICAgbW9kZWxbKl0gPSBuZXctbm9kZVxyXG5cclxuICAgIGZvciBub2RlIGluIGVsZW1lbnQuY2hpbGQtbm9kZXNcclxuICAgICAgYWRkLW5vZGUgbm9kZVxyXG4gICAgbW9kZWxcclxuXHJcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgIyNcclxuICAjIyBFTkQgREFUQSBQQVJTSU5HXHJcbiAgIyNcclxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuXHJcbiQuYmFyYW5kaXMuc2VsZWN0cGx1c1xyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=