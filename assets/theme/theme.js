// Create Theme JS

window.Theme = window.Theme || {
  $: {
    container: $(".container"),
    header: $("#themeHeader, .header").first(),
    menuToggle: $("[data-toggle-nav], .mobile-menu-toggle"),
    mobileNav: $("[data-mobile-nav], .mobile-header-items-container"),
    body: $("body"),
    menu: $("#menu, .menu").first(),
    category: $(".category")
  },
  themeData: _4ORMAT_DATA,
  init: function() {
    this.initJSForPageType();
    this.Menu.init();
  },
  initJSForPageType: function() {
    var pageType = this.normalizedPageType();
    if (window.Theme.hasOwnProperty(pageType)) {
      window.Theme[pageType].init();
    }
  },
  normalizedPageType: function() {
    var pageType;
    if (Theme.themeData.page.hasOwnProperty("nested")) {
      pageType = Theme.themeData.page.nested.type.charAt(0).toUpperCase() + Theme.themeData.page.nested.type.slice(1);
    } else {
      pageType = Theme.themeData.page.type.charAt(0).toUpperCase() + Theme.themeData.page.type.slice(1);
    }
    return pageType;
  },
  assetRows: function() {
    var assets = $(".asset");
    for (var i = 0; i < assets.length; i += 3) {
      var anchor = i / 3 + 1;
      assets.slice(i, i + 3).wrapAll("<div class='asset-row' id=" + anchor + "></div>");
    }
  },
  isLargerThanMobile: function() {
    return window.innerWidth >= 480;
  },
  isMobileView: function() {
    return window.innerWidth <= 767;
  },
  isTouchDevice: function() {
    var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    var mq = function(query) {
      return window.matchMedia(query).matches;
    }
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
      return true;
    }
    var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
  },
  pageAssets: function() {
    return Theme.themeData.page.assets;
  }
};

// Initialize menu show/hide toggle behaviour

window.Theme.Menu = window.Theme.Menu || {
  init: function() {
    this.bindEvents();
    this.toggle();
    this.headerHeight();
    this.socialPosition();
    this.mobileMenu();
    this.dropdownToggle();
  },
  bindEvents: function() {
    var w = $(window).width();
    $(window).on("resize", function() {
      window.Theme.Menu.headerHeight();
      window.Theme.Menu.socialPosition();
      if ($(this).width() != w) {
        w = $(this).width();
        window.Theme.Menu.mobileMenu();
      }
    });
    $(".mobile-header-background").click(function(e) {
      Theme.$.header.removeClass("active");
      Theme.$.body.removeClass("mobile-header-active");
    });
  },
  toggle: function() {
    Theme.$.menuToggle.on("click", function() {
      var $btn = $(this);
      // Gallery theme (#themeHeader): data-toggle-nav + data-mobile-nav.show
      if ($btn.is("[data-toggle-nav]")) {
        $btn.toggleClass("show");
        Theme.$.mobileNav.toggleClass("show");
        if ($btn.hasClass("show")) {
          Theme.$.body.addClass("menu-is-visible");
        } else {
          Theme.$.body.removeClass("menu-is-visible");
        }
        return;
      }
      // Legacy simple-theme header
      Theme.$.header.toggleClass("active");
      Theme.$.body.toggleClass("mobile-header-active");
    });
    Theme.$.mobileNav.on("click", "a", function() {
      Theme.$.menuToggle.removeClass("show");
      Theme.$.mobileNav.removeClass("show");
      Theme.$.body.removeClass("menu-is-visible");
    });
  },
  dropdownToggle: function() {
    var isMobileView = window.innerWidth <= 767;

    Theme.$.category.removeClass("visible");

    if (isMobileView || Theme.isTouchDevice()) {
      Theme.$.category.on("click", function() {
        Theme.$.category.removeClass("visible");
        $(this).toggleClass("visible");
      });
    } else {
      Theme.$.category.hover(function() {
        $(this).toggleClass("visible");
      });
    }

    Theme.$.body.on("click", function() {
      $target = $(event.target);
      if(!$target.closest('.category').length && 
      Theme.$.category.hasClass("visible")) {
        Theme.$.category.removeClass("visible");
      }
    });
  },
  headerHeight: function() {
    var height = Theme.$.header.outerHeight(true) || 0;
    if (Theme.themeData.theme.menu_position == "Right" && !Theme.isMobileView()) {
      Theme.$.container.css("margin-top", height + 20);
    } else {
      Theme.$.container.css("margin-top", height);
    }
  },
  socialPosition: function() {
    if (Theme.themeData.theme.menu_position == "Right") {
      logoHeight = $(".logo").height();
      $(".social").css("top", logoHeight + 40);
    }
  },
  mobileMenu: function() {
    var w = $(window).width();
    $(window).on("resize", function() {
      if ($(this).width() != w) {
        w = $(this).width();
        Theme.$.header.removeClass("active");
        Theme.$.body.removeClass("mobile-header-active menu-is-visible");
        Theme.$.menuToggle.removeClass("show");
        Theme.$.mobileNav.removeClass("show");
        Theme.$.header.css("top", 0);
      }
    });

    if (Theme.isMobileView()) {
      var headerHeight = Theme.$.header.outerHeight(true) || 0;
      $(".mobile-header-items-container").css("padding-top", headerHeight + 25);
      Theme.$.mobileNav.css({ top: Math.max(headerHeight - 2, 0) + "px" });

      // slide header up when scrolling down mobile page
      var lastScrollTop = 0;
      var headerPosition = debounce(function() {
        if (!Theme.$.header.hasClass("active") && !Theme.$.body.hasClass("menu-is-visible")) {
          var scrollPosition = $(window).scrollTop();
          var headerHeight = Theme.$.header.outerHeight(true) || 0;
          if (scrollPosition > lastScrollTop) {
            Theme.$.header.css("top", -headerHeight);
          } else {
            Theme.$.header.css("top", 0);
          }

          if (scrollPosition === 0) {
            Theme.$.header.css("top", 0);
          }
          lastScrollTop = scrollPosition;
        }
      }, 100);
      $(window).on("scroll", headerPosition);
    } else {
      $(window).on("scroll", function() {
        Theme.$.header.css("top", 0);
      });
    }
  }
};

// Initialize page type specific behaviour

window.Theme.Gallery = window.Theme.Gallery || {
  init: function() {
    this.respVideo();
    Theme.assetRows();
    this.galleryOverlay();
    this.bindEvents();
    this.showGallery();
  },
  bindEvents: function() {
    var w = $(window).width();
    $(window).on("resize", function() {
      if ($(this).width() != w) {
        w = $(this).width();
        window.Theme.Gallery.galleryOverlay();
      }
    });
  },
  showGallery: function() {
    setTimeout(function() {
      $("body.gallery .container").removeClass("loading");
    }, 100);
  },
  respVideo: function() {
    Theme.$.container.fitVids();
  },
  galleryOverlay: function() {
    if (window.Theme.isLargerThanMobile()) {
      $(".asset.image, .asset.video").on("click", function(e) {
        var orientation;
        if ($(this).hasClass("is-portrait")) {
          orientation = "portrait";
        } else if ($(this).hasClass("is-square")) {
          orientation = "portrait";
        } else {
          orientation = "landscape";
        }
        if (window.Theme.isLargerThanMobile()) {
          Theme.Gallery.showZoomedImage(orientation, e);
        };
      });
      $(".asset").each(function() {
        $(this).removeClass("has-caption");
      });
      if ($(".mobile-caption-visible").length) {
        $(".mobile-caption-visible").removeClass("mobile-caption-visible"); // close mobile caption if it was opened
        Theme.$.body.removeClass("blur");
      }
    } else {
      $(".asset").each(function(i) {
        if ($(this).find(".caption").length) {
          $(this).addClass("has-caption");
          if (_4ORMAT_DATA.theme.gallery_mobile_caption_position == "Overlay" && 
          !$(".mobile-captions-container").hasClass("populated")) {
            $(this).find(".caption").clone().attr("data-caption",i).appendTo(".mobile-captions-container");
          }
        }
      });
      $(".mobile-captions-container").addClass("populated");

      $(".caption-close").on("click", function() {
        $(".mobile-caption-visible").removeClass('mobile-caption-visible');
        Theme.$.body.removeClass("blur caption-visible");
      });

      $(".caption-toggle").on("click", function() {
        var index = $(this).parent(".asset").data('asset-index');
        $(".caption[data-caption="+index+"]").addClass("mobile-caption-visible");
        Theme.$.body.addClass("blur caption-visible");
      });
    }

    Theme.$.body.on("click", ".close-zoom-container", function() {
      Theme.Gallery.hideZoomedImage();
    });

    Theme.$.body.on("click", ".gallery-zoom-container", function(e) {
      e.stopPropagation();
      if ($(e.target).hasClass("gallery-zoom-container")) {
        Theme.Gallery.hideZoomedImage();
      }
    });

    $(document).keyup(function(e) {
      if (e.keyCode == 27) {
        Theme.Gallery.hideZoomedImage();
      }
    });
  },
  showZoomedImage: function(orientation, e) {
    Theme.$.body.css("overflow", "hidden");
    Theme.$.body.addClass("blur");
    var zoomContainer = $(".gallery-zoom-container");
    var zoomWrapper = $(".gallery-zoom-wrap");
    $(".gallery-zoomed-image, .gallery-zoomed-caption").remove(); // remove any current instances of it
    var $self = $(e.target).parents(".asset").find("img");
    var selfIndex = $self.parents(".asset").data("asset-index");
    if ($self.parents(".asset").hasClass("video")) {
      $(Theme.pageAssets()[selfIndex].embed_dimensions)
        .addClass("gallery-zoomed-image gallery-zoomed-video")
        .appendTo(zoomWrapper);
      setTimeout(function() {
        reframe(".gallery-zoomed-video iframe"); // For responsive embeds
      }, 0);
    } else {
      $self
        .clone()
        .addClass("gallery-zoomed-image is-" + orientation)
        .css("height", "80vh")
        .appendTo(zoomWrapper);
    }

    lazySizes.autoSizer.checkElems();

    var caption = $self.parents(".asset").find(".caption");
    if (caption.length) {
      var imageWidth = $(".gallery-zoomed-image").width();
      caption
        .clone()
        .addClass("gallery-zoomed-caption")
        .appendTo(zoomWrapper)
        .css("max-width",imageWidth);
    }

    if ($self.parents(".asset").hasClass("long-caption")) {
      zoomWrapper.addClass("justify-start");
    }

    zoomContainer.addClass("active");
  },
  hideZoomedImage: function(e) {
    $(".gallery-zoom-container").removeClass("active");
    $(".gallery-zoom-wrap").removeClass("justify-start");
    $(".gallery-zoomed-image, .gallery-zoomed-video, .gallery-zoomed-caption").remove();
    Theme.$.body.css("overflow", "auto");
    Theme.$.body.removeClass("blur");
  }
};

window.Theme.Listing = window.Theme.Listing || {
  init: function() {
    Theme.assetRows();
    this.mobileRowHeight();
    this.bindEvents();
  },
  bindEvents: function() {
    $(window).on("resize", function() {
      window.Theme.Listing.mobileRowHeight();
    });
  },
  mobileRowHeight: function() {
    if (Theme.isMobileView()) {
      var smallestHeight = 999999999999;
      $(".asset .image-placeholder").each(function() {
        if ($(this).height() < smallestHeight) {
          smallestHeight = $(this).height();
        }
      });
      $(".asset").height(smallestHeight);
    } else {
      $(".asset").height("auto");
    }
  }
};

window.lazySizes.init();

// Debounce function

function debounce(f, t) {
  return function (args) {
    let previousCall = this.lastCall;
    this.lastCall = Date.now();
    if (previousCall && ((this.lastCall - previousCall) <= t)) {
      clearTimeout(this.lastCallTimer);
    }
    this.lastCallTimer = setTimeout(() => f(args), t);
  }
}

// Initialize object on DOM load

$(document).on("DOMContentLoaded", function() {
  Theme.init();
});