import React, { useRef, useEffect } from 'react';
import { Button, Animated } from 'react-native';
import AlertSVG from '../assets/img/bellRred.svg';

const BellButton = ( { isAnimating } ) => {
  const animationValue = useRef(new Animated.Value(0)).current;

  const animation = useRef(
    Animated.loop(
      Animated.sequence([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animationValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
  ).current;

  useEffect(() => {
    if (isAnimating) {
      animation.start();
    } else {
      animation.stop();
    }
  }, [animation, isAnimating]);

  const scale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  return (
    <Animated.View
    style={{
      transform: [{ scale }],
    }}
    >
      <AlertSVG width={30} height={30} />
        
    </Animated.View>
  );
};

export default BellButton;