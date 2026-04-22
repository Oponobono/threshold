import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = require('./en.json');
const es = require('./es.json');

const resources = {
  en: { translation: en },
  es: { translation: es },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es', // default language
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
