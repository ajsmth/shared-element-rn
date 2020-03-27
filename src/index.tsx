import React from 'react';

import {
  SharedElement as RNSharedElement,
  SharedElementTransition,
  nodeFromRef,
  SharedElementAlign,
  SharedElementAnimation,
  SharedElementResize,
  SharedElementNode,
} from 'react-native-shared-element';

import { StyleSheet, Animated, View, ViewStyle } from 'react-native';

const IndexContext = React.createContext(-1);
const AnimatedIndexContext = React.createContext(new Animated.Value(0));
const TransitionContext = React.createContext<any>({});

interface ISharedElementConfig {
  align?: SharedElementAlign;
  resize?: SharedElementResize;
  animated?: SharedElementAnimation;
  debug?: boolean;
}

const DEFAULT_ELEMENT_CONFIG: ISharedElementConfig = {
  align: 'auto',
  resize: 'auto',
  animated: 'move',
  debug: false,
};

interface ITransitionContextProvider {
  children: React.ReactNode;
}

function TransitionContextProvider({ children }: ITransitionContextProvider) {
  const ancestors = React.useRef([]);
  const transitions = React.useRef<Record<string, SharedElementNode[]>>({});
  const configs = React.useRef<Record<string, ISharedElementConfig[]>>({});
  const childNodes = React.useRef<Record<string, any[]>>({});

  function registerAncestor(ref: any, index: number) {
    const node = nodeFromRef(ref);
    // @ts-ignore
    ancestors.current[index] = node;
  }

  function registerElement(
    node: any,
    index: number,
    id: string,
    child: any,
    config?: ISharedElementConfig
  ) {
    if (!transitions.current[id]) {
      transitions.current[id] = [];
    }

    transitions.current[id][index] = node;

    if (!childNodes.current[id]) {
      childNodes.current[id] = [];
    }

    childNodes.current[id][index] = child;

    if (!configs.current[id]) {
      configs.current[id] = [];
    }

    configs.current[id][index] = {
      ...DEFAULT_ELEMENT_CONFIG,
      ...config,
    };
  }

  return (
    <TransitionContext.Provider
      value={{
        ancestors: ancestors.current,
        registerAncestor,
        transitions: transitions.current,
        registerElement,
        configs: configs.current,
        childNodes: childNodes.current,
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}

interface ISharedElements {
  activeIndex: number;
  animatedIndex: Animated.Value;
  transitionConfig?: ITransitionConfig;
  children: React.ReactNode;
}

function SharedElementsImpl({
  activeIndex,
  animatedIndex,
  transitionConfig = DEFAULT_TRANSITION_CONFIG,
  children,
}: ISharedElements) {
  const transitionMethod =
    // @ts-ignore
    transitionConfig['duration'] !== undefined ? 'timing' : 'spring';

  const { transitions, ancestors, configs } = React.useContext(
    TransitionContext
  );

  const position = React.useRef(new Animated.Value(0));

  const [currentIndex, setCurrentIndex] = React.useState(activeIndex);
  const [nextIndex, setNextIndex] = React.useState(activeIndex);

  React.useEffect(() => {
    setNextIndex(activeIndex);
  }, [activeIndex]);

  const previousIndex = usePrevious(activeIndex);

  const transitioning =
    nextIndex !== currentIndex || previousIndex !== activeIndex;

  function renderTransitions() {
    if (currentIndex === nextIndex) {
      return null;
    }

    position.current.setValue(0);

    const nodes = Object.keys(transitions)
      .map((transitionId) => {
        const transition = transitions[transitionId];
        const startNode = transition[currentIndex];
        const endNode = transition[nextIndex];

        if (startNode && endNode) {
          const startAncestor = ancestors[currentIndex];
          const endAncestor = ancestors[nextIndex];

          const elementConfigs = configs[transitionId];
          let elementConfig;

          if (elementConfigs) {
            elementConfig = elementConfigs[currentIndex];
          }

          elementConfig = elementConfig || DEFAULT_ELEMENT_CONFIG;

          if (startAncestor && endAncestor) {
            return (
              <Animated.View
                key={transitionId}
                style={{
                  ...StyleSheet.absoluteFillObject,
                }}
              >
                <SharedElementTransition
                  start={{
                    node: startNode,
                    ancestor: startAncestor,
                  }}
                  end={{
                    node: endNode,
                    ancestor: endAncestor,
                  }}
                  position={position.current}
                  {...elementConfig}
                />
              </Animated.View>
            );
          }
        }

        return null;
      })
      .filter(Boolean);

    if (nodes.length > 0) {
      Animated.parallel([
        Animated[transitionMethod](position.current, {
          ...transitionConfig,
          toValue: 1,
        }),
        Animated[transitionMethod](animatedIndex, {
          ...transitionConfig,
          toValue: nextIndex,
        }),
      ]).start(() => {
        setCurrentIndex(nextIndex);
      });
    }

    return nodes;
  }

  return (
    <AnimatedIndexContext.Provider value={animatedIndex}>
      <View style={{ flex: 1 }} collapsable={false}>
        {React.Children.map(children, (child: any, index: number) => {
          if (!transitioning) {
            if (index > activeIndex) {
              return React.cloneElement(child, { children: null });
            }
          }

          return (
            <View
              collapsable={false}
              style={{ ...StyleSheet.absoluteFillObject }}
            >
              <IndexContext.Provider value={index}>
                <SharedElementScreen>{child}</SharedElementScreen>
              </IndexContext.Provider>
            </View>
          );
        })}

        {renderTransitions()}
      </View>
    </AnimatedIndexContext.Provider>
  );
}

interface ISharedElementScreen {
  children: React.ReactNode;
}

function SharedElementScreen({ children }: ISharedElementScreen) {
  const index = React.useContext(IndexContext);
  const { registerAncestor } = React.useContext(TransitionContext);

  return (
    <View
      style={{ flex: 1 }}
      collapsable={false}
      ref={(ref) => registerAncestor(ref, index)}
    >
      {children}
    </View>
  );
}

interface ISharedElement {
  children: React.ReactNode;
  id: string;
  config?: ISharedElementConfig;
}

function SharedElement({ children, id, config }: ISharedElement) {
  const index = React.useContext(IndexContext);

  const { registerElement } = React.useContext(TransitionContext);

  return (
    <RNSharedElement
      onNode={(node) => registerElement(node, index, id, children, config)}
    >
      {children}
    </RNSharedElement>
  );
}

type ITransitionConfig =
  | Partial<Animated.SpringAnimationConfig>
  | Partial<Animated.TimingAnimationConfig>;

const DEFAULT_TRANSITION_CONFIG: ITransitionConfig = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
  useNativeDriver: true,
};

interface ISharedElements {
  activeIndex: number;
  children: React.ReactNode;
  animatedValue?: Animated.Value;
  transitionConfig?: ITransitionConfig;
}

function SharedElements({
  children,
  activeIndex,
  animatedValue,
  transitionConfig,
}: ISharedElements) {
  const animatedIndex = React.useRef(
    animatedValue || new Animated.Value(activeIndex)
  );

  return (
    <TransitionContextProvider>
      <SharedElementsImpl
        transitionConfig={transitionConfig}
        activeIndex={activeIndex}
        animatedIndex={animatedIndex.current}
      >
        {children}
      </SharedElementsImpl>
    </TransitionContextProvider>
  );
}

export { SharedElements, SharedElement, useInterpolation };

function usePrevious(value: any) {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = React.useRef<any>(value);

  // Store current value in ref
  React.useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}

function useInterpolation(interpolation: any) {
  const index = React.useContext(IndexContext);
  const animatedIndex = React.useContext(AnimatedIndexContext);

  const offset = Animated.subtract(index, animatedIndex);

  const styles = React.useMemo(() => {
    return interpolateWithConfig(offset, interpolation);
  }, [interpolation, offset]);

  return styles;
}

function interpolateWithConfig(
  offset: Animated.AnimatedSubtraction,
  pageInterpolation?: any
): ViewStyle {
  if (!pageInterpolation) {
    return {};
  }

  return Object.keys(pageInterpolation).reduce((styles: any, key: any) => {
    const currentStyle = pageInterpolation[key];

    if (Array.isArray(currentStyle)) {
      const _style = currentStyle.map((interpolationConfig: any) =>
        interpolateWithConfig(offset, interpolationConfig)
      );

      styles[key] = _style;
      return styles;
    }

    if (typeof currentStyle === 'object') {
      styles[key] = offset.interpolate(currentStyle);
      return styles;
    }

    return styles;
  }, {});
}
