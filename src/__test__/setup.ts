import { _resetProjectInfo } from '../module/module.js';
import { _resetSettings } from '../settings/settings.js';

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
});
