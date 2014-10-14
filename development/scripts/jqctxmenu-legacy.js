/*
 * jqCtxMenu - a jQuery plugin
 * 1.0-alpha
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
        CTX_ARROW_OFFSET = 16,
        CTX_CONTAINER = "jqctx-container",
        CTX_CLASS = "jqctx",
        CTX_SUB_CLASS = "jqctx-sub",
        CTX_ARROW_CLASS = "jqctx-arrow",
        CTX_ARROW_TW_CLASS = "tw-arrow",
        name = "name",
        action = "action",
        context = {},
        $container = $("#" + CTX_CONTAINER),
        menus = [],
        totalCtxWidth = 0,
        initPadding = false,
        paddingXOffset,
        paddingYOffset,
        $menu;

    context.isValid = function(prop, i) {
        if (!this.options[i][prop]) {
            throw new Error(prop + " is mandatory for context menu object.");
        }
    };

    // On initialization methods

    context.bindInitialEvent = function() {
        $(document).mousedown(function() {
            $container.find("> ." + CTX_CLASS).hide();
        });
    };

    context.buildInitialContainer = function() {
        var container;

        if (!$(CTX_CONTAINER).length) {
            container = $("<div>").attr("id", CTX_CONTAINER);
            $("body").append(container);
            $container = $("#" + CTX_CONTAINER);

            this.bindInitialEvent();
        }
    };

    // Needed for determining CSS padding
    context.setPaddingOffset = function() {
        var paddingLeftString = $menu.find("li").css("padding-left"),
            paddingTopString = $menu.find("li").css("padding-top");

        paddingLeftString = paddingLeftString.replace("px", "");
        paddingTopString = paddingTopString.replace("px", "");

        paddingXOffset = parseInt(paddingLeftString);
        paddingYOffset = parseInt(paddingTopString);
    };

    // Build methods

    context.buildMenu = function(container, isSubmenu, currentMenu) {
        container = container || $container;
        isSubmenu = isSubmenu || false;

        var menu = $("<ul>").addClass(CTX_CLASS),
            menuLen = menus.length,
            newMenu,
            xMargin;

        container.append(menu);

        // Determines whether the menu should be appended to main one
        // or to the last added submenu
        if (!isSubmenu) {
            $menu = container.find(menu);
            return null;
        } else {
            if (menuLen === 0) {
                xMargin = $menu.outerWidth();
            } else {
                if (menus.length === 1) {
                    xMargin = menus[0].obj.outerWidth();
                } else {
                    xMargin = menus[menus.length - 1].parent.obj.outerWidth();
                }
            }

            // WARNING: Needed for determining menu position on RMB click later
            totalCtxWidth += xMargin;

            newMenu = {
                obj: container.find(menu),
                xMargin: xMargin,
                yMargin: $menu.find("li").outerHeight(),
                parent: currentMenu
            };

            menus.push(newMenu);

            return newMenu;
        }
    };

    // Determines where the option must be added
    context.appendOption = function(isSubmenu, option, currentMenu) {
        if (!isSubmenu) {
            $menu.append(option);
        } else {
            currentMenu.obj.append(option);
        }
    };

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

        return optContainer.find(title);
    };

    // Adds an option to the menu that is currently being built
    context.addOption = function(option, isSubmenu, currentMenu) {
        isSubmenu = isSubmenu || false;

        var optContainer = $("<li>"),
            contentWidth,
            $currentTitle,
            submenuCont,
            newMenu,
            submenu;

        $currentTitle = context.buildOption(optContainer, option);

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
            context.appendOption(isSubmenu, optContainer, currentMenu);

            submenu = $("<div>").addClass(CTX_SUB_CLASS);
            optContainer.append(submenu);

            contentWidth = $currentTitle.outerWidth() + CTX_ARROW_OFFSET + paddingXOffset * 2;
            if (contentWidth < optContainer.outerWidth()) {
                optContainer.addClass(CTX_ARROW_TW_CLASS);
            }

            optContainer.addClass(CTX_ARROW_CLASS);
            submenuCont = optContainer.find(submenu);

            newMenu = context.buildMenu($menu.find(submenuCont), true, currentMenu);
            context.loadMenu(option.menu, true, newMenu);

            return;
        }

        context.appendOption(isSubmenu, optContainer, currentMenu);
    };

    context.loadMenu = function(options, isSubmenu, currentMenu) {
        options = options || this.options;
        isSubmenu = isSubmenu || false;

        var i = 0;

        // Iterates throw all of the menu options and appends them
        // Note: The name is mandatory
        for (i; i < options.length; i += 1) {
            this.isValid(name, i);
            this.addOption(options[i], isSubmenu, currentMenu);

            if (!initPadding) {
                context.setPaddingOffset();
                initPadding = true;
            }
        }
    };

    context.determineDirections = function(page) {
        var windowX = $(window).innerWidth(),
            windowY = $(window).innerHeight(),
            ctxHeight = $menu.outerHeight(), // TODO: Integrate with all menus
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

    // Applies new position on RMB click
    context.positionMenu = function(page) {
        var i = 0,
            mainMenu = {},
            subMenus = {},
            directions,
            current;

        directions = context.determineDirections(page);

        if (directions.x === "left") {
            mainMenu.left = (page.x + CTX_X_OFFSET) - $menu.outerHeight();
        } else {
            mainMenu.left = page.x + CTX_X_OFFSET;
        }

        if (directions.y === "up") {
            mainMenu.top = (page.y) - $menu.outerWidth();
        } else {
            mainMenu.top = page.y + CTX_Y_OFFSET;
        }

        $menu.css({
            top: mainMenu.top,
            left: mainMenu.left
        });

        for (i; i < menus.length; i++) {
            current = menus[i];

            if (directions.x === "left") {
                subMenus.left = -current.obj.outerWidth() + CTX_X_OFFSET;
            } else {
                subMenus.left = current.xMargin - CTX_X_OFFSET;
            }

            current.obj.css({
                marginLeft: subMenus.left - paddingXOffset,
                marginTop: -current.yMargin + paddingYOffset
            });
        }
    };

    context.finishTotalCtxWidthCalculation = function() {
        var menuLen = menus.length;

        if (menuLen === 0) {
            totalCtxWidth = $menu.outerWidth();
        } else {
            totalCtxWidth += menus[menuLen - 1].obj.outerWidth();
        }
    };

    // Plugin
    $.fn.jqCtxMenu = function(options) {
        var $this = $(this),
            isInitSet = false;

        context.options = options;
        context.buildInitialContainer();
        context.buildMenu();
        context.loadMenu();
        context.finishTotalCtxWidthCalculation();

        // Disable the default context menu
        $this.bind("contextmenu", function() {
            return false;
        });

        $this.mousedown(function(e) {
            if(e.button === RMB) {
                context.positionMenu({ y: e.pageY, x: e.pageX });

                if (isInitSet) {
                    $menu.fadeIn();
                } else {
                    $menu.css("visibility", "visible");
                    isInitSet = true;
                }

                return false;
            }

            return true;
        });

        return this;
    };
}(jQuery));
