import { _resetProjectInfo } from '../module';
import { _resetSettings } from '../settings';

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
});
