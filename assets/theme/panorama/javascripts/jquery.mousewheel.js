/*! Copyright (c) 2013 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.1.3
 *
 * Requires: 1.2.2+
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],e):"object"==typeof exports?module.exports=e:e(jQuery)}(function(a){function t(e){var t,n=e||window.event,o=[].slice.call(arguments,1),l=0,i=0,s=0,h=0,u=0;return(e=a.event.fix(n)).type="mousewheel",n.wheelDelta&&(l=n.wheelDelta),n.detail&&(l=-1*n.detail),n.deltaY&&(l=s=-1*n.deltaY),n.deltaX&&(l=-1*(i=n.deltaX)),n.wheelDeltaY!==undefined&&(s=n.wheelDeltaY),n.wheelDeltaX!==undefined&&(i=-1*n.wheelDeltaX),h=Math.abs(l),(!r||h<r)&&(r=h),u=Math.max(Math.abs(s),Math.abs(i)),(!d||u<d)&&(d=u),t=0<l?"floor":"ceil",l=Math[t](l/r),i=Math[t](i/d),s=Math[t](s/d),o.unshift(e,l,i,s),(a.event.dispatch||a.event.handle).apply(this,o)}var r,d,e=["wheel","mousewheel","DOMMouseScroll","MozMousePixelScroll"],n="onwheel"in document||9<=document.documentMode?["wheel"]:["mousewheel","DomMouseScroll","MozMousePixelScroll"];if(a.event.fixHooks)for(var o=e.length;o;)a.event.fixHooks[e[--o]]=a.event.mouseHooks;a.event.special.mousewheel={setup:function(){if(this.addEventListener)for(var e=n.length;e;)this.addEventListener(n[--e],t,{passive:!1});else this.onmousewheel=t},teardown:function(){if(this.removeEventListener)for(var e=n.length;e;)this.removeEventListener(n[--e],t,{passive:!1});else this.onmousewheel=null}},a.fn.extend({mousewheel:function(e){return e?this.bind("mousewheel",e):this.trigger("mousewheel")},unmousewheel:function(e){return this.unbind("mousewheel",e)}})});