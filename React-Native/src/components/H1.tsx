import {Heading} from 'native-base';
import React from 'react';

export type IH1Props = {
  text: string;
  color?: string;
};

export const H1: React.FC<IH1Props> = ( { text = 'H1 Title', color = '#d0d0d0' } ) => {
  return (
    <Heading
      size="lg"
      fontWeight="600"
      color={color}
      _dark={{
        color,
      }}>
      {text}
    </Heading>
  );
};
