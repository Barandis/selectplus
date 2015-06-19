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

$ <- ((factory) !->
  if typeof define is \function and define.amd
    define <[ jquery jquery-ui/core jquery-ui/widget ]> factory
  else if typeof exports is \object
    require! <[ jquery jquery-ui/core jquery-ui/widget ]>
    module.exports = factory jquery, core, widget
  else
    factory jQuery)

# This adds some functionality to the core jQuery .attr() method. Namely, it 
# returns a map of all attribute names to values if no arguments are passed 
# to it. This may be unusual in older versions of IE (8 and before), which 
# apparently return the names of all possible attributes, rather than simply 
# the names of all set attributes that other browsers return.
#
# This is used later to copy over aria attributes, incidentally.
_old = $.fn.attr
$.fn.attr = ->
  if @0 and arguments.length is 0
    map = {}
    attributes = @0.attributes
    for attribute in attributes
      map[attribute.name.to-lower-case!] = attribute.value
    map
  else
    _old.apply @, arguments

$.widget \barandis.selectplus,

  ###########################################################################
  ##
  ## WIDGET OPTIONS
  ##
  ###########################################################################

  # Remember that this is LiveScript, and when it's compiled into JavaScript, 
  # dashed identifiers are replaced with camel-cased ones. Therefore, for 
  # instance, the property will be maxSelected rather than the max-selected 
  # shown below.
  options:
    # Raw JSON data for use in the model. If this is null, the widget instead
    # parses the select control that it's attached to. If this option is 
    # changed after creation, it will take effect immediately.
    data: null
    # Whether or not the widget is disabled. Post-creation changes of this 
    # option (or using the enable or disable method) will take effect 
    # immediately.
    disabled: no
    # The width of the widget, in pixels. If this is set to 0 (the default), 
    # then the width of the underlying HTML control. Changes to this option 
    # made after creation will take effect immediately. NOTE: While the width 
    # can conceivably set in a CSS file with an !important directive, this is 
    # not recommended. The widths of multiple parts of the widget are set 
    # specifically, and changing the width via CSS will not update all of 
    # those parts automatically. Additionally, a resize event will not be 
    # fired if the width of the widget is changed via CSS.
    width: 0
    # Whether or not class and style attributes are inherited from the 
    # underlying select and options. If data is not null, this determines 
    # whether the data's classes and style values are used. Changing this 
    # after creation will have no effect since it would require recalculation 
    # of a lot of the dimensions of the widget. To change this on the fly, 
    # destroy the widget and create another one with this option enabled.
    inherit: no
    # Right-to-left support. Post-creation changes to this option take effect 
    # immediately.
    rtl: no
    # Whether or not a value can be deselected (leaving the current value as 
    # null). This is only applicable to single-select widgets, as 
    # multiple-select widgets are inherently deselectable. A deselectable 
    # single-select widget will have an X displayed next to the up/down arrow 
    # when a selection is made, allowing that selection to be un-made. 
    # Changes to this option after creation will take effect immediately.
    deselectable: no
    # Whether or not multiple selections are allowed. Single selection is the 
    # default. If this is yes, the widget will be multiple-select. If it is 
    # null, it will depend on whether the underlying select has the muliple 
    # attribute (if there is no underlying select, then it will be 
    # single-select). This option cannot be changed after creation since the 
    # HTML structure is completely different; to do this, destroy the 
    # single-select widget and create a new multi-select widget with the same 
    # data.
    multi-select: null
    # Deselecting by keyboard (backspace/delete) in a multi-select widget 
    # normally requires two keystrokes. The first will highlight the 
    # selection and the second will deselect it. This allows deselection to 
    # occur in one keystroke instead. It does not apply to single-select 
    # widgets. Changes to this option after creation will take effect 
    # immediately.
    quick-deselect: no             
    # The maximum number of selections that can be made in a multi-select 
    # widget. It does not apply to single-select widgets. Changes to this 
    # option will take effect immediately, though if the new max is less 
    # than the amount of  selections already made, the extra selections will 
    # not be deleted (though more cannot be made until there are fewer than 
    # the new max).       
    max-selected: Infinity                
    # Whether or not there is a search box in the widget. This is only 
    # applicable to single-select widgets, as multi-select widgets inherently 
    # have a search box. Changes to this option after creation will take 
    # effect immediately.
    searchable: no
    # The threshold below which a search box will not be displayed. If there 
    # are fewer options available than this number, no search box will show. 
    # Again, this is only applicable to single-select widgets. Changes to 
    # this option after creation will take effect immediately.
    threshold: 0
    # Whether or not the search text should be matched against the beginning 
    # of each item text (as opposed to matching anywhere within the text). 
    # Changes to this option after creation will take effect immediately.
    anchored-search: yes
    # Whether or not an anchored search can match against only the beginning 
    # of the text or against the beginning of any word within the text. This 
    # has no effect if anchored-search is no. Changes to this option after 
    # creation will take effect immediately.
    split-search: yes
    # The text that shows on the widget when no selection is made. Changes to 
    # this option will take effect the next time that the default text is 
    # shown in the widget.             
    default-text: 'Select an item'
    # The text displayed when a search returns no results. It is appended 
    # with the text that was searched for (in double quotes). Changes to this 
    # option after creation will take effect the next time that the text is 
    # displayed in the widget.
    not-found-text: 'No results match'

    # EVENTS

    # Fired when anything is selected or deselected. The data object contains 
    # two elements: item, which contains the jQuery-wrapped element that was 
    # actually clicked on, and value, which is a plain object containing the 
    # data represented by that element. The value always has the following 
    # fields: value, text, html, selected, disabled, style, and classes. 
    # Additionally, it will contain any other arbitrarily-named fields that 
    # were specified in the data option. Fields whose names begin with 
    # underscores will not be output from the value method.
    change: null
    # Fired when the widget loses focus. This is independent of whether the 
    # search box loses focus...it loses focus naturally when other parts of 
    # the widget are clicked on, but that's accounted for and does not result 
    # in the firing of this event.
    blur: null
    # Fired when the widget gains focus. The search box (which is the part 
    # with the tabindex so is the part that receives focus naturally) often 
    # loses and regains focus when other parts of the widget are clicked, but 
    # this is compensated for and does not result in the firing of extra 
    # events.
    focus: null
    # Fired when the size of the always-visible portion of the widget changes.
    # This generally only happens in multi-select widgets (when enough options
    # are selected or deselected that it changes the height of the widget), 
    # but it is also fired in all widgets when they're created or when their 
    # width is changed programmatically.
    resize: null
    # Fired when the dropdown portion of the widget is displayed.
    open: null
    # Fired when the dropdown portion of the widget is hidden.
    close: null

  # The full rundown on how post-creation changes work is listed under the 
  # individual options above.
  _set-option: (key, value) !->
    switch key
      case \rtl
        if value then @container.add-class \bar-sp-rtl else @container.remove-class \bar-sp-rtl
        @_super key, value
      case \deselectable
        if not @multiple
          if value then @_build-deselect-control! if @selected-option 
          else @selection.find \.bar-sp-deselect .remove!
        @_super key, value
      case \searchable
        if not @multiple
          if value then @search-field.remove-class \ui-helper-hidden-accessible
          else @search-field.add-class \ui-helper-hidden-accessible
        @_super key, value
      case \data
        @_super key, value
        @_build-options!
      case \threshold
        if not @multiple
          if not @options.searchable or @model.length <= value
            @search-field.add-class \ui-helper-hidden-accessible
          else
            @search-field.remove-class \ui-helper-hidden-accessible
        @_super key, value
      case \disabled
        @_super key, value
        @_set-disabled-state!
      case \width
        old-width = @width
        @width = value or @element.outer-width!
        if old-width isnt @width
          @container.css \width, "#{@.width}px"
          dd-width = @width - @_get-border-and-side-width @dropdown
          @dropdown.css \width, "#{dd-width}px"
          @_resize-search-field!
          @_trigger \resize, null,
            item: @selection
            data:
              height: @selection.outer-height!
              width: @selection.outer-width!
          @_super key, value
      case \multiSelect \inherit
        # Do nothing, including setting the value of the option
        break
      else
        @_super key, value

  ###########################################################################
  ##
  ## END WIDGET OPTIONS
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## WIDGET CREATION
  ##
  ###########################################################################

  # Creation involves setting up the HTML for the widget, which is separate 
  # from the HTML of a select element that the widget is built from. The 
  # original select element is hidden, but it remains part of the DOM. For 
  # this reason, for larger datasets (involving perhaps a few hundred items), 
  # it may be better to use JSON data so avoid having the raw data be part of 
  # the DOM.
  #
  # Events are also set up in creation, and the framework fires off a 'create'
  # event at the end.
  _create: !->

    #########################################################################
    # MEMBER FIELDS

    # All of the member fields are listed here for the sake of documentation.

    # Indicates whether this is a multi-select widget. If false, a single-
    # select widget is created. (boolean)
    @multiple            = @options.multi-select ? not not @element.0.multiple
    # Flag indicating whether this widget is the active (focused) 
    # one. (boolean)
    @active               = no
    # Flag indicating whether a blur event on the search field was caused by 
    # a click on another part of the widget. The blur event handler uses this 
    # information to know whether it should really fire a blur event (it 
    # should not if the blur was caused by clicking on another part of the 
    # widget). (boolean)
    @clicked              = no
    # Flag indicating whether the drop-down box is visible. (boolean)
    @open                 = no
    # Flag that indicates whether the backspace key has already been 
    # registered once for a multi-select selection. A second press of that 
    # key while this flag is true results in that selection's destruction. 
    # (boolean)
    @destruction-pending  = no

    # The option that is highlighted via mouseover or key click. (jQuery 
    # object)
    @highlighted-option   = null
    # The option that is the current selection. Single-select only. (jQuery 
    # object)
    @selected-option      = null

    # The number of seletions that have been made. Multi-select only. (number)
    @selections           = 0
    # The width of the widget. This is based on the width of the underlying 
    # element. (number)
    @width                = @options.width or @element.outer-width!

    # The current value is different from the selected option. The latter is 
    # a jQuery object representing the option (an <a> element) that was 
    # selected. This is instead one of the elements of the model, a plain 
    # object containing the value, text, html, classes, style, and selected 
    # and disabled properties of the selected element. (single-select: plain 
    # object, multi-select: array of plain objects)
    @current-value        = if @multiple then [] else null

    # The ID of the container. If there was an ID on the element that this 
    # widget was assigned to, it's used in creating the container ID. If 
    # there is not, the base of the ID consists of 6 random alphanumeric 
    # characters. (string)
    @container-id         = (if @element.attr \id
                             then @element.attr \id .replace /[^\w]/g \-
                             else @_generate-container-id!) + \-selectplus

    # The root element of the widget, containing all other elements. (jQuery 
    # object)
    @container            = null
    # The container element for the dropdown portion of the widget, 
    # containing all of the options. (jQuery object)
    @dropdown             = null
    # The container for the options that can be chosen from. (jQuery object)
    @select-options       = null
    # The container element for the search field and the selections that have 
    # been made. Note that this always exists; it's merely hidden in a 
    # nonsearchable widget. (jQuery object)
    @search-container     = null
    # The actual search input control. (jQuery object)
    @search-field         = null
    # The element that indicates what option(s) has (have) been selected. 
    # (jQuery object)
    @selection            = null

    # Actions that fire when the container is clicked, the document is 
    # clicked, and the backspace key is pressed. These are just re-usable 
    # event handlers, created either because a handler is used in more than 
    # one place or  because it's recursive.
    @container-click-action     = null
    @document-click-action      = null
    @backspace-action           = null

    #########################################################################
    # HTML CREATION

    container-classes = <[ ui-widget bar-sp ]>
    container-classes.push \bar-sp- + (if @multiple then \multi else \single)
    container-classes.push @element.attr \class if @options.inherit and $.trim @element.attr \class .length
    container-classes.push \bar-sp-rtl if @options.rtl

    container-props =
      id: @container-id
      class: container-classes * ' '
      style: "width:#{@width}px;"
      title: @element.attr \title
    
    @container = $ \<div> container-props
    if @multiple
      @container.html  "<ul class=\"ui-corner-all bar-sp-selections\" tabindex=\"-1\" role=\"combobox\" 
                          aria-activedescendant=\"\" aria-owns=\"#{@container-id}-drop\">
                        <li class=\"bar-sp-search\" role=\"presentation\">
                        <input type=\"text\" value=\"#{@options.default-text}\" class=\"bar-sp-default\" 
                          autocomplete=\"off\" role=\"textbox\"></li></ul>
                        <div id=\"#{@container-id}-drop\" class=\"ui-widget-content ui-front ui-menu 
                          ui-corner-bottom ui-helper-hidden-accessible bar-sp-drop\">
                        <ul class=\"bar-sp-options\" role=\"listbox\" aria-live=\"polite\" tabindex=\"-1\"></ul>
                        </div>"
    else
      @container.html  "<a href=\"javascript:void(0)\" class=\"ui-widget ui-state-default ui-corner-all 
                          bar-sp-selection\" tabindex=\"-1\" role=\"combobox\" aria-activedescendant=\"\">
                        <span class=\"ui-priority-secondary\">#{@options.default-text}</span>
                        <div class=\"ui-icon ui-icon-triangle-1-s\" role=\"presentation\"></div></a>
                        <div class=\"ui-widget-content ui-front ui-menu ui-corner-bottom ui-helper-hidden-accessible 
                          bar-sp-drop\" role=\"presentation\">
                        <div class=\"bar-sp-search\" role=\"presentation\">
                        <input type=\"text\" class=\"ui-corner-all\" autocomplete=\"off\" role=\"textbox\"></div>
                        <ul class=\"bar-sp-options\" role=\"listbox\" aria-live=\"polite\" tabindex=\"-1\"/></div>"

    @element.hide!after @container

    @dropdown = @container.find \div.bar-sp-drop .first!
    dd-width = @width - @_get-border-and-side-width @dropdown
    @dropdown.css width: dd-width + \px

    @search-field = @container.find \input .first!
    @select-options = @container.find \ul.bar-sp-options .first!

    if @multiple
      @search-container = @container.find \li.bar-sp-search .first!
      @selection = @container.find \ul.bar-sp-selections .first!
    else
      @search-container = @container.find \div.bar-sp-search .first!
      @selection = @container.find \a.bar-sp-selection .first!

    $.each @element.attr!, (name, value) !~> @selection.attr name, value if /^aria-/ is name

    @_resize-search-field!
    @_build-options!
    @_set-tab-index!

    # Trigger resize when the control is first built to indicate initial size
    @_trigger \resize, null,
      item: @selection
      data:
        height: @selection.outer-height!
        width: @selection.outer-width!

    #########################################################################
    # EVENT HANDLER OBJECTS

    # Basic click action for the container as a whole, which basically just 
    # cleans things up and opens the dropdown.
    @container-click-action = (event) !~>
      event.prevent-default!
      if not @options.disabled
        deselect = if event? then $ event.target .has-class \bar-sp-deselect else false
        if not @multiple and deselect
          @_reset-options event
        else if @multiple and @destruction-pending
          @destruction-pending = no
        else
          if not @active
            @search-field.val '' if @multiple
            $ document .click @document-click-action
            @_open-dropdown!
          else if not @multiple and event? and (event.target is @selection.0 or \
                                                $ event.target .parents \a.bar-sp-selection .length)
            @_toggle-dropdown!
          @_activate-widget event

    # This mousewheel action is what emulates select-control-like scrolling 
    # for the widget. Regularly, once the top or bottom of the dropdown was 
    # reached and scrolling continued, the scroll event would bubble to the 
    # window and make the page as a whole scroll. This action stops the 
    # scrolling and prevents bubbling when the dropdown is at the top or the 
    # bottom.
    @mousewheel-action = (event) !~>
      orig-event = event.original-event
      delta = if orig-event.detail < 0 or orig-event.wheel-delta > 0 then 1 else -1
      if delta > 0 and @select-options.scroll-top! is 0
        event.prevent-default!
      else if delta < 0 and \
          @select-options.scroll-top! is @select-options.get 0 .scroll-height - @select-options.inner-height!
        event.prevent-default!

    # Default click action on the entire document. It checks to see whether 
    # the mouse is over the control, closing an open control if it isn't.
    @document-click-action = (event) !~>
      if $ event.target .parents "##{@container-id}" .length then @active = yes
      else @_deactivate-widget event

    # Tracks whether backspace has already been pressed and only deselects an 
    # option if it has. This implements the two-step deselection process that 
    # keeps options from being deselected accidentally for hitting the 
    # backspace key one too many times.
    @backspace-action = (event) !->
      if @pending-deselection
        pos = @_get-model-index @pending-deselection
        @_deselect-option event, $ "##{@_generate-dom-id \option pos}"
        @_clear-backspace!
      else
        next-available = @search-container.siblings \li.bar-sp-selection .last!
        if next-available.length and not next-available.has-class \ui-state-disabled
          @pending-deselection = next-available
          if @options.quick-deselect
            @backspace-action event
          else
            @pending-deselection.add-class \ui-state-focus

    #########################################################################
    # EVENT TRIGGER SETUP

    # Event handlers for the container in general. As one might expect, these 
    # are very general, handling only mouseover events and the status flag 
    # that helps to control focus. The final one is a mousewheel handler to
    # check to see whether the window scroll should be prevented (while 
    # scrolling over a widget).
    @_on @container,
      click: @container-click-action
      mousewheel: @mousewheel-action
      DOMMouseScroll: @mousewheel-action
      MozMousePixelScroll: @mousewheel-action
      mousedown: !~> @clicked = yes
      mouseup: !~> @clicked = no
      mouseenter: !~> @selection.add-class \ui-state-hover if not @open and not @multiple
      mouseleave: !~> @selection.remove-class \ui-state-hover if not @multiple

    # Event handlers for the options. This also handles mouseover events 
    # (highlighting), but it also handles the actual selection of options 
    # with mouse clicks.
    @_on @select-options,
      click: (event) !~>
        event-target = $ event.target
        target = if event-target .has-class \bar-sp-option
                 then event-target
                 else event-target.parents \.bar-sp-option .first!
        if target.length
          @highlighted-option = target
          @_select-option event, target
          @search-field.focus!
      mouseover: (event) !~>
        event-target = $ event.target
        target = if event-target .has-class \bar-sp-option
                 then event-target
                 else event-target.parents \.bar-sp-option .first!
        @_highlight-option target if target.length
      mouseout: (event) !~>
        event-target = $ event.target
        if event-target .has-class \bar-sp-option or event-target .parents \.bar-sp-option .length
          @_clear-highlight!

    # Event handlers on the search field. Since this is the element that is 
    # assigned the (positive) tabindex, this element is responsible for focus 
    # and blur for the entire widget, which is handled here. Also, keypresses 
    # are handled here, since as long as the widget is active, keyboard input 
    # is sent here.
    @_on @search-field,
      blur: (event) !~>
        if not @clicked
          @_trigger \blur, event, item: @container
          @_deactivate-widget event
      focus: (event) !~> 
        unless @active
          @_activate-widget event
          @_set-search-field-default!
          @_trigger \focus, event, item: @container
      keydown: (event) !~>
        if not @options.disabled
          key-code = event.which ? event.key-code
          @_resize-search-field!

          @_clear-backspace! if key-code is not 8 and @pending-deselection

          switch key-code
            # backspace, only tracks the length of the search field to know 
            # (in keyup) whether special action is necessary
            case 8                                          
              @backspace-length = @search-field.val! .length
            # tab, selects the highlighted option in addition to moving to 
            # the next tabindexed element on the page
            case 9
              @_select-option event, @highlighted-option if @open
            # enter, simply prevents the default action from occuring (the 
            # replacement actions are in keyup)
            case 13
              event.prevent-default!
            # up arrow and left arrow, moves up one option and if already at 
            # the top, closes the dropdown
            case 37 38
              event.prevent-default!
              if @open and @highlighted-option
                prev-siblings = @highlighted-option.parent!prev-all 'li:not(.ui-helper-hidden)'
                  .children 'a:not(.bar-sp-option-group)'
                if prev-siblings.length
                  @_highlight-option prev-siblings.first!
                else
                  @_clear-highlight!
                  @_deactivate-widget event
            # right arrow and down arrow, moves down one option and if the 
            # dropdown is closed, opens it
            case 39 40
              if not @highlighted-option
                first-active = @select-options.find 'li:not(.ui-helper-hidden)'
                  .children 'a:not(.bar-sp-option-group)' .first!
                @_highlight-option first-active if first-active.length
              else if @open
                next-siblings = @highlighted-option.parent!next-all 'li:not(.ui-helper-hidden)'
                  .children 'a:not(.bar-sp-option-group)'
                @_highlight-option next-siblings.first! if next-siblings.length
              @_open-dropdown! if not @open
      keyup: (event) !~>
        if not @options.disabled
          key-code = event.which ? event.key-code
          switch key-code
            # backspace, either filters if there is still search text left, 
            # deselects on a single-select deselectable widget, or handles 
            # the deselection of multi-select options
            case 8
              if @multiple and @backspace-length < 1 and @selections > 0
                @backspace-action event
              else if not @pending-deselection
                @_clear-highlight!
                if @open
                  @_filter-options!
                else if @search-field.val! is not ''
                  @_open-dropdown!
                else if not @multiple and @selection.find \.bar-sp-deselect .length
                  @_reset-options event
            # enter, selects an option if the dropdown is open, or opens it 
            # if it's closed
            case 13
              event.prevent-default!
              if @open then @_select-option event, @highlighted-option else @_open-dropdown!
            # escape, closes the dropdown
            case 27
              @_close-dropdown! if @open
            # tab, shift, control, all four arrow keys, windows key: these 
            # have no effect other than their normal ones
            case 9 16 17 37 38 39 40 91 =>
            # pretty much any regular keystroke (letters, numbers, etc.) 
            # causes filtering to happen
            default
              if @open then @_filter-options! else @_open-dropdown!

    # Event handlers for the selection area on a multi-select widget. Simply 
    # opens the dropdown if an empty area (i.e., one without a selection 
    # control) is clicked. This is necessary because the visible part of a 
    # multi-select widget is only partially covered by the search field; this 
    # handler allows the dropdown to be opened even if a part is clicked that 
    # doesn't happen to be the search field.
    if @multiple then @_on @selection,
      click: (event) !~>
        event.prevent-default!
        if @active and \
           not ($ event.target .has-class \bar-sp-selection or \
                $ event.target .parents \bar-sp-selection .length) and \
           not @open
          @_open-dropdown!

  ###########################################################################
  ##
  ## END WIDGET CREATION
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## WIDGET DESTRUCTION
  ##
  ###########################################################################

  # Destroy is clean in this widget. Creation is simply undone. The old 
  # tabindex (which had been removed from the original element) is restored, 
  # the widgets is removed, and the original element is shown. In theory, 
  # _create and _destroy can be called over and over again with the same 
  # effect each time.
  _destroy: !->
    @_revert-tab-index!
    @container.remove!
    @element.show!

  ###########################################################################
  ##
  ## END WIDGET DESCRUTCTION
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## PUBLIC METHODS
  ##
  ###########################################################################

  # Returns the current value of the widget, meaning the data elements that 
  # are selected. Internal fields (any that begin with an underscore) are 
  # removed from this output data. The fields value, text, html, selected, 
  # disabled, classes, and style will always be present, as will custom 
  # fields that were a part of the JSON data.
  #
  # For single-select widgets, this is a plain object (or null of no 
  # selection has been made). For multi-select widgets, it is an array of 
  # such objects (which is empty if no selection has been made).
  #
  # This is a read-only method. It cannot be used to set the value, in large 
  # part because of the many different ways that's possible. To set values, 
  # set them in the backing data itself (either the original option elements 
  # or the JSON data array). if this is done directly on the option elements 
  # and not by passing new data, then refresh will need to be called to make 
  # the widget update (this is done automatically when data is set).
  value: -> 
    | @multiple           => [@_sanitize-item item for item in @current-value]
    | not @current-value  => null
    | otherwise           => @_sanitize-item @current-value

  # Simply returns the widget itself, as a jQuery object.
  widget: -> @container

  # Disables the widget. This is the same as calling the disabled option with 
  # a true value.
  disable: !->
    @options.disabled = yes
    @_set-disabled-state!

  # Enabled the widget. This is the same as calling the disabled option with 
  # a false value.
  enable: !->
    @options.disabled = no
    @_set-disabled-state!

  # Rebuilds the options, taking any changes into account. This automatically 
  # happens when the data option is set, so this is primarily for refreshing 
  # after the information in select/option elements has been changed.
  refresh: !-> @_build-options!

  # Clears any selected options. Events are still fired when these selections 
  # are cleared.
  clear: !-> @_reset-options!

  ###########################################################################
  ##
  ## END PUBLIC METHODS
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## WIDGET BUILDING
  ##
  ###########################################################################

  # Builds the objects and HTML for all of the elements inside the dropdown. 
  # It does not deselect any options already selected, so the widget's state 
  # will remain the same at the end.
  _build-options: !->
    @model = @_parse!

    if @multiple
      if @selections > 0
        @selection.find \li.bar-sp-selection .remove!
        @selections = 0
    else
      @selection.find \span .add-class \ui-priority-secondary .text @options.default-text
      if not @options.searchable or @model.length <= @options.threshold
        @search-field.add-class \ui-helper-hidden-accessible
      else
        @search-field.remove-class \ui-helper-hidden-accessible

    content = ''
    for option in @model
      if option.group
        content += @_create-group option
      else if not option.empty
        content += @_create-option option
        if option.selected
          if @multiple
            @_build-selection option
            @current-value[*] = option
          else 
            @selection.find \span .remove-class \ui-priority-secondary .text option.text
            @current-value = option
            @_build-deselect-control! if @options.deselectable

    @_set-disabled-state!
    @_set-search-field-default!
    @_resize-search-field!

    @select-options.html content

    if not @multiple and @current-value
      id = @_generate-dom-id \option @current-value._node-index
      @selected-option = $ "##id"

  # Creates an option group. This represents the same thing as an HTML 
  # <optgroup> element. It's primarily for presentation, grouping options 
  # visually on the screen, though groups can be disabled as a unit.
  _create-group: (group) ->
    if not group.disabled
      group._dom-id = @_generate-dom-id \group group._node-index
      "<li class=\"ui-menu-item\" role=\"presentation\">
        <a id=\"#{group._dom-id}\" href=\"javascript:void(0)\" class=\"ui-priority-primary bar-sp-option-group\"
          role=\"group\" aria-hidden=\"false\" tabindex=\"-1\">#{ $ \<div> .text group.label .html! }</a></li>"
    else ''

  # Creates one of the selectable options.
  _create-option: (option) ->
    if not option.disabled
      option._dom-id = @_generate-dom-id \option option._node-index

      classes = <[ ui-corner-all bar-sp-option ]>
      classes[*] = \bar-sp-selected if option.selected
      classes[*] = \bar-sp-grouped-option if option._group-index?
      classes[*] = option.classes if @options.inherit and option.classes is not ''

      style = if @options.inherit and option.style is not '' then " style=\"#{option.style}\"" else ''
      wrapper-class = \ui-menu-item + (if option.selected then ' ui-helper-hidden' else '')

      "<li class=\"#{wrapper-class}\" role=\"presentation\">
        <a id=\"#{option._dom-id}\" href=\"javascript:void(0)\" class=\"#{classes * ' '}\"#{style} role=\"option\"
          aria-hidden=\"false\" tabindex=\"-1\">#{option.html}</a></li>"
    else ''

  # Builds a deselect control. This appears as an X to the inside of the 
  # dropdown arrow. It's only called if a single-select widget is marked 
  # deselectable.
  _build-deselect-control: !->
    if not @selection.find \div.bar-sp-deselect .length
      @selection.find \span .first!after '<div class="ui-icon ui-icon-close bar-sp-deselect"/>'

  # Builds the controls that represent selections in a multi-select widget. 
  # These display the text of the selected option, along with an X that will 
  # deselect them when clicked.
  _build-selection: (option) !->
    return if @options.max-selected <= @selections
    selection-id = @_generate-dom-id \selection option._node-index
    @selections += 1

    if option.disabled
      html = "<li class=\"ui-corner-all ui-state-disabled bar-sp-selection\" id=\"#{selection-id}\">
              <span>#{option.html}</span></li>"
    else
      html = "<li class=\"ui-corner-all ui-state-default bar-sp-selection\" id=\"#{selection-id}\">
              <span>#{option.html}</span>
              <a href=\"javascript:void(0)\" class=\"ui-icon ui-icon-closethick bar-sp-selection-close\" 
                tabindex=\"-1\"></a></li>"
    @search-container.before html

    link = $ "##selection-id" .find \a .first!
    # The event handlers for the X control. The clicked member field must be 
    # set here as well, in part because the control is destroyed as a part of 
    # this handling and that messes things up a bit.
    link.mousedown (event) !~>
      event.prevent-default!
      if @options.disabled
        event.stop-propagation!
      else
        @clicked = yes
        @destruction-pending = yes
        @_deselect-option event, $ "##{@_generate-dom-id \option option._node-index}"
    link.mouseup !~>
      @clicked = no

  ###########################################################################
  ##
  ## END WIDGET BUILDING
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## DROPDOWN OPERATIONS
  ##
  ###########################################################################

  # Opens the dropdown so that the options (and the search field, in a 
  # single-select control) can be viewed.
  _open-dropdown: !->
    if not @multiple
      @selection.add-class 'ui-state-active bar-sp-with-drop'
      @selection.find \div .remove-class \ui-icon-triangle-1-s .add-class \ui-icon-triangle-1-n
      @_highlight-option @selected-option if @selected-option
    else if @options.max-selected <= @selections then return
    else @selection.add-class \bar-sp-with-drop

    dd-top = @container.height!
    @dropdown.css top: dd-top + \px .remove-class \ui-helper-hidden-accessible

    @search-field.focus!
    @search-field.val @search-field.val!

    @_filter-options!

    @_trigger \open, null, item: @container unless @open
    @open = yes

  _select-item: (item) !->
    item.selected = yes
    if item._element?
      $element = $ item._element
      $element.prop \selected yes
      $element.parents \select .trigger \change

  _deselect-item: (item) !->
    item.selected = no
    if item._element?
      $element = $ item._element
      $element.prop \selected no
      $element.parents \select .trigger \change if @multiple

  # Closes the dropdown so that the options (and the search field, in a 
  # single-select control) can no longer be viewed.
  _close-dropdown: !->
    if @multiple
      @selection.remove-class \bar-sp-with-drop
    else
      @selection.remove-class 'ui-state-active bar-sp-with-drop'
      @selection.find \div .remove-class \ui-icon-triangle-1-n .add-class \ui-icon-triangle-1-s
    @_clear-highlight!

    @dropdown.add-class \ui-helper-hidden-accessible
    @_trigger \close, null, item: @container if @open
    @open = no

  # Toggles the dropdown, opening it if closed and closing it if open.
  _toggle-dropdown: !-> if @open then @_close-dropdown! else @_open-dropdown!

  # Resets the options, clearing out any selection and closing the dropdown. 
  # Since multi-select requires more handling because of the selection 
  # elements, this method merely iterates through the selected options and 
  # delegates to _deselect-option for each one, meaning that a change event 
  # is fired for each selection that is cleared. For single-select widgets, a 
  # single change event is fired, and only if there actually had been a 
  # selected option before the call to this method.
  _reset-options: (event) !->
    if @multiple
      indices = [item._node-index for item in @current-value]
      for index in indices
        option = $ "##{@_generate-dom-id \option index}"
        @_deselect-option event, option
    else
      @selection.find \span .text @options.default-text .add-class \ui-priority-secondary
      old-value = @current-value
      old-item = @selected-option
      @_deselect-item old-item if old-item?
      @current-value = null
      @selected-option = null
      @selection.find \.bar-sp-deselect .remove!
      @_activate-option(@select-options.find \.bar-sp-selected .remove-class \bar-sp-selected)
      @_close-dropdown! if @active

      if old-value is not null
        @_trigger \change, event, item: null data: null 

  ###########################################################################
  ##
  ## END DROPDOWN OPERATIONS
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## OPTION SELECTION
  ##
  ###########################################################################

  # Selects the specified option. Aside from simply making the selection, 
  # this adds the option's data to current-value, removes the highlight, and 
  # closes the dropdown (unless the Ctrl or Alt key is being held down on a 
  # multi-select widget). It also fires a change event as long as the method 
  # isn't called with an already-selected option. Multi-select widgets will 
  # not allow the same option to be selected twice; the second one will be 
  # silently ignored.
  _select-option: (event, option) !->
    if option?
      @_clear-highlight!

      position = @_get-model-index option
      value = @model[position]
      return if value.selected

      if @multiple
        @_deactivate-option option
        if (pos = value._group-index)
          group = @model[pos]
          visible = no
          for index from pos + 1 til pos + group._children
            if not @model[index].selected
              visible = yes
              break
          if not visible
            @_deactivate-option $ "##{group._dom-id}"
      else
        @_activate-option(@select-options.find \a.bar-sp-selected .remove-class \bar-sp-selected)
        @selected-option = option
        @selection.find \span .remove-class \ui-priority-secondary

      option.add-class \bar-sp-selected
      @_select-item value

      if @multiple
        s-height = @selection.outer-height!
        s-width = @selection.outer-width!
        @_build-selection value
        new-height = @selection.outer-height!
        new-width = @selection.outer-width!
      else
        @selection.find \span .first!text value.text
        @_build-deselect-control! if @options.deselectable

      @_close-dropdown! unless @multiple and (event?.meta-key or event?.ctrl-key)
      @search-field.val ''

      if @multiple and (s-height is not new-height or s-width is not new-width)
        @_trigger \resize, event,
          item: @selection
          data:
            height: new-height
            width: new-width
      if @multiple and $.in-array value, @current-value is -1
        @current-value[*] = value 
        @_trigger \change, event, item: option, data: value
      if not @multiple and value is not @current-value
        old-value = @current-value
        @_deselect-item old-value if old-value?
        @current-value = value
        @_trigger \change, event, item: option, data: value

      @_resize-search-field!

  # Deselects an option in a multi-select widget. To do so in a single-select 
  # widget, use _reset-options. This handles the selection on the data side 
  # and also destroys the HTML associated with the selection on the 
  # presentation side.
  _deselect-option: (event, option) !->
    pos = @_get-model-index option
    value = @model[pos]

    if not value.disabled
      @_deselect-item value
      @_activate-option option
      if value._group-index
        @_activate-option $ "##{@_generate-dom-id \group value._group-index}"

      @_clear-highlight!
      @_filter-options!

      index = $.in-array value, @current-value
      @current-value.splice index, 1

      selection = $ "##{@_generate-dom-id \selection pos}"
      @selections -= 1

      @_close-dropdown! if @selections > 0 and @search-field.val! .length is 0
      
      s-height = @selection.outer-height!
      s-width = @selection.outer-width!
      selection.remove!
      new-height = @selection.outer-height!
      new-width = @selection.outer-height!

      @search-field.focus!
      @_set-search-field-default!
      @_resize-search-field!

      if s-height is not new-height or s-width is not new-width
        @_trigger \resize, event,
          item: @selection
          data:
            height: new-height
            width: new-width
      @_trigger \change, event, item: null, data: null
    
  # Applies a highlight to the provided option. In addition to highlighting 
  # it (by giving it the class ui-state-focus, which is the same way that the 
  # jQuery UI menu does it), it also checks the position of the highlighted 
  # option and scrolls it into view if necessary. It also handles the 
  # widget's aria-activedescendant attribute for accessibility.
  _highlight-option: (option) !->
    if option.length
      @_clear-highlight!

      @highlighted-option = option
      @highlighted-option.add-class \ui-state-focus
      @selection.attr \aria-activedescendant @highlighted-option.attr \id

      max-height = parse-int @select-options.css \maxHeight
      visible-top = @select-options.scroll-top!
      visible-bottom = max-height + visible-top

      highlight-top = @highlighted-option.position!top + @select-options.scroll-top!
      highlight-bottom = highlight-top + @highlighted-option.outer-height!

      if highlight-bottom >= visible-bottom
        @select-options.scroll-top if highlight-bottom - max-height > 0 then highlight-bottom - max-height else 0
      else if highlight-top < visible-top
        @select-options.scroll-top highlight-top

  # Removes the highlighting from the (formerly) highlighted option.
  _clear-highlight: !->
    @highlighted-option.remove-class \ui-state-focus if @highlighted-option
    @highlighted-option = null

  # Makes an option available for selection. This is done when it is 
  # deselected from a multi-select widget, since the option is hidden when 
  # it's selected so that it can't be re-selected.
  _activate-option: (option) !-> 
    option.parent!remove-class \ui-helper-hidden
    option.attr \aria-hidden \false

  # Makes an option unavailable for selection. This is done when it's 
  # selected in a multi-select widget so that it can't be selected a second 
  # time. This is done in an accessability-friendly way, by hiding the 
  # element and setting its aria-hidden attribute.
  _deactivate-option: (option) !->
    option.parent!add-class \ui-helper-hidden
    option.attr \aria-hidden \true

  ###########################################################################
  ##
  ## END OPTION SELECTION
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## WIDGET ACTIVATION
  ##
  ###########################################################################

  # Activates the widget by giving it the appropriate classes and focusing 
  # the search field.
  _activate-widget: (event) !->
    @container.add-class \bar-sp-active
    @selection.add-class \ui-state-focus if not @multiple
    @active = yes
    @search-field.val @search-field.val!
    @search-field.focus!

  # Deactivates the widget by removing the appropriate classes, closing the 
  # dropdown, and clearing much of the widget's state.
  _deactivate-widget: (event) !->
    $ document .unbind \click @document-click-action
    @active = no
    @_close-dropdown!

    @container.remove-class \bar-sp-active
    @selection.remove-class \ui-state-focus if not @multiple
    @_clear-options-filter!
    @_clear-backspace!

    @_set-search-field-default!
    @_resize-search-field!

  ###########################################################################
  ##
  ## END WIDGET ACTIVATION
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## OPTION FILTERING
  ##
  ###########################################################################

  # Applies the text in the search field to the available options, hiding all 
  # of those that don't match the search and highlighting the portion of the 
  # rest that does match the search.
  _filter-options: !->
    @_clear-not-found!
    count = 0

    search-text = $ \<div> .text($.trim @search-field.val!).html!
    regex-anchor = if @options.anchored-search then '^' else ''
    escaped-search = search-text.replace /[-[\]{}()*+?.,\\^$|#\s]/g \\\$&
    regex = new RegExp regex-anchor + escaped-search, 'i'
    part-regex = new RegExp '\\s' + escaped-search, 'i'

    for option in @model
      if not option.disabled and not option.empty
        if option.group
          @_deactivate-option $ "##{option._dom-id}"
        else if not (@multiple and option.selected)
          found = no
          result-id = option._dom-id
          result = $ "##{result-id}"

          if (start = option.html.search regex) is not -1
            found = yes
            count += 1
          else if @options.split-search and (option.html.index-of(' ') is not -1 or option.html.index-of('[') is 0)
            parts = option.html.replace /\[|\]/g '' .split ' '
            if parts.length
              for part in parts
                if regex.test part
                  found = yes
                  count += 1
                  start = option.html.search(part-regex) + 1
                  break

          if found
            if search-text.length
              text = "#{ option.html.substr 0 start + search-text.length }</span>
                      #{ option.html.substr start + search-text.length }"
              text = "#{ text.substr 0 start }<span class=\"ui-priority-primary\">#{ text.substr start }"
            else
              text = option.html

            result.html text
            @_activate-option result

            if option._group-index?
              @_activate-option $ "##{@model[option._group-index]._dom-id}"
          else
            @_clear-highlight! if @highlighted-option and result-id is @highlighted-option.attr \id
            @_deactivate-option result

    if count < 1 and search-text.length
      @_not-found search-text
    else
      @_set-filter-highlight!

  # Clears the filter by activating all options that were hidden. It also 
  # clears the search field.
  _clear-options-filter: !->
    @search-field.val ''
    links = @select-options.find \a

    for a in links
      link = $ a
      if not @multiple or link.has-class \bar-sp-option-group or not link.has-class \bar-sp-selected
        @_activate-option link 

  # Highlights whichever option is appropriate after the filter removes some 
  # options. If the currently highlighted option is removed by the filter, 
  # this will figure out the closest still-visible one and use it instead.
  _set-filter-highlight: !->
    if not @highlighted-option
      selected = if @multiple then [] else @select-options.find \.bar-sp-selected
      highlighted = if selected.length
                    then selected.first!
                    else @select-options.find \.bar-sp-option .first!
      @_highlight-option highlighted if highlighted.length

  # Adds elements to the dropdown to show that a search did not return a 
  # result.
  _not-found: (text) !->
    html = $ "<li class=\"bar-sp-not-found ui-menu-item\">
              <a href=\"javascript:void(0)\">#{@options.not-found-text} \"#{text}\"</a></li>"
    @select-options.append html

  # Clears the not-found message from the DOM
  _clear-not-found: !->
    @select-options.find \.bar-sp-not-found .remove!

  ###########################################################################
  ##
  ## END WIDGET OPTIONS
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## UTILITY FUNCTIONS
  ##
  ###########################################################################

  # Handles both the disabling and the enabling of the widget. This sets the 
  # disabled CSS class to the container and explicitly disables the search 
  # field (or the opposite, if the widget is enabled). Since the search field 
  # is disabled, the widget will not receive focus while disabled.
  _set-disabled-state: !->
    if @options.disabled
      @container.add-class 'bar-sp-disabled ui-state-disabled'
      @search-field.0.disabled = yes
      @_deactivate-widget!
    else
      @container.remove-class 'bar-sp-disabled ui-state-disabled'
      @search-field.0.disabled = no

  # Sets the default text and class into the search field. Note that since 
  # only multi-select widgets put the default text in the search field, this 
  # method will have any real effect when called by a multi-select widget. 
  # Single-select can call it, but it won't do anything.
  _set-search-field-default: !->
    if @multiple and @selections < 1 and not @active
      @search-field.val @options.default-text .add-class \bar-sp-default
    else
      @search-field.val '' .remove-class \bar-sp-default

  # Resizes the search field width and positioning. This only really needs to 
  # be done once (at creation) for single-select widgets since they will 
  # always have the same number of selections and don't need resizing. Multi-
  # select widgets should require it each time an option is selected or 
  # deselected, since that may change the size of the input. However, calling 
  # this more than once on a single-select widget is harmless since it will 
  # always 'resize' to the same size.
  _resize-search-field: !->
    if @multiple
      sf-width = 0
      style-text = 'position:absolute;left:-1000px;top:-1000px;display:none;'
      styles = <[ font-size font-style font-weight font-family line-height text-transform letter-spacing ]>

      for style in styles
        style-text += "#style:#{ @search-field.css style };"

      temp-div = $ \<div> style: style-text
      temp-div.text @search-field.val!
      $ \body .append temp-div

      sf-width = temp-div.width + 25
      sf-width = @width - 10 if sf-width > @width - 10
      temp-div.remove!
    else
      dd-width = @width - @_get-border-and-side-width @dropdown
      sf-width = dd-width - @_get-border-and-side-width(@search-container) - \
        @_get-border-and-side-width @search-field

    dd-top = @container.height!
    @search-field.css width: sf-width + \px
    @dropdown.css top: dd-top + \px

  # Moves the underlying element's tabindex to the widget's search field, so 
  # that the widget can insert itself into whatever tabindex scheme has been 
  # established. If the underlying element has no tabindex, the widget's will 
  # stay at -1.
  _set-tab-index: !->
    index = @element.attr \tabindex
    if index
      @element.attr \tabindex -1
      @search-field.attr \tabindex index

  # Undoes the changes from the _set-tab-index method. This is called 
  # immediately prior to the destruction of the widget, putting the tabindex 
  # back onto the underlying element so that a new widget could conceivably 
  # be built in the same location.
  _revert-tab-index: !->
    index = @search-field.attr \tabindex
    if index
      @search-field.attr \tabindex -1
      @element.attr \tabindex index

  # Removes record of backspaces pressed with regard to deleting selections 
  # in a multi-select widget. It clears data  about which option will be 
  # removed on the next backspace and removes the focus state CSS class from 
  # previously-backspaced options. 
  _clear-backspace: !->
    @pending-deselection.remove-class \ui-state-focus if @pending-deselection
    @pending-deselection = null

  # Generates a random ID for a container. This is only called if the 
  # original element doesn't have an ID to build off of and consists simply 
  # of the string 'sp-' followed by 6 random alphanumeric characters.
  _generate-container-id: ->
    result = \sp- + [@_generate-char! for i from 1 to 6] * ''
    while $ "##{result}" .length
      result += @_generate-char!
    result

  # Generates a single random alphanumeric character, for use with the 
  # previous method.
  _generate-char: ->
    chars = \0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
    rand = Math.floor Math.random! * chars.length
    chars.char-at rand

  # Generates an ID for an option. This consists of the type of the option 
  # (things like 'option', 'group', or 'selection'), the container ID, and 
  # the index of the option data within the model, all separated by hyphens.
  _generate-dom-id: (type, index) -> "#type-#{@container-id}-#index"

  # Determines the width of an element's border and padding together. This is 
  # used to lay out the widget on creation.
  _get-border-and-side-width: (element) -> element.outer-width! - element.width!

  # Extracts the index (position of an element within the model) from an 
  # option. It does this by pulling the number from the end of the option's 
  # ID.
  _get-model-index: (option) ->
    id = option.attr \id
    id.substr id.last-index-of(\-) + 1

  # Removes the 'internal' data (keys that begin with an underscore) from an 
  # item's data and returns the sanitized object.
  _sanitize-item: (item) ->
    result = {}
    for own key, value of item
      result[key] = value if key.index-of(\_) is not 0
    result

  ###########################################################################
  ##
  ## END UTILITY FUNCTIONS
  ##
  ###########################################################################

  ###########################################################################
  ##
  ## DATA PARSING
  ##
  ###########################################################################

  # Parses data into a model. This data can come either from the data option 
  # or a backing select element and its children.
  _parse: ->
    if @options.data
      @_parse-data @options.data
    else if @element.0.node-name.to-lower-case! is \select
      @_parse-options @element.0
    else
      []

  # Parses JSON data into a model. If there are additional fields over and 
  # above the necessary ones within a data element, they will be retained 
  # (just not used by the widget).
  _parse-data: (data) ->
    option-index = 0
    model = []

    add-node = (node) !->
      if node.children?.length then add-group node else add-option node

    add-group = (node) !->
      position = model.length
      new-node =
        _node-index: position
        group: yes
        label: node.label ? node.text ? ''
        _children: 0
        disabled: node.disabled ? no
      for own key, val of node
        if not $.in-array key, <[ _nodeIndex group label _children disabled ]>
          new-node[key] = val
      model[*] = new-node
      [add-option option, position, node.disabled for option in node.children]

    add-option = (node, group-position, group-disabled) !->
      if not node.children?.length
        if node.text is not ''
          if group-position?
            model[group-position]._children += 1
          new-node =
            _node-index: model.length
            _option-index: option-index
            value: node.value ? node.text
            text: node.text
            html: node.html ? node.text
            selected: node.selected ? no
            disabled: if group-disabled then group-disabled else node.disabled ? no
            _group-index: group-position
            classes: node.classes
            style: node.style
        else
          new-node =
            _node-index: model.length
            _option-index: option-index
            empty: yes
        for own key, val of node
          if not $.in-array key, <[ _nodeIndex _optionIndex value text html 
                                    selected disabled _groupIndex classes style ]>
            new-node[key] = val
        option-index += 1
        model[*] = new-node

    for node in data
      add-node node
    model

  # Parses a select element into a model.
  _parse-options: (element) ->
    option-index = 0
    model = []

    add-node = (node) !->
      if node.node-name.to-lower-case! is \optgroup
      then add-group node
      else add-option node

    add-group = (node) !->
      position = model.length
      new-node =
        _element: node
        _node-index: position
        group: yes
        label: node.label
        _children: 0
        disabled: node.disabled
      model[*] = new-node
      [add-option option, position, node.disabled for option in node.child-nodes]

    add-option = (node, group-position, group-disabled) !->
      if node.node-name.to-lower-case! is \option
        if node.text is not ''
          if group-position?
            model[group-position]._children += 1
          new-node =
            _element: node
            _node-index: model.length
            _option-index: option-index
            value: node.value
            text: node.text
            html: node.innerHTML
            selected: node.selected
            disabled: if group-disabled then group-disabled else node.disabled
            _group-index: group-position
            classes: node.class-name
            style: node.style.css-text
        else
          new-node =
            _node-index: model.length
            _option-index: option-index
            empty: yes
        option-index += 1
        model[*] = new-node

    for node in element.child-nodes
      add-node node
    model

  ###########################################################################
  ##
  ## END DATA PARSING
  ##
  ###########################################################################

$.barandis.selectplus
