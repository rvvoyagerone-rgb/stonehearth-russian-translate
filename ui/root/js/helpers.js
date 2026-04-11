Handlebars.registerHelper('i18n', function(i18n_key, options) {

   var view = options.data.view;
   var attrs = options.hash;

   $.each(Ember.keys(attrs), function (i, key) {
      attrs[key] = view.get(attrs[key]);
   });

   var result = i18n.t(i18n_key, attrs);

   return new Handlebars.SafeString(result);
});

(function ($) {
     $.each(['show', 'hide'], function (i, ev) {
       var el = $.fn[ev];
       $.fn[ev] = function () {
         this.trigger(ev);
         return el.apply(this, arguments);
       };
     });
   })(jQuery);

var stonehearth_translate = function(key, options) {
   if (typeof key != 'string' || key == '') {
      // If there's nothing to translate, bail.
      return "";
   }

   if (key.indexOf('i18n(') == 0 && key.charAt(key.length-1) == ')' && key.charAt(6) != '_') {
      key = key.substr(5, key.length-6);
   }

   options = options || {};
   var originalLang = options.lng;
   options.postProcess = "localizeEntityName";
   if (key.indexOf(i18n.options.nsseparator) > -1) {
      var parts = key.split(i18n.options.nsseparator);
      var namespace = parts[0];
      var currentLang = i18n.lng();
      if (!i18n.hasResourceBundle(currentLang, namespace)) { // If no data for namespace, supply a fallback locale
         var moduleData = App.getModuleData();
         var mod = moduleData ? moduleData[namespace] : null;
         if (mod && mod.default_locale) {
            options.lng = mod.default_locale;
         }
      }
   }
   if (options.escapeHTML) {
      options.escapeInterpolation = true;
   }
   var translatedToken = i18n.translate(key, options);
   options.lng = originalLang;
   return translatedToken;
}

i18n.t = stonehearth_translate;

// Does name substitutions for localization strings that contain [name(...)]
// Will get the custom or display name for the provided entity
i18n.addPostProcessor("localizeEntityName", function(value, key, isFound, opts) {
   //i18n(__i18n_data.entity_display_name__, {\"self.stonehearth:unit_info.custom_name\":\"__i18n_data.entity_custom_name__\"})

   var nameHelperPrefix = '[name(';
   var nameHelperSuffix = ')]';
   var replacementCounter = 0;
   var maxRecursion = 4;

   opts.postProcess = null;

   function localizeName(translated, options) {
     while (translated.indexOf(nameHelperPrefix) != -1) {
         replacementCounter++;
         if (replacementCounter > maxRecursion) {
            break;
         } // safety net for too much recursion
         var indexOfOpening = translated.lastIndexOf(nameHelperPrefix);
         var indexOfEndOfClosing = translated.indexOf(nameHelperSuffix, indexOfOpening) + nameHelperSuffix.length;
         var token = translated.substring(indexOfOpening, indexOfEndOfClosing);
         var tokenWithoutSymbols = token.replace(nameHelperPrefix, '').replace(nameHelperSuffix, '');

         if (indexOfEndOfClosing <= indexOfOpening) {
             f.error('there is an missing closing in following translation value', translated);
             return '';
         }

         var customNameKey = i18n.options.interpolationPrefix + tokenWithoutSymbols + "_custom_name" + i18n.options.interpolationSuffix;
         var customName = i18n.applyReplacement(customNameKey, opts);
         var isFullEntity = false;
         if (customName == customNameKey) {
            customNameKey = i18n.options.interpolationPrefix + tokenWithoutSymbols + ".stonehearth:unit_info.custom_name" + i18n.options.interpolationSuffix;
            customName = i18n.applyReplacement(customNameKey, opts);
            isFullEntity = true;
         }

         var newToken = i18n.options.interpolationPrefix + tokenWithoutSymbols + (isFullEntity ? ".stonehearth:unit_info.display_name" : "_display_name") + i18n.options.interpolationSuffix;
         var replacedToken = i18n.applyReplacement(newToken, opts);
         opts['self'] = {
            'stonehearth:unit_info': {
               'custom_name': customName
            }
         };
         opts.defaultValue = i18n.t("stonehearth:ui.game.entities.unknown_name");
         var translatedToken = i18n.t(replacedToken, opts);
         if (options.escapeHTML) {
            translatedToken = Ember.Handlebars.Utils.escapeExpression(translatedToken);
         }
         translated = translated.replace(token, translatedToken);
     }
     return translated;
   }

   if (value.indexOf("[name(") >= 0) {
      var newValue = localizeName(value, opts);
      newValue = i18n.applyReplacement(newValue, opts);
      return newValue;
   }

   if (value == key && !isFound) {
      return undefined;
   }


   return value;
});

Ember.Handlebars.registerBoundHelper('i18n_key', function (key, options) {
   if (typeof key != 'string' || key == '') {
      // If there's nothing to translate, bail.
      return null;
   }
   var attrs = options.hash;
   var result = i18n.t(key, attrs);
   return result;
});

// For use in {{{ }}} in Ember
Ember.Handlebars.registerBoundHelper('formatted_i18n_key', function(key, options) {
   if (typeof key != 'string' || key == '') {
      // If there's nothing to translate, bail.
      return null;
   }
   var attrs = options.hash;
   attrs.escapeHTML = true;
   var result = i18n.t(key, attrs);
   return new Ember.Handlebars.SafeString(result);
});

Handlebars.registerHelper('tr', function(context, options) {
   var opts = i18n.functions.extend(options.hash, context);
   if (options.fn) opts.defaultValue = options.fn(context);

   var result = i18n.t(opts.key, opts);

   return new Handlebars.SafeString(result);
});
