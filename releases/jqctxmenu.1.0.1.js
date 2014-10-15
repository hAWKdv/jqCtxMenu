/*
 * jqCtxMenu - a jQuery plugin
 * 1.0-beta
 * Copyright 2014
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * Author: hAWK
 * Repository: https://github.com/hAWKdv/jqCtxMenu
 */
(function($) {
    "use strict";

    var RMB = 2,
        CTX_X_OFFSET = 2,
        CTX_Y_OFFSET = -15,
        CTX_CONTAINER = "jqctx-container",
        CTX_CLASS = "jqctx",
        CTX_SUB_CLASS = "jqctx-sub",
        CTX_ARROW_CLASS = "jqctx-arrow",
        name = "name",
        action = "action",
        context = {},
        $mainContainer = $("#" + CTX_CONTAINER),
        $currentContainer = $mainContainer,
        totalCtxWidth = 0,
        paddingXOffset,
        $currentMenu,
        $mainMenu,
        $subMenu,
        Queue,
        menus;

    // >> Helpers

    Queue = (function() {
        function Queue() {
            this._container = [];
        }

        Queue.prototype.isEmpty = function() {
            return !this._container.length;
        };

        Queue.prototype.length = function() {
            return this._container.length;
        };

        Queue.prototype.enqueue = function(obj) {
            this._container.push(obj);
        };

        Queue.prototype.dequeue = function() {
            return this._container.shift();
        };

        return Queue;
    }());


    // >> Validation

    context.isValid = function(prop, i) {
        if (!this.options[i][prop]) {
            throw new Error(prop + " is mandatory for context menu object.");
        }
    };


    // >> On initialization functions

    context.bindInitialEvent = function() {
        $(document).mousedown(function() {
            $mainContainer.find("> ." + CTX_CLASS).hide();
        });
    };

    context.buildInitialContainer = function() {
        var container;

        if (!$(CTX_CONTAINER).length) {
            container = $("<div>").attr("id", CTX_CONTAINER);
            $("body").append(container);
            $mainContainer = $("#" + CTX_CONTAINER);
            $currentContainer = $mainContainer;

            this.bindInitialEvent();
        }
    };


    // >> Finalization functions

    context.finalizeSetting = function() {
        // Sets the sub-menu selector (used for positioning)
        $subMenu = $("." + CTX_SUB_CLASS + " > ." + CTX_CLASS);

        // Gets the default option padding
        paddingXOffset = $("." + CTX_CLASS).find("> li").css("padding-left").replace("px", "");
        paddingXOffset = parseInt(paddingXOffset);
    };

    // Determines the longest possible context menu width with all sub-menus opened
    // BFS-based
    context.determineTotalWidth = function() {
        var queue = new Queue(),
            pathWidths = [],
            currentWidth,
            children,
            currentEl;

        queue.enqueue({
            widthSoFar: 0,
            menu: $mainMenu
        });

        while (!queue.isEmpty()) {
            currentEl = queue.dequeue();
            children = false;

            currentWidth = currentEl.widthSoFar + currentEl.menu.width();

            currentEl.menu.find("> li > ." + CTX_SUB_CLASS + " > ." + CTX_CLASS)
                .each(function() {
                    children = true;

                    queue.enqueue({
                        widthSoFar: currentWidth,
                        menu: $(this)
                    });
                });

            if (!children) {
                pathWidths.push(currentWidth);
            }
        }

        totalCtxWidth = Math.max.apply(null, pathWidths);
    };


    // >> Build functions

    // Creates a new menu container
    context.buildMenu = function(init) {
        var menu = $("<ul>").addClass(CTX_CLASS);

        $currentContainer.append(menu);

        if (init) {
            $mainMenu = $currentContainer.find(menu);
        } else {
            $currentMenu = $currentContainer.find(menu);
        }
    };

    // Visual built of the option - title, icon, etc.
    context.buildOption = function(optContainer, optData) {
        var title = $("<span>").text(optData.name),
            icon;

        if (optData.icon) {
            icon = $("<img>").attr("src", optData.icon);
            title.prepend(icon);
        }

        if (optData.group) {
            optContainer.css("border-bottom", "none");
        }

        optContainer.append(title);
    };

    // Adds an option to the menu that is currently being built
    context.addOption = function(option, init) {
        var optContainer = $("<li>"),
            subMenu;

        context.buildOption(optContainer, option);

        /*
         * Action priority:
         * 1. Custom function (a.k.a. action)
         * 2. Location
         * 3. Sub-menu
         */
        if (option.action) {
            optContainer.mousedown(option.action);
        }
        else if (option.location) {
            optContainer.mousedown(function() {
                window.location = option.location;
            });
        }
        else if (option.menu) {
            subMenu = $("<div>").addClass(CTX_SUB_CLASS);
            optContainer.prepend(subMenu);
            optContainer.addClass(CTX_ARROW_CLASS);

            menus.enqueue({
                container: optContainer.find(subMenu),
                options: option.menu
            });
        }

        // Append the newly built option
        if (init) {
            $mainMenu.append(optContainer);
        } else {
            $currentMenu.append(optContainer);
        }
    };

    // Append all built options to the current menu
    context.loadMenu = function(init) {
        var i = 0,
            dequeuedMenu;

        // Iterates throw all of the menu options and appends them
        // Note: The name is mandatory
        for (i; i < this.options.length; i += 1) {
            this.isValid(name, i);
            this.addOption(this.options[i], init);
        }

        // Setting the with with data in order to avoid display: none bug while opening the menu
        if (init) {
            $mainMenu.data("width", $mainMenu.width());
        } else {
            $currentMenu.data("width", $currentMenu.width());
        }

        // Continue building the enqueued menus, if any (BFS)
        if (!menus.isEmpty()) {
            dequeuedMenu = menus.dequeue();

            this.options = dequeuedMenu.options;
            $currentContainer = dequeuedMenu.container;

            this.buildMenu();
            this.loadMenu();
        }
    };


    // >> On RMB click functions

    // Determines the directions of the menu according to the cursor position
    context.determineDirections = function(page) {
        var windowX = $(window).innerWidth(),
            windowY = $(window).innerHeight(),
            ctxHeight = $mainMenu.outerHeight(), // TODO: Integrate with all menus
            directions = { x: "", y: "" };

        // Calculate X
        if (totalCtxWidth + page.x <= windowX) {
            directions.x = "right";
        } else {
            directions.x = "left";
        }

        // Calculate Y
        if (ctxHeight + page.y <= windowY) {
            directions.y = "down";
        } else {
            directions.y = "up";
        }

        return directions;
    };

    // Applies the new position on RMB click
    context.positionMenu = function(page) {
        var mainMenu = {},
            directions;

        directions = context.determineDirections(page);

        if (directions.x === "left") {
            mainMenu.left = (page.x + CTX_X_OFFSET - paddingXOffset / 2) - $mainMenu.width();

            $subMenu.each(function() {
                var $this = $(this);
                $this.css({ marginLeft: - ($this.data("width") + paddingXOffset) });
            });
        } else {
            mainMenu.left = page.x + CTX_X_OFFSET;

            $subMenu.each(function() {
                var $this = $(this);
                $this.css({ marginLeft: $this.parent().closest("." + CTX_CLASS).data("width") - paddingXOffset });
            });
        }

        if (directions.y === "up") {
            mainMenu.top = (page.y) - $mainMenu.outerWidth() + CTX_Y_OFFSET;
        } else {
            mainMenu.top = page.y + CTX_Y_OFFSET;
        }

        $mainMenu.css({
            top: mainMenu.top,
            left: mainMenu.left
        });
    };


    // PLUGIN
    $.fn.jqCtxMenu = function(options) {
        var $this = $(this),
            isInitSet = false;

        menus = new Queue();

        context.options = options;
        context.buildInitialContainer();

        context.buildMenu(true);
        context.loadMenu(true);
        context.determineTotalWidth();
        context.finalizeSetting();

        // Disable the default context menu
        $this.bind("contextmenu", function() {
            return false;
        });

        $this.mousedown(function(e) {
            if(e.button === RMB) {
                context.positionMenu({ y: e.pageY, x: e.pageX });

                if (isInitSet) {
                    $mainMenu.fadeIn();
                } else {
                    $mainMenu.css("visibility", "visible");
                    isInitSet = true;
                }

                return false;
            }

            return true;
        });

        return this;
    };
}(jQuery));
