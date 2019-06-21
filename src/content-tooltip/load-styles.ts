import { browser } from 'webextension-polyfill-ts'

import { injectCSS } from 'src/search-injection/dom'

export default () => injectCSS(browser.extension.getURL('/content_script.css'))
