import { _resetEntryPointCheck } from '../module/getEntryPointCheck.js';
import { _resetProjectInfo } from '../module/module.js';
import { _resetSettings } from '../settings/settings.js';
import { _reset } from '../util/files.js';

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
  _reset();
  _resetEntryPointCheck();
});
