# shared-element-rn

Shared element transitions built around [`react-native-shared-element`](https://github.com/IjzerenHein/react-native-shared-element)

This component somewhat simplifys the usage for other libraries or custom screens in your app.

## Installation

```bash
yarn add shared-element-rn react-native-shared-element
cd ios && pod install
```

## API

`<SharedElements />` will trigger a transition when its `activeIndex` prop changes.

It will look for any `<SharedElement />` children on the next screen and if there is a matching id (or ids) it will trigger the shared element transition.

```javascript
import { SharedElements, SharedElement } from 'shared-element-rn';

function MySharedElements() {
  const [activeIndex, setActiveIndex] = React.useState(0);

  return (
    <View style={{ flex: 1 }}>
      <SharedElements activeIndex={activeIndex}>
        <Screen1 onTransition={() => setActiveIndex(1)} />
        <Screen2 onTransition={() => setActiveIndex(0)} />
      </SharedElements>
    </View>
  );
}

function Screen1({ onTransition }) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={onTransition}>
        <SharedElement id="image">
          <Image source={{ uri: 'my-image.png' }} style={{ height: 300 }} />
        </SharedElement>
      </TouchableOpacity>
    </View>
  );
}

function Screen2({ onTransition }) {
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity onPress={onTransition}>
        <SharedElement id="image">
          <Image source={{ uri: 'my-image.png' }} style={{ height: 500 }} />
        </SharedElement>
      </TouchableOpacity>
    </View>
  );
}
```

## Other stuff

Often you'll want to add some custom animations to non-shared elements, for example a fade in or slide in effect.

This library exports a `useInterpolation()` hook that can be used to animate non-shared elements in sync with the transitions:

```javascript
import { useInterpolation } from 'shared-element-rn';

const fadeIn = {
  opacity: {
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  },
};

function FadeIn({ children }) {
  const styles = useInterpolation(fadeIn);
  return <Animated.View style={styles}>{children}</Animated.View>;
}

const transitionBottom = {
  transform: [
    {
      translateY: {
        inputRange: [-1, 0, 1],
        outputRange: [500, 0, 500],
      },
    },
  ],
};

function TransitionBottom({ children }) {
  const styles = useInterpolation(transitionBottom);

  return <Animated.View style={styles}>{children}</Animated.View>;
}
```

## Roadmap

- gesture handling to dismiss views on swipe
