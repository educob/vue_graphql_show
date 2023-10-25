import './buffer.js';
import 'react-native-get-random-values';
import 'react-native-reanimated'

import * as React from 'react';
import {MainNavigator} from './src/navigation/MainNavigator';
import {store} from './src/store/store';
import {Provider} from 'react-redux';
import {NativeBaseProvider} from 'native-base';
import { Storage } from './src/utils/Storage';

function App() {
  //Storage.clear()

  return (
    <Provider store={store}>
      <NativeBaseProvider>
        <MainNavigator />
      </NativeBaseProvider>
    </Provider>
  );
}

export default App;
