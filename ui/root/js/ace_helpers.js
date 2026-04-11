var unit_info_property = 'stonehearth:unit_info';
var root_unit_info_property = 'stonehearth:iconic_form.root_entity.stonehearth:unit_info';

// spiegg's solution here: https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
function interpretPropertyString(s, obj) {
   var properties = Array.isArray(s) ? s : s.split('.')
   return properties.reduce((prev, curr) => prev && prev[curr], obj)
}

// need to add support for titles and other custom data to name localization
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

   // if "self.stonehearth:unit_info" is specified, check whether the root form's unit_info should be used instead
   if (typeof translatedToken == 'string' && translatedToken.indexOf(i18n.options.interpolationPrefix + 'self.' + unit_info_property) >= 0) {
      var root_unit_info = interpretPropertyString('self.' + root_unit_info_property, options);
      if (root_unit_info && (root_unit_info.custom_name || root_unit_info.custom_data)) {
         translatedToken = translatedToken.split(i18n.options.interpolationPrefix + 'self.' + unit_info_property)
                                          .join(i18n.options.interpolationPrefix + 'self.' + root_unit_info_property);
         translatedToken = i18n.translate(translatedToken, options);
      }
   }

   options.lng = originalLang;
   return translatedToken;
}

i18n.t = stonehearth_translate;

i18n.addPostProcessor("localizeEntityName", function(value, key, isFound, opts) {
   //i18n(__i18n_data.entity_display_name__, {\"self.stonehearth:unit_info.custom_name\":\"__i18n_data.entity_custom_name__\"})

   var nameHelperPrefix = '[name(';
   var nameHelperSuffix = ')]';
   const endModifyPref = '(d_'; //Открывающие символы
   const postfix = '=)'; //закрывающие символы
   var replacementCounter = 0;
   var maxRecursion = 4;

   opts.postProcess = null;
   
	function endModify(word) //Функция изменения окончания
	{
		//return word; //отключить функцию для дебага
		
		//Числа 0 = 48, 49-57
		//return '9'.charCodeAt(0);
		var nouns = 0; //Количество существительных
		var maxNouns = 1; //Максимальное количество существительных
		
		var safetyCounter = 0;
		
		var Text = word;
		var isTiming = 0;
		
		/* СТАРЬЁ	
		const nouns_i = ["га-",		"ка-",	"ха-",	"ия-",	"ий-",	"й-",	"ие-",	"мя-",		"ец-",	"а-",	"о-",	"ы-",	"я-",	"ги-",		"ки-",		"хи-",		"и-", 	"д-",	"ник-",		"ёнок-",	"ень-",	"ок-",	"лон-",		"нт-",		"-"]; 
		const nouns_r = ["ги-",		"ки-",	"хи-",	"ии-",	"ия-",	"я-",	"ия-",	"мени-",	"ца-",	"ы-",	"а-",	"ов-",	"и-",	"г-",		"ок-",		"х-",		"ь-", 	"да-",	"ника-",	"ёнка-",	"ня-",	"ка-",	"лона-",	"нта-",		"а-"];
		const nouns_d = ["ге-",		"ке-",	"хе-",	"ии-",	"ию-",	"ю-",	"ию-",	"мени-",	"цу-",	"е-",	"у-",	"ам-",	"е-",	"гам-",		"кам-",		"хам-",		"ям-", 	"ду-",	"нику-",	"ёнку-",	"ню-",	"ку-",	"лону-",	"нту-",		"у-"];
		const nouns_v = ["гу-",		"ку-",	"ху-",	"ию-",	"ия-",	"й-",	"ие-",	"мя-",		"ца-",	"у-",	"о-",	"ы-",	"ю-",	"ги-",		"ки-",		"хи-",		"и-", 	"д-",	"ник-",		"ёнка-",	"ень-",	"ок-",	"лон-",		"нт-",		"-"];
		const nouns_t = ["гой-",	"кой-",	"хой-",	"ией-",	"ием-",	"ем-",	"ием-",	"менем-",	"цем-",	"ой-",	"ом-",	"ами-",	"ей-",	"гами-",	"ками-",	"хами-",	"ями-",	"дом-",	"ником-",	"ёнком-",	"нём-",	"ком-",	"лоном-",	"нтом-",	"ом-"];
		const nouns_p = ["ге-",		"ке-",	"хе-",	"ии-",	"ии-",	"е-",	"ии-",	"мени-",	"це-",	"е-",	"е-",	"ах-",	"е-",	"гах-",		"ках-",		"хах-",		"ях-", 	"де-",	"нике-",	"ёнке-",	"не-",	"ке-",	"лоне-",	"нте-",		"е-"];
		const nounsLength = nouns_i.length;
			
		const adjectives_i = ["гий-",	"цкий-",		"кий-",		"хий-",		"ой-",	"ый-",	"ий-",		"яя-",	"чая-",	"щая-",	"ая-",	"гое-",		"кое-",		"хое-",		"ее-",	"ое-",	"ые-"];
		const adjectives_r = ["гого-",	"цкого-",		"кого-",	"хого-",	"ого-",	"ого-",	"его-",		"ей-",	"чей-",	"щей-",	"ой-",	"гого-",	"кого-",	"хого-",	"его-",	"ого-",	"ых-"];
		const adjectives_d = ["гому-",	"цкому-",		"кому-",	"хому-",	"ому-",	"ому-",	"ему-",		"ей-",	"чей-",	"щей-",	"ой-",	"гому-",	"кому-",	"хому-",	"ему-",	"ому-",	"ым-"];
		const adjectives_v = ["гого-",	"цкий-",		"кого-",	"хого-",	"ой-",	"ый-",	"ий-",		"юю-",	"чую-",	"щую-",	"ую-",	"гое-",		"кое-",		"хое-",		"ее-",	"ое-",	"ые-"];
		const adjectives_t = ["гим-",	"цким-",		"ким-",		"хим-",		"ым-",	"ым-",	"им-",		"ей-",	"чей-",	"щей-",	"ой-",	"гим-",		"ким-",		"хим-",		"им-",	"ым-",	"ыми-"];
		const adjectives_p = ["гом-",	"цком-",		"ком-",		"хом-",		"ом-",	"ом-",	"ем-",		"ей-",	"чей-",	"щей-",	"ой-",	"гом-",		"ком-",		"хом-",		"ем-",	"ом-",	"ых-"];
		const adjectivesLength = adjectives_i.length;
		*/
		
		//НОВАЯ СИСТЕМА ПО РОДАМ
		const m_adjectives_i = ["гий-",		"цкий-",	"кий-",		"хий-",		"ий-",		"ой-",	"ый-"]; //Мужицкие прилагательные
		const m_adjectives_r = ["гого-",	"цкого-",	"кого-",	"хого-",	"его-",		"ого-",	"ого-"];
		const m_adjectives_d = ["гому-",	"цкому-",	"кому-",	"хому-",	"ему-",		"ому-",	"ому-"];
		const m_adjectives_v = ["гий-",		"цкий-",	"кий-",		"хий-",		"ий-",		"ой-",	"ый-"];
		const m_adjectives_t = ["гим-",		"цким-",	"ким-",		"хим-",		"им-",		"ым-",	"ым-"];
		const m_adjectives_p = ["гом-",		"цком-",	"ком-",		"хом-",		"ем-",		"ом-",	"ом-"];
		const m_adjectives_x = ["гие-",		"цкие-",	"кие-",		"хие-",		"ие-",		"ие-",	"ые-"];
		const m_adjectivesLength = m_adjectives_i.length;
		
		const f_adjectives_i = ["яя-",	"чая-",	"щая-",	"ая-"]; //Женщинские
		const f_adjectives_r = ["ей-",	"чей-",	"щей-",	"ой-"];
		const f_adjectives_d = ["ей-",	"чей-",	"щей-",	"ой-"];
		const f_adjectives_v = ["юю-",	"ую-",	"ую-",	"ую-"];
		const f_adjectives_t = ["ей-",	"чей-",	"щей-",	"ой-"];
		const f_adjectives_p = ["ей-",	"чей-",	"щей-",	"ой-"];
		const f_adjectives_x = ["ие-",	"чие-",	"щие-",	"ие-"];
		const f_adjectivesLength = f_adjectives_i.length;
		
		const n_adjectives_i = ["гое-",		"кое-",		"хое-",		"ее-",	"ое-"]; //Средненькие
		const n_adjectives_r = ["гого-",	"кого-",	"хого-",	"его-",	"ого-"];
		const n_adjectives_d = ["гому-",	"кому-",	"хому-",	"ему-",	"ому-"];
		const n_adjectives_v = ["гое-",		"кое-",		"хое-",		"ее-",	"ое-"];
		const n_adjectives_t = ["гим-",		"ким-",		"хим-",		"им-",	"ым-"];
		const n_adjectives_p = ["гом-",		"ком-",		"хом-",		"ем-",	"ом-"];
		const n_adjectives_x = ["гие-",		"кие-",		"хие-",		"ие-",	"ые-"];
		const n_adjectivesLength = n_adjectives_i.length;
		
		const x_adjectives_i = ["гие-",		"кие-",		"хие-",		"ие-",	"ые-"]; //Множественные
		const x_adjectives_r = ["гих-",		"ких-",		"хих-",		"их-",	"ых-"];
		const x_adjectives_d = ["гим-",		"ким-",		"хим-",		"им-",	"ым-"];
		const x_adjectives_v = ["гие-",		"кие-",		"хие-",		"их-",	"ые-"];
		const x_adjectives_t = ["гими-",	"кими-",	"хими-",	"ими-",	"ыми-"];
		const x_adjectives_p = ["гих-",		"ких-",		"хих-",		"их-",	"ых-"];
		//const x_adjectives_x = x_adjectives_r;
		const x_adjectivesLength = x_adjectives_i.length;
		
		const m_nouns_i = ["ень-",	"ь-",	"-"]; //Мужицкие существительные
		const m_nouns_r = ["ня-",	"я-",	"а-"];
		const m_nouns_d = ["ню-",	"ю-",	"у-"];
		const m_nouns_v = ["ень-",	"я-",	"-"];
		const m_nouns_t = ["нём-",	"ем-",	"ом-"];
		const m_nouns_p = ["не-",	"е-",	"е-"];
		const m_nouns_x = ["ни-",	"и-",	"ы-"];
		const m_nounsLength = m_nouns_i.length;
		
		const f_nouns_i = ["га-",	"ка-",	"ха-",	"а-",	"я-",	"ь-"]; //Женщинские
		const f_nouns_r = ["ги-",	"ки-",	"хи-",	"ы-",	"и-",	"и-"];
		const f_nouns_d = ["ге-",	"ке-",	"хе-",	"е-",	"е-",	"и-"];
		const f_nouns_v = ["гу-",	"ку-",	"ху-",	"у-",	"ю-",	"ь-"];
		const f_nouns_t = ["гой-",	"кой-",	"хой-",	"ой-",	"ёй-",	"ью-"];
		const f_nouns_p = ["ге-",	"ке-",	"хе-",	"е-",	"е-",	"и-"];
		const f_nouns_x = ["ги-",	"ки-",	"хи-",	"ы-",	"и-",	"и-"];
		const f_nounsLength = f_nouns_i.length;
		
		const n_nouns_i = ["о-",	"е-"]; //Средненькие
		const n_nouns_r = ["а-",	"а-"];
		const n_nouns_d = ["у-",	"у-"];
		const n_nouns_v = ["о-",	"е-"];
		const n_nouns_t = ["ом-",	"ем-"];
		const n_nouns_p = ["е-",	"е-"];
		const n_nouns_x = ["а-",	"а-"];
		const n_nounsLength = n_nouns_i.length;
		
		const x_nouns_i = ["ги-",	"ки-",		"хи-",		"и-",	"ы-"]; //Множественные
		const x_nouns_r = ["гов-",	"ков-",		"хов-",		"й-",	"ов-"];
		const x_nouns_d = ["гам-",	"кам-",		"хам-",		"ям-",	"ам-"];
		const x_nouns_v = ["ги-",	"ки-",		"хи-",		"и-",	"ов-"];
		const x_nouns_t = ["гами-",	"ками-",	"хами-",	"ями-",	"ами-"];
		const x_nouns_p = ["гах-",	"ках-",		"хах-",		"ях-",	"ах-"];
		//const x_nouns_x =  = x_nouns_r;
		const x_nounsLength = x_nouns_i.length;
		
		
		while (Text.indexOf(endModifyPref) != -1) 
		{
			safetyCounter++;
			if (safetyCounter > maxRecursion) 
				break; // safety net for too much recursion
			
			var fullPref; //Полные открывающие символы
			const startAtribute = endModifyPref.length + Text.indexOf(endModifyPref); //Индекс начала атрибутов
			var suffix = Text.charAt(startAtribute); //падеж (длина открывающих символов + их позиция во всём тексте)
			var gender = 0; //Род слова (0 - не определён, 1 - женский, 2 - множественный, 3 - средний, 4 - мужской)
			
			if (Text.charAt(startAtribute + 1) != '_') //Если не указано ограничение существительных
				fullPref = endModifyPref + suffix + '=';
			else
			{
				maxNouns = Text.charAt(startAtribute + 2);
				fullPref = endModifyPref + suffix + '_' + maxNouns + '=';
			}
				
			var indexOfOpening = Text.lastIndexOf(fullPref); //индекс первого символа
			var indexOfEndOfClosing = Text.indexOf(postfix, indexOfOpening) + postfix.length; 
				
			var token = Text.substring(indexOfOpening, indexOfEndOfClosing);
			var tokenWithoutSymbols = token.replace(fullPref, '').replace(postfix, ''); //чистый текст между открывающими/закрывающими символами
				
			var tokens = tokenWithoutSymbols.split(' '); //массив раздельных слов
			var tokensLength = tokens.length; //количество слов
			
			/* (СТАРЫЕ РАЗМЫШЛЕНИЯ)
				1 - делим слова пробелами
				2 - начинаем проверку слов
				3 - делим слова дефисами 
				4 - начинаем проверку частей слов
				5 - проверяем гласные на краткость (пропажа "о", "ё" и "е" в некоторых падежах)
				6 - проверяем слова-исключения, которые не склоняются
				7 - проверяем прилагательные
				8 - проверяем существительные
			*/
			/*
				1 - Раделяем словосочетание пробелами
				2 - Определяем часть речи по окончанию
				3 - Разделяем (только) сложные существительные с дефисом
			*/
			/*	СДЕЛАТЬ:
				Склонения имён отличаются от склонений нарицательных. "Боб" - вижу "Боба", но "боб" - вижу "боб".
				Сделать различные массивы склонений для различных родов? Так можно будет увеличить точность склонений последующих слов и оптимизировать процесс.
				Отдельный массив для слов-исключений?
			*/ 
			var newToken = '';
			
			for (var i = 0; i < tokensLength; i++) //проходим по каждому слову
				tokens[i] = tokens[i] + '-'; //так будет проще найти окончание (по дефису в конце)
				
			for (var i = 0; i < tokensLength; i++) //проходим по каждому слову
			{
				const firstCharCode = tokens[i].charCodeAt(0); //Первый символ слова
				var wasNumber = 0; //Было ли слово-число
				
				if ( firstCharCode >= 1025 && firstCharCode <= 1103) //Если первый символ слова является кириллицей (нам нужно склонять только русские слова)
				{
					var success = 0; //Переменная успеха нахождения окончания
					
					if ( !gender || gender == 1 ) //ЖЕНСКИЙ
					{			
						for (var e = 0; e < f_adjectivesLength; e++) //ПРИЛАГАТЕЛЬНЫЕ: проверяем окончание части слова, проходя по окончаниям заданных массивов
						{
							if (tokens[i].indexOf(f_adjectives_i[e]) >= 0) //если это прилагательное, и окончание подходит...
							{ 
								switch (suffix) //Заменяем окончание в зависимости от падежа
								{
									case 'r':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_r[e]); break;
								
									case 'd':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_d[e]); break;
									
									case 'v':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_v[e]); break;
									
									case 't':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_t[e]); break;
									
									case 'p':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_p[e]); break;
										
									case 'x':
										tokens[i] = tokens[i].replace(f_adjectives_i[e], f_adjectives_x[e]); break;
								}
								gender = 1; 
								success = 1;
								break; //Больше не нужно проверять базу окончаний
							}
						}
						
						if (!success && ((nouns < maxNouns) || (maxNouns == 0))) 
						{
							//return tokens[i]; //DEBAG: Узнать существительное
							var parts = tokens[i].split('-'); //разделяем отдельные слова на части (в случае слов через дефис)
							var partsLength = parts.length; //длина части слова
								
							for (var t = 0; t < partsLength-1; t++) //проходим по каждой части слова
							{
								parts[t] = parts[t] + '-';
								for (var e = 0; e < f_nounsLength; e++) //проверяем окончание части слова, проходя по окончаниям заданных массивов
								{
									if (parts[t].indexOf(f_nouns_i[e]) >= 0) //если это существительное, и окончание подходит...
									{ 
										switch (suffix) //Заменяем окончание в зависимости от падежа
										{
											case 'r':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_r[e]); break;
										
											case 'd':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_d[e]); break;
											
											case 'v':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_v[e]); break;
											
											case 't':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_t[e]); break;
											
											case 'p':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_p[e]); break;
												
											case 'x':
												parts[t] = parts[t].replace(f_nouns_i[e], f_nouns_x[e]); break;
										}
										gender = 1;
										nouns++;
										if (!t) 
											tokens[i] = ''; //Стираем слово на первой итерации
										
										tokens[i] = tokens[i] + parts[t];
										break; //Больше не нужно проверять базу окончаний
									}
								}
							}
						}
					} 
					if ( !gender || gender == 2 ) //МНОЖЕСТВЕННЫЙ
					{
						for (var e = 0; e < x_adjectivesLength; e++) //ПРИЛАГАТЕЛЬНЫЕ: проверяем окончание части слова, проходя по окончаниям заданных массивов
						{
							if (tokens[i].indexOf(x_adjectives_i[e]) >= 0) //если это прилагательное, и окончание подходит...
							{ 
								switch (suffix) //Заменяем окончание в зависимости от падежа
								{
									case 'r':
										tokens[i] = tokens[i].replace(x_adjectives_i[e], x_adjectives_r[e]); break;
								
									case 'd':
										tokens[i] = tokens[i].replace(x_adjectives_i[e], x_adjectives_d[e]); break;
									
									case 'v':
										tokens[i] = tokens[i].replace(x_adjectives_i[e], x_adjectives_v[e]); break;
									
									case 't':
										tokens[i] = tokens[i].replace(x_adjectives_i[e], x_adjectives_t[e]); break;
									
									case 'p':
										tokens[i] = tokens[i].replace(x_adjectives_i[e], x_adjectives_p[e]); break;
								}
								gender = 2;
								success = 1;
								break; //Больше не нужно проверять базу окончаний
							}
						}
					
						if (!success && ((nouns < maxNouns) || (maxNouns == 0))) 
						{
							//return tokens[i]; //DEBAG: Узнать существительное
							var parts = tokens[i].split('-'); //разделяем отдельные слова на части (в случае слов через дефис)
							var partsLength = parts.length; //длина части слова
								
							for (var t = 0; t < partsLength-1; t++) //проходим по каждой части слова
							{
								parts[t] = parts[t] + '-';
								for (var e = 0; e < x_nounsLength; e++) //проверяем окончание части слова, проходя по окончаниям заданных массивов
								{
									if (parts[t].indexOf(x_nouns_i[e]) >= 0) //если это существительное, и окончание подходит...
									{ 
										switch (suffix) //Заменяем окончание в зависимости от падежа
										{
											case 'r':
												parts[t] = parts[t].replace(x_nouns_i[e], x_nouns_r[e]); break;
										
											case 'd':
												parts[t] = parts[t].replace(x_nouns_i[e], x_nouns_d[e]); break;
											
											case 'v':
												parts[t] = parts[t].replace(x_nouns_i[e], x_nouns_v[e]); break;
											
											case 't':
												parts[t] = parts[t].replace(x_nouns_i[e], x_nouns_t[e]); break;
											
											case 'p':
												parts[t] = parts[t].replace(x_nouns_i[e], x_nouns_p[e]); break;
										}
										gender = 2;
										nouns++;
										if (!t) 
											tokens[i] = ''; //Стираем слово на первой итерации
										
										tokens[i] = tokens[i] + parts[t];
										break; //Больше не нужно проверять базу окончаний
									}
								}
							}
						}
					}
					if ( !gender || gender == 3 ) //СРЕДНИЙ
					{				
						for (var e = 0; e < n_adjectivesLength; e++) //ПРИЛАГАТЕЛЬНЫЕ: проверяем окончание части слова, проходя по окончаниям заданных массивов
						{
							if (tokens[i].indexOf(n_adjectives_i[e]) >= 0) //если это прилагательное, и окончание подходит...
							{ 
								switch (suffix) //Заменяем окончание в зависимости от падежа
								{
									case 'r':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_r[e]); break;
								
									case 'd':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_d[e]); break;
									
									case 'v':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_v[e]); break;
									
									case 't':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_t[e]); break;
									
									case 'p':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_p[e]); break;
										
									case 'x':
										tokens[i] = tokens[i].replace(n_adjectives_i[e], n_adjectives_x[e]); break;
								}
								gender = 3;
								success = 1;
								break; //Больше не нужно проверять базу окончаний
							}
						}
					
						if (!success && ((nouns < maxNouns) || (maxNouns == 0))) 
						{
							//return tokens[i]; //DEBAG: Узнать существительное
							var parts = tokens[i].split('-'); //разделяем отдельные слова на части (в случае слов через дефис)
							var partsLength = parts.length; //длина части слова
								
							for (var t = 0; t < partsLength-1; t++) //проходим по каждой части слова
							{
								parts[t] = parts[t] + '-';
								for (var e = 0; e < n_nounsLength; e++) //проверяем окончание части слова, проходя по окончаниям заданных массивов
								{
									if (parts[t].indexOf(n_nouns_i[e]) >= 0) //если это существительное, и окончание подходит...
									{ 
										switch (suffix) //Заменяем окончание в зависимости от падежа
										{
											case 'r':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_r[e]); break;
										
											case 'd':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_d[e]); break;
											
											case 'v':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_v[e]); break;
											
											case 't':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_t[e]); break;
											
											case 'p':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_p[e]); break;
												
											case 'x':
												parts[t] = parts[t].replace(n_nouns_i[e], n_nouns_x[e]); break;
										}
										gender = 3;
										nouns++;
										if (!t) 
											tokens[i] = ''; //Стираем слово на первой итерации
										
										tokens[i] = tokens[i] + parts[t];
										break; //Больше не нужно проверять базу окончаний
									}								
								}
							}
						}
					}
					if ( !gender || gender == 4 ) //МУЖСКОЙ
					{
						for (var e = 0; e < m_adjectivesLength; e++) //ПРИЛАГАТЕЛЬНЫЕ: проверяем окончание части слова, проходя по окончаниям заданных массивов
						{
							if (tokens[i].indexOf(m_adjectives_i[e]) >= 0) //если это прилагательное, и окончание подходит...
							{ 
								switch (suffix) //Заменяем окончание в зависимости от падежа
								{
									case 'r':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_r[e]); break;
								
									case 'd':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_d[e]); break;
									
									case 'v':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_v[e]); break;
									
									case 't':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_t[e]); break;
									
									case 'p':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_p[e]); break;
										
									case 'x':
										tokens[i] = tokens[i].replace(m_adjectives_i[e], m_adjectives_x[e]); break;
								}
								gender = 4;
								success = 1;
								break; //Больше не нужно проверять базу окончаний
							}
						}
					
						if (!success && ((nouns < maxNouns) || (maxNouns == 0))) 
						{
							
							var parts = tokens[i].split('-'); //разделяем отдельные слова на части (в случае слов через дефис)
							var partsLength = parts.length; //длина части слова
							
							for (var t = 0; t < partsLength-1; t++) //проходим по каждой части слова
							{
								parts[t] = parts[t] + '-';
								for (var e = 0; e < m_nounsLength; e++) //проверяем окончание части слова, проходя по окончаниям заданных массивов
								{
									if (parts[t].indexOf(m_nouns_i[e]) >= 0) //если это существительное, и окончание подходит...
									{ 
										switch (suffix) //Заменяем окончание в зависимости от падежа
										{
											case 'r':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_r[e]); break;
										
											case 'd':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_d[e]); break;
											
											case 'v':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_v[e]); break;
											
											case 't':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_t[e]); break;
											
											case 'p':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_p[e]); break;
												
											case 'x':
												parts[t] = parts[t].replace(m_nouns_i[e], m_nouns_x[e]); break;
										}
										
										gender = 4;
										nouns++;
										if (!t) 
											tokens[i] = ''; //Стираем слово на первой итерации
										
										tokens[i] = tokens[i] + parts[t];
										break; //Больше не нужно проверять базу окончаний
									}
								}
							}
						}
					}
					//if (i == 2) return gender;
				}
				else if (firstCharCode >= 48 && firstCharCode <=57) //Если слово - число
				{
					wasNumber = 1;
					var number = tokens[i].substring(tokens[i].length - 3, tokens[i].length - 1); //Берём последние две цифры
					
					if (number >= 5 && number <= 20)
						suffix = 'x'; //Меняем падеж на множественное число (дней)
					else
					{
						number = number[1]; //Берём последнюю цифру
						if (number == 0 || number > 4) //дней
							suffix = 'x';
						else if (number > 0 && number < 5) //дня
							suffix = 'r';
					}
					//return number;
				}
				
				tokens[i] = tokens[i].substring(0, tokens[i].length - 1); //Обрезаем дефис в конце
				if (i != tokensLength-1) // Если слово не последнее...
					tokens[i] = tokens[i] + ' '; //заменяем дефис пробелом...
							
				newToken = newToken + tokens[i];
			}
			Text = Text.replace(token, newToken);
		}
		return Text;
	}
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
             f.error('there is a missing closing in following translation value', translated);
             return '';
         }

         // if [entity]_custom_name doesn't work, assume it's a full entity passed to us
         var customNameKey = i18n.options.interpolationPrefix + tokenWithoutSymbols + "_custom_name" + i18n.options.interpolationSuffix;
         var customName = i18n.applyReplacement(customNameKey, opts);
         var isFullEntity = false;

         // prefer the unit info for this entity, unless custom_name or custom_data is specified for root entity
         var tokenData = interpretPropertyString(tokenWithoutSymbols, opts);
         var ui_property = unit_info_property;
         var unit_info = interpretPropertyString(unit_info_property, tokenData);
         var root_unit_info = interpretPropertyString(root_unit_info_property, tokenData);
         if (root_unit_info && (root_unit_info.custom_name || root_unit_info.custom_data)) {
            ui_property = root_unit_info_property;
            unit_info = root_unit_info;
         }
         
         if (customName == customNameKey) {
            isFullEntity = true;
            customNameKey = i18n.options.interpolationPrefix + tokenWithoutSymbols + "." + ui_property + ".custom_name" + i18n.options.interpolationSuffix;
            customName = i18n.applyReplacement(customNameKey, opts);
         }

         var newToken = i18n.options.interpolationPrefix + tokenWithoutSymbols + (isFullEntity ? "." + ui_property + ".display_name" : "_display_name") + i18n.options.interpolationSuffix;
         var replacedToken = i18n.applyReplacement(newToken, opts);

         var customData = interpretPropertyString(tokenWithoutSymbols + '_custom_data', opts) || {};
         opts['self'] = {};
         opts.self['stonehearth:unit_info'] = unit_info;
         if (!opts.self['stonehearth:unit_info'] || !isFullEntity) {
            opts.self['stonehearth:unit_info'] = {
               'custom_name': customName,
               'custom_data': customData
            };
         }
         opts.defaultValue = i18n.t("stonehearth:ui.game.entities.unknown_name");
         var translatedToken = i18n.t(replacedToken, opts);
         if (options.escapeHTML) {
            translatedToken = Ember.Handlebars.Utils.escapeExpression(translatedToken);
         }
         translated = translated.replace(token, translatedToken);
     }
     return translated;
   }

   
  //Изменено для системы падежей
  var newValue = value;
  
   if (value.indexOf("[name(") >= 0) {
      newValue = localizeName(value, opts);
      newValue = i18n.applyReplacement(newValue, opts);
   }
   
   if (value.indexOf(endModifyPref) >= 0) 
   {
	  newValue = endModify(newValue);
	  return newValue;
   }

   if (value == key && !isFound) {
      return undefined;
   }


   return newValue;
});