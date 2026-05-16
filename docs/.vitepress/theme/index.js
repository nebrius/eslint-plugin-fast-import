// CSS load order matters: the default theme must load first so our
// custom.css overrides win the cascade. This intentionally opposes
// simple-import-sort's default side-effect-first grouping.
/* eslint-disable simple-import-sort/imports */
import DefaultTheme from 'vitepress/theme';
import './custom.css';
/* eslint-enable simple-import-sort/imports */

export default DefaultTheme;
