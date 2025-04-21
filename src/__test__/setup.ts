import { _resetProjectInfo } from '../module/module.js';
import { _resetStatementId } from '../module/util.js';
import { _resetSettings } from '../settings/settings.js';
import { _reset } from '../util/files.js';

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
  _reset();
  _resetStatementId();
});
