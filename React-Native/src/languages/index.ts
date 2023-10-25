import { Platform, NativeModules } from 'react-native';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import 'intl-pluralrules'

const locale = Platform.OS === 'ios'
  ? NativeModules.SettingsManager.settings.AppleLocale ||
    NativeModules.SettingsManager.settings.AppleLanguages[0]
  : NativeModules.I18nManager.localeIdentifier;

let en_US = require('./en_US');

// null if locale != en_US
let langModule;
if (locale == 'es_ES') {
  langModule = require('./es_ES');
} else if (locale == 'xxxx') {
 // langModule = require('./xxxx');
}

const resources = { en_US }

if(!!langModule)
  resources[locale] = langModule
 
i18n.use(initReactI18next)
  .init({
    resources,
    lng: locale,
    fallbackLng: "en_US",
    interpolation: {
      escapeValue: false
    }
  });
export const getT = () => {
  return useTranslation
}



/*
en_US: English (United States)
en_GB: English (United Kingdom)
fr_FR: French (France)
de_DE: German (Germany)
es_ES: Spanish (Spain)
zh_CN: Chinese (China)
ja_JP: Japanese (Japan)
ko_KR: Korean (Korea)

*/
