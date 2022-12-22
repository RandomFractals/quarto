/*
 * store.ts
 *
 * Copyright (C) 2022 by Posit Software, PBC
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */

import { configureStore } from '@reduxjs/toolkit'
import { jsonRpcBrowserRequestTransport } from 'core-browser';
import { editorJsonRpcServices } from 'editor';
import { kWriterJsonRpcPath } from 'writer-types';
import { dictionaryApi, initDictionaryApi } from 'editor-ui';

import { editorSlice } from './editor';
import { prefsApi } from './prefs';

export async function initializeStore() {

  // get editor services
  const request = jsonRpcBrowserRequestTransport(kWriterJsonRpcPath);
  const editorServices = editorJsonRpcServices(request);

  // initialize dictionary api
  initDictionaryApi(editorServices.dictionary);

  const store = configureStore({
    reducer: {
      editor: editorSlice.reducer,
      [prefsApi.reducerPath]: prefsApi.reducer,
      [dictionaryApi.reducerPath]: dictionaryApi.reducer
    },
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware()
          .prepend(prefsApi.middleware)
          .prepend(dictionaryApi.middleware)
    }
  });
  
  // prefech prefs
  store.dispatch(prefsApi.util.prefetch("getPrefs", undefined, {force: true}));
  await Promise.all(store.dispatch(prefsApi.util.getRunningQueriesThunk()));

  // return store
  return store;
}



