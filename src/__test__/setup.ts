import { _resetProjectInfo } from '../module';
import { _resetSettings } from '../settings/settings';

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
});
